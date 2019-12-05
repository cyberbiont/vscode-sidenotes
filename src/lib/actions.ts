import * as vscode from 'vscode';
import {
	Designer,
	EditorUtils,
	IScanData,
	ISidenote,
	Inspector,
	Pruner,
	Scanner,
	SidenoteProcessor,
	SidenotesDictionary,
	SidenotesRepository,
	SidenotesStyler,
	ReferenceController
} from './types';

export default class Actions {
	constructor(
		public designer: Designer,
		public inspector: Inspector,
		public pool: SidenotesDictionary,
		public pruner: Pruner,
		public scanner: Scanner,
		public sidenoteProcessor: SidenoteProcessor,
		public sidenotesRepository: SidenotesRepository,
		public styler: SidenotesStyler,
		public stylerController: ReferenceController<SidenotesStyler, string>,
		public utils: EditorUtils
	) {}

	async scan(): Promise<void> {
		const scanResults = this.scanner.scanText();
		if (!scanResults)	return;

		if (!this.pool.isInitialized) await this.initializeDocumentSidenotesPool(scanResults);
		else await this.updateDocumentSidenotesPool(scanResults);
		// 🕮 70b9807e-7739-4e0f-bfb5-7f1603cb4377

		this.styler.updateDecorations();
	}

	async initializeDocumentSidenotesPool(scanResults: IScanData[]): Promise<void> {
		if (!this.utils.checkFileIsLegible()) return;
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
			if (!this.utils.checkFileIsLegible({ showMessage: true })) return;

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

	async createCustom() {

	}

	async delete({ deleteContentFile = true }: { deleteContentFile?: boolean } = {}): Promise<void> {
		const scanData = this.scanner.scanLine();
		if (!scanData) {
			vscode.window.showInformationMessage('There is no sidenotes attached at current cursor position');
			return;
		}

		let sidenote = await this.sidenotesRepository.obtain(scanData);
		await this.sidenoteProcessor.delete(sidenote, { deleteContentFile });

		this.styler.updateDecorations();
	}

	async prune(category) {
		this.scan();

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

	refresh() {
		this.reset();
		this.scan();
	}

	switchStylesCfg() {
		const key = this.stylerController.key === 'default' ? 'alternative' : 'default';
		this.stylerController.update(key);
		this.refresh();
	}
}
