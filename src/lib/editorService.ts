import * as vscode from 'vscode';
import { IChangeTracker, VscodeChangeTracker, FileChangeTracker } from  './watcher';
import { ActiveEditorUtils } from './utils';

export interface IEditorService {
	changeTracker: IChangeTracker;
	open(path: string)
	// onDidSaveTextDocument(document: vscode.TextDocument): boolean
}

export class VscodeEditor implements IEditorService {
	constructor(public changeTracker: VscodeChangeTracker) {
		this.changeTracker = changeTracker;
		this.changeTracker.init();
	}
	/**
	* opens sidenote document, associated with comment anchor in current line, creating comment and document if they don't exits
	* in new editor window
	*/
	async open(path: string, scheme: string = 'file'): Promise<vscode.TextEditor> {
		const URI = vscode.Uri.parse(`${scheme}:${path}`);
		return await vscode.workspace.openTextDocument(URI).then(
			doc => vscode.window.showTextDocument(doc, {
				viewColumn: vscode.ViewColumn.Beside,
				// preserveFocus: true // otherwise decorationUpdate triggers on new editor and 'open' note doesn't get highlight
				// preview: true,
			}),
			error => {
				vscode.window.showErrorMessage(`<Failed to open file>. ${error.message}`);
				// return false;
			}
		);
	}
}

export class TyporaEditor implements IEditorService {

	terminal: vscode.Terminal;
	constructor(
		public changeTracker: FileChangeTracker,
		public activeEditorUtils: ActiveEditorUtils
	) {
		this.activeEditorUtils = activeEditorUtils;
		this.changeTracker = changeTracker;
		this.terminal = vscode.window.createTerminal('Typora');
		this.changeTracker.init();
	}

	open(path: string): vscode.Terminal|false {
		// TODO check file extension
		// if (this.activeEditorUtils.editor.document.languageId !== 'markdown') {
		// 	vscode.window.showInformationMessage(
		// 		`The file you are trying to open is not in Markdown format!`
		// 	);
		// 	return false;
		// } else {
		try {
			this.terminal.sendText(`typora "${path}"`);
			// vscode.window.showInformationMessage('Opening Typora');
		} catch (e) {
			console.log(e);
			vscode.window.showInformationMessage(
				`Typora can't handle this file!`
			);
		}
		// this.changeTracker.start(path);
		// }
		return this.terminal;
		// if (!cfg.externalEditors.typora.includes(this.ext)) {
		// 	throw new Error('this file extension is not supported');
		// };
	}


}
