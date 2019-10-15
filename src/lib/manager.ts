import * as vscode from 'vscode';
import Document from './document';
import Sidenote from './sidenote';

import { MapDictionary } from './dictionary';
import cfg from './cfg';

import * as fs from 'fs';


class Manager {
	dictionary: MapDictionary<Sidenote>
	decorations: {
		[category: string]: {
			type: vscode.TextEditorDecorationType
			options: vscode.DecorationOptions[]
		}
	}
	activeEditor?: vscode.TextEditor

	// TODO Dependency injection
	// constructor(dictionaryProvider: { new(): MapDictionary<Sidenote> } ) { // new() D indicates that argument shoul be constructable
	constructor() { // new() D indicates that argument shoul be constructable
		this.dictionary = new MapDictionary();
		this._initDecorationConfig();

		// this.decorations = this._initDecorationConfig();
	}

	// TODO check prune
	// нам конечно надо запускать inventorize перд prune перед этим, но промежуточные результаты надо все равно где-то хранить, и как раз в dict мы их и записываем
	// хорошо было бы чтоб delete возвращал удаленный элемент, но на объектах такое не канает

	pruneBroken() {
		return this._prune(sidenote => sidenote._isBroken);
	}
	pruneEmpty() {
		return this._prune(sidenote => sidenote._isEmpty);
	}

	async _prune(getCondition) {
		this._init();

		// this.dictionary.prune(cb.bind(this));
		async function cb(sidenote: Sidenote): Promise<boolean> {
			const condition = getCondition(sidenote);
			if (condition) await sidenote.wipe();
			return condition;
		}

		for await (let sidenote of this.dictionary[Symbol.asyncIterator](cb)) {
			// if (getCondition()) {
			// 	await sidenote.wipe();
			// 	this.dictionary.delete(sidenote.id);
			// }
		}

		this.updateDecorations();
	}

	pruneAll() {
		this.pruneEmpty();
		this.pruneBroken();
	}

