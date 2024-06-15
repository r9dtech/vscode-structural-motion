import * as assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import { afterEach } from 'mocha';
import * as path from 'path';

import * as vscode from 'vscode';

type Language = {
    name: string;
    extension: string;
    cursorPlaceholder: string;
    slowLanguagePlugin: boolean;
};

const languages: Language[] = [
    {
        name: 'css',
        extension: '.css',
        cursorPlaceholder: '/*cursor*/',
        slowLanguagePlugin: false,
    },
    {
        name: 'html',
        extension: '.html',
        cursorPlaceholder: '<!--cursor-->',
        slowLanguagePlugin: true,
    },
    {
        name: 'typescript',
        extension: '.ts',
        cursorPlaceholder: '/*cursor*/',
        slowLanguagePlugin: false,
    },
];

languages.forEach((language) => {
    const fixtureFolders = readdirSync(path.resolve(__dirname, '../../testFixture', language.name), {
        withFileTypes: true,
    })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    suite(`Fixtures for ${language.name}`, () => {
        afterEach(async () => {
            await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
        });

        fixtureFolders.forEach((fixtureFolder) => {
            const fixturePath = path.resolve(__dirname, '../../testFixture', language.name, fixtureFolder);

            test(`Fixture: ${fixtureFolder} - move down`, async () => {
                const expectedResult = readFileSync(path.join(path.join(fixturePath, `result${language.extension}`)), {
                    encoding: 'utf-8',
                });

                const editor = await openFile(path.join(fixturePath, `before${language.extension}`));

                await goToCursor(editor);

                if (language.slowLanguagePlugin) {
                    // Allow slow plugins to parse the file
                    await new Promise(r => setTimeout(r, 500));
                }
                
                await vscode.commands.executeCommand('structural-motion.moveStructureDown');

                assert.equal(expectedResult, editor.document.getText());
            });

            test(`Fixture: ${fixtureFolder} - move up`, async () => {
                const expectedResult = readFileSync(path.join(path.join(fixturePath, `before${language.extension}`)), {
                    encoding: 'utf-8',
                }).replace(language.cursorPlaceholder, '');

                const editor = await openFile(path.join(fixturePath, `before${language.extension}`));

                await goToCursor(editor);

                const selections = editor.selections;

                await vscode.commands.executeCommand('structural-motion.moveStructureDown');
                await vscode.commands.executeCommand('structural-motion.moveStructureUp');

                assert.equal(expectedResult, editor.document.getText());
                assert.equal(JSON.stringify(selections), JSON.stringify(editor.selections));
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
        for (let index = 0; index < editor.document.lineCount; index++) {
            const line = editor.document.lineAt(index).text;
            const cursorStartsAt = line.indexOf(language.cursorPlaceholder);
            if (cursorStartsAt >= 0) {
                const cursorPosition = new vscode.Position(index, cursorStartsAt);
                await editor.edit((eb) => {
                    eb.delete(
                        new vscode.Range(
                            cursorPosition,
                            cursorPosition.with({ character: cursorPosition.character + language.cursorPlaceholder.length }),
                        ),
                    );
                });
                editor.selections = [new vscode.Selection(cursorPosition, cursorPosition)];
                return;
            }
        }
        assert.fail(`could not find ${language.cursorPlaceholder} in ${editor.document.uri.toString()}`);
    }
});
