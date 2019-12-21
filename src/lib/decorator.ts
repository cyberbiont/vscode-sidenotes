import {
	DecorationOptions,
	DecorationRenderOptions,
	OverviewRulerLane,
	TextEditor,
	TextEditorDecorationType,
	window,
} from 'vscode';
import path from 'path';

import { Sidenote, SidenotesDictionary } from './types';

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
	colorIndication?: Array<colorIndication>;
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
	common: OCategory;
} & {
	[category in categories]: Partial<OCategory>;
};

type categories = 'active' | 'broken' | 'empty';
type colorIndication = 'text' | 'after' | 'before' | 'ruler';

export type ODecorator = {
	anchor: {
		styles: {
			settings: {
				before?: string;
				after?: string;
				hideMarkers: boolean;
				gutterIcon: boolean;
				ruler: boolean;
				colorIndication?: Array<colorIndication>;
			};
			categories: OCategories;
		};
	};
};

export default class Decorator<T extends Decorable> {
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
			the "common" section is not found inside styles configuration. It should contain `,
			);

		const result = Object.create(null);

		for (const [categoryName, categoryOptions] of Object.entries(categories)) {
			// eslint-disable-next-line no-continue
			if (categoryName === 'common') continue;

			// merge categories cfg over common cfg
			const c: OCategory = Object.assign(categories.common, categoryOptions);

			// set optional properties for sidenote categories:
			if (o.hideMarkers) {
				c.style.opacity = '0';
				c.style.letterSpacing = '-1rem';
			}
			if (o.gutterIcon) c.style.gutterIconPath = this.getIconPath(c.icon);
			if (o.before)
				this.addNestedProperty(c.style, 'before.contentText', o.before);
			if (o.after)
				this.addNestedProperty(c.style, 'after.contentText', o.after);
			if (o.ruler) c.style.overviewRulerLane = OverviewRulerLane.Right;
			if (o.colorIndication && c.color)
				o.colorIndication.forEach(prop => {
					switch (prop) {
						case 'text':
							this.setColor(c.color, c.style, 'color');
							break;
						case 'ruler':
							this.setColor(c.color, c.style, 'overviewRulerColor');
							break;
						case 'after':
						case 'before':
							this.setColor(c.color, c.style, `${prop}.color`);
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
		return path.join(__dirname, '..', '..', 'images', fileName);
	}

	private setColor(
		color: string | { dark: string; light: string },
		style,
		prop: string,
	): void {
		// 🕮 <YL> 2be2105d-c01b-4bf7-89ab-03665aaa2ce1.md
		this.addNestedProperty(
			style,
			prop,
			typeof color === 'string' ? color : color.dark,
		);
		this.addNestedProperty(
			style,
			`light.${prop}`,
			typeof color === 'string' ? color : color.light,
		);
	}

	private addNestedProperty(
		base: object,
		propsString: string,
		value: unknown,
	): object {
		// 🕮 <YL> c5745bee-a5b1-4b45-966e-839fec3db57a.md
		const props = propsString.split('.');
		const lastProp = arguments.length === 3 ? props.pop() : undefined;

		const lastBase = props.reduce((base, prop) => {
			const value = base[prop] ? base[prop] : {};
			base[prop] = value;
			base = value;
			return base;
		}, base);

		if (lastProp) lastBase[lastProp] = value;
		return lastBase;
	}

	updateDecorations({
		pool = this.pool,
		reset = false,
	}: { pool?: SidenotesDictionary; reset?: boolean } = {}): void {
		const getStylableDecorationOptions = (decorable: T): Decorations => {
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
