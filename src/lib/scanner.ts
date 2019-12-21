import { TextEditor, Range, TextLine } from 'vscode';

import { EditorUtils, MarkerUtils } from './types';

export type OScanner = {};

export interface ScanData {
	marker: {
		fullMatch: string;
		signature?: string;
		id: string;
		extension?: string;
	};
	ranges: Range[];
	key: string;
}

export default class Scanner {
	constructor(
		private editor: TextEditor, // TODO narrow class to active Editor
		private utils: EditorUtils & MarkerUtils,
	) {}

	scanText(
		text: string = this.editor.document.getText(),
	): ScanData[] | undefined {
		const result: {
			[key: string]: Pick<ScanData, 'marker'> & {
				positions: Set<number | undefined>;
			};
		} = Object.create(null);

		let match: RegExpMatchArray | null;
		const regex = this.utils.bareMarkerRegex;

		// eslint-disable-next-line no-cond-assign
		while ((match = regex.exec(text)) !== null) {
			const [fullMatch, signature, id, extension] = match;
			const { index } = match;
			const key = this.utils.getKey(id, extension);

			if (result[key]) result[key].positions.add(index);
			else
				result[key] = {
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

		return entries.map(entry => {
			const [key, { marker, positions }] = entry;
			const { fullMatch } = marker;
			return {
				key,
				marker,
				ranges: Array.from(positions, index => {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const position = this.editor.document.positionAt(index!);
					const range = this.utils.getMarkerRange(fullMatch, position);
					return range;
				}),
			};
		});
	}

	rescanForRange(
		regex: RegExp,
		text: string = this.editor.document.getText(),
	): Range | undefined {
		const match = text.match(regex);
		if (match?.index) {
			const [fullMatch] = match;
			const { index } = match;
			const position = this.editor.document.positionAt(index);
			const range = this.utils.getMarkerRange(fullMatch, position);
			return range;
		}
		return undefined;
	}

	scanLine(line: TextLine = this.utils.getTextLine()): ScanData | undefined {
		if (line.isEmptyOrWhitespace) return undefined;

		const match = line.text.match(this.utils.bareMarkerRegexNonG);

		if (match) {
			const [fullMatch, signature, id, extension] = match;
			const { index } = match;
			const key = this.utils.getKey(id, extension);

			const position = line.range.start.translate({ characterDelta: index });
			const range = this.utils.getMarkerRange(fullMatch, position);

			return {
				key,
				marker: {
					signature,
					id,
					extension,
					fullMatch,
				},
				ranges: [range],
			};
		}
		return undefined;
	}
}
