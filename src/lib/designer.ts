import * as vscode from 'vscode';
import {
	IStylableDecoration,
	Inspector,
	OStyler,
} from './types';

export interface IDesignable {
	// isBroken(): boolean
	// isEmpty(): boolean
	content: string | undefined;
	color ?: string
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
	): IStylableDecoration[] {

		const decorations: IStylableDecoration[] = Array.prototype.concat(
			...ranges.map(range => this.getRangeDecorations(range, designable))
		); // TODO change to flat()

		if (ranges.length > 1) {
			const color = designable.color ? designable.color : designable.color = this.getRandomColor()
			decorations.map(decoration => this.markAsDuplicated(decoration, color));
		}
		return decorations;
	}

	private markAsDuplicated(decoration: IStylableDecoration, color: string) {
		// TODO move to config
		// const after = this.cfg.anchor.styles.categories.common.style.after!.contentText;
		return decoration.options.renderOptions = {
			// before: {
			// 	contentText: `*` ,
			// 	color
			// },
			after: {
				border: `1px solid ${color}`
			}
		}
	}

	getRandomColor() {
		return '#'+((1<<24)*Math.random()|0).toString(16);
	}

	getRangeDecorations(
		range: vscode.Range,
		designable: IDesignable
	): IStylableDecoration[] {
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
	): IStylableDecoration {
		const hoverMessage: string = this.cfg.anchor.styles.categories[category].message
			? this.cfg.anchor.styles.categories[category].message
			: designable.content;

		const decoration: IStylableDecoration = {
			options: {
				range,
				hoverMessage
			},
			category
		};

		return decoration;
	}
}
