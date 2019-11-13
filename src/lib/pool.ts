import * as vscode from 'vscode';
import {
	IDictionary,
	ISidenote
} from './types';
import { SidenoteBuilder } from './sidenote';

// type ISidenottableDocument<T> = vscode.TextDocument & { sidenotes?: IDictionary<T> }

// TODO rewrite as proxy?

interface IDictionaryMulti<ISidenote>extends IDictionary<ISidenote> {
	isInitialized: boolean;
}

export default class Pool {
	// private dictionaryPool: {
	// 	[ documentPath: string ]: IDictionary<T>
	// }
	private dictionaryMap: Map<vscode.TextDocument, IDictionaryMulti<ISidenote>>;
	activeDictionary: IDictionaryMulti<ISidenote>;

	constructor(
		// context,
		private Dictionary
	) {
		this.dictionaryMap = new Map();
		// TODO clean dictionaryMap in accordance with document disposal (onDocumentClose event delete keys)

		this.activeDictionary = this.getDictionary(vscode.window.activeTextEditor!.document);
		// vscode.window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor, this, context.subscriptions);
	}

	getDictionary(document): IDictionaryMulti<ISidenote> {
		let dictionary: IDictionaryMulti<ISidenote>;

		const queryResult = this.dictionaryMap.get(document);
		if (queryResult) {
			dictionary = queryResult;
			// console.log('document found in map');
			dictionary.each((sidenote: ISidenote) => {
				if (sidenote.anchor.editor)	sidenote.anchor.editor = vscode.window.activeTextEditor! // TODO use activeEditorUtils
			})
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
		// console.log(vscode.workspace.textDocuments);
		this.activeDictionary = this.getDictionary(editor.document);
		// console.log(this.activeDictionary.list);
	}

	getIsInitialized() {
		return this.activeDictionary.isInitialized;
	}

	setIsInitialized(state: boolean): boolean {
		try {
			this.activeDictionary.isInitialized = state;
			return true;
		} catch(e) {
			return false;
		}
	}

	delete(id: string) { return this.activeDictionary.delete(id) }
	get(id: string) { return this.activeDictionary.get(id) }
	add(item: ISidenote) {
		// const queryResult = this.activeDictionary.get(item.id);
		// if (queryResult) {
		// 	if (
		// 		!queryResult.decorations.some(
		// 			decoration =>
		// 				decoration.options.range.start.character === item.decorations[0].options.range.start.character &&
		// 				decoration.options.range.start.line ===	item.decorations[0].options.range.start.line
		// 		)
		// 	) {
		// 		queryResult.decorations.push(item.decorations[0]);
		// 	}
		// }

		return this.activeDictionary.add(item);
	}
	clear() {
		this.activeDictionary.clear();
		this.setIsInitialized(false);
		return this.activeDictionary;
	}
	each(cb) { return this.activeDictionary.each(cb) }
}
