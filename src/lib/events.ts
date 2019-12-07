import * as vscode from 'vscode';
import * as path from 'path';
import {
	Actions,
	EventEmitter,
	ICfg,
	IChangeData,
	// IChangeTracker,
	ISidenote,
	MarkerUtils,
	ReferenceController,
	Scanner,
	SidenoteProcessor,
	SidenotesDictionary,
	SidenotesRepository,
	SidenotesStyler,
} from './types';

export default class Events {
	constructor(
		private actions: Actions,
		private cfg: ICfg,
		// private changeTracker: IChangeTracker,
		private editor: vscode.TextEditor,
		private pool: SidenotesDictionary,
		private scanner: Scanner,
		private sidenoteProcessor: SidenoteProcessor,
		private sidenotesRepository: SidenotesRepository,
		private styler: SidenotesStyler,
		private utils: MarkerUtils,
		private editorController: ReferenceController<vscode.TextEditor>,
		private poolController: ReferenceController<Promise<SidenotesDictionary>, vscode.TextDocument>
	) {}

	async onEditorChange(editor: vscode.TextEditor) {
		try {
			await this.editorController.update();
			await this.poolController.update(editor.document);
			this.pool.each((sidenote: ISidenote) => sidenote.anchor.editor = this.editor);
			this.actions.scan();
		} catch (e) {
			console.log(e);
		}
	};

	/**
	 * includes additional check to prevent triggering scan on sidenote files
	 */
	onVscodeEditorChange(editor: vscode.TextEditor) {
		if (this.utils.getIdFromString(editor.document.fileName)) return;
		this.onEditorChange(editor);
	};

	/**
	 update sidenote content and source document decorations
	 */
	async onSidenoteDocumentChange(changeData: IChangeData) {
		const key = this.utils.getKey(changeData.id, path.extname(changeData.path));
		const sidenote = await this.sidenotesRepository.get(key);
		// const sidenote = await this.sidenotesRepository.get(changeData.path);
		if (!sidenote) throw new Error('Error: sidenote being edited is not present in pool');

		this.sidenoteProcessor.updateContent(sidenote);
		this.styler.updateDecorations();
	};

	async onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
		if (!event.contentChanges.some(
			change => {
				// 🕮 aef6cc81-45c3-43bc-8f49-97c7f6ded1c7
				const condition = (
					(change.rangeLength &&
						change.rangeLength >= this.utils.BARE_MARKER_SYMBOLS_COUNT) ||
					(this.utils.BARE_MARKER_SYMBOLS_COUNT &&
						change.text.includes(this.cfg.anchor.marker.salt))
						// change.text.indexOf(this.cfg.anchor.marker.salt) !== -1) // ensures that change includes marker
				);
				return condition;
			}
		)) return;

		// rescan positions for decorations in current document
		const scanResults = this.scanner.scanText();
		if (!scanResults) return;

		await this.actions.updateDocumentSidenotesPool(scanResults);

		this.styler.updateDecorations();
	};

}
