import { assert } from 'console';
import { ExtensionContext, commands, window, SelectionRange, Range, TextDocument } from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('structural-motion.moveStructureDown', async () => {
            const editor = window.activeTextEditor;

            if (!editor) {
                return;
            }

            const documentUri = editor.document.uri;
            const documentVersion = editor.document.version;
            const cursorPosition = editor.selection.active;

            const sourceStructure = await findStructureFromLastLine(editor.document, cursorPosition.line);

            if (!sourceStructure) {
                return;
            }

            const targetStructure = await findStructureFromLastLine(editor.document, sourceStructure.end.line + 1);

            if (!targetStructure) {
                return;
            }

            const fullSourceRange = sourceStructure.union(
                editor.document.lineAt(sourceStructure.end.line).rangeIncludingLineBreak,
            );

            const fullTargetRange = targetStructure.union(
                editor.document.lineAt(targetStructure.end.line).rangeIncludingLineBreak,
            );

            await editor.edit((eb) => {
                if (editor.document.uri !== documentUri || editor.document.version !== documentVersion) {
                    console.error('structural-motion not applying change as document has changed');
                    return;
                }
                eb.delete(fullTargetRange);
                const targetText = editor.document.getText(fullTargetRange);
                eb.insert(fullSourceRange.start, targetText);
            });
        }),
    );
    context.subscriptions.push(
        commands.registerCommand('structural-motion.moveStructureUp', async () => {
            const editor = window.activeTextEditor;

            if (!editor) {
                return;
            }

            const documentUri = editor.document.uri;
            const documentVersion = editor.document.version;
            const cursorPosition = editor.selection.active;

            const sourceStructure = await findStructureFromLastLine(editor.document, cursorPosition.line);

            if (!sourceStructure) {
                return;
            }

            const targetStructure = await findStructureFromLastLine(editor.document, sourceStructure.start.line - 1);

            if (!targetStructure) {
                return;
            }

            const fullSourceRange = sourceStructure.union(
                editor.document.lineAt(sourceStructure.end.line).rangeIncludingLineBreak,
            );

            const fullTargetRange = targetStructure.union(
                editor.document.lineAt(targetStructure.end.line).rangeIncludingLineBreak,
            );

            await editor.edit((eb) => {
                if (editor.document.uri !== documentUri || editor.document.version !== documentVersion) {
                    console.error('structural-motion not applying change as document has changed');
                    return;
                }
                const targetText = editor.document.getText(fullTargetRange);
                eb.insert(fullSourceRange.end, targetText);
                eb.delete(fullTargetRange);
            });
        }),
    );
}

async function findStructureFromLastLine(document: TextDocument, line: number): Promise<Range | undefined> {
    if (document.lineAt(line).isEmptyOrWhitespace) {
        return document.lineAt(line).range;
    }

    const candidateStructure = await findFullLineSelectionRangeUsingLineStart(document, line);

    const checkStructureRange = candidateStructure
        ? await findFullLineSelectionRangeUsingLineEnd(document, candidateStructure.range.start.line)
        : undefined;

    const candidateWiderStructure =
    candidateStructure && candidateStructure.parent
            ? expandSelectionRangeUntilFullLines(document, candidateStructure.parent)
            : undefined;

    const checkWiderStructureRange =
        candidateStructure && candidateWiderStructure
            ? await findFullLineSelectionRangeUsingLineEnd(document, candidateWiderStructure.range.start.line)
            : undefined;

    if (
        candidateWiderStructure &&
        checkWiderStructureRange &&
        checkWiderStructureRange.range.end.line === line &&
        candidateWiderStructure.range.isEqual(checkWiderStructureRange.range)
    ) {
        return checkWiderStructureRange.range;
    }

    if (
        candidateStructure &&
        checkStructureRange &&
        checkStructureRange.range.end.line === line &&
        candidateStructure.range.isEqual(checkStructureRange.range)
    ) {
        return checkStructureRange.range;
    }

    return (await findFullLineSelectionRangeUsingLineEnd(document, line))?.range;
}

async function findFullLineSelectionRangeUsingLineEnd(document: TextDocument, line: number): Promise<SelectionRange | undefined> {
    if (document.lineAt(line).isEmptyOrWhitespace) {
        return document.lineAt(line);
    }

    const selectionRange = await getSelectionRanges(document, line, 'end');

    return expandSelectionRangeUntilFullLines(document, selectionRange);
}

async function findFullLineSelectionRangeUsingLineStart(document: TextDocument, line: number): Promise<SelectionRange | undefined> {
    if (document.lineAt(line).isEmptyOrWhitespace) {
        return document.lineAt(line);
    }

    const selectionRange = await getSelectionRanges(document, line, 'start');

    return expandSelectionRangeUntilFullLines(document, selectionRange);
}

function expandSelectionRangeUntilFullLines(document: TextDocument, selectionRange: SelectionRange) {
    let current: SelectionRange | undefined = selectionRange;
    while (current) {
        if (isFullLineSelection(document, current.range)) {
            break;
        }
        current = current.parent;
    }
    return current;
}

async function getSelectionRanges(
    document: TextDocument,
    line: number,
    lineLocation: keyof Pick<Range, 'start' | 'end'>,
): Promise<SelectionRange> {
    const position = document.lineAt(line).range[lineLocation];
    const result = await commands.executeCommand<SelectionRange[]>(
        'vscode.executeSelectionRangeProvider',
        document.uri,
        [position],
    );
    assert(result instanceof Array && result.length === 1);
    assert(result[0] instanceof SelectionRange);
    return result[0];
}

function isFullLineSelection(document: TextDocument, range: Range): boolean {
    return (
        range.contains(document.lineAt(range.start.line).range) && range.contains(document.lineAt(range.end.line).range)
    );
}

export function deactivate() {
    // This plugin has nothing to deactivate
}
