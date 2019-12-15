import vscode from 'vscode';
import path from 'path';

import {
	Constructor,
	IAnchor,
	ISidenote,
	ReferenceContainer,
	SidenotesDictionary,
	MapRepository,
} from './types';

export interface IDecorableDecoration {
	category: string
	options: vscode.DecorationOptions
}

export interface IDecorable {
	decorations: IDecorableDecoration[]
}

interface IDecorations {
		[category: string]: IConfigForSetDecorationFn
}

interface IConfigForSetDecorationFn {
	type: vscode.TextEditorDecorationType,
	options: vscode.DecorationOptions[],
}

interface ICategoryConfig {
	style: vscode.DecorationRenderOptions
	color: string | {
		dark: string,
		light: string
	}
	icon: string
	message: string
	condition?: (sidenote: ISidenote) => boolean
}

type categories = 'active'|'broken'|'empty';
type colorIndication = 'text'|'after'|'before'|'ruler'

export type ODecorator = {
	anchor: {
		styles: {
			settings: {
				before: string | false
				after: string | false
				hideMarkers: boolean
				gutterIcon: boolean
				ruler: boolean
				colorIndication: Array<colorIndication>|false
			},
			categories: {
				common: ICategoryConfig,
			} & {
				[category in categories]: Partial<ICategoryConfig>
			}
		}
	}
}

export default class Decorator<T extends IDecorable> {
	private decorations: IDecorations  = this.initDecorationConfig();
	constructor(
		private pool: SidenotesDictionary,
		private cfg: ODecorator
	) {}

	initDecorationConfig(): IDecorations  {
		const { settings: o, categories } = JSON.parse(JSON.stringify(this.cfg.anchor.styles));

		if (!categories.common || !categories.common.style) throw new Error(
			`sidenotes: cannot build decoration types.
			the "common" section is not found inside styles configuration. It should contain `
		);

		let result = Object.create(null);

		for (const category in categories) {
			if (category === 'common') continue;

			// merge categories cfg over common cfg
			const c: ICategoryConfig = Object.assign(
				categories.common,
				categories[category]
			);

			// set optional properties for sidenote categories:
			if (o.hideMarkers) {
				c.style.opacity = '0';
				c.style.letterSpacing = '-1rem';
			}
			if (o.gutterIcon)	c.style.gutterIconPath = this.getIconPath(c.icon);
			if (o.before) this.addNestedProperty(c.style, 'before.contentText', o.before);
			if (o.after) this.addNestedProperty(c.style, 'after.contentText', o.after);
			if (o.ruler) c.style.overviewRulerLane =	vscode.OverviewRulerLane.Right;
			if (o.colorIndication && c.color) o.colorIndication.forEach(prop => {
				switch (prop) {
					case 'text':
						this.setColor(c.color, c.style, 'color'); break;
					case 'ruler':
						this.setColor(c.color, c.style, 'overviewRulerColor'); break;
					case 'after':
					case 'before':
						this.setColor(c.color, c.style, `${prop}.color`); break;
				}
			})

			result[category] = {
				type: vscode.window.createTextEditorDecorationType(c.style),
				options: []
			};
		}
		return result;
	};

	private getIconPath(fileName: string): string {
		return path.join(__dirname, '..', '..', 'images', fileName);
	}

	private setColor(color: string | {	dark: string,	light: string	}, style, prop: string) {
		// 🕮 <YL> 2be2105d-c01b-4bf7-89ab-03665aaa2ce1.md
		this.addNestedProperty(style,prop, typeof color === 'string' ? color : color.dark);
		this.addNestedProperty(style,`light.${prop}`, typeof color === 'string' ? color : color.light);
	}

	private addNestedProperty(base, propsString, value) {
		// 🕮 <YL> c5745bee-a5b1-4b45-966e-839fec3db57a.md
		const props = propsString.split('.');
		const lastProp = arguments.length === 3 ? props.pop() : false;

		let lastBase = props.reduce((base, prop) => {
			let value = base[prop] ? base[prop] : {};
			base[prop] = value;
			base = value;
			return base;
		}, base)

		if (lastProp) lastBase = lastBase[lastProp] = value;
		return lastBase;
	};

	updateDecorations({ pool = this.pool, reset = false }: { pool ?: SidenotesDictionary, reset?: boolean } = {}): void {
		// const editorsToUpdate: Set<vscode.TextEditor> = new Set();

		pool.each(getStylableDecorationOptions.bind(this));

		function getStylableDecorationOptions(designable: IDecorable) {
			if (designable.decorations)	{
				designable.decorations.forEach(decoration => {
					this.decorations[decoration.category].options.push(decoration.options);
					// editorsToUpdate.add(stylable.anchor.editor);
				})
			}
		};

		// if we have deleted last note
		// if (editorsToUpdate.size === 0) editorsToUpdate.add(vscode.window.activeTextEditor!);

		// const resetCategoryDecorations = (editor, category) => editor.setDecorations(this.decorations[category].type, []);
		// const applyCategoryDecorations = (editor, category) => {
		// 	editor.setDecorations(
		// 		this.decorations[category].type,
		// 		this.decorations[category].options
		// 	);
		// };

		for (let category in this.decorations) {
			// if (reset) editorsToUpdate.forEach(editor => this.resetCategoryDecorations(editor, category));
			// else editorsToUpdate.forEach(editor => this.applyCategoryDecorations(editor, category));
			if (reset) this.resetCategoryDecorations(pool.editor, category);
			else this.applyCategoryDecorations(pool.editor, category);

			this.decorations[category].options.length = 0 // clear array
		}
		// return editorsToUpdate;
	}

	resetCategoryDecorations(editor, category) {
		editor.setDecorations(this.decorations[category].type, []);
	}

	applyCategoryDecorations(editor, category) {
		editor.setDecorations(
			this.decorations[category].type,
			this.decorations[category].options
		);
	};

	resetDecorations(): void {
		return this.updateDecorations({ reset: true });
	}

	disposeDecorationTypes(): void {
		for (const category in this.decorations) {
			this.decorations[category].type.dispose();
		}
	}
}
