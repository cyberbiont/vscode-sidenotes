import * as vscode from 'vscode';
import * as path from 'path';
import {
	Actions,
	DocumentInitializableSidenotesRepository,
	EventEmitter,
	ICfg,
	IChangeData,
	ISidenote,
	MarkerUtils,
	ReferenceController,
	Scanner,
	SidenoteProcessor,
	SidenotesDictionary,
	SidenotesDecorator,
} from './types';

export default class Events {
	constructor(
		private actions: Actions,
		private cfg: ICfg,
		private editor: vscode.TextEditor,
		private pool: SidenotesDictionary,
		private scanner: Scanner,
		private sidenoteProcessor: SidenoteProcessor,
		private decorator: SidenotesDecorator,
		private utils: MarkerUtils,
		private editorController: ReferenceController<vscode.TextEditor>,
		private poolController: ReferenceController<Promise<SidenotesDictionary>, vscode.TextDocument>,
		private poolRepository: DocumentInitializableSidenotesRepository
	) {}

	async onEditorChange(editor: vscode.TextEditor) {
		if (!editor) return; //! 🕮 <YL> 23a3d9cc-aa47-487e-952a-78c177efe655.md
		try {
			await this.editorController.update();
			await this.poolController.update(editor.document);
			this.pool.editor = editor;
			this.actions.scan();
		} catch (e) {
			console.log(e);
		}
	};

	/**
	 update sidenote content and source document decorations
	 */
	async onSidenoteDocumentChange(changeData: IChangeData) {
		const key = this.utils.getKey(changeData.id, path.extname(changeData.path));
		const pools: SidenotesDictionary[] = [];
		const documents = vscode.workspace.textDocuments;

		const sidenotes = await Promise.all(documents.map(async document => {
			if (document.isClosed) return;
			const pool = await this.poolRepository.obtain(document);
			const sidenote = pool.get(key);
			if (sidenote)	pools.push(pool);
			return sidenote;
		})).then(results => results.filter((result): result is ISidenote => !!result));

		if (sidenotes.length === 0) throw new Error('Update sidenote failed: no corresponding sidenotes were found in pool');
		sidenotes.map(sidenote => this.sidenoteProcessor.updateContent(sidenote));
		pools.map(pool => this.decorator.updateDecorations({ pool }));
	};

	async onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent) {
		if (!event.contentChanges.some(
			change => {
				// 🕮 <YL> aef6cc81-45c3-43bc-8f49-97c7f6ded1c7.md
				const condition = (
					(change.rangeLength &&
						change.rangeLength >= this.utils.BARE_MARKER_SYMBOLS_COUNT) ||
					(this.utils.BARE_MARKER_SYMBOLS_COUNT &&
						change.text.includes(this.cfg.anchor.marker.salt))
				);
				return condition;
			}
		)) return;

		// rescan positions for decorations in current document
		const scanResults = this.scanner.scanText();
		if (!scanResults) return;

		await this.actions.updateDocumentSidenotesPool(scanResults);

		this.decorator.updateDecorations();
	};

}
