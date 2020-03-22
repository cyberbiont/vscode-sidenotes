import { DecorationInstanceRenderOptions, Range } from 'vscode';
import { DecorableDecoration, ODecorator } from './decorator';
import { Inspector } from './sidenote';

export interface Stylable {
	content?: string;
	color?: string;
	mime?: string | false;
	extension?: string;
}

export type OStyler = ODecorator & {
	anchor: {
		styles: {
			instanceRenderOptions: (color: string) => DecorationInstanceRenderOptions;
		};
	};
};

export default class Styler {
	constructor(public inspector: Inspector, public cfg: OStyler) {}

	get(stylable: Stylable, ranges: Range[]): DecorableDecoration[] {
		const decorations: DecorableDecoration[] = ranges
			.map((range) => this.getRangeDecorations(range, stylable))
			.flat();

		if (ranges.length > 1) {
			const color = stylable.color
				? stylable.color
				: (stylable.color = this.getRandomHSLColor());
			// TODO decrease color lightness for dark themes
			decorations.map((decoration) => this.markAsDuplicated(decoration, color));
		}
		return decorations;
	}

	private markAsDuplicated(
		decoration: DecorableDecoration,
		color: string,
	): void {
		decoration.options.renderOptions = this.cfg.anchor.styles.instanceRenderOptions(
			color,
		);
	}

	getRandomHSLColor(lightness = '75%'): string {
		// 🕮 <cyberbiont> 16762ea0-4553-4aee-8dd2-508e37ca0adb.md
		const color = `hsl(${Math.random() * 360}, 100%, ${lightness})`;
		return color;
	}

	getRangeDecorations(range: Range, stylable: Stylable): DecorableDecoration[] {
		const categories = this.getDecorationCategories(stylable);
		return categories.map((category) =>
			this.getCategoryDecoration(category, range, stylable),
		);
	}

	getDecorationCategories(stylable: Stylable): string[] {
		// TODO represent categories as enum
		const categories: string[] = [];
		if (this.inspector.isBroken(stylable)) categories.push('broken');
		else if (this.inspector.isEmpty(stylable)) categories.push('empty');
		else categories.push('active');
		return categories;
	}

	getCategoryDecoration(
		category: string,
		range: Range,
		stylable: Stylable,
	): DecorableDecoration {
		const { extension, mime, content } = stylable;
		const isTextFile = this.inspector.isText(stylable);

		let message: string;
		if (this.cfg.anchor.styles.categories[category].message)
			message = this.cfg.anchor.styles.categories[category].message;
		else if (isTextFile && content) message = content;
		else message = '';

		const hoverMessage: string[] = [message];

		if (!isTextFile)
			hoverMessage.push(`⮜ NOT TEXT FILE TYPE ⮞
			This content type cannot be displayed in tooltip.
			Extension: ${extension} MIME type: ${mime}`);

		// 🕮 <cyberbiont> 7d0274da-2eba-4948-93d6-993af5e1bcf5.md
		// ? TODO how to prepend?

		const decoration: DecorableDecoration = {
			options: {
				range,
				hoverMessage,
			},
			category,
		};

		return decoration;
	}
}
