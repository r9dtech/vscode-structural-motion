import { assert } from 'console';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('structural-motion.moveStructureUp', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            return;
        }

        const documentUri = editor.document.uri;
        const documentVersion = editor.document.version;
        const originalCursorPosition = editor.selection.active;

        let selectionRange: vscode.SelectionRange | undefined = await getSelectionRanges(
            documentUri,
            originalCursorPosition,
        );

        while (selectionRange) {
            if (isFullLineSelection(selectionRange.range, editor)) {
                break;
            }
            selectionRange = selectionRange.parent;
        }

        if (!selectionRange || selectionRange.range.start.line < 1) {
            return;
        }

        const moveRange = selectionRange.range.union(
            editor.document.lineAt(selectionRange.range.end.line).rangeIncludingLineBreak,
        );
        const beforeRange = editor.document.lineAt(selectionRange.range.start.line - 1).rangeIncludingLineBreak;

        if (editor.document.uri !== documentUri || editor.document.version !== documentVersion) {
            return; // TODO: log error?
        }

        await editor.edit((eb) => {
            eb.insert(moveRange.end, editor.document.getText(beforeRange));
            eb.delete(beforeRange);
        });
    });

    context.subscriptions.push(disposable);
}

async function getSelectionRanges(uri: vscode.Uri, position: vscode.Position): Promise<vscode.SelectionRange> {
    const result = await vscode.commands.executeCommand<vscode.SelectionRange[]>(
        'vscode.executeSelectionRangeProvider',
        uri,
        [position],
    );
    assert(result instanceof Array && result.length === 1);
    assert(result[0] instanceof vscode.SelectionRange);
    return result[0];
}

function isFullLineSelection(range: vscode.Range, editor: vscode.TextEditor) {
    return (
        range.contains(editor.document.lineAt(range.start.line).range) &&
        range.contains(editor.document.lineAt(range.end.line).range)
    );
}

export function deactivate() {
    // This plugin has nothing to deactivate
}
