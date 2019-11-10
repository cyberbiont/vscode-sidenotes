import * as vscode from 'vscode';
import {
	ActiveEditorUtils,
	IAnchor,
	ISidenote,
	IStylableDecorations,
	IStylerCfg,
	Inspector,
	MarkerUtils,
	Scanner,
} from './types';

export interface IDesignable {
	// isBroken(): boolean
	// isEmpty(): boolean
	anchor: IAnchor;
	content: string | undefined;
}

export interface IDesignerCfg extends IStylerCfg {}

export default class Designer {
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
		let ranges: vscode.Range[] = [];

		if (positionHints && positionHints.markerStartPos) {
			// only get the end position
			let range: vscode.Range = this.markerUtils.getMarkerRange(
				designable.anchor,
				positionHints.markerStartPos
			);
			ranges.push(range);
		} else if (positionHints && positionHints.uncommentedMarkerStartPos) {
			// search in the same line
			let range: vscode.Range = this.scanner.rescanLineForMarkerRange(
				designable.anchor,
				positionHints.uncommentedMarkerStartPos
			);
			ranges.push(range);
		} else {
			// search whole document
			ranges = this.markerUtils.getMarkerRange(designable.anchor);
		}
		const decorations = Array.prototype.concat(
			...ranges.map(range => this.getRangeDecorations(range, designable))
		); // TODO change to flat()

		return decorations;
	}

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
