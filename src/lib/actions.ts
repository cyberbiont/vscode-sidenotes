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

type ExtensionSelectionDialogTypes = 'input'|'pick';

export type OActions = {
	storage: {
		files: {
			extensionsQuickPick: string[]
		}
	},
	anchor: {
		comments: {
			affectNewlineSymbols: boolean
		}
	}
}

export default class Actions {
	constructor(
		public designer: Designer,
		public inspector: Inspector,
		public pool: SidenotesDictionary,
		public poolController,
		public pruner: Pruner,
		public scanner: Scanner,
		public sidenoteProcessor: SidenoteProcessor,
		public sidenotesRepository: SidenotesRepository,
		public styler: SidenotesStyler,
		public stylerController: ReferenceController<SidenotesStyler, string>,
		public utils: EditorUtils,
		public cfg: OActions
	) {}

	async scan(): Promise<void> {
		const scanResults = this.scanner.scanText();
		if (!scanResults)	return;

		if (!this.pool.isInitialized) await this.initializeDocumentSidenotesPool(scanResults);
		else await this.updateDocumentSidenotesPool(scanResults);
		// 🕮 <YL> 70b9807e-7739-4e0f-bfb5-7f1603cb4377.md

		this.styler.updateDecorations();
	}

	async getHover(document: vscode.TextDocument, position: vscode.Position) {
		const scanData = this.scanner.scanLine(document.lineAt(position));
		if (!scanData) return undefined;

		const uriEncodedScanData = encodeURIComponent(JSON.stringify({ onHoverScanData: scanData }));

		const editCommandUri = vscode.Uri.parse(`command:sidenotes.annotate?${uriEncodedScanData}`);
		const deleteCommandUri = vscode.Uri.parse(`command:sidenotes.delete?${uriEncodedScanData}`);
		const wipeCommandUri = vscode.Uri.parse(`command:sidenotes.wipeAnchor?${uriEncodedScanData}`);

		const contents = new vscode.MarkdownString(`[Edit](${editCommandUri}) [Delete](${deleteCommandUri}) [Wipe](${wipeCommandUri})`);
		const [ range ] = scanData.ranges;
		contents.isTrusted = true;

		return new vscode.Hover(contents, range);
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

	async run({
			selectExtensionBy = false,
			onHoverScanData
		}: {
			selectExtensionBy?: ExtensionSelectionDialogTypes|false,
			onHoverScanData?: IScanData
		} = {}
	): Promise<void> {
		try {
			if (!this.utils.checkFileIsLegible({ showMessage: true })) return;

			const scanData = onHoverScanData ? onHoverScanData : this.scanner.scanLine();

			let sidenote: ISidenote | undefined;

			if (scanData) {
				const obtainedSidenote = await this.sidenotesRepository.obtain(scanData);
				if (this.inspector.isBroken(obtainedSidenote)) {
					sidenote = await this.sidenoteProcessor.handleBroken(obtainedSidenote);
				}
				else sidenote = obtainedSidenote;
			}	else {
				const extension = selectExtensionBy ? `.${await this.promptExtension(selectExtensionBy)}` : undefined;

				if (this.cfg.anchor.comments.affectNewlineSymbols && this.utils.editor.selection.isEmpty) {
					await vscode.commands.executeCommand('editor.action.insertLineBefore');
				}

				sidenote = await this.sidenotesRepository.create({
					marker: {
						extension
					}
				});
			}

			if (sidenote) await this.sidenoteProcessor.open(sidenote);

			this.styler.updateDecorations();

		} catch(e) {
			console.log(e);
		}
	}
	// TODO extract to User Interactions
	async promptExtension(dialogType: ExtensionSelectionDialogTypes = 'input'): Promise<string|undefined> {
		let extension: string|undefined;

		if (dialogType === 'pick') {
			const action = await vscode.window.showQuickPick(
				this.cfg.storage.files.extensionsQuickPick.map(ext => ({
					label: ext
				})), {
					placeHolder: `choose extension to the content file to be created`
				}
			);
			extension = action ? action.label : undefined;

		} else {
			extension = await vscode.window.showInputBox({
				prompt: 'Enter extension for your content file (without dot)',
				value: 'md',
			})
		}

		return extension;
	}

	async delete({
			deleteContentFile = true,
			onHoverScanData
		}: {
			deleteContentFile?: boolean,
			onHoverScanData?: IScanData
		} = {}
	): Promise<void> {

		const scanData = onHoverScanData ? onHoverScanData : this.scanner.scanLine();
		if (!scanData) {
			vscode.window.showWarningMessage(
				'There is no sidenotes attached at current cursor position'
			);
			return;
		};
		const sidenote = await this.sidenotesRepository.obtain(scanData);
		await this.sidenoteProcessor.delete(sidenote, { deleteContentFile });
		this.styler.updateDecorations();
	}

	async wipeAnchor({
			onHoverScanData
		}: {
			onHoverScanData?: any
		} = {}): Promise<void> {
		// 🕮 <YL> ee0dfe5b-ff4d-4e76-b494-967aa73151e1.md
		let range: vscode.Range;
		if (onHoverScanData) {
			const [[ start, end ]] = onHoverScanData.ranges as any;

			range = new vscode.Range(
				new vscode.Position(start.line, start.character),
				new vscode.Position(end.line, end.character)
			);
		} else {
			const scanData = this.scanner.scanLine();
			if (!scanData) return;
			([ range ] = scanData.ranges);
		}

		const lineRange = this.utils.getTextLine(range.start).range;

		await this.utils.editor.edit(
			edit => { edit.delete(lineRange); },
			{ undoStopAfter: false, undoStopBefore: false }
		);

		this.refresh();
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
