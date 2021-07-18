import { Position, Range } from 'vscode';

import { IdProvider } from '../idProvider';
import Signature from '../signature';

// TODO remove signature config from here and prepare and take all values from signature class instance
export type OMarkerUtils = {
	anchor: {
		marker: {
			salt: string;
			prefix?: string;
			defaultSignature: string;
			riggedSignatures: Set<string>;
			signatureFilter?: Set<string>;
			readUnsigned?: boolean;
		};
	};
};

export default class MarkerUtils {
	constructor(
		public idProvider: IdProvider,
		public signature: Signature,
		public cfg: OMarkerUtils,
	) {}

	BARE_MARKER_SYMBOLS_COUNT: number =
		this.cfg.anchor.marker.salt.length + this.idProvider.symbolsCount;

	bareMarkerRegexString: string = this.getBareMarkerRegexString();

	bareMarkerRegex = new RegExp(this.bareMarkerRegexString, `g`);

	bareMarkerRegexNonG = new RegExp(this.bareMarkerRegexString);

	getBareMarkerRegexString(
		idString: string = this.idProvider.ID_REGEX_STRING,
	): string {
		const o = this.cfg.anchor.marker;

		const extensionRegexString = `(?<extension>.\\w+)?`;

		const readSignatures: Set<string> = o.signatureFilter
			? new Set([...o.signatureFilter, ...o.riggedSignatures])
			: new Set(`.*`);

		const readSignaturesRegexString = `(<(?<signature>(${Array.from(
			readSignatures,
		).join(`|`)}))> )${o.readUnsigned ? `?` : ``}`;

		// 🕮 <cyberbiont> 3ff25cbb-b2cb-46fe-88cd-eb5f2c488470.md
		return `(?<salt>${o.salt}|🖉) ${readSignaturesRegexString}${idString}${extensionRegexString}`;
	}

	/**
	 * @param {string} id
	 * @returns {string} full marker to be written in document
	 * @memberof MarkerUtils
	 */
	getMarker(id: string, extension: string): string {
		// template 🕮 <cyberbiont> 7ce3c26f-8b5e-4ef5-babf-fab8100f6d6c.md
		const o = this.cfg.anchor.marker;
		return `${o.prefix ? `${o.prefix} ` : ``}${o.salt} <${
			this.signature.active
		}> ${id}${extension}`;
	}

	getKey(id: string, extension: string): string {
		return `${id}${extension || ``}`;
	}

	getIdFromString(string: string): string | null {
		const match = string.match(this.idProvider.ID_REGEX);
		if (match) return match[0];
		return null;
	}

	/**
	 * returns range of string based on its start position
	 *
	 * @param {string} marker
	 * @param {vscode.Position} start
	 * @returns {vscode.Range} range of marker
	 * @memberof MarkerUtils
	 */
	getMarkerRange(marker: string, start: Position): Range {
		return new Range(start, start.translate({ characterDelta: marker.length }));
	}

	getMarkerSubRange(
		markerStartPos: Position,
		marker: string,
		substring: string,
	): Range {
		const substringStartIndex = marker.indexOf(substring);
		const substringEndIndex = substringStartIndex + substring.length;
		return new Range(
			markerStartPos.translate({ characterDelta: substringStartIndex }),
			markerStartPos.translate({ characterDelta: substringEndIndex }),
		);
	}

	// TODO move to utility funcions
	isText(mime: string | undefined | false) {
		if (mime === undefined) return true;
		if (mime === false) return false;
		return mime.includes(`text`);
	}
}
