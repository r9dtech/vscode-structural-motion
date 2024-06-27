import * as assert from 'assert';
import { readFileSync } from 'fs';
import { before } from 'mocha';
import * as path from 'path';

import { Selection, TextEditor, commands } from 'vscode';
import { findFixtureFolders, goToCursorPlaceholder, languageFixtureDetails } from './util/e2e';
import { supportedLanguages } from './util/language';
import { openReusableEditor } from './util/reusable-editor';
import { moveStructure } from '../extension';

suite('refuse to work when cursors are complex', () => {
    async function resetDocument(): Promise<TextEditor> {
        return await openReusableEditor(
            'typescript',
            ['let _0;', 'let _1;', 'let _2;', 'let _3;', 'let _4;'].join('\n'),
        );
    }
    test('Single cursor move', async () => {
        const editor = await resetDocument();
        editor.selections = [
            new Selection(editor.document.lineAt(0).range.start, editor.document.lineAt(0).range.start),
        ];
        await moveStructure(1);
        assert.equal(editor.document.getText(editor.document.lineAt(0).range), 'let _1;');
        assert.equal(editor.document.getText(editor.document.lineAt(1).range), 'let _0;');
    });
    test('Single line selection does not move', async () => {
        const editor = await resetDocument();
        editor.selections = [new Selection(editor.document.lineAt(0).range.start, editor.document.lineAt(0).range.end)];
        await moveStructure(1);
        assert.equal(editor.document.getText(editor.document.lineAt(0).range), 'let _0;');
        assert.equal(editor.document.getText(editor.document.lineAt(1).range), 'let _1;');
    });
    test('Multi line selection does not move', async () => {
        const editor = await resetDocument();
        editor.selections = [new Selection(editor.document.lineAt(0).range.start, editor.document.lineAt(1).range.end)];
        await moveStructure(1);
        assert.equal(editor.document.getText(editor.document.lineAt(0).range), 'let _0;');
        assert.equal(editor.document.getText(editor.document.lineAt(1).range), 'let _1;');
    });
    test('Second cursor ignored', async () => {
        const editor = await resetDocument();
        editor.selections = [
            new Selection(editor.document.lineAt(0).range.start, editor.document.lineAt(0).range.start),
            new Selection(editor.document.lineAt(2).range.start, editor.document.lineAt(2).range.start),
        ];
        await moveStructure(1);
        assert.equal(editor.document.getText(editor.document.lineAt(0).range), 'let _1;');
        assert.equal(editor.document.getText(editor.document.lineAt(1).range), 'let _0;');
        assert.equal(editor.document.getText(editor.document.lineAt(2).range), 'let _2;');
        assert.equal(editor.document.getText(editor.document.lineAt(3).range), 'let _3;');
    });
});

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
