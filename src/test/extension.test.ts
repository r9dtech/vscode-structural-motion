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

            await goToCursor(editor);

            await vscode.commands.executeCommand('structural-motion.moveStructureUp');

            assert.equal(
                readFileSync(path.join(fixturePath, 'result.ts'), { encoding: 'utf-8' }),
                editor.document.getText(),
            );
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

async function goToCursor(editor: vscode.TextEditor) {
    const cursorPlaceholder = '/*cursor*/';
    for (let index = 0; index < editor.document.lineCount; index++) {
        const line = editor.document.lineAt(index).text;
        const cursorStartsAt = line.indexOf(cursorPlaceholder);
        if (cursorStartsAt >= 0) {
            const cursorPosition = new vscode.Position(index, cursorStartsAt);
            await editor.edit((eb) => {
                eb.replace(
                    new vscode.Range(
                        cursorPosition,
                        cursorPosition.with({ character: cursorPosition.character + cursorPlaceholder.length }),
                    ),
                    '',
                );
            });
            editor.selections = [new vscode.Selection(cursorPosition, cursorPosition)];
            return;
        }
    }
    assert.fail(`could not find ${cursorPlaceholder} in ${editor.document.uri.toString()}`);
}
