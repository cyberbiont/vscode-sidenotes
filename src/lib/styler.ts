import * as vscode from 'vscode';
import * as path from 'path';
import {
	// IDictionary,
	IAnchor,
	Pool,
} from './types';

export interface IStylableDecorations extends Array<{
	category: string
	options: vscode.DecorationOptions
}>{}

export interface IStylable {
	decorations: IStylableDecorations
	anchor: IAnchor
}

interface ISetDecorationFnConfig {
	type: vscode.TextEditorDecorationType
	options: vscode.DecorationOptions[]
}

export type OStyler = {
	anchor: {
		marker: {
			useMultilineComments: boolean
		}
		design: {
			before: string | false
			after: string | false
			hideMarker: boolean
			foldMarker: true
			gutterIcon: boolean

			ruler: boolean
			stateIndication: 'background'|'border'|'after'|'ruler'|false
			onOffIndication: 'background'|'border'|'after'|false
			decorations: {
				[preset: string]: {
					indicationColor: string
					style: vscode.DecorationRenderOptions
					message?: string
				}
			}
		}
	}
}

export default class Styler<T> {

	private decorations: {
		[category: string]: ISetDecorationFnConfig
	} = this.initDecorationConfig();

	constructor(
		// public pool: IDictionary<T>,
		private pool: Pool,
		private cfg: OStyler
	) {
	}

	initDecorationConfig(): {
		[category: string]: ISetDecorationFnConfig
	} {
		let result = Object.create(null);

		const d = this.cfg.anchor.design;
		const cs = d.decorations['common'].style;

		// if (!this.cfg.anchor.marker.useMultilineComments)
		// 	d.decorations['common'].style.isWholeLine = true;
		if (d.hideMarker) {
			cs.opacity = '0';
			// if (d.foldMarker) cs.letterSpacing = '-0.61rem';
			if (d.foldMarker) cs.letterSpacing = '-1rem';
		}

		if (d.gutterIcon)
			cs.gutterIconPath = path.join(
				__dirname,
				'..',
				'..',
				'images',
				'sidenote.svg'
			);
		if (d.before) cs.before = { contentText: d.before };
		if (d.after) cs.after = { contentText: d.after };
		if (d.ruler) {
			cs.overviewRulerLane =	vscode.OverviewRulerLane.Right;
			cs.overviewRulerColor = d.decorations['common'].indicationColor;
		}
		if (d.onOffIndication == 'border' || d.stateIndication == 'border') {
			cs.border = `1px solid ${d.decorations['common'].indicationColor}`;
		}
		if (d.onOffIndication) setIndication('common', d.onOffIndication);

		for (let category in d.decorations) {
			if (category === 'common') continue;

			if (d.stateIndication) {
				setIndication(category, d.stateIndication);
			}

			result[category] = {
				type: vscode.window.createTextEditorDecorationType(
					Object.assign(
						this.cfg.anchor.design.decorations['common'].style,
						this.cfg.anchor.design.decorations[category].style
					)
				),
				options: []
			};
		}
		return result;

		function setIndication(category, prop) {
			switch (prop) {
				case 'background':
					d.decorations[category].style.backgroundColor = d.decorations[category].indicationColor; break;
				case 'border':
					d.decorations[category].style.borderColor = d.decorations[category].indicationColor; break;
				case 'ruler':
					d.decorations[category].style.overviewRulerColor = d.decorations[category].indicationColor; break;
				case 'after':
					d.decorations[category].style.after = {
						// width: '2em',
						contentText: d.after ?  d.after : '  💬  ',
						// margin: '0 0 0 -1.6em',
						color: d.decorations[category].indicationColor
					}; break;
			}
		}
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
		if (editorsToUpdate.size == 0) editorsToUpdate.add(vscode.window.activeTextEditor!);

		for (let category in this.decorations) {
			// if(this.decorations[category].options.length) { // надо обновлят все категории, инчае если мы удалили один пустой коммент например, то стили для него не сбросятся, тк этот тип не будет вызыван с пустыми опциями;
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

	decReset(): Set<vscode.TextEditor> {
		return this.updateDecorations({ reset: true });
	}
}
