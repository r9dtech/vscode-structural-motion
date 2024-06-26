import { readdirSync } from 'fs';
import path from 'path';
import { Position, Range, Selection, TextEditor } from 'vscode';
import { Language } from './language-utils';
import assert from 'assert';

export function findFixtureFolders(language: { name: string; extension: string; cursorPlaceholder: string }) {
    return readdirSync(path.resolve(__dirname, '../../testFixture', language.name), {
        withFileTypes: true,
    })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
}

export async function goToCursorPlaceholder(editor: TextEditor, language: Language) {
    for (let index = 0; index < editor.document.lineCount; index++) {
        const line = editor.document.lineAt(index).text;
        const cursorStartsAt = line.indexOf(language.cursorPlaceholder);
        if (cursorStartsAt >= 0) {
            const cursorPosition = new Position(index, cursorStartsAt);
            await editor.edit((eb) => {
                eb.delete(
                    new Range(
                        cursorPosition,
                        cursorPosition.with({
                            character: cursorPosition.character + language.cursorPlaceholder.length,
                        }),
                    ),
                );
            });
            editor.selections = [new Selection(cursorPosition, cursorPosition)];
            return;
        }
    }
    assert.fail(`could not find ${language.cursorPlaceholder} in ${editor.document.uri.toString()}`);
}
