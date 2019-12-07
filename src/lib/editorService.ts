import * as vscode from 'vscode';
import * as open from 'open';

import {
	FileChangeTracker,
	IChangeTracker,
} from  './types';

export interface IEditorService {
	changeTracker: IChangeTracker;
	open(path: string);
}

export class VscodeEditor implements IEditorService {
	constructor(
		public changeTracker: FileChangeTracker,
		private parentContainer
	) {
		this.changeTracker.init();
	}
	/**
	* opens sidenote document, associated with comment anchor in current line, creating comment and document if they don't exits
	* in new editor window
	*/
	async open(path: string, scheme: string = 'file'): Promise<vscode.TextEditor> {
		const URI = vscode.Uri.parse(`${scheme}:${path}`);
		//@old 🕮 <YL> ea2901bc-16b1-4153-8753-1daa685ca125.md

		return await vscode.workspace.openTextDocument(URI).then(
			doc => vscode.window.showTextDocument(doc, {
				viewColumn: vscode.ViewColumn.Beside,
				// 🕮 <YL> f94a2a43-584b-49fb-bf3b-1ae27b53079b.md
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

	// 🕮 <YL> 2b37aa7d-e5d4-4a4d-9cde-e8831f91e3c4.md
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
