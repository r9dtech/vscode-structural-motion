import * as assert from 'assert';
import { readFileSync } from 'fs';
import { before } from 'mocha';
import * as path from 'path';

import { commands } from 'vscode';
import { findFixtureFolders, goToCursorPlaceholder, languageFixtureDetails } from './util/e2e';
import { supportedLanguages } from './util/language';
import { openReusableEditor } from './util/reusable-editor';

suite('end to end', () => {
    supportedLanguages.forEach((language) => {
        const languageFixtureDetail = languageFixtureDetails[language];
        const fixtureFolders = findFixtureFolders(language);
        suite(`Fixtures for ${language}`, () => {
            before(async () => {});

            fixtureFolders.forEach((fixtureFolder) => {
                const fixturePath = path.resolve(__dirname, '../../testFixture', language, fixtureFolder);

                test(`Fixture: ${fixtureFolder} - move down`, async () => {
                    const beforeContent = readFileSync(
                        path.join(fixturePath, `before${languageFixtureDetail.extension}`),
                        {
                            encoding: 'utf8',
                        },
                    );

                    const expectedResult = readFileSync(
                        path.join(path.join(fixturePath, `result${languageFixtureDetail.extension}`)),
                        {
                            encoding: 'utf-8',
                        },
                    );

                    const editor = await openReusableEditor(language, beforeContent);

                    await goToCursorPlaceholder(editor, language);

                    await commands.executeCommand('structural-motion.moveStructureDown');

                    assert.equal(expectedResult, editor.document.getText());
                });

                test(`Fixture: ${fixtureFolder} - move up`, async () => {
                    const beforeContent = readFileSync(
                        path.join(fixturePath, `before${languageFixtureDetail.extension}`),
                        {
                            encoding: 'utf8',
                        },
                    );

                    const expectedResult = beforeContent.replace(languageFixtureDetail.cursorPlaceholder, '');

                    const editor = await openReusableEditor(
                        language,
                        readFileSync(path.join(fixturePath, `before${languageFixtureDetail.extension}`), {
                            encoding: 'utf8',
                        }),
                    );

                    await goToCursorPlaceholder(editor, language);

                    const selections = editor.selections;

                    await commands.executeCommand('structural-motion.moveStructureDown');
                    await commands.executeCommand('structural-motion.moveStructureUp');

                    assert.equal(expectedResult, editor.document.getText());
                    assert.equal(JSON.stringify(selections), JSON.stringify(editor.selections));
                });
            });
        });
    });
});
