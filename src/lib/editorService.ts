import * as vscode from 'vscode';
import {
	FileChangeTracker,
	IChangeTracker,
	VscodeChangeTracker,
} from  './types';

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

	private terminal: vscode.Terminal = vscode.window.createTerminal('Typora');

	constructor(
		public changeTracker: FileChangeTracker,
	) {
		// this.terminal = vscode.window.createTerminal('Typora');
		this.changeTracker.init();
		// TODO // this.checkRequirements();
	}

	// checkRequirements() {
	// 	const isWin = ~require('os').platform().indexOf('win');
	// 	const where = isWin ? 'where' : 'whereis';
	// 	const spawn = require('child_process').spawn;
	// 	spawn(`${where} typora`, {encoding: 'utf8'})
	// 		.on('close', code => {
	// 			console.log('exit code : ' + code);
	// 		});
	// }

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
