import * as vscode from 'vscode';
import {
	IStylableDecorations,
	Inspector,
	OStyler,
} from './types';

export interface IDesignable {
	// isBroken(): boolean
	// isEmpty(): boolean
	content: string | undefined;
}

export type ODesigner = OStyler

export default class Designer {

	constructor(
		public inspector: Inspector,
		public cfg: ODesigner
	) {}

	get(
		designable: IDesignable,
		ranges: vscode.Range[]
	): IStylableDecorations {

		return Array.prototype.concat(
			...ranges.map(range => this.getRangeDecorations(range, designable))
		); // TODO change to flat()
	}

	getRangeDecorations(
		range: vscode.Range,
		designable: IDesignable
	): IStylableDecorations {
		const categories = this.getDecorationCategories(designable);
		return categories.map(category =>
			this.getCategoryDecoration(category, range, designable)
		);
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
		const hoverMessage = this.cfg.anchor.styles.categories[category].message
			? this.cfg.anchor.styles.categories[category].message
			: designable.content;

		const decoration = {
			options: {
				range,
				hoverMessage
			},
			category
		};

		return decoration;
	}
}
