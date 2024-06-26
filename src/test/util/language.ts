import { TextEditor, commands } from 'vscode';
import { replaceAllText } from './text';

export const supportedLanguages = ['bash', 'python', 'css', 'html', 'typescript'] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

const languageWarmUpCodes: Record<string, string | undefined> = {
    bash: undefined, // bash seems to have no symbol support, so we can't wait for it to be ready
    python: 'ready_check=1',
    css: '.ready-check{color: bisque;}',
    html: '<div>ReadyCheck</div>',
    typescript: 'const readyCheck = 1;',
} satisfies Record<SupportedLanguage, string | undefined>;

export async function waitForLanguageServer(editor: TextEditor) {
    const languageWarmUpCode = languageWarmUpCodes[editor.document.languageId];

    if (languageWarmUpCode === undefined) {
        return;
    }

    await replaceAllText(editor, languageWarmUpCode);

    let result: unknown = undefined;

    while (!result) {
        // Wait for symbols, which means the language plugin has initialised
        result = await commands.executeCommand('vscode.executeDocumentSymbolProvider', editor.document.uri);
        await new Promise((r) => setTimeout(r, 300));
    }
}
