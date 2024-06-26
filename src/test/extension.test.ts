import * as assert from 'assert';
import { readFileSync } from 'fs';
import { before } from 'mocha';
import * as path from 'path';

import * as vscode from 'vscode';
import { findFixtureFolders, goToCursorPlaceholder } from './e2e-util';
import { languages, waitForLanguageServer } from './language-utils';
import { openReusableTextDocument } from './text-document-util';

languages.forEach((language) => {
    before(async () => {
        await waitForLanguageServer(language);
    });
});

suite('end to end', () => {
    languages.forEach((language) => {
        const fixtureFolders = findFixtureFolders(language);
        suite(`Fixtures for ${language.name}`, () => {
            before(async () => {});

            fixtureFolders.forEach((fixtureFolder) => {
                const fixturePath = path.resolve(__dirname, '../../testFixture', language.name, fixtureFolder);

                test(`Fixture: ${fixtureFolder} - move down`, async () => {
                    const beforeContent = readFileSync(path.join(fixturePath, `before${language.extension}`), {
                        encoding: 'utf8',
                    });

                    const expectedResult = readFileSync(
                        path.join(path.join(fixturePath, `result${language.extension}`)),
                        {
                            encoding: 'utf-8',
                        },
                    );

                    const editor = await openReusableTextDocument(language.name, beforeContent);

                    await goToCursorPlaceholder(editor, language);

                    await vscode.commands.executeCommand('structural-motion.moveStructureDown');

                    assert.equal(expectedResult, editor.document.getText());
                });

                test(`Fixture: ${fixtureFolder} - move up`, async () => {
                    const beforeContent = readFileSync(path.join(fixturePath, `before${language.extension}`), {
                        encoding: 'utf8',
                    });

                    const expectedResult = beforeContent.replace(language.cursorPlaceholder, '');

                    const editor = await openReusableTextDocument(
                        language.name,
                        readFileSync(path.join(fixturePath, `before${language.extension}`), { encoding: 'utf8' }),
                    );

                    await goToCursorPlaceholder(editor, language);

                    const selections = editor.selections;

                    await vscode.commands.executeCommand('structural-motion.moveStructureDown');
                    await vscode.commands.executeCommand('structural-motion.moveStructureUp');

                    assert.equal(expectedResult, editor.document.getText());
                    assert.equal(JSON.stringify(selections), JSON.stringify(editor.selections));
                });
            });
        });
    });
});
