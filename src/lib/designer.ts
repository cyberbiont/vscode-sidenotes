import * as vscode from 'vscode';
import {
	MarkerUtils,
	ActiveEditorUtils,
	IAnchor,
	IStylableDecorations,
	IStylerCfg,
	Inspector,
	Scanner,
	ISidenote
} from './types';

export interface IDesignable {
	// isBroken(): boolean
	// isEmpty(): boolean
	content: string | undefined;
	anchor: IAnchor;
}

export interface IDesignerCfg extends IStylerCfg {}

export default class Designer {
	// private decorations: IStylableDecorations
	constructor(
		public markerUtils: MarkerUtils,
		public inspector: Inspector,
		public activeEditorUtils: ActiveEditorUtils,
		public scanner: Scanner,
		public cfg: IDesignerCfg
	) {}

	get(
		designable: IDesignable,
		positionHints?: {
			uncommentedMarkerStartPos?: vscode.Position;
			markerStartPos?: vscode.Position;
		}
	): IStylableDecorations {
		// this.decorations = [];

		let ranges: vscode.Range[] = [];
		let range: vscode.Range;

		if (positionHints && positionHints.markerStartPos) {
			// only get end position
			range = this.markerUtils.getMarkerRange(
				designable.anchor,
				positionHints.markerStartPos
			);
			ranges.push(range);
		} else if (positionHints && positionHints.uncommentedMarkerStartPos) {
			// search same line
			range = this.scanner.rescanLineForMarkerRange(
				designable.anchor,
				positionHints.uncommentedMarkerStartPos
			);
			ranges.push(range);
		} else {
			// search whole document
			// range = this.markerUtils.getMarkerRange(designable.anchor);
			ranges = this.markerUtils.getMarkerRange(designable.anchor);
		}
		const decorations = Array.prototype.concat(
			...ranges.map(range => this.getRangeDecorations(range, designable))
		); // TODO change to flat()

		return decorations;
	}

	// getRanges(
	// 	designable: IDesignable,
	// 	positionHints?: {
	// 		uncommentedMarkerStartPos?: vscode.Position,
	// 		markerStartPos?: vscode.Position
	// 	}
	// ) {

	// 	return range;
	// }

	getRangeDecorations(
		range: vscode.Range,
		designable: IDesignable
	): IStylableDecorations {
		const categories = this.getDecorationCategories(designable);
		const perRangeDecorations = categories.map(category =>
			this.getCategoryDecoration(category, range, designable)
		);
		return perRangeDecorations;
	}

	getDecorationCategories(designable: IDesignable): string[] {
		const categories: string[] = [];
		if (this.inspector.isBroken(designable)) categories.push('broken');
		else if (this.inspector.isEmpty(designable)) categories.push('empty');
		else categories.push('active');
		return categories;
	}

	getCategoryDecoration(
		category: string,
		range: vscode.Range,
		designable: IDesignable
	) {
		const hoverMessage = this.cfg.decorations[category].message
			? this.cfg.decorations[category].message
			: designable.content;

		const decoration = {
			options: { range, hoverMessage },
			category
		};

		return decoration;
	}
}
