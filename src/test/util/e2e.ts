import { readdirSync } from 'fs';
import path from 'path';
import { Position, Range, Selection, TextEditor } from 'vscode';
import { SupportedLanguage } from './language';
import assert from 'assert';

type LanguageFixtureDetail = {
    extension: string;
    cursorPlaceholder: string;
};

export const languageFixtureDetails: Record<SupportedLanguage, LanguageFixtureDetail> = {
    bash: {
        extension: '.sh',
        cursorPlaceholder: '#cursor',
    },
    python: {
        extension: '.py',
        cursorPlaceholder: '#cursor',
    },
    css: {
        extension: '.css',
        cursorPlaceholder: '/*cursor*/',
    },
    html: {
        extension: '.html',
        cursorPlaceholder: '<!--cursor-->',
    },
    typescript: {
        extension: '.ts',
        cursorPlaceholder: '/*cursor*/',
    },
};

export function findFixtureFolders(language: SupportedLanguage) {
    return readdirSync(path.resolve(__dirname, '../../../testFixture', language), {
        withFileTypes: true,
    })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);
}

export async function goToCursorPlaceholder(editor: TextEditor, language: SupportedLanguage) {
    const cursorPlaceholder = languageFixtureDetails[language].cursorPlaceholder;

    for (let index = 0; index < editor.document.lineCount; index++) {
        const line = editor.document.lineAt(index).text;
        const cursorStartsAt = line.indexOf(cursorPlaceholder);
        if (cursorStartsAt < 0) {
            continue;
        }
        const cursorPosition = new Position(index, cursorStartsAt);
        await editor.edit((eb) => {
            eb.delete(
                new Range(
                    cursorPosition,
                    cursorPosition.with({
                        character: cursorPosition.character + cursorPlaceholder.length,
                    }),
                ),
            );
        });
        editor.selections = [new Selection(cursorPosition, cursorPosition)];
        return;
    }
    assert.fail(`could not find ${cursorPlaceholder} in ${editor.document.uri.toString()}`);
}
