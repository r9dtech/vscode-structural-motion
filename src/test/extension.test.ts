import * as assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import { afterEach } from 'mocha';
import * as path from 'path';

import * as vscode from 'vscode';

const tsFixtureFolders = readdirSync(path.resolve(__dirname, '../../testFixture/ts'), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

suite('Extension Test Suite', () => {
    tsFixtureFolders.forEach((tsFixtureFolder) => {
        afterEach(async () => {
            await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
        });

        test(`.ts fixture: ${tsFixtureFolder}`, async () => {
            const fixturePath = path.resolve(__dirname, '../../testFixture', 'ts', tsFixtureFolder);

            const editor = await openFile(path.join(fixturePath, 'before.ts'));

            const position = editor.document.lineAt(1).range.end;
            editor.selections = [new vscode.Selection(position, position)];
            await vscode.commands.executeCommand('structural-motion.moveStructureUp');

            const content = editor.document.getText();

            const expectedResult = readFileSync(path.join(fixturePath, 'result.ts'), { encoding: 'utf-8' });

            assert.equal(expectedResult, content);
        });
    });
});

async function openFile(filePath: string): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument(filePath);

    await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    await vscode.window.showTextDocument(document);

    const editor = vscode.window.activeTextEditor;

    if (editor?.document.uri.path !== filePath) {
        assert.fail('Editor did not open');
    }
    return editor;
}
