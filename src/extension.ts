import * as vscode from 'vscode';

//TODO someday when VSCode will support folding ranges, to make uuids fold
//TODO support other file formats beside Markdown, such as mind maps (no hover, open in external application, separate command with file extension prompt)
import cfg from './lib/cfg';
import Manager from './lib/manager';
import Sidenote from './lib/sidenote';

export function activate(context:vscode.ExtensionContext) {

	if (!vscode.workspace.workspaceFolders) throw new Error('Adding notes requires an open folder.');

	const manager = new Manager();
	manager._init();

	// open sidenote associated with anchor comment at current cursor position or creates comment and sidenote if they don't exist
	function annotate() {	manager.run(); }
	function deleteSidenote() { manager.delete(); }
	function pruneBroken() { manager.pruneBroken();	}
	function pruneEmpty() {	manager.pruneEmpty(); }
	function display() { manager._init(); }

	function temp() { manager.temp(); }

	vscode.window.onDidChangeActiveTextEditor(manager.onEditorChange, manager, context.subscriptions);
	vscode.workspace.onDidSaveTextDocument(manager.onDocumentSave, manager, context.subscriptions);
	// vscode.workspace.onDidChangeTextDocument(manager.onDocumentChange, manager, context.subscriptions);
	// on fs change (manager.onFileChange)

	context.subscriptions.push(
		vscode.commands.registerCommand('sidenotes.annotate', annotate),
		vscode.commands.registerCommand('sidenotes.display', display),
		vscode.commands.registerCommand('sidenotes.delete', deleteSidenote),
		vscode.commands.registerCommand('sidenotes.pruneBroken', pruneBroken),
		vscode.commands.registerCommand('sidenotes.pruneEmpty', pruneEmpty),
		vscode.commands.registerCommand('sidenotes.temp', temp)
	);
}

export function deactivate() {
	this._subscriptions.dispose();
	// console.log('Deactivating sidenotes')
}
