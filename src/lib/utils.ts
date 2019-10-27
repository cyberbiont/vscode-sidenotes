import * as vscode from 'vscode';
import { IAnchor } from './anchorer';

export type IActiveEditorUtilsCfg = {
	fileFormatsAllowedForTransfer: string[]
}
export class ActiveEditorUtils {
	//active Editor manager
	editor: vscode.TextEditor
	constructor(
		context,
		public cfg: IActiveEditorUtilsCfg
	) {
		this.editor = vscode.window.activeTextEditor!;
		this.cfg = cfg;
		vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this, context.subscriptions);
	}

	onDidChangeActiveTextEditor(editor: vscode.TextEditor): void {
		this.editor = editor;
	}

	getWorkspaceFolderPath(): string {
		// because VSCode allows several equal root folders(workspaces), we need to check where current document resides every time
		const currentWorkspaceFolder = vscode.workspace.workspaceFolders!.find( // already handle undefined case in app requirements check
			folder => this.editor.document.fileName.includes(folder.uri.fsPath)
		);
		if (currentWorkspaceFolder) {
			return currentWorkspaceFolder.uri.fsPath;
		}
		else throw new Error();
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
			// this.cfg.fileFormatsAllowedForTransfer &&
			// this.cfg.fileFormatsAllowedForTransfer.includes(ext) &&
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
		return content; // to prevent node writeFile from writing 'undefined'
	}
}

export type IMarkerUtilsCfg = {
	marker: {
		salt: string,
		prefix: string
		template?: string
	}
}

import { IIdMaker } from './idMaker';
export class MarkerUtils {

	bareMarkerRegexString: string
	bareMarkerRegex: RegExp
	bareMarkerRegexNonG: RegExp

	constructor(
		public idMaker: IIdMaker,
		public cfg: IMarkerUtilsCfg
	) {
		this.idMaker = idMaker;
		this.cfg = cfg;
		this.bareMarkerRegexString = `${this.cfg.marker.salt}${this.idMaker.ID_REGEX_STRING}`;
		this.bareMarkerRegex = new RegExp(this.bareMarkerRegexString, 'g');
		this.bareMarkerRegexNonG = new RegExp(this.bareMarkerRegexString);
	}

	getIdFromMarker(marker: string): string {
		const match = marker.match(this.idMaker.ID_REGEX_STRING)!;
		return match[0];
	}

	getMarker(id: string): string { //get full marker to be written in document
		let marker: string;
		if (this.cfg.marker.template) {
			marker = this.cfg.marker.template
				.replace('%p', this.cfg.marker.prefix)
				.replace('%id', `${this.cfg.marker.salt}${id}`);
		} else {
			marker = `${this.cfg.marker.prefix}${this.cfg.marker.salt}${id}`;
		}
		return marker;
	}

	getPrefixLength() {
		return this.cfg.marker.prefix.length;
	}

	getPositionFromIndex(anchor: IAnchor, index: number): vscode.Position {
		return anchor.editor.document.positionAt(index);
	}

	getMarkerStartPosition(anchor: IAnchor) {
		const index = anchor.editor.document.getText().indexOf(anchor.marker);
		return this.getPositionFromIndex(anchor, index);
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

	getMarkerRange(
		anchor: IAnchor,
		start?: vscode.Position
	): vscode.Range {
		start = start ? start : this.getMarkerStartPosition(anchor);
		const end = start.translate({ characterDelta: anchor.marker.length });
		return new vscode.Range(start, end);
	}

}
