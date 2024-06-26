import assert from 'assert';
import { after, before } from 'mocha';
import { Range, TextDocument, TextEditor, commands, window, workspace } from 'vscode';

const reusableTextDocuments: Map<string, TextDocument> = new Map();

before(() => {
    reusableTextDocuments.clear();
});
after(async () => {
    await closeTextDocuments(reusableTextDocuments.values());
});

export async function openReusableTextDocument(language: string, content: string): Promise<TextEditor> {
    const foundDocument = reusableTextDocuments.get(language);
    if (foundDocument) {
        const editor = await window.showTextDocument(foundDocument);
        assert(
            await editor.edit((eb) => {
                eb.delete(
                    new Range(
                        editor.document.lineAt(0).range.start,
                        editor.document.lineAt(foundDocument.lineCount - 1).rangeIncludingLineBreak.end,
                    ),
                );
                eb.insert(editor.document.lineAt(0).range.start, content);
            }),
        );
        return editor;
    }
    const newDocument = await workspace.openTextDocument({ language, content });
    reusableTextDocuments.set(language, newDocument);
    return await window.showTextDocument(newDocument);
}

async function closeTextDocuments(documents: Iterable<TextDocument>) {
    let success = true;
    for (const document of documents) {
        try {
            await window.showTextDocument(document);
            await commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
        } catch (e) {
            console.error(e);
            success = false;
        }
    }
    assert(success);
}
