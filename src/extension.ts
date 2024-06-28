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
    Selection,
    SymbolInformation,
    TextLine,
} from 'vscode';

export function activate(context: ExtensionContext) {
    context.subscriptions.push(
        commands.registerCommand('structural-motion.moveStructureDown', async () => {
            await moveStructure(1);
        }),
    );

    context.subscriptions.push(
        commands.registerCommand('structural-motion.moveStructureUp', async () => {
            await moveStructure(-1);
        }),
    );
}

export function deactivate() {
    // This plugin has nothing to deactivate
}

/**
 * Find a structure under the cursor in the active editor and move it past whatever structure above or below
 */
export async function moveStructure(moveDirection: -1 | 1) {
    const editor = window.activeTextEditor;

    if (!editor) {
        return;
    }

    if (!editor.selection.isEmpty) {
        console.warn('Moving selections is not yet supported');
        return;
    }

    const documentUri = editor.document.uri;
    const documentVersion = editor.document.version;

    const cursorPosition = editor.selection.active;

    const symbolsPromise = getSymbolInformation(editor.document);

    const sourceLine = cursorPosition.line;

    const sourceStructure = await findStructure(editor.document, sourceLine, symbolsPromise);

    if (!sourceStructure) {
        return;
    }

    const targetLine =
        {
            [-1]: sourceStructure.start,
            [1]: sourceStructure.end,
        }[moveDirection].line + moveDirection;

    const targetStructure = await findStructure(editor.document, targetLine, symbolsPromise);

    if (!targetStructure) {
        return;
    }

    const intersection = sourceStructure.intersection(targetStructure);

    if (intersection && !intersection.isEmpty) {
        return;
    }

    const { firstStructure, secondStructure } = {
        [-1]: () => ({ firstStructure: targetStructure, secondStructure: sourceStructure }),
        [1]: () => ({ firstStructure: sourceStructure, secondStructure: targetStructure }),
    }[moveDirection]();

    const between = new Range(firstStructure.end, secondStructure.start);

    await editor.edit((eb) => {
        if (editor.document.uri !== documentUri || editor.document.version !== documentVersion) {
            console.error('structural-motion not applying change as document has changed');
            return;
        }
        const firstText = editor.document.getText(firstStructure);
        const betweenText = editor.document.getText(between);
        const secondText = editor.document.getText(secondStructure);
        eb.delete(new Range(firstStructure.start, secondStructure.end));
        eb.insert(firstStructure.start, secondText + betweenText + firstText);
    });
    const newCursorPosition = cursorPosition.with({
        line: cursorPosition.line + (targetStructure.end.line - targetStructure.start.line + 1) * moveDirection,
    });
    editor.selections = [new Selection(newCursorPosition, newCursorPosition)];
}

/**
 * Find a structure using provided symbols and selection ranges provided by language plugins
 *
 * A 'structure' in this context is a range of whole lines in a file which represent some discrete unit in a given
 * language - for example a function, class, array, statement, expression, html tag, etc.
 */
async function findStructure(
    document: TextDocument,
    lineNumber: number,
    symbolsPromise: Promise<DocumentSymbol[]>,
): Promise<Range | undefined> {
    if (!documentHasLine(document, lineNumber)) {
        return;
    }
    const textLine = document.lineAt(lineNumber);

    const symbols = await symbolsPromise;

    const selectionRangesFromLineStart = getSelectionRanges(
        // selectionRanges from line start are generally find structures ending on this line
        document,
        new Position(lineNumber, textLine.firstNonWhitespaceCharacterIndex),
    );
    const selectionRangesFromLineEnd = getSelectionRanges(
        // selectionRanges from line end are generally find structures starting on this line
        document,
        textLine.range.end,
    );

    const upwardsRanges = extractFullLineRanges(document, await selectionRangesFromLineStart).filter(
        (r) => r.end.line === lineNumber,
    );

    const downwardRanges = extractFullLineRanges(document, await selectionRangesFromLineEnd).filter(
        (r) => r.start.line === lineNumber,
    );

    return (
        findRangeMatchingEmptyLine(textLine) ??
        findRangeFromSymbols(symbols, textLine) ??
        (await findRangeFromUpwardsRangesWithMatchingDownwardRange(document, upwardsRanges)) ??
        downwardRanges[0] ?? // downward ranges do well because providers often give a multi-line range, whereas upward ranges do so less often
        upwardsRanges[0] // upward ranges make a good fallback when there were , e.g. in the case of css declarations (where eol selects the whole rule)
    );
}

