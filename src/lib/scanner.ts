import * as vscode from 'vscode';

import {
	EditorUtils,
	IAnchor,
	ICfg,
	MarkerUtils,
} from './types';
import { log } from 'util';

export type OScanner = {}

export interface IScanData {
	marker: {
		fullMatch: string;
		signature?: string;
		id: string;
		extension?: string;
	};
	ranges: vscode.Range[];
	key: string;
}

export default class Scanner {
	constructor(
		private editor: vscode.TextEditor, //TODO narrow class to ActualEditor
		private utils: EditorUtils & MarkerUtils,
		// private cfg: OScanner
	) {}

	scanText(
		text: string = this.editor.document.getText()
	): IScanData[]|undefined {

		const result: {
			[key: string]:
				Pick<IScanData, 'marker'>
				& {
				positions: Set<number|undefined>;
			}
		} = Object.create(null);

		let match: RegExpMatchArray|null;
		const regex = this.utils.bareMarkerRegex;

		while ((match = regex.exec(text)) !== null) {

			let [ fullMatch, signature, id, extension ] = match;
			let { index } = match;
			let key = this.utils.getKey(id, extension);

			if (result[key]) result[key].positions.add(index); // если уже есть такой маркер, добавляем индекс
			else result[key] = {
				marker: {
					signature,
					id,
					extension,
					fullMatch,
				},
				positions: new Set([index]),
			};
		}

		const entries = Object.entries(result);
		if (entries.length === 0) return undefined;
		else return entries.map(entry => {
			const [key, { marker, positions } ] = entry;
			const { fullMatch, id, extension } = marker;
			return {
				key,
				marker,
				ranges: Array.from(positions, index => {
					const position = this.editor.document.positionAt(index!);
					const range = this.utils.getMarkerRange(
						fullMatch,
						position
					);
					return range;
				})
			}

		});
	}

	scanLine(line: vscode.TextLine = this.utils.getTextLine()): IScanData|undefined {
		if (line.isEmptyOrWhitespace) return;

		const match = line.text.match(this.utils.bareMarkerRegexNonG);

		if (match) {
			let [ fullMatch, signature, id, extension ] = match;
			let { index } = match;
			const key = this.utils.getKey(id, extension);

			const position = line.range.start.translate({ characterDelta:index });
			const range = this.utils.getMarkerRange(fullMatch, position);

			return {
				key,
				marker: {
					signature,
					id,
					extension,
					fullMatch,
				},
				ranges: [range]
			}
		} else {
			return undefined;
		}
	}
}
