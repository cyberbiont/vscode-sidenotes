import * as vscode from 'vscode';
import { Minimatch, IMinimatch } from 'minimatch';

export type OEditorUtils = {
	filter: {
		includePattern: string,
		excludePattern: string
	},
	anchor: {
		comments: {
			affectNewlineSymbols: boolean
		}
	}
}

//@bug 🕮 <YL> 72ef1c23-5ee7-4109-82ea-7d6b411bfff3.md
// 🕮 <YL> 6defb427-8d46-4c9b-af42-ccc4ffa4f6a0.md
export default class EditorUtils {
	private includePattern: IMinimatch;
	private excludePattern: IMinimatch;

	constructor(
		public editor: vscode.TextEditor,
		public cfg: OEditorUtils
	) {
		this.includePattern = new Minimatch(this.cfg.filter.includePattern, { dot: true });
		this.excludePattern = new Minimatch(this.cfg.filter.excludePattern, { dot: true, flipNegate: true });
	}

	getWorkspaceFolderPath(this: EditorUtils): string {
		//@bug 🕮 <YL> 1a6740cd-a7a6-49a9-897c-f8ed877dea0f.md
		const currentWorkspaceFolder = vscode.workspace.workspaceFolders!.find(
			folder => this.editor.document.fileName.includes(folder.uri.fsPath)
		);
		return currentWorkspaceFolder!.uri.fsPath;
	}

	checkFileIsLegible(this: EditorUtils, { showMessage = false }: { showMessage?: boolean } = {}): boolean {
		if (!this.getWorkspaceFolderPath()) {
			if (showMessage) vscode.window.showWarningMessage(
				`Sidenotes: ${this.editor.document.uri.fsPath}
				Files outside of a workspace cannot be annotated!`);
			return false;
		}

		if (
			!this.includePattern.match(this.editor.document.uri.fsPath)
			|| this.excludePattern.match(this.editor.document.uri.fsPath)
		) {
			if (showMessage) vscode.window.showWarningMessage(
				`Sidenotes: this file is excluded by glob pattern in configuration settings and can not be annotated!`
			);
			return false;
		}

		return true;
	}

	/**
	 * returns textLine based on position, by default returns current textLine
	 *
	 * @param {*} [position=this.editor.selection.anchor]
	 * @returns {vscode.TextLine}
	 * @memberof ActiveEditorUtils
	 */
	getTextLine(this: EditorUtils, position = this.editor.selection.anchor): vscode.TextLine {
		return this.editor.document.lineAt(position);
	}

	extendRangeToFullLine(range: vscode.Range): vscode.Range {
		const line = this.getTextLine(range.start);
		return this.cfg.anchor.comments.affectNewlineSymbols ? line.rangeIncludingLineBreak : line.range;
	}

	/**
	 * @returns {Promise<string>} current selection content
	 * @memberof EditorUtils
	 */
	async extractSelectionContent(this: EditorUtils): Promise<string> {
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

	async cycleEditors(cb) {
		// const firstEditor = this.editor;
		// const editors: string[] = [];
		console.log(vscode.workspace.textDocuments.length);
		let i = 0;
		do {
			// await cb();
			++i;
			vscode.commands.executeCommand('workbench.action.nextEditor');
		} while (i < vscode.workspace.textDocuments.length);
		//что-то толком не работает
	}

	async toggleComment(
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
