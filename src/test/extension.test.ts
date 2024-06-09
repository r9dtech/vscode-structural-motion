import * as assert from 'assert';
import { readFileSync } from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
	test('Sample test', async () => {
		const filePath = path.resolve(__dirname, '../../testFixture', 'multi-line-array.ts');
		const originalContent = readFileSync(filePath, { encoding: 'utf-8' });
		const editor = await openFile(filePath);

		const position = editor.document.lineAt(1).range.end;
		editor.selections = [new vscode.Selection(position, position)];
		await vscode.commands.executeCommand('structural-motion.moveStructureUp');

		const content = editor.document.getText();
		const actual = content.split(`//---\n`, 2)[0];
		const expected = originalContent.split(`//---\n`, 2)[1];
		assert.equal(actual, expected);
	});
});

async function openFile(filePath: string): Promise<vscode.TextEditor> {
	const document = await vscode.workspace.openTextDocument(filePath);
	
	await vscode.window.showTextDocument(document);

	const editor = vscode.window.activeTextEditor;

	if (!editor) {
		assert.fail('Editor did not open');
	}
	return editor;
}
