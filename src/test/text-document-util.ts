import assert from 'assert';
import { afterEach, beforeEach } from 'mocha';
import { TextDocument, TextEditor, commands, window, workspace } from 'vscode';

const managedTextDocuments: TextDocument[] = [];

beforeEach(() => {
    managedTextDocuments.length = 0;
});

export async function openTextDocument(filePath: string): Promise<TextEditor> {
    const document = await workspace.openTextDocument(filePath);
    managedTextDocuments.push(document);
    return await window.showTextDocument(document);
}

afterEach(async () => {
    let success = true;
    for (const document of managedTextDocuments) {
        try {
            await window.showTextDocument(document);
            await commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
        } catch (e) {
            console.error(e);
            success = false;
        }
    }
    assert(success);
});
