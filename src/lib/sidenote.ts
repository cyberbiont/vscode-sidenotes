import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import cfg from './cfg';
import Document from './document';
const uuidv4 = require('uuid/v4');

class Sidenote {
	id: string
	ext: string
	path: string
	content?: string
	// editor?: vscode.TextEditor
	anchorEditor?: vscode.TextEditor
	decorations ?: Array<{
		category: string
		options: vscode.DecorationOptions
	}>

	constructor(id: string, ext: string) {
		this.id = id;
		this.ext = '.md';
		this.path = this._getPath(); // calculated path for file
	}

	// * @returns { string } path to folder for sidenote
	_getPath(): string {
		const folder = path.join(Document.workspaceFolderPath, cfg.notesSubfolder);
		if (!fs.existsSync(folder)) fs.mkdirSync(folder);
		const absPath = path.join(folder, `${this.id}${this.ext}`);
		return absPath;
	}

	get _isBroken(): boolean {
		return typeof this.content === 'undefined';
	}

	get _isEmpty(): boolean {
		return this.content === '';
	}

	get _hasAnchor(): boolean {
		return 'anchorEditor' in this;
	}

	async wipe(): Promise<this> {
		this._deleteNoteFile();
		await this._deleteAnchorComment();
		return this;
	}
	_deleteNoteFile(): this {
		try{
			fs.unlinkSync(this.path);
		} catch (e) {
			// if file is not present, continue
		}
		return this;
	}
	async _deleteAnchorComment(): Promise<this> {
		// TODO надо обновить декорации везде глобально
		await this._toggleComment();
		await this.anchorEditor.edit(
			edit => { edit.delete( this.getRangeForMarker() ); }, // вычисляем range по новой т.к. после тоггла коммента позиция сместилась
			{ undoStopAfter: false, undoStopBefore: false }
		);
		return this;
	}

	async _toggleComment() {
		if(cfg.useMultilineComments) {
			const range = this.getRangeForMarker();
			const selection = new vscode.Selection(range.start, range.end);
			this.anchorEditor.selection = selection;
			vscode.commands.executeCommand('editor.action.blockComment');
		} else {
			vscode.commands.executeCommand('editor.action.commentLine');
		}
	}

	async write(): Promise<this> {
		await this._writeNoteFile();
		await this._writeAnchorComment();
		return this;
	}
	async _writeNoteFile(): Promise<this> {
		const initialContent = await Document.getInitialContent(this.ext);
		this.content = initialContent;
		if (!fs.existsSync(this.path)) {
			fs.writeFileSync(this.path, initialContent);
		}
		return this;
	}
	/**
	* creates anchor comment to document at current cursor position
	*/
	async _writeAnchorComment(): Promise<this> {
		if(this._hasAnchor) return this; // if file already has anchor, no need to write it
		this.anchorEditor = Document.editor;

		const position = Document.currentSelection.anchor;
		await this.anchorEditor.edit(
			edit => { edit.insert(position, this.marker); },
			{ undoStopAfter: false, undoStopBefore: false }
		);
		this._toggleComment();

		return this;
	}

	updateFromFile(): this {
		try {
			this.content = fs.readFileSync(this.path, { encoding: 'utf8' });
		} catch (error)	{
			// vscode.window.showErrorMessage(`<Failed to open file>. ${error.message}`);
		}
		return this;
	}

	updateState({ readFile = true }: { readFile?: boolean } = {}): this {
		if (readFile) this.updateFromFile();
		this.updateDecorationOptions();
		return this;
	}

	get marker(): string { //get full marker to be written in document
		return `${cfg.prefix}${cfg.steadyPrefix}${this.id}`;
	}

	getRangeForMarker(start: vscode.Position = (() => {
			const index = this.anchorEditor.document.getText().indexOf(this.marker);
			return this.anchorEditor.document.positionAt(index);
			// с помощью обычного match можно получить ИЛИ все маркеры, или маркер + индекс,
			// поэтому в inventorize получаем все маркеры, а тут дополнительно ищем индекс через indexof
			// мы не можем привязывать Range коммента включая символы комментария, потом что для разных языков они могут быть разными
		})()) {
		const end = start.translate({ characterDelta: this.marker.length })
		return new vscode.Range(start, end);
	}

	updateDecorationOptions(): this {
		this.decorations = [];
		this.decorations.length = 0;
		const range = this.getRangeForMarker();
		const categories = getDecorationCategories.call(this);
		categories.forEach(prepareCategoryOptions.bind(this));

		function getDecorationCategories(): string[] {
			const categories = [];
			if (this._isBroken) categories.push('broken');
			else if (this._isEmpty) categories.push('empty');
			else categories.push('active');

			// if (this._isOpen) categories.push('open');
			return categories;
		}

		function prepareCategoryOptions(category) {
			const hoverMessage = cfg.decorations[category].message ?
				cfg.decorations[category].message : this.content;
			this.decorations.push({
				options: { range, hoverMessage },
				category
			});
			return this.decorations;
		}

		return this;
	}

	/**
	* opens sidenote document, associated with comment anchor in current line, creating comment and document if they don't exits
	* in new editor window
	*/
	async open(scheme: string = 'file'): Promise<this> {

		const URI = vscode.Uri.parse(`${scheme}:${this.path}`);
		await vscode.workspace.openTextDocument(URI).then(
			doc => vscode.window.showTextDocument(doc, {
				viewColumn: vscode.ViewColumn.Beside,
				// preserveFocus: true // otherwise decorationUpdate triggers on new editor and 'open' note doesn't get highlight
				// preview: true,
			}),
			error => vscode.window.showErrorMessage(`<Failed to open file>. ${error.message}`)
		);
		// TODO add watch
		return this;
	}

	static create(id: string, dictionary, keepId: boolean = true): Sidenote {
		let sidenote;
		if (id) {
			sidenote = dictionary.get(id);
			if (sidenote) return sidenote;
		}
		if (keepId) {
			sidenote = spawn(id);
			sidenote.anchorEditor = Document.editor; // passed id means that there is a comment anchor already, hence the flag
			return sidenote;
		}

		return spawn(uuidv4());

		/**
		* creates sidenote instance with given id
		*
		* @param {string} id  sidenote identifier
		* @param {string} ext='.md' extension of the file to be created
		* @returns {Sidenote} sidenote class instance
		*/
		function spawn(id: string, ext:string = '.md') {
			// function spawn({ id, ext = '.md'}: {id?: string, ext?: string } = {}) {
			const sidenote = new Sidenote(id, ext);
			dictionary.add(sidenote);
			return sidenote;
		}
	}

	/**
	* TODO opens sidenote document in Typora
	*/
	// async openInTypora() {
	// 	if (!cfg.externalEditors.typora.includes(this.ext)) {
	// 		throw new Error('this file extension is not supported')
	// 	}
	// }

}

export default Sidenote;
