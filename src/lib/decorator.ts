import {
	DecorationOptions,
	DecorationRenderOptions,
	OverviewRulerLane,
	TextEditor,
	TextEditorDecorationType,
	ThemableDecorationRenderOptions,
	window,
} from 'vscode';

import { Sidenote } from './sidenote';
import { SidenotesDictionary } from './types';
import { addNestedProperty } from './utilityFunctions';
import path from 'path';

export interface DecorableDecoration {
	category: string;
	options: DecorationOptions;
}

export interface Decorable {
	decorations: DecorableDecoration[];
}

interface Decorations {
	[category: string]: OSetDecorationFn;
}

interface OSetDecorationFn {
	type: TextEditorDecorationType;
	options: DecorationOptions[];
}

type OSettings = {
	before?: string;
	after?: string;
	hideMarkers: boolean;
	gutterIcon: boolean;
	ruler: boolean;
	colorIndication?: Array<ColorIndicationName>;
};

interface OCategory {
	style: DecorationRenderOptions;
	color:
		| string
		| {
				dark: string;
				light: string;
		  };
	icon: string;
	message: string;
	condition?: (sidenote: Sidenote) => boolean;
}

type OCategories = {
	common: OCategory; // full
} & {
	[category in CategoryName]: Partial<OCategory>; // partial overrides
};

export type CategoryName = `active` | `broken` | `empty`;
type ColorIndicationName = `text` | `after` | `before` | `ruler`;

export type ODecorator = {
	anchor: {
		styles: {
			settings: {
				before?: string;
				after?: string;
				hideMarkers: boolean;
				gutterIcon: boolean;
				ruler: boolean;
				colorIndication?: Array<ColorIndicationName>;
			};
			categories: OCategories;
		};
	};
};

export default class Decorator {
	private decorations: Decorations = this.initDecorationConfig();
	constructor(private pool: SidenotesDictionary, private cfg: ODecorator) {}

	initDecorationConfig(): Decorations {
		const {
			settings: o,
			categories,
		}: { settings: OSettings; categories: OCategories } = JSON.parse(
			JSON.stringify(this.cfg.anchor.styles),
		);

		if (!categories.common || !categories.common.style)
			throw new Error(
				`sidenotes: cannot build decoration types.
			the "common" section is not found inside styles configuration.`,
			);

		const result = Object.create(null);

		for (const [categoryName, categoryOptions] of Object.entries(categories)) {
			// eslint-disable-next-line no-continue
			if (categoryName === `common`) continue;

			// merge categories cfg over common cfg
			const c: OCategory = Object.assign(categories.common, categoryOptions);

			// set optional properties for sidenote categories:
			if (o.hideMarkers) {
				c.style.opacity = `0`;
				c.style.letterSpacing = `-1rem`;
			}
			if (o.gutterIcon) c.style.gutterIconPath = this.getIconPath(c.icon);
			if (o.before) addNestedProperty(c.style, `before.contentText`, o.before);
			if (o.after) addNestedProperty(c.style, `after.contentText`, o.after);
			if (o.ruler) c.style.overviewRulerLane = OverviewRulerLane.Right;
			if (o.colorIndication && c.color)
				o.colorIndication.forEach(prop => {
					switch (prop) {
						case `text`:
							this.setColor(c.style, `color`, c.color);
							break;
						case `ruler`:
							this.setColor(c.style, `overviewRulerColor`, c.color);
							break;
						case `after`:
							this.setColor(c.style, `after.color`, c.color);
							break;
						case `before`:
							this.setColor(c.style, `before.color`, c.color);
							break;
						// no default
					}
				});

			result[categoryName] = {
				type: window.createTextEditorDecorationType(c.style),
				options: [],
			};
		}
		return result;
	}

	private getIconPath(fileName: string): string {
		const dir = __dirname;
		return path.join(__dirname, `..`, `images`, fileName);
	}

	private setColor(
		style: DecorationRenderOptions,
		prop:
			| RecursiveKeyOf<DecorationRenderOptions>
			| RecursiveKeyOf<ThemableDecorationRenderOptions>,
		color: string | { dark: string; light: string },
	): void {
		// 🕮 <cyberbiont> 2be2105d-c01b-4bf7-89ab-03665aaa2ce1.md
		function isThemableDecorationRenderOptionsKey(
			prop: string,
		): prop is RecursiveKeyOf<ThemableDecorationRenderOptions> {
			const arr = prop.split(`.`);
			if ((arr.length > 1 && arr[0] !== `after`) || arr[0] !== `before`)
				return false;
			return true;
		}
		addNestedProperty(
			style,
			prop,
			typeof color === `string` ? color : color.dark,
		);

		if (isThemableDecorationRenderOptionsKey(prop)) {
			if (!style.light) style.light = {};

			addNestedProperty(
				style.light,
				prop,
				typeof color === `string` ? color : color.light,
			);
		}
	}

	updateDecorations({
		pool = this.pool,
		reset = false,
	}: { pool?: SidenotesDictionary; reset?: boolean } = {}): void {
		const getStylableDecorationOptions = (
			decorable: Decorable,
		): Decorations => {
			if (decorable.decorations) {
				decorable.decorations.forEach(decoration => {
					this.decorations[decoration.category].options.push(
						decoration.options,
					);
				});
			}
			return this.decorations;
		};

		pool.each(getStylableDecorationOptions);

		for (const category of Object.keys(this.decorations)) {
			if (reset) this.resetCategoryDecorations(pool.editor, category);
			else this.applyCategoryDecorations(pool.editor, category);

			this.decorations[category].options.length = 0;
		}
	}

	resetCategoryDecorations(editor: TextEditor, category: string): void {
		editor.setDecorations(this.decorations[category].type, []);
	}

	applyCategoryDecorations(editor: TextEditor, category: string): void {
		editor.setDecorations(
			this.decorations[category].type,
			this.decorations[category].options,
		);
	}

	resetDecorations(): void {
		return this.updateDecorations({ reset: true });
	}

	disposeDecorationTypes(): void {
		for (const category of Object.keys(this.decorations)) {
			this.decorations[category].type.dispose();
		}
	}
}
