import * as vscode from 'vscode';
import * as open from 'open';

import {
	FileChangeTracker,
	IChangeTracker,
	VscodeChangeTracker,
} from  './types';

export interface IEditorService {
	changeTracker: IChangeTracker;
	open(path: string);
}

export class VscodeEditor implements IEditorService {
	constructor(
		public changeTracker: VscodeChangeTracker,
	) {
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
			}
		);
	}
}

export class SystemDefaultEditor implements IEditorService {
	constructor(
		public changeTracker: FileChangeTracker,
		private opn = open
	) {
		this.changeTracker.init();
	}
	async open(path: string) {
		return await this.opn(path);
	}
}

export class TyporaEditor implements IEditorService {
	private terminal: vscode.Terminal = vscode.window.createTerminal('Sidenotes');

	constructor(
		public changeTracker: FileChangeTracker,
		private editor: vscode.TextEditor
	) {
		this.changeTracker.init();
	}

	// 🕮 2b37aa7d-e5d4-4a4d-9cde-e8831f91e3c4

	open(path: string): vscode.Terminal|false {
		try {
			this.terminal.sendText(`typora "${path}"`);
		} catch (e) {
			console.log(e);
			vscode.window.showErrorMessage(
				`Failed to open file ${path} in Typora`
			);
		}
		return this.terminal;
	}
}
