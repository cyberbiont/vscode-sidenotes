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
		private ReferenceContainer: Constructor<ReferenceContainer<any>>,
	) {
		this.init();
	}

	async init() {
		this.DRefContainer = new ReferenceContainer();
		this.editorRefContainer = new ReferenceContainer();

		this.editorReference = this.editorRefContainer.getProxy();
		this.DReference = this.DRefContainer.getProxy();

		this.updateEditor();
		return	await this.updateD();
	}
	return
	private async updateD(key: vscode.TextDocument = this.editorReference.document): Promise<D> {
		const item = await this.repo.get(key);
		this.DRefContainer.load(item);
		return item;
	};

	private updateEditor() {
		this.editorRefContainer.load(vscode.window.activeTextEditor!);
	}

	onEditorChange(document: vscode.TextDocument) {
		this.updateEditor();
		this.updateD(document);
	}
	getProxy(proxyFor: 'editor'): vscode.TextEditor
	getProxy(proxyFor: 'metadata'): D
	getProxy(proxyFor: 'editor'|'metadata'): D|vscode.TextEditor|undefined {
		switch(proxyFor) {
			case 'metadata': return this.DReference;
			case 'editor': return this.editorReference;
		}
	}
}
