import {
	Terminal,
	TextEditor,
	Uri,
	ViewColumn,
	window,
	workspace,
} from 'vscode';
import open from 'open';
import { ChangeTracker, FileChangeTracker } from './changeTracker';

export interface EditorService {
	changeTracker: ChangeTracker;
	open(path: string | Uri, extension?: string);
}

export class VscodeEditorService implements EditorService {
	constructor(public changeTracker: FileChangeTracker) {
		this.changeTracker.init();
	}

	/**
	 * opens sidenote document, associated with comment anchor in current line, creating comment and document if they don't exits
	 * in new editor window
	 */
	async open(uri: Uri): Promise<TextEditor> {
		// @old 🕮 <YL> ea2901bc-16b1-4153-8753-1daa685ca125.md

		return workspace.openTextDocument(uri).then(
			async doc => {
				return window.showTextDocument(doc, {
					viewColumn: ViewColumn.Beside,
					// 🕮 <YL> f94a2a43-584b-49fb-bf3b-1ae27b53079b.md
				});
			},
			error => {
				window.showErrorMessage(`<Failed to open file>. ${error.message}`);
			},
		);
	}
}

export class SystemDefaultEditorService implements EditorService {
	constructor(public changeTracker: FileChangeTracker, public opn = open) {
		this.changeTracker.init();
	}

	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	async open(path: string) {
		return this.opn(path);
	}
}

export class ShellEditorService implements EditorService {
	private terminal: Terminal;
	// 🕮 <YL> ed1e948e-8c99-4b59-adba-fef501653dda.md

	constructor(public changeTracker: FileChangeTracker) {
		this.changeTracker.init();
	}

	private getExecutableName(extension: string): string {
		switch (extension) {
			case '.cson':
				return 'Boost note';
			case '.md':
			case '.markdown':
			default:
				return 'typora';
		}
	}

	// 🕮 <YL> 2b37aa7d-e5d4-4a4d-9cde-e8831f91e3c4.md
	open(path: string, extension: string): Terminal | false {
		const executableName = this.getExecutableName(extension);

		if (!this.terminal) this.terminal = window.createTerminal('Sidenotes');

		try {
			this.terminal.sendText(`& "${executableName}" "${path}"`);
		} catch (e) {
			console.log(e);
			window.showErrorMessage(
				`Failed to open file ${path} in ${executableName}. Make sure that application executable is in your PATH`,
			);
		}
		return this.terminal;
	}
}
