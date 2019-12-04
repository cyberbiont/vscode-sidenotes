import * as vscode from 'vscode';
import { Minimatch } from 'minimatch';

export type OEditorUtils = {
	sources: {
		matchFiles: string, // GlobPattern
		excludeFiles: string, // GlobPattern
	}
}

// 🕮 6defb427-8d46-4c9b-af42-ccc4ffa4f6a0
export default class EditorUtils {
	private matchPattern;
	private excludePattern;

	constructor(
		public editor: vscode.TextEditor,
		public cfg: OEditorUtils
	) {
		this.matchPattern = new Minimatch(this.cfg.sources.matchFiles, { dot: true });
		this.excludePattern = new Minimatch(this.cfg.sources.excludeFiles, { dot: true, flipNegate: true });
	}

	getWorkspaceFolderPath = function(): string {
		//@bug 🕮 1a6740cd-a7a6-49a9-897c-f8ed877dea0f
		const currentWorkspaceFolder = vscode.workspace.workspaceFolders!.find( // already handle undefined case in app requirements check
			folder => this.editor.document.fileName.includes(folder.uri.fsPath)
		);
		return currentWorkspaceFolder!.uri.fsPath;

	}

	checkFileIsLegible = function({ showMessage = false }: { showMessage?: boolean } = {}): boolean {
		if (!this.getWorkspaceFolderPath()) {
			if (showMessage) vscode.window.showErrorMessage(
				`Sidenotes: ${this.editor.document.uri.fsPath}
				Files outside of a workspace cannot be annotated!`);
			return false;
		}

		if (
			!this.matchPattern.match(this.editor.document.uri.fsPath)
			|| this.excludePattern.match(this.editor.document.uri.fsPath)
		) {
			vscode.window.showErrorMessage(
				`Sidenotes:
				Files excluded by pattern in configuration settings cannot be annotated!`
			);
			return false;
		}

		return true;
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
		if (this.editor.selection.isEmpty) return '';

		const content = this.editor.document.getText(this.editor.selection);
		if (content) {
			await this.editor.edit(
				edit => { edit.delete(this.editor.selection); },
				{ undoStopAfter: false, undoStopBefore: false }
			);
		}
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
