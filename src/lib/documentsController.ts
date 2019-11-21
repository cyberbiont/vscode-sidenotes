import * as vscode from 'vscode';

import {
	Constructor,
	MapRepository,
	ReferenceContainer,
	Scanner,
	SidenotesDictionary,
} from './types';

/**
 * updates document-related (D) data based on currently active editor
 *
 * @export
 * @class DocumentsController
 * @template D
 */
export default class DocumentsController<D extends object> {
	private DRefContainer: ReferenceContainer<D>
	private editorRefContainer: ReferenceContainer<vscode.TextEditor>

	private DReference: D;
	private editorReference: vscode.TextEditor;

	constructor(
		private repo: MapRepository<vscode.TextDocument, D>,
		ReferenceContainer: Constructor<ReferenceContainer<any>>,
	) {
		this.init();
	}

	async init() {
		this.DRefContainer = new ReferenceContainer();
		this.editorRefContainer = new ReferenceContainer();

		this.editorReference = this.editorRefContainer.getProxy();
		this.DReference = this.DRefContainer.getProxy();

		this.update();
	}
	private async update() {
		this.updateEditor();
		await this.updateD();
	}

	private async updateD(key: vscode.TextDocument = this.editorReference.document): Promise<D> {
		const item = await this.repo.get(key);
		this.DRefContainer.load(item);
		return item;
	};

	private updateEditor(editor: vscode.TextEditor = vscode.window.activeTextEditor!) {
		this.editorRefContainer.load(editor);
	}

	onEditorChange(document: vscode.TextDocument) {
		this.updateEditor();
		this.updateD(document);
	}
	getReference(proxyFor: 'editor'): vscode.TextEditor
	getReference(proxyFor: 'metadata'): D
	getReference(proxyFor: 'editor'|'metadata'): D|vscode.TextEditor|undefined {
		switch(proxyFor) {
			case 'metadata': return this.DReference;
			case 'editor': return this.editorReference;
		}
	}
}
