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
		const line = this.editor.document.lineAt(position);
		// if (line.isEmptyOrWhitespace) return null;
		// else return line.text;
		return line;
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
			// prefix: string
			// template?: string
		}
	}
}

import { IIdMaker } from './idMaker';
export class MarkerUtils {

	// bareMarkerRegexString: string
	// bareMarkerRegex: RegExp
	// bareMarkerRegexNonG: RegExp

	constructor(
		private idMaker: IIdMaker,
		private cfg: OMarkerUtils
	) {
		// this.bareMarkerSymbolsCount = this.idMaker.symbolsCount;
		// this.bareMarkerRegexString = `${this.cfg.anchor.marker.salt}${this.idMaker.ID_REGEX_STRING}`;
		// this.bareMarkerRegex = new RegExp(this.bareMarkerRegexString, 'g');
		// this.bareMarkerRegexNonG = new RegExp(this.bareMarkerRegexString);
	}
	public BARE_MARKER_SYMBOLS_COUNT: number = this.cfg.anchor.marker.salt.length + this.idMaker.symbolsCount;
	public bareMarkerRegexString: string = `${this.cfg.anchor.marker.salt}${this.idMaker.ID_REGEX_STRING}`;
	public bareMarkerRegex: RegExp = new RegExp(this.bareMarkerRegexString, 'g');
	public bareMarkerRegexNonG: RegExp = new RegExp(this.bareMarkerRegexString);


	getIdFromMarker(marker: string): string {
		const match = marker.match(this.idMaker.ID_REGEX_STRING)!;
		return match[0];
	}

	getMarker(id: string): string { //get full marker to be written in document
		let marker: string;
		// if (this.cfg.marker.template) {
		// 	marker = this.cfg.marker.template
		// 		.replace('%p', this.cfg.marker.prefix)
		// 		.replace('%id', `${this.cfg.marker.salt}${id}`);
		// } else {
			// marker = `${this.cfg.marker.prefix}${this.cfg.marker.salt}${id}`;
			marker = `${this.cfg.anchor.marker.salt}${id}`;
		// }
		return marker;
	}

	// getPrefixLength(): number {
	// 	return this.cfg.marker.prefix;
	// }

	getPositionFromIndex(editor: vscode.TextEditor, index: number): vscode.Position {
		return editor.document.positionAt(index);
	}

	getMarkerStartPosition(anchor: IAnchor) {
		const index = anchor.editor.document.getText().indexOf(anchor.marker);
		return this.getPositionFromIndex(anchor.editor, index);
		// с помощью обычного match можно получить ИЛИ все маркеры, или маркер + индекс,
		// поэтому в inventorize получаем все маркеры, а тут дополнительно ищем индекс через indexof
		// мы не можем привязывать Range коммента включая символы комментария, потом что для разных языков они могут быть разными
	}

	// getMarkerStartPosFromLine(line: vscode.TextLine) {
	// 	//функция должна пересканировать строчку и вернуть позицию маркера
	// 	if (line.isEmptyOrWhitespace) return undefined;
	// 	const match = line.text.match(this.bareMarkerRegexNonG);
	// 	if (match) return line.range.start.translate({ characterDelta: match.index });
	// }
	// TODO duiambiguate commentedMarker, bareMarker

	// getMarkerRange(anchor: IAnchor,start: vscode.Position): vscode.Range
	// getMarkerRange(anchor: IAnchor): vscode.Range[] {
	// 	start = start ? start : this.getMarkerStartPosition(anchor);
	// 	const end = start.translate({ characterDelta: anchor.marker.length });
	// 	return new vscode.Range(start, end);
	// }

	getMarkerRangeFromStartPosition(marker, start: vscode.Position): vscode.Range {
		return new vscode.Range(
			start,
			start.translate({ characterDelta: marker.length })
		);
	}

	getMarkerRange(anchor: IAnchor, start: vscode.Position): vscode.Range
	getMarkerRange(anchor: IAnchor): vscode.Range[]
	getMarkerRange(anchor: IAnchor, start?: vscode.Position) {
		if (start) return this.getMarkerRangeFromStartPosition(anchor.marker, start);
		else {
			const starts = this.getAllMarkerStartPositions(anchor);
			return starts.map(start => this.getMarkerRangeFromStartPosition(anchor.marker, start));
		}
	}
	getAllMarkerStartPositions(anchor: IAnchor): vscode.Position[] {

		const text = anchor.editor.document.getText();
		const indexes: number[] = [];

		function find(fromIndex = 0) {
			let index = text.indexOf(anchor.marker, fromIndex);
			if (~index) {
				indexes.push(index);
				find(++index);
			}
			else return;
		}
		find();

		const positions = indexes.map(index => this.getPositionFromIndex(anchor.editor, index));

		return positions;
	}


}
