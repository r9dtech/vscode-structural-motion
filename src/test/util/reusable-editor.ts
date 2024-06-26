import assert from 'assert';
import { after, before } from 'mocha';
import { TextDocument, TextEditor, commands, window, workspace } from 'vscode';
import { SupportedLanguage, waitForLanguageServer } from './language';
import { replaceAllText } from './text';

const reusableTextDocuments: Map<SupportedLanguage, TextDocument> = new Map();

before(() => {
    reusableTextDocuments.clear();
});
after(async () => {
    await closeTextDocuments(reusableTextDocuments.values());
});

export async function openReusableEditor(language: SupportedLanguage, content: string): Promise<TextEditor> {
    const foundDocument = reusableTextDocuments.get(language);
    let editor: TextEditor;
    if (foundDocument) {
        editor = await window.showTextDocument(foundDocument);
    } else {
        const newDocument = await workspace.openTextDocument({ language, content: '' });
        editor = await window.showTextDocument(newDocument);
        reusableTextDocuments.set(language, newDocument);
        await waitForLanguageServer(editor);
    }
    await replaceAllText(editor, content);
    return editor;
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
