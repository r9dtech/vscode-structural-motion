import * as vscode from 'vscode';
import * as z from 'zod'

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('structural-motion.helloWorld', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		const result = await vscode.commands.executeCommand('vscode.executeSelectionRangeProvider', editor.document.uri, [editor.selection.active])
		let selectionRange: vscode.SelectionRange | undefined = parseSelectionRange(result);
		while (selectionRange) {
			vscode.window.showInformationMessage(JSON.stringify(selectionRange.range));
			if (isFullLineSelection(selectionRange.range, editor)) {
				break;
			}
			selectionRange = selectionRange.parent;
		}
		if (!selectionRange) {
			return;
		}
		editor.selections = [new vscode.Selection(selectionRange.range.start, selectionRange.range.end)];
	});

	context.subscriptions.push(disposable);
}

const Position$ = z.object({
	line: z.number(),
	character: z.number(),
}).transform(p => new vscode.Position(p.line, p.character));


const BaseSelectionRange$ = z.object({
	range: z.object({
		start: Position$,
		end: Position$,
	}).transform(r => new vscode.Range(r.start, r.end)),
});

type SelectionRangeInput = z.input<typeof BaseSelectionRange$> & {
	parent?: SelectionRangeInput;
};

const SelectionRange$: z.ZodType<vscode.SelectionRange, z.ZodTypeDef, SelectionRangeInput> = BaseSelectionRange$.extend({
	parent: z.optional(z.lazy(() => SelectionRange$)),
}).transform(sr=>new vscode.SelectionRange(sr.range, sr.parent));

const SelectionRangeResult$ = z.tuple([SelectionRange$]);

function parseSelectionRange(data: unknown): vscode.SelectionRange {
	return SelectionRangeResult$.parse(data)[0]; // TODO: what about if there are zero or many selection ranges?
}

function isFullLineSelection(range: vscode.Range, editor: vscode.TextEditor) {
	return (
		range.contains(editor.document.lineAt(range.start.line).range)
		&&
		range.contains(editor.document.lineAt(range.end.line).range)
	);
}

export function deactivate() { }