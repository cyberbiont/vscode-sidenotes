import * as vscode from 'vscode';
import { IAnchor } from './types';

export type OActiveEditorUtils = {
	sources: {
		fileFormatsAllowedForTransfer: string[] //TODO
	}
}

export class ActiveEditorUtils {
	//active Editor manager
	editor: vscode.TextEditor
	constructor(
		private cfg: OActiveEditorUtils
	) {
		this.editor = vscode.window.activeTextEditor!;
		// vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this, context.subscriptions);
	}

	onDidChangeActiveTextEditor(editor: vscode.TextEditor): void {
		this.editor = editor;
	}

	getWorkspaceFolderPath(): string {
		// because VSCode allows several equal root folders(workspaces), we need to check where current document resides every time

		// const currentWorkspaceFolder = vscode.workspace.workspaceFolders!.find( // already handle undefined case in app requirements check
		// 	folder => this.editor.document.fileName.includes(folder.uri.fsPath)
		// );
		const currentWorkspaceFolder = vscode.workspace.getWorkspaceFolder(
			this.editor.document.uri!
		)!
		if (currentWorkspaceFolder) {
			return currentWorkspaceFolder.uri.fsPath;
		}
		else throw new Error('Files outside of a workspace cannot be annotated');
	}

	// returns textLine based on position, by default returns current tetLine
	getTextLine(position = this.editor.selection.anchor): vscode.TextLine {
		return this.editor.document.lineAt(position);
	}

	async extractSelectionContent(): Promise<string> {
		// if (
			// this.cfg.sources.fileFormatsAllowedForTransfer &&
			// this.cfg.sources.fileFormatsAllowedForTransfer.includes(ext) &&
			// !this.editor.selection.isEmpty
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

export type OMarkerUtils = {
	anchor: {
		marker: {
			salt: string,
			prefix: string | false,
			template?: string,
		}
	}
}

import { IIdMaker } from './idMaker';
export class MarkerUtils {
	constructor(
		private idMaker: IIdMaker,
		private cfg: OMarkerUtils
	) {}

	public BARE_MARKER_SYMBOLS_COUNT: number =
		this.cfg.anchor.marker.salt.length + this.idMaker.symbolsCount;
	public bareMarkerRegexString: string = `${this.cfg.anchor.marker.salt}${this.idMaker.ID_REGEX_STRING}`;
	public bareMarkerRegex: RegExp = new RegExp(
		this.bareMarkerRegexString,
		'g'
	);
	public bareMarkerRegexNonG: RegExp = new RegExp(
		this.bareMarkerRegexString
	);

	getIdFromMarker(marker: string): string {
		const [match] = marker.match(this.idMaker.ID_REGEX_STRING)!;
		return match;
	}

	getMarker(id: string): string {
		// get full marker to be written in document
		// template 🕮 7ce3c26f-8b5e-4ef5-babf-fab8100f6d6c
		return `${this.cfg.anchor.marker.prefix}${this.cfg.anchor.marker.salt}${id}`;
	}

	getPositionFromIndex(
		editor: vscode.TextEditor,
		index: number
	): vscode.Position {
		return editor.document.positionAt(index);
	}

	// @outdated 🕮 a96faaf1-b199-43b1-a8f1-aa66cd669e27

	// getMarkerRange(anchor: IAnchor,start: vscode.Position): vscode.Range;
	// getMarkerRange(anchor: IAnchor): vscode.Range[];
	getMarkerRange(anchor: IAnchor, start: vscode.Position): vscode.Range {
		// if (start)
			return this.getMarkerRangeFromStartPosition(
				anchor.marker,
				start
			);
		// else {
		// 	const starts = this.getAllMarkerStartPositions(anchor);
		// 	return starts.map(start =>
		// 		this.getMarkerRangeFromStartPosition(
		// 			anchor.marker,
		// 			start
		// 		)
		// 	);
		// }
	}

	getMarkerRangeFromStartPosition(
		marker: string,
		start: vscode.Position
	): vscode.Range {
		return new vscode.Range(
			start,
			start.translate({ characterDelta: marker.length })
		);
	}

	// getAllMarkerStartPositions(anchor: IAnchor): vscode.Position[] {
	// 	const text = anchor.editor.document.getText();
	// 	const indexes: number[] = [];

	// 	function find(fromIndex = 0) {
	// 		let index = text.indexOf(anchor.marker, fromIndex);
	// 		if (~index) {
	// 			indexes.push(index);
	// 			find(++index);
	// 		} else return;
	// 	}
	// 	find();

	// 	const positions = indexes.map(index =>
	// 		this.getPositionFromIndex(anchor.editor, index)
	// 	);

	// 	return positions;
	// }
}
