import * as vscode from 'vscode';

import {
	ActiveEditorUtils,
	Actual,
	MapPool,
	SidenotesDictionary,
	Scanner,
} from './types';

export default class DocumentsController<D extends object> {
	constructor(
		private pool: MapPool<vscode.TextDocument, D>,
		private actualKeeper: Actual<D>,
		private scanner: Scanner,
		private activeEditorUtils: ActiveEditorUtils,
	) {
		this.updateActual(this.activeEditorUtils.editor.document);
	}

	async updateActual(key: vscode.TextDocument): Promise<D> {
		const item = await this.pool.get(key);
		this.actualKeeper.setActual(item);
		return item;
	};

	/**
	 * returns link to actual sidenotes dictionary
	 */
	get(): D {
		return this.actualKeeper.get();
	};

	onEditorChange(document: vscode.TextDocument) {
		return this.updateActual(document);
	}
}
