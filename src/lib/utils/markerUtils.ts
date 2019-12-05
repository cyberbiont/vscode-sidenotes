import * as vscode from 'vscode';
import {
	IAnchor,
	IIdMaker
} from '../types';

export type OMarkerUtils = {
	anchor: {
		marker: {
			salt: string,
			prefix?: string,
			signature: string,
			readSignatures?: string[]
			readUnsigned?: boolean
			// template?: string,
		}
	},
	app: {
		formats: {
			file: {
				[extension: string]: string
			}
		}
	}
}

export default class MarkerUtils {
	constructor(
		public idMaker: IIdMaker,
		public cfg: OMarkerUtils
	) {}

	BARE_MARKER_SYMBOLS_COUNT: number =	this.cfg.anchor.marker.salt.length + this.idMaker.symbolsCount

	bareMarkerRegexString: string = this.getBareMarkerRegexString()

	bareMarkerRegex: RegExp = new RegExp(this.bareMarkerRegexString,	'g')

	bareMarkerRegexNonG: RegExp = new RegExp(this.bareMarkerRegexString)

	getBareMarkerRegexString() {
		const o = this.cfg.anchor.marker;
		const extensionRegexString = '(.\\w+)?';
		const signatures: string[] = o.readSignatures ? o.readSignatures: ['.*'];
		if (o.signature) signatures.push(o.signature);

		const readSignaturesRegexString =
		 `(?:<(${signatures.join('|')})> )${o.readUnsigned ? '?' : ''}`

	 // 🖉 3ff25cbb-b2cb-46fe-88cd-eb5f2c488470
		return `(?:${o.salt}|🖉) ${readSignaturesRegexString}${this.idMaker.ID_REGEX_STRING}${extensionRegexString}`;
	}

	/**
	 * @param {string} id
	 * @returns {string} full marker to be written in document
	 * @memberof MarkerUtils
	 */
	getMarker = function(id: string, extension?: string): string {
		// template 🕮 7ce3c26f-8b5e-4ef5-babf-fab8100f6d6c
		const o = this.cfg.anchor.marker;
		return `${o.prefix ? o.prefix+' ':''}${o.salt} <${o.signature}> ${id}${extension}`;
	}

	getKey = function(id: string, extension?: string): string {
		return `${id}${extension ?  extension : ''}`;
	}

	/**
	 * returns range of string based on its start position
	 *
	 * @param {string} str
	 * @param {vscode.Position} start
	 * @returns {vscode.Range} range of marker
	 * @memberof MarkerUtils
	 */
	getMarkerRange = function(
		str: string,
		start: vscode.Position
	): vscode.Range {
		return new vscode.Range(
			start,
			start.translate({ characterDelta: str.length })
		);
	}
}

// @outdated 🕮 a96faaf1-b199-43b1-a8f1-aa66cd669e27
