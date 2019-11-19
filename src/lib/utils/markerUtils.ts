import * as vscode from 'vscode';
import {
	IAnchor,
	IIdMaker
} from '../types';

export type OMarkerUtils = {
	anchor: {
		marker: {
			salt: string,
			prefix: string | false,
			template?: string,
		}
	}
}

export default class MarkerUtils {
	constructor(
		public idMaker: IIdMaker,
		public cfg: OMarkerUtils
	) {}

	BARE_MARKER_SYMBOLS_COUNT: number =	this.cfg.anchor.marker.salt.length + this.idMaker.symbolsCount

	bareMarkerRegexString: string = `${this.cfg.anchor.marker.salt}${this.idMaker.ID_REGEX_STRING}`

	bareMarkerRegex: RegExp = new RegExp(this.bareMarkerRegexString,	'g')

	bareMarkerRegexNonG: RegExp = new RegExp(this.bareMarkerRegexString)

	/**
	 * searches for id in marker
	 * @param {string} marker
	 * @returns {string} marker id
	 * @memberof MarkerUtils
	 */
	getIdFromMarker = function(marker: string): string {
		const [match] = marker.match(this.idMaker.ID_REGEX_STRING)!;
		return match;
	}

	/**
	 * @param {string} id
	 * @returns {string} full marker to be written in document
	 * @memberof MarkerUtils
	 */
	getMarker = function(id: string): string {
		// template 🕮 7ce3c26f-8b5e-4ef5-babf-fab8100f6d6c
		return `${this.cfg.anchor.marker.prefix}${this.cfg.anchor.marker.salt}${id}`;
	}

	/**
	 * returns range of marker based on it' start position
	 *
	 * @param {string} marker
	 * @param {vscode.Position} start
	 * @returns {vscode.Range} range of marker
	 * @memberof MarkerUtils
	 */
	getMarkerRange = function(
		marker: string,
		start: vscode.Position
	): vscode.Range {
		return new vscode.Range(
			start,
			start.translate({ characterDelta: marker.length })
		);
	}
}

// @outdated 🕮 a96faaf1-b199-43b1-a8f1-aa66cd669e27
