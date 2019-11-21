import * as vscode from 'vscode';
import * as path from 'path';

import {
	Constructor,
	IAnchor,
	ISidenote,
	ReferenceContainer,
	ReferenceController,
	SidenotesDictionary,
	MapRepository,
} from './types';

export interface IStylableDecoration {
	category: string
	options: vscode.DecorationOptions
}

export interface IStylable {
	decorations: IStylableDecoration[]
	anchor: {
		editor: vscode.TextEditor
	}
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

export type OStyler = {
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

export default class Styler<T extends IStylable> {
	private decorations: IDecorations  = this.initDecorationConfig();
	constructor(
		private pool: SidenotesDictionary,
		private cfg: OStyler
	) {}

	initDecorationConfig(): IDecorations  {
		const { settings: o, categories } = this.cfg.anchor.styles;

		if (!categories.common || !categories.common.style) throw new Error(`sidenotes: cannot build decoration types.
			the "common" section is not found inside styles configuration. It should contain `);

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
		// 🕮 2be2105d-c01b-4bf7-89ab-03665aaa2ce1
		this.addNestedProperty(style,prop, typeof color === 'string' ? color : color.dark);
		this.addNestedProperty(style,`light.${prop}`, typeof color === 'string' ? color : color.light);
	}

	private addNestedProperty(base, propsString, value) {
		// 🕮 c5745bee-a5b1-4b45-966e-839fec3db57a
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

	updateDecorations({ reset = false }: { reset?: boolean } = {}): Set<vscode.TextEditor> {
		const editorsToUpdate: Set<vscode.TextEditor> = new Set();

		this.pool.each(getStylableDecorationOptions.bind(this));

		function getStylableDecorationOptions(stylable: IStylable) {
			if (stylable.decorations)	{
				stylable.decorations.forEach(decoration => {
					this.decorations[decoration.category].options.push(decoration.options);
					editorsToUpdate.add(stylable.anchor.editor);
				})
			}
		};

		// if we have deleted last note
		if (editorsToUpdate.size === 0) editorsToUpdate.add(vscode.window.activeTextEditor!);

		for (let category in this.decorations) {
			const applyDecorations = editor => {
				editor.setDecorations(
					this.decorations[category].type,
					this.decorations[category].options
				);
			};
			const resetDecorations = editor => editor.setDecorations(this.decorations[category].type, []);

			if (reset) editorsToUpdate.forEach(resetDecorations);
			else editorsToUpdate.forEach(applyDecorations);

			this.decorations[category].options.length = 0 // clear array
		}

		return editorsToUpdate;
	}

	resetDecorations(): Set<vscode.TextEditor> {
		return this.updateDecorations({ reset: true });
	}

	disposeDecorationTypes(): void {
		for (const category in this.decorations) {
			this.decorations[category].type.dispose();
		}
	}
}



/* export class StylerController<T extends IStylable>
implements ReferenceController<OStyler, Styler>

{
	private container: ReferenceContainer<Styler<T>>
	private reference: Styler<T>

	constructor(
		private repo: MapRepository<OStyler, Styler<T>>,
		ReferenceContainer: Constructor<ReferenceContainer<any>>,
		cfg: OStyler,
		commands
	) {
		this.container = new ReferenceContainer();
		this.reference = this.container.getProxy();
		// this.o = cfg.anchor.styles;
		commands.registerCommand('sidenotes.toggleIds', this.toggleIds, this);
	}

	getReference(): Styler<T> {
		return this.reference;
	}

	async update(key) {
		const instance = await this.repo.get(key);
		this.container.load(instance);
	}

	private toggleIds() {
		this.stylerReference;
	}
} */
