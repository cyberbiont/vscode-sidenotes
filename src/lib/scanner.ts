import * as vscode from 'vscode';

import {
	EditorUtils,
	IAnchor,
	MarkerUtils,
} from './types';

export interface IScanData {
	id: string;
	ranges: vscode.Range[];
}

export default class Scanner {
	constructor(
		private editor: vscode.TextEditor, //TODO narrow class to actual editor
		private utils: EditorUtils & MarkerUtils,
	) {}

	getIdsFromText(
		text: string = this.editor.document.getText()
	): IScanData[]|undefined {

		const result: {
			[marker: string]: Set<number>
		} = Object.create(null);

		let match;
		let regex = this.utils.bareMarkerRegex;

		while ((match = regex.exec(text)) !== null) {
			let [ marker ] = match; // = match[0]
			let { index } = match; // = match.index

			if (result[marker]) result[marker].add(index);
			else result[marker] = new Set([index]);
		}
		const entries = Object.entries(result);
		if (entries.length === 0) return undefined;
    	else return entries.map(entry => {
			let [marker, positions] = entry;

			return {
				id: this.utils.getIdFromMarker(marker),
				ranges: Array.from(positions, index => {
					const position = this.editor.document.positionAt(index);

					const range = this.utils.getMarkerRange(
						marker,
						position
					);
					return range;
				})
			};
		});
	}

	scanLine(line: vscode.TextLine = this.utils.getTextLine()): IScanData|undefined {
		if (line.isEmptyOrWhitespace) return undefined;
		const match = line.text.match(this.utils.bareMarkerRegexNonG);

		if (match) {
			const [ marker ] = match;
			const { index } = match;

			const id = this.utils.getIdFromMarker(marker);
			const position = line.range.start.translate({ characterDelta:index });
			const range = this.utils.getMarkerRange(marker, position);

			return {
				id,
				ranges: [range]
			}
		}
	}
}
