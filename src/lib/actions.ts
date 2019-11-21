import * as vscode from 'vscode';
import {
	Designer,
	DocumentsController,
	EventEmitter,
	FileSystem,
	ICfg,
	IChangeData,
	IChangeTracker,
	IEditorService,
	IScanData,
	ISidenote,
	Inspector,
	MarkerUtils,
	Pruner,
	Scanner,
	SidenoteProcessor,
	SidenotesDictionary,
	SidenotesRepository,
	SidenotesStyler,
} from './types';

export default class Actions {
	constructor(
		public styler: SidenotesStyler,
		private pruner: Pruner,
		private sidenoteProcessor: SidenoteProcessor,
		private scanner: Scanner,
		private fileSystem: FileSystem,
		public pool: SidenotesDictionary,
		private inspector: Inspector,
		private editor: vscode.TextEditor,
		private utils: MarkerUtils,
		private sidenotesRepository: SidenotesRepository,
		private changeTracker: IChangeTracker,
		private designer: Designer,
		private documentsController: DocumentsController< SidenotesDictionary>,
		private cfg: ICfg
	) {}

	// eventListeners
	async onEditorChange(editor: vscode.TextEditor) {
		await this.documentsController.onEditorChange(editor.document);
		this.pool.each((sidenote: ISidenote) => sidenote.anchor.editor = this.editor);
		this.scanDocumentAnchors();
	};

	onVscodeEditorChange(editor: vscode.TextEditor) {
		// add additional check to prevent triggering scan on sidenote files
		if (this.changeTracker.getIdFromFileName(editor.document.fileName)) return;
		this.onEditorChange(editor);
	};

	async onSidenoteDocumentChange(changeData: IChangeData) { // update sidenote content and source document decorations
		const sidenote = await this.sidenotesRepository.get(changeData.id);
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
						change.text.indexOf(this.cfg.anchor.marker.salt) !== -1) // ensures that change includes marker
				);
				return condition;
			}
		)) return;

		// rescan positions for decorations in current document
		const scanResults = this.scanner.getIdsFromText();
		if (!scanResults) return;

		await this.updateDocumentSidenotesPool(scanResults);

		this.styler.updateDecorations();
	};

	async scanDocumentAnchors(): Promise<void> {
		// надо просто знать, если уже уже пул для этого документа или нет, если есть, то не пересканируем, просто апдейтим декорации
		const scanResults = this.scanner.getIdsFromText();
		if (!scanResults)	return;

		if (!this.pool.isInitialized) await this.initializeDocumentSidenotesPool(scanResults);
		else await this.updateDocumentSidenotesPool(scanResults);
		// 🕮 70b9807e-7739-4e0f-bfb5-7f1603cb4377

		this.styler.updateDecorations();
	}

	async initializeDocumentSidenotesPool(scanResults: IScanData[]): Promise<void> {
		await Promise.all(scanResults.map(this.sidenotesRepository.create, this.sidenotesRepository));
		this.pool.isInitialized = true;
	}

	async updateDocumentSidenotesPool(scanResults: IScanData[]) {
		const updateDecorationRange = async (scanData: IScanData): Promise<ISidenote> => {
			const sidenote = await this.sidenotesRepository.obtain(scanData);
			sidenote.decorations = this.designer.get(sidenote, scanData.ranges);
			return sidenote;
		}
		return Promise.all(scanResults.map(updateDecorationRange));
	}

	async run(): Promise<void> {
		try {
			const scanData = this.scanner.scanLine();

			let obtainedSidenote = await this.sidenotesRepository.obtain(scanData);

			let sidenote: ISidenote | undefined;
			if (this.inspector.isBroken(obtainedSidenote)) {
				sidenote = await this.sidenoteProcessor.handleBroken(obtainedSidenote);
			} else sidenote = obtainedSidenote;

			if (sidenote) await this.sidenoteProcessor.open(sidenote);

			this.styler.updateDecorations();

		} catch(e) {
			console.log(e);
		}
	}

	async delete(): Promise<void> {
		const scanData = this.scanner.scanLine();
		if (!scanData) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return;
		}

		let sidenote = await this.sidenotesRepository.obtain(scanData);
		await this.sidenoteProcessor.delete(sidenote);

		this.styler.updateDecorations();
	}

	async prune(category) {
		this.scanDocumentAnchors();

		switch (category) {
			case 'broken': await this.pruner.pruneBroken(); break;
			case 'empty': await this.pruner.pruneEmpty(); break;
			default: await this.pruner.pruneAll();
		}

		this.styler.updateDecorations();
	}

	reset() {
		this.styler.resetDecorations();
		this.pool.clear();
		this.pool.isInitialized = false;
	}

	toggleAnchorsFolding() {// TODO
		// надо обернуть стайлер в actual  и переключаться между двумя его инстансами, в одном из которых будут развернутые комменты
	}
}
