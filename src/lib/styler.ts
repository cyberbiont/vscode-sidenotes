import * as vscode from 'vscode';

import {
	IDictionary,
	IAnchor
} from './types';

export interface IStylableDecorations extends Array<{
	category: string
	options: vscode.DecorationOptions
}>{}

export interface IStylable {
	decorations: IStylableDecorations
	anchor: IAnchor
}

export type IStylerCfg = {
	decorations: {
		[preset: string]: {
			style: vscode.DecorationRenderOptions
			message?: string
		}
	}
}

interface ISetDecorationFnConfig {
	type: vscode.TextEditorDecorationType
	options: vscode.DecorationOptions[]
}

export default class Styler<T> {

	private decorations: {
		[category: string]: ISetDecorationFnConfig
	}
	constructor(
		public pool: IDictionary<T>,
		public cfg: IStylerCfg,
	) {
		this.cfg = cfg;
		this.pool = pool;
		this.decorations = this.initDecorationConfig();
	}

	initDecorationConfig(): {
		[category: string]: ISetDecorationFnConfig
	} {
		let result = Object.create(null);
		for (let category in this.cfg.decorations) {
			if (category === 'common') continue;
			result[category] = {
				type: vscode.window.createTextEditorDecorationType(
					Object.assign(
						this.cfg.decorations['common'].style,
						this.cfg.decorations[category].style
					)
				),
				options: []
			};
		}
		return result;
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
