import * as vscode from 'vscode';
import cfg from './cfg';

/**
* adapter class for interaction with vscode
* aliasing some properties; doing it via get to be able to always access fresh value
* @namespace
*
* @class Document
*/
class Document {

	// TODO упростить тут алиасы
	// т.к. если в св-ве у нас ссылка на оригинальный объект,с-во будет живым в любом случае;
	// т.е не обязательно использовать get. а вот если возвращаем результат вызова функции, когда создается новый объект или константа, другое дело
	static get editor(): vscode.TextEditor {
		return vscode.window.activeTextEditor;
	}
	static get getText() {
		return Document.editor.document.getText;
	}
	static get documentPath(): string {
		return vscode.window.activeTextEditor.document.fileName;
	}

	static get currentSelection(): vscode.Selection {
		return this.editor.selection;
	}


	static get workspaceFolderPath(): (string|undefined) {
		// return vscode.workspace.workspaceFolders[0].uri.fsPath;
		// because VSCode allows several equal root folders(workspaces), we need to check where are document resides every time
		const currentDocWorkspaceFolder = vscode.workspace.workspaceFolders.find(folder => this.documentPath.includes(folder.uri.fsPath));
		return currentDocWorkspaceFolder.uri.fsPath;
	}


	static async getInitialContent(ext: string): Promise<string> {
		if ( cfg.fileFormatsAllowedForTranfer
			&& cfg.fileFormatsAllowedForTranfer.includes(ext)
			&& !this.currentSelection.isEmpty
		) {
			const initialContent = this.editor.document.getText(this.currentSelection);
			if (initialContent) {
				await this.editor.edit(
					edit => { edit.delete(this.currentSelection); },
					{ undoStopAfter: false, undoStopBefore: false }
				);
				return initialContent;
			}
		}
		return ''; // to prevent node writeFile from writing 'undefined'
	}

	/**
	* gets UUID value if such is present in active editor line, corresponding to passed position. ATTENTION: only first comment from line is returned, so don't add more than one!
	*
	* @param {vscode.Position} currentPos
	* @returns {(string|null)} anchor comment UUID or null
	*/
	static getTextFromCurrentLine(): string {
		const line = this.editor.document.lineAt(this.currentSelection.anchor);
		if (line.isEmptyOrWhitespace) return null;
		else return line.text;
	}
}
export default Document;
