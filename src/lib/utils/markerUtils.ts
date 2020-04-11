import { Position, Range } from 'vscode';
import { IdProvider } from '../idProvider';

export type OMarkerUtils = {
	anchor: {
		marker: {
			salt: string;
			prefix?: string;
			signature: string;
			signatureFilter?: Set<string>;
			readUnsigned?: boolean;
		};
	};
};

export default class MarkerUtils {
	constructor(public idProvider: IdProvider, public cfg: OMarkerUtils) {}

	BARE_MARKER_SYMBOLS_COUNT: number =
		this.cfg.anchor.marker.salt.length + this.idProvider.symbolsCount;

	bareMarkerRegexString: string = this.getBareMarkerRegexString();

	bareMarkerRegex = new RegExp(this.bareMarkerRegexString, 'g');

	bareMarkerRegexNonG = new RegExp(this.bareMarkerRegexString);

	getBareMarkerRegexString(
		idString: string = this.idProvider.ID_REGEX_STRING,
	): string {
		const o = this.cfg.anchor.marker;

		const extensionRegexString = '(?<extension>.\\w+)?';

		const signatures: Set<string> = o.signatureFilter
			? o.signatureFilter
			: new Set('.*');
		if (o.signature) signatures.add(o.signature);
		const readSignaturesRegexString = `(<(?<signature>(${Array.from(
			signatures,
		).join('|')}))> )${o.readUnsigned ? '?' : ''}`;

		// 🕮 <cyberbiont> 3ff25cbb-b2cb-46fe-88cd-eb5f2c488470.md
		return `(?<salt>${o.salt}|🖉) ${readSignaturesRegexString}${idString}${extensionRegexString}`;
	}

	/**
	 * @param {string} id
	 * @returns {string} full marker to be written in document
	 * @memberof MarkerUtils
	 */
	getMarker(id: string, extension?: string): string {
		// template 🕮 <cyberbiont> 7ce3c26f-8b5e-4ef5-babf-fab8100f6d6c.md
		const o = this.cfg.anchor.marker;
		return `${o.prefix ? `${o.prefix} ` : ''}${o.salt} <${
			o.signature
		}> ${id}${extension}`;
	}

	getKey(id: string, extension?: string): string {
		return `${id}${extension || ''}`;
	}

	getIdFromString(string: string): string | null {
		const match = string.match(this.idProvider.ID_REGEX);
		if (match) return match[0];
		return null;
	}

	/**
	 * returns range of string based on its start position
	 *
	 * @param {string} str
	 * @param {vscode.Position} start
	 * @returns {vscode.Range} range of marker
	 * @memberof MarkerUtils
	 */
	getMarkerRange(str: string, start: Position): Range {
		return new Range(start, start.translate({ characterDelta: str.length }));
	}
}

// @outdated 🕮 <cyberbiont> a96faaf1-b199-43b1-a8f1-aa66cd669e27.md
