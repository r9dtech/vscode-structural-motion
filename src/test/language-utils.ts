import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { openReusableTextDocument } from './text-document-util';
import { commands } from 'vscode';

export type Language = {
    name: string;
    extension: string;
    cursorPlaceholder: string;
};

export const languages: Language[] = [
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

export async function waitForLanguageServer(language: Language) {
    const warmUpFile = path.resolve(__dirname, '../../testFixture', language.name, `ready${language.extension}`);

    if (!existsSync(warmUpFile)) {
        return;
    }

    const editor = await openReusableTextDocument(language.name, readFileSync(warmUpFile, { encoding: 'utf8' }));

    let result: unknown = undefined;

    while (!result) {
        // Wait for symbols, which means the language plugin has initialised
        result = await commands.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
        await new Promise((r) => setTimeout(r, 300));
    }
}
