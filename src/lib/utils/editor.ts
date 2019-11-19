import * as vscode from 'vscode';

export type OEditorUtils = {
	sources: {
		fileFormatsAllowedForTransfer: string[] //TODO
	}
}

export class EditorUtils {
	//active Editor manager
	editor: vscode.TextEditor
	constructor(
		private cfg: OEditorUtils
	) {
		this.editor = vscode.window.activeTextEditor!;
		// vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this, context.subscriptions);
	}

	onEditorChange(editor: vscode.TextEditor): void {
		this.editor = editor;
	}

	getWorkspaceFolderPath(): string {
		// because VSCode allows several equal root folders(workspaces), we need to check where current document resides every time
		// @old 🕮 c6ba287f-9876-4818-964a-d6963bd13248

		const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(
			this.editor.document.uri!
		)!
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
	getTextLine(position = this.editor.selection.anchor): vscode.TextLine {
		return this.editor.document.lineAt(position);
	}

	/**
	 * @returns {Promise<string>} current selection content
	 * @memberof EditorUtils
	 */
	async extractSelectionContent(): Promise<string> {
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
}
