import * as vscode from 'vscode';
import * as z from 'zod'

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('structural-motion.helloWorld', async () => {
		const editor = vscode.window.activeTextEditor;
		if (!editor)
			return;
		const result = await vscode.commands.executeCommand('vscode.executeSelectionRangeProvider', editor.document.uri, [editor.selection.active])
		let selectionRange: SelectionRange | undefined = parseSelectionRange(result);
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
		editor.selections = [new vscode.Selection(
			new vscode.Position(selectionRange.range.start.line, selectionRange.range.start.character),
			new vscode.Position(selectionRange.range.end.line, selectionRange.range.end.character),
		)];
	});

	context.subscriptions.push(disposable);
}

const Position$ = z.object({
	line: z.number(),
	character: z.number(),
});

const Range$ = z.object({
	start: Position$,
	end: Position$,
});

type Range = z.infer<typeof Range$>;
const BaseSelectionRange$ = z.object({
	range: Range$,
});

type SelectionRange = z.infer<typeof BaseSelectionRange$> & {
	parent?: SelectionRange;
};

const SelectionRange$: z.ZodType<SelectionRange> = BaseSelectionRange$.extend({
	parent: z.optional(z.lazy(() => SelectionRange$)),
})

const SelectionRangeResult$ = z.tuple([SelectionRange$]);

function parseSelectionRange(data: unknown): SelectionRange {
	return SelectionRangeResult$.parse(data)[0]; // TODO: what about if there are zero or many selection ranges?
}


function isFullLineSelection(range: Range, editor: vscode.TextEditor) {
	if (range.start.character !== 0) {
		return false;
	}
	const line = editor.document.lineAt(range.end.line);
	return (
		range.end.character === line.range.end.character
		||
		range.end.character === line.rangeIncludingLineBreak.end.character
	)
}

export function deactivate() { }