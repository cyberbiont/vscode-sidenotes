import { TextEditor, Range, TextLine } from 'vscode';
import { EditorUtils, MarkerUtils } from './utils';

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

		const regex = this.utils.bareMarkerRegex;
		const matches = text.matchAll(regex);
		for (const match of matches) {
			const { index } = match;
			// @old 🕮 <YL> 9596da3d-a8bd-40c9-9439-8bbdec915cc8.md
			const [fullMatch] = match;
			// 🕮 <YL> c924fc03-6eaf-4eab-be51-7ae8428f956d.md
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const { salt, signature, id, extension } = match.groups!;
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
		// @old 🕮 <YL> b9d9f141-a247-4e3e-b3eb-48fbaf78d6d2.md

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
