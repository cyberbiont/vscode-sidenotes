import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import {
	ActiveEditorUtils,
	IAnchor,
	MarkerUtils,
} from './types';

export interface IScanData {
	id: string;
	ranges: vscode.Range[];
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
	): IScanData[]|undefined {

		const result: {
			[marker: string]: Set<number>
		} = Object.create(null);

		let match;
		let regex = this.markerUtils.bareMarkerRegex;
		//TODO use matchAll?
		while ((match = regex.exec(text)) !== null) {
			let [ marker ] = match; // = match[0]
			let { index } = match; // = match.index
			// console.log(marker, index);

			if (result[marker]) result[marker].add(index);
			else result[marker] = new Set([index]);
		}
		const entries = Object.entries(result);
		if (entries.length === 0) return undefined;
    	else return entries.map(entry => {
			let [marker, positions] = entry;

			return {
				id: this.markerUtils.getIdFromMarker(marker),
				// TODO добавить функцию вторым аргументом вместо map
				ranges: Array.from(positions).map(index => {
					const position = this.activeEditorUtils.editor.document.positionAt(index);

					const range = this.markerUtils.getMarkerRangeFromStartPosition(
						marker,
						position
					);
					return range;
				})
			};
		});
	}

	// rescanLineForMarkerRange(anchor: IAnchor, position: vscode.Position): IScanData {
	// 	const line = this.activeEditorUtils.getTextLine(position);
	// 	return this.scanLine(line)!;
	// }

	scanLine(line: vscode.TextLine = this.activeEditorUtils.getTextLine()): IScanData|undefined {

		if (line.isEmptyOrWhitespace) return undefined;
		const match = line.text.match(this.markerUtils.bareMarkerRegexNonG);

		if (match) {
			const [ marker ] = match;
			const { index } = match;

			const id = this.markerUtils.getIdFromMarker(marker);
			const position = line.range.start.translate({
				characterDelta:index
				// this.markerUtils.getPrefixLength()
			});
			const range = this.markerUtils.getMarkerRangeFromStartPosition(marker, position);
			// return range;
			return {
				id,
				ranges: [range]
			}
		}
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
				.filter(scanData => scanData !== undefined) as unknown as IScanData[]; // remove undefined values
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
