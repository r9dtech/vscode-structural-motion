import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('structural-motion.helloWorld', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor) 
			return;
		const result = await vscode.commands.executeCommand('vscode.executeSelectionRangeProvider', editor.document.uri, [editor.selection.active])
		vscode.window.showInformationMessage(JSON.stringify(result));
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
