import vscode from 'vscode';
import {
	IDecorableDecoration,
	Inspector,
	ODecorator,
} from './types';

export interface IStylable {
	content?: string;
	color?: string;
	mime?: string | false;
	extension?: string;
}

export type OStyler = ODecorator & {
	anchor: {
		styles: {
			instanceRenderOptions: (color: string) => vscode.DecorationInstanceRenderOptions
		}
	}
}

export default class Styler {

	constructor(
		public inspector: Inspector,
		public cfg: OStyler
	) {}

	get(
		stylable: IStylable,
		ranges: vscode.Range[]
	): IDecorableDecoration[] {

		const decorations: IDecorableDecoration[] = Array.prototype.concat(
			...ranges.map(range => this.getRangeDecorations(range, stylable))
		); // TODO change to flat()

		if (ranges.length > 1) {
			const color = stylable.color ? stylable.color : stylable.color = this.getRandomHSLColor();
			// TODO decrease color lightness for dark themes
			decorations.map(decoration => this.markAsDuplicated(decoration, color));
		}
		return decorations;
	}

	private markAsDuplicated(decoration: IDecorableDecoration, color: string) {
		decoration.options.renderOptions = this.cfg.anchor.styles.instanceRenderOptions(color);
	}

	getRandomHSLColor(lightness: string = '75%') {
		// 🕮 <YL> 16762ea0-4553-4aee-8dd2-508e37ca0adb.md
		const color = 'hsl(' + Math.random() * 360 + `, 100%, ${lightness})`;
		return color;
	}

	getRangeDecorations(
		range: vscode.Range,
		stylable: IStylable
	): IDecorableDecoration[] {
		const categories = this.getDecorationCategories(stylable);
		return categories.map(category =>
			this.getCategoryDecoration(category, range, stylable)
		);
	}

	getDecorationCategories(stylable: IStylable): string[] {
		const categories: string[] = [];
		if (this.inspector.isBroken(stylable)) categories.push('broken');
		else if (this.inspector.isEmpty(stylable)) categories.push('empty');
		else categories.push('active');
		return categories;
	}

	getCategoryDecoration(
		category: string,
		range: vscode.Range,
		stylable: IStylable
	): IDecorableDecoration {
		const { extension, mime, content } = stylable;
		const isTextFile = this.inspector.isText(stylable);

		let hoverMessage: string[] = [(this.cfg.anchor.styles.categories[category].message)
			? this.cfg.anchor.styles.categories[category].message
			: (isTextFile) ? content: ''
		];

		if (!isTextFile) hoverMessage.push(`⮜ NOT TEXT FILE TYPE ⮞
			This content type cannot be displayed in tooltip.
			Extension: ${extension} MIME type: ${mime}`);

		// 🕮 <YL> 7d0274da-2eba-4948-93d6-993af5e1bcf5.md
		//? TODO how to prepend?

		const decoration: IDecorableDecoration = {
			options: {
				range,
				hoverMessage
			},
			category
		};

		return decoration;
	}
}
