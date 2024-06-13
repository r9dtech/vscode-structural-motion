import assert from 'assert';
import {
    ExtensionContext,
    commands,
    window,
    SelectionRange,
    Range,
    TextDocument,
    DocumentSymbol,
    Position,
} from 'vscode';

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

            const intersection = fullSourceRange.intersection(fullTargetRange);

            if (!intersection?.isEmpty) {
                return;
            }

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

            const intersection = fullSourceRange.intersection(fullTargetRange);

            if (!intersection?.isEmpty) {
                return;
            }

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
    if (document.lineAt(line).isEmptyOrWhitespace) {
        return document.lineAt(line).range;
    }

    const docLine = document.lineAt(line);

    const symbolsPromise = getSymbolInformation(document);

    const [selectionRangesFromLineStart, selectionRangesFromLineEnd] = await getSelectionRanges(document, [
        new Position(line, docLine.firstNonWhitespaceCharacterIndex),
        document.lineAt(line).range.end,
    ]);

    const upwardsRanges = extractFullLineRanges(document, selectionRangesFromLineStart).filter(
        (r) => r.end.line === line,
    );

    const downwardRanges = extractFullLineRanges(document, selectionRangesFromLineEnd).filter(
        (r) => r.start.line === line,
    );

    const sortedRanges = [...downwardRanges, ...upwardsRanges].sort(
        (a, b) => a.end.line - a.start.line - (b.end.line - b.start.line),
    );
    const symbols = await symbolsPromise;
    for (const range of sortedRanges) {
        if (rangeMatchesSymbol(range, symbols)) {
            return range;
        }
    }

    // check the non-single-line upwardRanges to see if any of them have an equivalent downward range - implying they are a complete structure
    const nonSinleLineUpwardRanges = upwardsRanges.filter((range) => !range.isSingleLine);

    const nonSingleLineUpwardRangeStarts = nonSinleLineUpwardRanges.map((range) =>
        range.start.with({ character: document.lineAt(range.start.line).range.end.character }),
    );

    const upwardRangeCheckSelectionRanges = await getSelectionRanges(document, nonSingleLineUpwardRangeStarts);

    for (let index = 0; index < upwardRangeCheckSelectionRanges.length; index++) {
        const upwardRange = nonSinleLineUpwardRanges[index];
        const checkSelectionRange = upwardRangeCheckSelectionRanges[index];
        const checkRanges = extractFullLineRanges(document, checkSelectionRange);
        if (checkRanges[0]?.isEqual(upwardRange)) {
            // first expansion in JS tends to match - e.g. multi-line-string
            return upwardRange;
        }
    }

    //if nothing, return the first downwardRange
    return downwardRanges[0];
}

function extractFullLineRanges(document: TextDocument, selectionRange: SelectionRange): Range[] {
    const results: Range[] = [];
    let current: SelectionRange | undefined = selectionRange;
    while (current) {
        if (isFullLineSelection(document, current.range)) {
            results.push(current.range);
        }
        current = current.parent;
    }
    return results;
}

function rangeMatchesSymbol(range: Range, symbols: DocumentSymbol[]): boolean {
    for (const symbol of symbols) {
        // pretend the range covers the whole line, like for const `f = function()=>{}`, tho that might not always be true
        const symbolRange = symbol.range.with({ start: symbol.range.start.with({ character: 0 }) });
        if (symbolRange.isEqual(range)) {
            return true;
        }
        if (symbolRange.contains(range)) {
            if (rangeMatchesSymbol(range, symbol.children)) {
                return true;
            }
        }
    }
    return false;
}

async function getSelectionRanges(document: TextDocument, positions: Position[]): Promise<SelectionRange[]> {
    const result = await commands.executeCommand<SelectionRange[]>(
        'vscode.executeSelectionRangeProvider',
        document.uri,
        positions,
    );
    assert(result instanceof Array);
    assert(result.every((sr) => sr instanceof SelectionRange));
    assert(result.length === positions.length);
    return result;
}

async function getSymbolInformation(document: TextDocument): Promise<DocumentSymbol[]> {
    const result = await commands.executeCommand<DocumentSymbol[] | undefined | null>(
        'vscode.executeDocumentSymbolProvider',
        document.uri,
    );
    assert(!result || result instanceof Array);
    // assert(result.every((r) => r instanceof DocumentSymbol)); TODO: this is some kind of weird lie!
    return result ?? [];
}

function isFullLineSelection(document: TextDocument, range: Range): boolean {
    return (
        range.contains(document.lineAt(range.start.line).range) && range.contains(document.lineAt(range.end.line).range)
    );
}

export function deactivate() {
    // This plugin has nothing to deactivate
}