function findRangeMatchingEmptyLine(line: TextLine): Range | undefined {
    return line.isEmptyOrWhitespace ? line.range : undefined;
}

/**
 * If a range ends on a give line, we can double-check that it is a sensible structure by finding ranges starting at the end of it's first line.
 *
 * This is useful if, for example, we have found a range from a closing brace, as language plugins will often provide the first full-line selection range
 * for a function, but not for (e.g.) an if - statement.
 */
async function findRangeFromUpwardsRangesWithMatchingDownwardRange(
    document: TextDocument,
    upwardsRanges: Range[],
): Promise<Range | undefined> {
    // check the non-single-line upwardRanges to see if any of them have an equivalent downward range - implying they are a complete structure
    const firstNonSingleLineUpwardRange = upwardsRanges.find((range) => !range.isSingleLine);

    if (firstNonSingleLineUpwardRange) {
        const nonSingleLineUpwardRangeStart = firstNonSingleLineUpwardRange.start.with({
            character: document.lineAt(firstNonSingleLineUpwardRange.start.line).range.end.character,
        });
        const upwardRangeCheckSelectionRange = await getSelectionRanges(document, nonSingleLineUpwardRangeStart);
        const checkRanges = extractFullLineRanges(document, upwardRangeCheckSelectionRange);
        if (checkRanges[0]?.isEqual(firstNonSingleLineUpwardRange)) {
            // first expansion in JS tends to match - e.g. multi-line-string
            // this avoids matching e.g. partial method chain
            return firstNonSingleLineUpwardRange;
        }
    }
    return;
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

function findRangeFromSymbols(symbols: DocumentSymbol[], textLine: TextLine): Range | undefined {
    const nonWhitespaceLineRange = textLine.range.with({
        start: textLine.range.start.with({ character: textLine.firstNonWhitespaceCharacterIndex }),
    });

    for (const symbol of symbols) {
        if (!symbol.range.contains(nonWhitespaceLineRange)) {
            continue;
        }
        if (
            symbol.range.start.line === textLine.range.start.line ||
            symbol.range.end.line === textLine.range.start.line
        ) {
            return symbol.range;
        }
        const foundInChild = findRangeFromSymbols(symbol.children, textLine);
        if (foundInChild) {
            return foundInChild;
        }
    }
    return;
}

async function getSelectionRanges(document: TextDocument, position: Position): Promise<SelectionRange> {
    const result = await commands.executeCommand<SelectionRange[] | null | undefined>(
        'vscode.executeSelectionRangeProvider',
        document.uri,
        [
            // There is a bug/behaviour (e.g. for HTML) where the provider doesn't respond correctly if we request multiple positions
            // Instead it just sends the full doc range back
            // So only allow one position at a time here.
            position,
        ],
    );
    assert(result && result[0]);
    return result[0];
}

async function getSymbolInformation(document: TextDocument): Promise<(DocumentSymbol & SymbolInformation)[]> {
    const result =
        (await commands.executeCommand<
            // contrary to documentation, vscode returns a class which is a merge of these two types
            (SymbolInformation & DocumentSymbol)[] | null | undefined
        >('vscode.executeDocumentSymbolProvider', document.uri)) ?? [];
    assert(result instanceof Array);
    return result;
}

function isFullLineSelection(document: TextDocument, range: Range): boolean {
    return (
        range.contains(document.lineAt(range.start.line).range) && range.contains(document.lineAt(range.end.line).range)
    );
}

function documentHasLine(document: TextDocument, line: number): boolean {
    return line >= 0 && line < document.lineCount;
}
