import * as vscode from 'vscode';
import { IDictionary, ISidenote } from './types';

interface IDictionaryMulti<T> extends IDictionary<T> {
	isInitialized: boolean;
}

export default class Pool<T extends { anchor: { editor: vscode.TextEditor }}> {
	private dictionaryMap: Map<
		vscode.TextDocument,
		IDictionaryMulti<T>
	> = new Map();

	activeDictionary: IDictionaryMulti<T> = this.getDictionary(
		vscode.window.activeTextEditor!.document
	);

	constructor(
		// context,
		private Dictionary
	) {
		// TODO clean dictionaryMap in accordance with document disposal (onDocumentClose event delete keys)
		// vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this, context.subscriptions);
	}

	getDictionary(document): IDictionaryMulti<T> {
		let dictionary: IDictionaryMulti<T>;

		const queryResult = this.dictionaryMap.get(document);
		if (queryResult) {
			dictionary = queryResult;
			dictionary.each((sidenote: T) => {
				if (sidenote.anchor.editor)
					sidenote.anchor.editor = vscode.window.activeTextEditor!;
				// TODO use activeEditorUtils
			});
			return dictionary;
		}

		// other method
		// if (this.dictionaryPool[fileName]) return this.dictionaryPool[fileName];
		// let sidenotedDocument: vscode.TextDocument & { sidenotes?: IDictionary<T> };
		// const document = vscode.workspace.textDocuments.find(el => el === document) as ISidenottableDocument<T>;
		// if (document && document.sidenotes) {
		// 	dictionary = document.sidenotes; // TypeError: Cannot add property sidenotes, object is not extensible
		// 	return dictionary;
		// }
		// но т.к. не можем добавить св-во к документу, придется поддерживать свой реестр

		dictionary = new this.Dictionary();
		dictionary.isInitialized = false;
		this.dictionaryMap.set(document, dictionary);

		return dictionary;
	}

	onDidChangeActiveTextEditor(editor: vscode.TextEditor) {
		return (this.activeDictionary = this.getDictionary(editor.document));
	}

	getIsInitialized(): boolean {
		return this.activeDictionary.isInitialized;
	}
	setIsInitialized(state: boolean): void {
		this.activeDictionary.isInitialized = state;
	}


	delete(id: string) {
		return this.activeDictionary.delete(id);
	}
	get(id: string) {
		return this.activeDictionary.get(id);
	}
	add(item: T) {
		return this.activeDictionary.add(item);
	}
	clear() {
		this.activeDictionary.clear();
		this.setIsInitialized(false);
		return this.activeDictionary;
	}
	each(cb) {
		return this.activeDictionary.each(cb);
	}
}
