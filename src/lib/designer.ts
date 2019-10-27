import * as vscode from 'vscode';
import { MarkerUtils, ActiveEditorUtils } from './utils';
import { IAnchor } from './anchorer';
import { IStylableDecorations, IStylerCfg } from './styler';
import { Inspector } from './sidenote';
import Scanner from './scanner';

export interface IDesignable {
	// isBroken(): boolean
	// isEmpty(): boolean
	content: string|undefined
	anchor: IAnchor
}

export interface IDesignerCfg extends IStylerCfg {}

export default class Designer {
	private decorations: IStylableDecorations
	constructor(
		public markerUtils: MarkerUtils,
		public inspector: Inspector,
		public activeEditorUtils: ActiveEditorUtils,
		public scanner: Scanner,
		public cfg: IDesignerCfg
	) {
		this.cfg = cfg
		this.markerUtils = markerUtils;
		this.inspector = inspector;
		this.activeEditorUtils = activeEditorUtils;
		this.scanner = scanner;
	}

	get(
		designable: IDesignable,
		positionHints?: {
			uncommentedMarkerStartPos?: vscode.Position,
			markerStartPos?: vscode.Position
		}
	): IStylableDecorations {
		this.decorations = [];
		let range;

		if (positionHints && positionHints.markerStartPos) {//only get end postion
			range = this.markerUtils.getMarkerRange(
				designable.anchor,
				positionHints.markerStartPos
			);
		} else if(positionHints && positionHints.uncommentedMarkerStartPos) {// search same line
			range = this.scanner.rescanLineForMarkerRange(designable.anchor, positionHints.uncommentedMarkerStartPos);
		} else { // search whole document
			range = this.markerUtils.getMarkerRange(designable.anchor);
		}

		const categories = getDecorationCategories.call(this);
		categories.forEach(prepareCategoryOptions.bind(this));

		function getDecorationCategories(): string[] {
			const categories: string[] = [];
			if (this.inspector.isBroken(designable)) categories.push('broken');
			else if (this.inspector.isEmpty(designable)) categories.push('empty');
			else categories.push('active');
			return categories;
		}

		function prepareCategoryOptions(category) {
			const hoverMessage = this.cfg.decorations[category].message
				? this.cfg.decorations[category].message
				: designable.content;

			this.decorations.push({
				options: { range, hoverMessage },
				category
			});
			return this.decorations;
		}

		return this.decorations;
	}
}
