import { assert } from 'console';
import { ExtensionContext, commands, window, SelectionRange, Uri, Position, Range, TextDocument } from 'vscode';

export function activate(context: ExtensionContext) {
    const disposable = commands.registerCommand('structural-motion.moveStructureDown', async () => {
        const editor = window.activeTextEditor;

        if (!editor) {
            return;
        }

        const documentUri = editor.document.uri;
        const documentVersion = editor.document.version;
        const cursorPosition = editor.selection.active;

        const sourceStructure = await findStructure(editor.document, cursorPosition);

        if (!sourceStructure) {
            return;
        }

        const fullSourceRange = sourceStructure.union(
            editor.document.lineAt(sourceStructure.end.line).rangeIncludingLineBreak,
        );

        const fullTargetRange = editor.document.lineAt(sourceStructure.end.line + 1).rangeIncludingLineBreak;

        await editor.edit((eb) => {
            if (editor.document.uri !== documentUri || editor.document.version !== documentVersion) {
                console.error('structural-motion not applying change as document has changed');
                return;
            }
            eb.delete(fullTargetRange);
            const targetText = editor.document.getText(fullTargetRange);
            eb.insert(fullSourceRange.start, targetText);
        });
    });

    context.subscriptions.push(disposable);
}

async function findStructure(document: TextDocument, originalCursorPosition: Position): Promise<Range | undefined> {
    let selectionRange: SelectionRange | undefined = await getSelectionRanges(document.uri, originalCursorPosition);

    while (selectionRange) {
        if (isFullLineSelection(document, selectionRange.range)) {
            break;
        }
        selectionRange = selectionRange.parent;
    }
    return selectionRange?.range;
}

async function getSelectionRanges(uri: Uri, position: Position): Promise<SelectionRange> {
    const result = await commands.executeCommand<SelectionRange[]>('vscode.executeSelectionRangeProvider', uri, [
        position,
    ]);
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
