import assert from 'assert';
import { Range, TextEditor } from 'vscode';

export async function replaceAllText(editor: TextEditor, content: string) {
    assert(
        await editor.edit((eb) => {
            eb.delete(
                new Range(
                    editor.document.lineAt(0).range.start,
                    editor.document.lineAt(editor.document.lineCount - 1).rangeIncludingLineBreak.end,
                ),
            );
            eb.insert(editor.document.lineAt(0).range.start, content);
        }),
    );
}
