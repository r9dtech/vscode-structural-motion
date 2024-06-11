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

            const sourceStructure = await findStructure(editor.document, cursorPosition.line);

            if (!sourceStructure) {
                return;
            }

            const targetStructure = await findStructure(editor.document, sourceStructure.end.line + 1);

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

            const sourceStructure = await findStructure(editor.document, cursorPosition.line);

            if (!sourceStructure) {
                return;
            }

            const targetStructure = await findStructure(editor.document, sourceStructure.start.line - 1);

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

async function findStructure(document: TextDocument, line: number): Promise<Range | undefined> {
    let selectionRange: SelectionRange | undefined = await getSelectionRanges(document, line);

    selectionRange = expandSelectionRangeUntilFullLines(document, selectionRange);

    if (!selectionRange) {
        return undefined;
    }

    // We have a block which makes up whole lines.
    // If the line parameter was at the start of the structure, then this is likely a whole stucture (method/class/whatever)
    // otherwise we can try to expand our scope once more to find a structure which ends on this line.

    if (!selectionRange.range.isSingleLine) {
        // further expansion is unlikely not useful if the range is already multi-line.
        return selectionRange.range;
    }

    if (!selectionRange.parent) {
        // no further epansion possible, stick with what we've found already.
        return selectionRange.range;
    }

    const widerSelectionRange = expandSelectionRangeUntilFullLines(document, selectionRange.parent);

    if (!widerSelectionRange) {
        // no further epansion possible, stick with what we've found already.
        return;
    }

    if (widerSelectionRange.range.end.line !== selectionRange.range.end.line) {
        // if the selection expands down, we are unlikely to be at the end of a structure
        return selectionRange.range;
    }

    const widerSelectionRangeCheck = expandSelectionRangeUntilFullLines(
        document,
        await getSelectionRanges(document, widerSelectionRange.range.start.line),
    );

    if (!widerSelectionRangeCheck || widerSelectionRange.range.isEqual(widerSelectionRangeCheck.range)) {
        return widerSelectionRange.range;
    }

    return selectionRange.range;
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

async function getSelectionRanges(document: TextDocument, line: number): Promise<SelectionRange> {
    const position = document.lineAt(line).range.end;
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
