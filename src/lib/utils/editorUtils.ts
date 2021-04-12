import {
	workspace,
	window,
	commands,
	Selection,
	TextEditor,
	Range,
	TextLine,
} from 'vscode';
import { Minimatch, IMinimatch } from 'minimatch';

export type OEditorUtils = {
	worskspaceFilter: {
		include: string;
		exclude: string;
	};
	anchor: {
		comments: {
			affectNewlineSymbols: boolean;
		};
	};
};

// @bug 🕮 <cyberbiont> 72ef1c23-5ee7-4109-82ea-7d6b411bfff3.md
// 🕮 <cyberbiont> 6defb427-8d46-4c9b-af42-ccc4ffa4f6a0.md
export default class EditorUtils {
	private includePattern: IMinimatch;
	private excludePattern: IMinimatch;

	constructor(public editor: TextEditor, public cfg: OEditorUtils) {
		this.includePattern = new Minimatch(this.cfg.worskspaceFilter.include, {
			dot: true,
		});
		this.excludePattern = new Minimatch(this.cfg.worskspaceFilter.exclude, {
			dot: true,
			flipNegate: true,
		});
	}

	getWorkspaceFolderPath(): string {
		// @bug 🕮 <cyberbiont> 1a6740cd-a7a6-49a9-897c-f8ed877dea0f.md
		if (!workspace.workspaceFolders)
			throw new Error('Adding notes requires an open folder.');
		const currentWorkspaceFolder = workspace.workspaceFolders.find((folder) =>
			this.editor.document.fileName.includes(folder.uri.fsPath),
		);
		if (!currentWorkspaceFolder)
			throw new Error('Files outside a workspace folder cannot be aanotated.');
		return currentWorkspaceFolder.uri.fsPath;
	}

	checkFileIsLegible({
		showMessage = false,
	}: { showMessage?: boolean } = {}): boolean {
		if (!this.getWorkspaceFolderPath()) {
			if (showMessage)
				window.showWarningMessage(
					`Sidenotes: ${this.editor.document.uri.fsPath}
				Files outside of a workspace cannot be annotated!`,
				);
			return false;
		}

		if (
			!this.includePattern.match(this.editor.document.uri.fsPath) ||
			this.excludePattern.match(this.editor.document.uri.fsPath)
		) {
			if (showMessage)
				window.showWarningMessage(
					`Sidenotes: this file is excluded by glob pattern in configuration settings and can not be annotated!`,
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
	getTextLine(position = this.editor.selection.anchor): TextLine {
		return this.editor.document.lineAt(position);
	}

	extendRangeToFullLine(range: Range): Range {
		const line = this.getTextLine(range.start);
		return this.cfg.anchor.comments.affectNewlineSymbols
			? line.rangeIncludingLineBreak
			: line.range;
	}

	/**
	 * @returns {Promise<string>} current selection content
	 * @memberof EditorUtils
	 */
	async extractSelectionContent(): Promise<string> {
		let content: string;

		if (this.editor.selection.isEmpty) content = '';
		else {
			content = this.editor.document.getText(this.editor.selection);
			if (content) {
				await this.editor.edit(
					(edit) => {
						edit.delete(this.editor.selection);
					},
					{ undoStopAfter: false, undoStopBefore: false },
				);
			}
		}

		if (process.env.SIDENOTES_USE_CODE_FENCE)
			content = `\`\`\`${this.editor.document.languageId}\n${content}\n\`\`\``;
		return content;
	}

	async cycleEditors(): Promise<void> {
		// const firstEditor = this.editor;
		// const editors: string[] = [];
		console.log(workspace.textDocuments.length);
		let i = 0;
		do {
			// await cb();
			++i;
			commands.executeCommand('workbench.action.nextEditor');
		} while (i < workspace.textDocuments.length);
		// что-то толком не работает
	}

	async toggleComment(
		range: Range,
		editor: TextEditor = this.editor,
		{ useBlockComments = false }: { useBlockComments?: boolean } = {},
	): Promise<boolean> {
		try {
			const selection = new Selection(range.start, range.end);
			editor.selection = selection;
			if (useBlockComments) {
				await commands.executeCommand('editor.action.blockComment');
			} else {
				await commands.executeCommand('editor.action.commentLine');
			}
			return true;
		} catch (e) {
			return false;
		}
	}
}
