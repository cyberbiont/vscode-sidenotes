import * as vscode from 'vscode';

export type OEditorUtils = {
	sources: {
		fileFormatsAllowedForTransfer: string[] //TODO
	}
}

// 🕮 6defb427-8d46-4c9b-af42-ccc4ffa4f6a0
export default class EditorUtils {
	constructor(
		public editor: vscode.TextEditor,
		public cfg: OEditorUtils
	) {}

	getWorkspaceFolderPath = function(): string {
		// because VSCode allows several equal root folders(workspaces), we need to check where current document resides every time
		// @old 🕮 c6ba287f-9876-4818-964a-d6963bd13248

		const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(this.editor.document.uri!)!
		if (currentWorkspaceFolder) return currentWorkspaceFolder.uri.fsPath;
		else throw new Error('Files outside of a workspace cannot be annotated');
	}

	/**
	 * returns textLine based on position, by default returns current tetLine
	 *
	 * @param {*} [position=this.editor.selection.anchor]
	 * @returns {vscode.TextLine}
	 * @memberof ActiveEditorUtils
	 */
	getTextLine = function(position = this.editor.selection.anchor): vscode.TextLine {
		return this.editor.document.lineAt(position);
	}

	/**
	 * @returns {Promise<string>} current selection content
	 * @memberof EditorUtils
	 */
	extractSelectionContent = async function(): Promise<string> {
		// if (
			// this.cfg.sources.fileFormatsAllowedForTransfer &&
			// this.cfg.sources.fileFormatsAllowedForTransfer.includes(ext) && !this.editor.selection.isEmpty
		// ) {
			const content = this.editor.document.getText(this.editor.selection);
			if (content) {
				await this.editor.edit(
					edit => { edit.delete(this.editor.selection); },
					{ undoStopAfter: false, undoStopBefore: false }
				);
				// return content;
			}
		// }
		return content;
	}

	toggleComment = async function(
		range: vscode.Range,
		editor: vscode.TextEditor = this.editor,
		{ useBlockComments = false}: { useBlockComments?: boolean } = {}
	): Promise<boolean> {
		try {
			const selection = new vscode.Selection(range.start, range.end);
			editor.selection = selection;
			if (useBlockComments) {
				await vscode.commands.executeCommand('editor.action.blockComment');
			} else {
				await vscode.commands.executeCommand('editor.action.commentLine');
			}
			return true;
		} catch (e) {
			return false;
		}
	}
}
