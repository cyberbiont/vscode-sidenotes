import * as vscode from 'vscode';

import {
	Actual,
	Constructor,
	MapPool,
	SidenotesDictionary,
	Scanner,
} from './types';

/**
 * updates document-related (D) data based on currently active editor
 *
 * @export
 * @class DocumentsController
 * @template D
 */
export default class DocumentsController<D extends object> {
	private DActualKeeper: Actual<D>
	private editorActualKeeper: Actual<vscode.TextEditor>

	private actualD: D;
	private actualEditor: vscode.TextEditor;

	constructor(
		private pool: MapPool<vscode.TextDocument, D>,
		private ActualKeeper: Constructor<Actual<any>>,
		// private scanner: Scanner
	) {
		this.DActualKeeper = new ActualKeeper();
		this.editorActualKeeper = new ActualKeeper();

		this.actualEditor = this.editorActualKeeper.get();
		this.actualD = this.DActualKeeper.get();

		this.updateEditor();
		this.updateD();
	}

	private async updateD(key: vscode.TextDocument = this.actualEditor.document): Promise<D> {
		const item = await this.pool.get(key);
		this.DActualKeeper.set(item);
		return item;
	};

	private updateEditor() {
		this.editorActualKeeper.set(vscode.window.activeTextEditor!);
	}

	onEditorChange(document: vscode.TextDocument) {
		this.updateEditor();
		this.updateD(document);
	}
	get(actual: 'editor'): vscode.TextEditor
	get(actual: 'metadata'): D
	get(actual: 'editor'|'metadata'): D|vscode.TextEditor|undefined {
		switch(actual) {
			case 'metadata': return this.actualD;
			case 'editor': return this.actualEditor;
		}
	}
}
