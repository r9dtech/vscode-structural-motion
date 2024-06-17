import * as assert from 'assert';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { afterEach, before } from 'mocha';
import * as path from 'path';

import * as vscode from 'vscode';

type Language = {
    name: string;
    extension: string;
    cursorPlaceholder: string;
};

const languages: Language[] = [
    {
        name: 'bash',
        extension: '.sh',
        cursorPlaceholder: '#cursor',
    },
    {
        name: 'python',
        extension: '.py',
        cursorPlaceholder: '#cursor',
    },
    {
        name: 'css',
        extension: '.css',
        cursorPlaceholder: '/*cursor*/',
    },
    {
        name: 'html',
        extension: '.html',
        cursorPlaceholder: '<!--cursor-->',
    },
    {
        name: 'typescript',
        extension: '.ts',
        cursorPlaceholder: '/*cursor*/',
    },
];

languages.forEach((language) => {
    const fixtureFolders = readdirSync(path.resolve(__dirname, '../../testFixture', language.name), {
        withFileTypes: true,
    })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

    suite(`Fixtures for ${language.name}`, () => {
        before(async () => {
            console.log([1]);

            const warmUpFile = path.resolve(
                __dirname,
                '../../testFixture',
                language.name,
                `ready${language.extension}`,
            );

            if (!existsSync(warmUpFile)) {
                return;
            }

            const editor = await openFile(warmUpFile);

            let result: unknown = undefined;

            while (!result) {
                // Wait for symbols, which means the language plugin has initialised
                result = await vscode.commands.executeCommand(
                    'vscode.executeDocumentSymbolProvider',
                    editor.document.uri,
                );
                await new Promise((r) => setTimeout(r, 300));
            }
        });

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
                            cursorPosition.with({
                                character: cursorPosition.character + language.cursorPlaceholder.length,
                            }),
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
