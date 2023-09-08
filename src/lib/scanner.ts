import { EditorUtils, MarkerUtils } from './utils';
import { Range, TextDocument, TextLine } from 'vscode';

export type OScanner = AnyObject;

// 🕮 <cyberbiont> 3d3fb8fd-a5fc-4670-9bca-c73592fa91a8.md
export interface ScanData {
	marker: string; // full marker
	signature: string;
	id: string;
	extension: string;
	ranges: Range[];
	key: string;
	// 🕮 <cyberbiont> 0b98de6e-2cde-4be3-b031-07ce78963322.md
}

export default class Scanner {
	constructor(
		private document: TextDocument,
		private utils: EditorUtils & MarkerUtils,
	) {}

	scanText(
		text: string = this.document.getText(),
	): ScanData[] | undefined {
		// 🕮 <cyberbiont> a844327f-600d-4f49-91c5-bba1899aa441.md
		const regex = this.utils.bareMarkerRegex;
		const matches = text.matchAll(regex);

		type TempData = {
			// intermediate type to store values
			[key: string]: Omit<ScanData, `ranges` | `key`> & {
				positions: Set<number | undefined>;
			};
		};

		const result: TempData = Object.create(null);

		for (const match of matches) {
			const { index } = match;
			const [fullMatch] = match;
			// 🕮 <cyberbiont> c924fc03-6eaf-4eab-be51-7ae8428f956d.md
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const { salt, signature, id, extension } = match.groups!;
			const key = this.utils.getKey(id, extension);

			if (result[key]) result[key].positions.add(index);
			else
				result[key] = {
					signature,
					id,
					extension,
					marker: fullMatch,

					positions: new Set([index]),
				};
		}

		const entries = Object.entries(result);
		if (entries.length === 0) return undefined;

		return entries.map(entry => {
			const [key, tempData] = entry;
			return {
				key,
				...tempData,
				ranges: Array.from(tempData.positions, index => {
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					const position = this.document.positionAt(index!);
					const range = this.utils.getMarkerRange(tempData.marker, position);
					return range;
				}),
			};
		});
	}

	rescanForRange(
		regex: RegExp,
		text: string = this.document.getText(),
	): Range | undefined {
		const match = text.match(regex);
		if (match?.index) {
			const [fullMatch] = match;
			const { index } = match;
			const position = this.document.positionAt(index);
			const range = this.utils.getMarkerRange(fullMatch, position);
			return range;
		}
		return undefined;
	}

	scanLine(line: TextLine = this.utils.getTextLine()): ScanData | undefined {
		if (line.isEmptyOrWhitespace) return undefined;

		const match = line.text.match(this.utils.bareMarkerRegexNonG);

		if (match) {
			// const [fullMatch, signature, id, extension] = match;
			const { index } = match;
			const [fullMatch] = match;
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const { salt, signature, id, extension } = match.groups!;
			const key = this.utils.getKey(id, extension);

			const position = line.range.start.translate({ characterDelta: index });
			const range = this.utils.getMarkerRange(fullMatch, position);

			return {
				key,
				signature,
				id,
				extension,
				marker: fullMatch,
				ranges: [range],
			};
		}
		return undefined;
	}
}
