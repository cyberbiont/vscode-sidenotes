import * as vscode from 'vscode';
import {
	IStylableDecoration,
	Inspector,
	OStyler,
} from './types';

export interface IDesignable {
	content?: string;
	color?: string;
	mime?: string|false;
	extension?: string
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
			const color = designable.color ? designable.color : designable.color = this.getRandomHSLColor();
			// TODO decrease color lightness for dark themes
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
				border: `1px dotted ${color}`
			}
		}
	}

	getRandomHSLColor(lightness: string = '75%') {
		// 🕮 <YL> 16762ea0-4553-4aee-8dd2-508e37ca0adb.md
		const color = 'hsl(' + Math.random() * 360 + `, 100%, ${lightness})`;
		return color;
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
		const { extension, mime, content } = designable;
		const isTextFile = (mime === undefined)
			? true
			: (mime === false)
				? false
				: mime.includes('text')

		let hoverMessageBase: string = (this.cfg.anchor.styles.categories[category].message)
			? this.cfg.anchor.styles.categories[category].message
			: (isTextFile) ? content: '';
		if (!isTextFile) hoverMessageBase += `⮜ NOT TEXT FILE TYPE ⮞: This content type cannot be displayed in tooltip. Extension: ${extension} MIME type: ${mime}`;

		// 🕮 <YL> 7d0274da-2eba-4948-93d6-993af5e1bcf5.md
		const hoverMessageButtons: vscode.MarkdownString = new vscode.MarkdownString(
			`[Edit](command:sidenotes.annotate) [Delete](command:sidenotes.delete) [Wipe](command:sidenotes.wipeAnchor) \n`
		);
		hoverMessageButtons.isTrusted = true;

		const hoverMessage = hoverMessageButtons.appendMarkdown(hoverMessageBase);
		//? TODO how to prepend?

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