	async delete() {
		const idMarker = this._getIdMarkerMatchFromCurrentPosition();
		if (!idMarker) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return false;
		}
		const sidenote = Sidenote.create(this._stripMarker(idMarker), this.dictionary);
		await sidenote.wipe();
		this.dictionary.delete(sidenote.id);
		this.updateDecorations();
	}

	// TODO: cltлать clean rescan с очисткой базы и пересозданием, потому что бывает в базе записи которые уже изменили стейт, но сотались закэшированными и при инит достаются оттуда

	_initDecorationConfig() {
		let result = Object.create(null);
		for (let category in cfg.decorations) {
			if (category === 'common') continue;
			result[category] = {
				type: vscode.window.createTextEditorDecorationType(
					Object.assign(cfg.decorations['common'].style, cfg.decorations[category].style)
				),
				options: []
			};
		}
		this.decorations = result;
		return result;
	};

	updateDecorations() {
		const editorsToUpdate = new Set();

		this.dictionary.each(getSidenoteDecorationOptions.bind(this));
		function getSidenoteDecorationOptions(sidenote) {
			if (sidenote.decorations)	{
				sidenote.decorations.forEach(decoration => {
					this.decorations[decoration.category].options.push(decoration.options);
					editorsToUpdate.add(sidenote.anchorEditor);
				})
			}
		};
		for (let category in this.decorations) {
			// if(this.decorations[category].options.length) { // надо обновлят все категории, инчае если мы удалили один пустой коммент например, то стили для него не сбросятся, тк этот тип не будет вызыван с пустыми опциями
			const applyDecorations = editor => {
				// editor.setDecorations(this.decorations[category].type, [])
				editor.setDecorations(
					this.decorations[category].type,
					this.decorations[category].options
				);
			};
			editorsToUpdate.forEach(applyDecorations);
			this.decorations[category].options.length = 0 // clear array
		}
		return editorsToUpdate;
	}

	// checkForOrphanedSidenotes() {}  //TODO
	// migrate(targetFolder: string) {} //TODO
	// findAnchorsInCurrentRoot(path): string {

	// }

	// findAnchorsInDirectory() { //TODO: add to explorer context menu
	// 	fs.readdirSync(target dir). for each => content.match(sidenote.regexp) -> recreate sidenotes -> foreach fs.modeFile(sidenote.path, {didenotes.subfolder}targetdir)
	// }

	async internalize(sidenote) { //TODO test
		let text;
		// сначала апдейт
		sidenote.updateFromFile();
		// или прям из текущего редактора
		if (sidenote.editor) text = sidenote.editor.document.getText();
		await Document.editor.edit(
			edit => {
				edit.delete(Document.currentSelection);
				edit.insert(Document.currentSelection.active, text);
			}
		).then(sidenote.delete);
		this.updateDecorations();
	}

	temp() {
		this.decReset();
	}
	decReset() {

		for (const c in this.decorations) {
			Document.editor.setDecorations(this.decorations[c].type, [])
			// this.decorations[c].type.dispose();
			// this.decorations[c].type.dispose();
		}
		// this._initDecorationConfig()
		return false;
		// this.decorations.forEach(category => category.type.dispose());
	}

	/**
	* @const {string} RegExp to match sidenote ID expression
	*/
	UUID_REGEXP_STRING: string = '(\\d|[a-z]){8}-(\\d|[a-z]){4}-(\\d|[a-z]){4}-(\\d|[a-z]){4}-(\\d|[a-z]){12}'
	UUID_REGEXP: RegExp = new RegExp(this.UUID_REGEXP_STRING, 'g')
	sidenoteIdMarkerRegExp: RegExp = new RegExp(`${cfg.steadyPrefix}${this.UUID_REGEXP_STRING}`, 'g')
	//TODO по принципу sprintf только через регэкспы чтобы можно было задавтаь в конфиге структуру коммента, типа такого: '%p %i %s' - префикс + uuid + суффикс
	// sidenoteFull: RegExp = new RegExp(`cfg.anchorFormula`.replace(cfg.anchorFormula, this.UUID_REGEXP_STRING), 'g')
	// sidenoteIdRegExp: RegExp = new RegExp(`${cfg.steadyPrefix}${this.UUID_REGEXP_STRING}`)

	_stripMarker(marker: string): string {
		return marker.match(this.UUID_REGEXP_STRING)[0];
	}

	_getIdMarkersMatchFromText(text = Document.getText()): (string[]|null) {
		return text.match(this.sidenoteIdMarkerRegExp);
	}

	_getIdMarkerMatchFromCurrentPosition(): (string|null) {
		if (!(Document.workspaceFolderPath)) throw new Error('Files outside of a workspace cannot be annotated.');
		const text = Document.getTextFromCurrentLine();
		if (text) {
			const match = this._getIdMarkersMatchFromText(text);
			if (match) return match[0];
		}
		return null;
		//TODO support several notes in one line, open depending on cursor position
	}

	async run() { // аналог forEach для каждого аркера в случае int
		const idMarker = this._getIdMarkerMatchFromCurrentPosition();
		let id;
		if (idMarker) id = this._stripMarker(idMarker); // obtainMarker
		const sidenote = Sidenote.create(id, this.dictionary, false);
		if (!sidenote._hasAnchor) await sidenote.write(); // write нужен только в том случае, если у нас идт создание новой заметки, если срабатывает get или id по старому якорю, то не надо
		await sidenote.open();
		await sidenote.updateState({ readFile: false}); // т.к. sidenote переходит в состояние isOpen. в реестре апдейтится автоматически, т.к. это один и тот же объект)

		this.updateDecorations();
		return this;
	}

	/**
	*  scans current document, registers sidenotes and activates comments decorations
	*  should be called on extension activation and changes of active editor
	*/
	async _init(): Promise<this> {
		const idMarkers = await this._getIdMarkersMatchFromText();
		if (idMarkers) {
			idMarkers.forEach(recreate, this);

			function recreate(id): Sidenote {
				const sidenote = Sidenote.create(this._stripMarker(id), this.dictionary) // в принципе, можно использовать тут get dместо create, т.к. при переключении между редакторами например есть вероятность, что заметки уже будут в реестре
					.updateState({ readFile: true }); // апдейтим из файла + декорации генерируем
					// gjtxve e yfc тут update state, а в случае с open внутри open?
				return sidenote;
			}

			this.updateDecorations(); // апдейтим все после инициализации заметок
		}
		return this;
	}


	onDocumentSave(document) {
		// const id = document.fileName.match(/(\d|[a-z]){8}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){12}/g)[0];
		const id = this._getIdFromFile(document);
		if (id) {
			const sidenote = this.dictionary.get(id);
			sidenote.updateState();
		}
		this.updateDecorations();
		// remove watch
	}

	onFileChange() {
		// init
		// this.update();
	}

	// onDocumentClose(document) {
	// 	const id = this._getIdFromFile(document);
	// 	// const id = document.fileName.match(/(\d|[a-z]){8}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){12}/g)[0];
	// 	if (id) {
	// 		const sidenote = this.dictionary.get(id);
	// 		delete sidenote.editor;
	// 		sidenote.updateState();
	// 	}
	// 	this.updateDecorations();
	// 	// remove watch
	// }

	onEditorChange(editor) {
		console.log('change!');
		console.log(this.activeEditor === editor);
		console.log('vscode..activeTextEdiotr === editor)', vscode.window.activeTextEditor === editor);
		console.log('vscode..activeTextEdiotr === this.editor)', vscode.window.activeTextEditor === this.activeEditor);
		this.activeEditor = editor;
		// this._init();
	}
	onDocumentChange(document) {}

	/**
	* if documents resides in the specified subnotes folder, returns associated id derived from file name
	*
	* @param {vscode.TextDocument} document
	* @returns {string} sidenote document UUID
	*/
	_getIdFromFile(document:vscode.TextDocument): string {
		// const match = document.fileName.match(/(\d|[a-z]){8}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){4}-(\d|[a-z]){12}/g);
		return document.fileName.match(this.UUID_REGEXP)[0];
	}

	static get() {

	}
}

export default Manager;
