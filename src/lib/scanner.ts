import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import {
	IAnchor,
	MarkerUtils,
	ActiveEditorUtils
} from './types';

export interface IScanResultData {
	id: string,
	markerStartPos?: vscode.Position
}

export default class Scanner {
	constructor(
		public markerUtils: MarkerUtils,
		public activeEditorUtils: ActiveEditorUtils
	) {}
	// we should convert indexes to position at once,
	// otherwise it will differ depending on was line matched or whole document
	getIdsFromText(
		text: string = this.activeEditorUtils.editor.document.getText()
	): IScanResultData[]|undefined {
		const match = text.match(this.markerUtils.bareMarkerRegex);
		// предусматриваем в дальнейшем возможность передачи index вместе с id, когда перейдем на метод MatchAll
		const result: IScanResultData[] = [];
		if (match) {
			match.forEach(el => result.push({
				id: this.markerUtils.getIdFromMarker(el)
			}));
			return result;
		} else {
			return undefined;
		}
	}

	rescanLineForMarkerRange(anchor: IAnchor, positionHint: vscode.Position): vscode.Range {
		const line = this.activeEditorUtils.getTextLine(positionHint);
		let scanResult = this.scanLine(line)!;
		return this.markerUtils.getMarkerRange(anchor, scanResult.markerStartPos!);
	}

	scanLine(line: vscode.TextLine): IScanResultData|undefined {
		if (line.isEmptyOrWhitespace) return undefined;
		const match = line.text.match(this.markerUtils.bareMarkerRegexNonG);
		if (match && match.index) {
			return {
				id: this.markerUtils.getIdFromMarker(match[0]),
				markerStartPos: line.range.start.translate({ characterDelta: match.index - this.markerUtils.getPrefixLength() })
			}
		}
	}

	getFromCurrentLine(): IScanResultData|undefined {
		if (!this.activeEditorUtils.getWorkspaceFolderPath()) {
			throw new Error('Files outside of a workspace cannot be annotated.');
		}
		const line = this.activeEditorUtils.getTextLine();

		const scanResult = this.scanLine(line);
		if (scanResult) return scanResult;
		return undefined;
		//TODO support several notes in one line, open depending on cursor position
	}

	async readDirectoryRecursive(dir: string): Promise<string[]> {
		const dirents: fs.Dirent[] = await fs.promises.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(
			dirents.map(async dirent => {
				const fullPath = path.resolve(dir, dirent.name);
				return dirent.isDirectory() ? this.readDirectoryRecursive(fullPath) : fullPath;
			})
		);
		return Array.prototype.concat(...files);
		// return files.flat();
	}
	// TODO вынести все что связано с файлами из сканера и StorageService в fsUtils
	async scanCurrentWorkspace() {

		const readFiles = async (filePaths: string[]) => {
			return Promise.all(
				filePaths.map(filePath => fs.promises.readFile(filePath, { encoding: 'utf-8' }) as Promise<string>) // returns string when encoding is sepecifie, see fs docs
			);
		}

		const scanContents = (contents: string[]) => {
			const fileMatches = contents.map(content => this.getIdsFromText(content))
				.filter(scanData => scanData !== undefined) as unknown as IScanResultData[]; // remove undefined values
				// https://codereview.stackexchange.com/questions/135363/filtering-undefined-elements-out-of-an-array
			const flat = Array.prototype.concat(...fileMatches);
			const idsOnly: string[] = flat.map(scanData => scanData.id);
			return idsOnly;
			// return files.flat();
		};

		const workspace = this.activeEditorUtils.getWorkspaceFolderPath();
		const filePaths = await this.readDirectoryRecursive(workspace);
		const contents = await readFiles(filePaths);
		const ids = scanContents(contents);
		const uniqueIds = new Set(ids);
		return uniqueIds;
	}

	// async scanCurrentSidenotesDir() {
	// 	const workspace = this.activeEditorUtils.getWorkspaceFolderPath();
	// 	const filePaths = await this.readDirectoryRecursive(workspace);
	// }



}
