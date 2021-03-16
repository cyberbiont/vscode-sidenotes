import {
	Hover,
	MarkdownString,
	Position,
	Range,
	TextDocument,
	Uri,
	window,
} from 'vscode';

import Styler from './styler';
import { Inspector, Sidenote } from './sidenote';
import {
	SidenotesDictionary,
	SidenotesRepository,
	SidenotesDecorator,
} from './types';
import { ReferenceController } from './referenceContainer';
import Pruner from './pruner';
import Scanner, { ScanData } from './scanner';
import SidenoteProcessor from './sidenoteProcessor';
import { EditorUtils } from './utils';

type ExtensionSelectionDialogTypes = 'input' | 'pick';

export type OActions = {
	storage: {
		files: {
			extensionsQuickPick: string[];
		};
	};
};

export default class Actions {
	constructor(
		public styler: Styler,
		public inspector: Inspector,
		public pool: SidenotesDictionary,
		public poolController: ReferenceController<
			Promise<SidenotesDictionary>,
			TextDocument
		>,
		public pruner: Pruner,
		public scanner: Scanner,
		public sidenoteProcessor: SidenoteProcessor,
		public sidenotesRepository: SidenotesRepository,
		public decorator: SidenotesDecorator,
		public decoratorController: ReferenceController<SidenotesDecorator, string>,
		public utils: EditorUtils,
		public cfg: OActions,
	) {}

	async scan(): Promise<void> {
		const scanResults = this.scanner.scanText();
		if (!scanResults) return;

		if (!this.pool.isInitialized)
			await this.initializeDocumentSidenotesPool(scanResults);
		else await this.updateDocumentSidenotesPool(scanResults);
		// 🕮 <cyberbiont> 70b9807e-7739-4e0f-bfb5-7f1603cb4377.md

		this.decorator.updateDecorations();
	}

	async getHover(
		document: TextDocument,
		position: Position,
	): Promise<Hover | undefined> {
		const scanData = this.scanner.scanLine(document.lineAt(position));
		if (!scanData) return undefined;

		const uriEncodedScanData = encodeURIComponent(
			JSON.stringify({ onHoverScanData: scanData }),
		);

		const editCommandUri = Uri.parse(
			`command:sidenotes.annotate?${uriEncodedScanData}`,
		);
		const deleteCommandUri = Uri.parse(
			`command:sidenotes.delete?${uriEncodedScanData}`,
		);
		const wipeCommandUri = Uri.parse(
			`command:sidenotes.wipeAnchor?${uriEncodedScanData}`,
		);

		const contents = new MarkdownString(
			`[Edit](${editCommandUri}) [Delete](${deleteCommandUri}) [Wipe](${wipeCommandUri})`,
		);
		const [range] = scanData.ranges;
		contents.isTrusted = true;

		return new Hover(contents, range);
	}

	async initializeDocumentSidenotesPool(
		scanResults: ScanData[],
	): Promise<void> {
		if (!this.utils.checkFileIsLegible()) return;
		await Promise.all(
			scanResults.map(
				this.sidenotesRepository.create,
				this.sidenotesRepository,
			),
		);
		this.pool.isInitialized = true;
	}

	async updateDocumentSidenotesPool(
		scanResults: ScanData[],
	): Promise<Sidenote[]> {
		const updateDecorationRange = async (
			scanData: ScanData,
		): Promise<Sidenote> => {
			const sidenote: Sidenote = await this.sidenotesRepository.obtain(
				scanData,
			);
			sidenote.decorations = this.styler.get(sidenote, scanData.ranges);
			return sidenote;
		};
		return Promise.all(scanResults.map(updateDecorationRange));
	}

