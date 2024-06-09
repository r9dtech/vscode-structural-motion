import * as assert from 'assert';
import { readFileSync, readdirSync } from 'fs';
import * as path from 'path';

import * as vscode from 'vscode';

const tsFixtureFolders = readdirSync(path.resolve(__dirname, '../../testFixture/ts'), { withFileTypes: true })
	.filter(dirent => dirent.isDirectory())
	.map(dirent => dirent.name);

suite('Extension Test Suite', () => {
	tsFixtureFolders.forEach(tsFixtureFolder => {
		test(`.ts fixture: ${tsFixtureFolder}`, async () => {
			const fixturePath = path.resolve(__dirname, '../../testFixture', 'ts' , tsFixtureFolder);

			const expectedResult = readFileSync(path.join(fixturePath, 'result.ts'), { encoding: 'utf-8' });

			const editor = await openFile(path.join(fixturePath, 'before.ts'));

			const position = editor.document.lineAt(1).range.end;
			editor.selections = [new vscode.Selection(position, position)];
			await vscode.commands.executeCommand('structural-motion.moveStructureUp');

			const content = editor.document.getText();
		
			assert.equal(content, expectedResult);
		});
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