	async run({
		useCodeFence = false,
		selectExtensionBy = false,
		onHoverScanData,
	}: {
		useCodeFence?: boolean;
		selectExtensionBy?: ExtensionSelectionDialogTypes | false;
		onHoverScanData?: ScanData;
	} = {}): Promise<void> {
		try {
			if (!this.utils.checkFileIsLegible({ showMessage: true })) return;

			if (useCodeFence && !process.env.SIDENOTES_USE_CODE_FENCE)
				process.env.SIDENOTES_USE_CODE_FENCE = 'true';

			const scanData = onHoverScanData || this.scanner.scanLine();

			let sidenote: Sidenote | undefined;

			if (scanData) {
				const obtainedSidenote = await this.sidenotesRepository.obtain(
					scanData,
				);
				if (this.inspector.isBroken(obtainedSidenote)) {
					sidenote = await this.sidenoteProcessor.handleBroken(
						obtainedSidenote,
					);
				} else sidenote = obtainedSidenote;
			} else {
				let extension: string | undefined;

				if (selectExtensionBy) {
					const promptResult = await this.promptExtension(selectExtensionBy);
					if (promptResult) extension = `.${promptResult}`;
					else return;
				} else extension = undefined;

				sidenote = await this.sidenotesRepository.create({
					marker: { extension },
				});
			}

			this.scan();
			// 🕮 <cyberbiont> d296063a-56ff-4667-8a50-b2120c93158e.md
			if (sidenote) await this.sidenoteProcessor.open(sidenote);

			if (process.env.SIDENOTES_USE_CODE_FENCE)
				delete process.env.SIDENOTES_USE_CODE_FENCE;
		} catch (e) {
			console.log(e);
		}
	}

	// TODO extract to User Interactions
	async promptExtension(
		dialogType: ExtensionSelectionDialogTypes = 'input',
	): Promise<string | undefined> {
		let extension: string | undefined;

		if (dialogType === 'pick') {
			const action = await window.showQuickPick(
				this.cfg.storage.files.extensionsQuickPick.map((ext) => ({
					label: ext,
				})),
				{
					placeHolder: `choose extension of the content file to be created`,
				},
			);
			extension = action?.label;
		} else {
			extension = await window.showInputBox({
				prompt: 'Enter extension for your content file (without dot)',
				value: 'md',
			});
		}

		return extension;
	}

	async delete({
		deleteContentFile = true,
		onHoverScanData,
	}: {
		deleteContentFile?: boolean;
		onHoverScanData?: ScanData;
	} = {}): Promise<void> {
		const scanData = onHoverScanData || this.scanner.scanLine();
		if (!scanData) {
			window.showWarningMessage(
				'There is no sidenotes attached at current cursor position',
			);
			return;
		}
		const sidenote = await this.sidenotesRepository.obtain(scanData);
		await this.sidenoteProcessor.delete(sidenote, { deleteContentFile });
		this.decorator.updateDecorations();
	}

	async wipeAnchor({
		onHoverScanData,
	}: { onHoverScanData?: ScanData } = {}): Promise<void> {
		// 🕮 <cyberbiont> ee0dfe5b-ff4d-4e76-b494-967aa73151e1.md
		//! 🕮 <cyberbiont> 11f45863-9374-4824-ae21-4698c7aaf99f.md
		let range: Range;

		if (onHoverScanData) {
			const [[start, end]] = (onHoverScanData.ranges as unknown) as [
				Position[],
			]; // consequence of JSON convertion
			range = new Range(
				new Position(start.line, start.character),
				new Position(end.line, end.character),
			);
		} else {
			const scanData = this.scanner.scanLine();
			if (!scanData) return;
			[range] = scanData.ranges;
		}

		const lineRange = this.utils.extendRangeToFullLine(range);

		await this.utils.editor.edit(
			(edit) => {
				edit.delete(lineRange);
			},
			{ undoStopAfter: false, undoStopBefore: false },
		);

		this.refresh();
	}

	async prune(category: string): Promise<void> {
		this.scan();

		switch (category) {
			case 'broken':
				await this.pruner.pruneBroken();
				break;
			case 'empty':
				await this.pruner.pruneEmpty();
				break;
			default:
				await this.pruner.pruneAll();
		}

		this.decorator.updateDecorations();
	}

	reset(): void {
		this.decorator.resetDecorations();
		this.pool.clear();
		this.pool.isInitialized = false;
	}

	refresh(): void {
		this.reset();
		this.scan();
	}

	switchStylesCfg(): void {
		const key =
			this.decoratorController.key === 'default' ? 'alternative' : 'default';
		this.decoratorController.update(key);
		this.refresh();
	}
}
