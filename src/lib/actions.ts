import {
	Hover,
	MarkdownString,
	OpenDialogOptions,
	Position,
	Range,
	TextDocument,
	Uri,
	window,
	WorkspaceFolder,
} from 'vscode';
import dedent from 'ts-dedent';
import { Inspector, Sidenote } from './sidenote';
import Scanner, { ScanData } from './scanner';
import {
	SidenotesDecorator,
	SidenotesDictionary,
	SidenotesRepository,
} from './types';
import UserInteraction, {
	ExtensionSelectionDialogTypes,
} from './userInteraction';

import { EditorUtils } from './utils';
import { FileData, FileStorage } from './storageService';
import Pruner from './pruner';
import { ReferenceController } from './referenceContainer';
import SidenoteProcessor from './sidenoteProcessor';
import Signature from './signature';
import Styler from './styler';

import path from 'path';
import SnFileSystem from './fileSystem';
import VsOutputChannel from './outputChannel';

export type OActions = {
	app: {
		showIdOnHover: boolean;
	};
	storage: {
		files: {
			extensionsQuickPick: string[];
		};
	};
};

export default class Actions {
	constructor(
		public channel: VsOutputChannel,
		public styler: Styler,
		public inspector: Inspector,
		public fileStorage: FileStorage,
		public pool: SidenotesDictionary,
		public poolController: ReferenceController<
			SidenotesDictionary,
			TextDocument
		>,
		public pruner: Pruner,
		public scanner: Scanner,
		public sidenoteProcessor: SidenoteProcessor,
		public sidenotesRepository: SidenotesRepository,
		public decorator: SidenotesDecorator,
		public decoratorController: ReferenceController<SidenotesDecorator, string>,
		public utils: EditorUtils,
		public userInteraction: UserInteraction,
		public signature: Signature,
		public fs: SnFileSystem,
		public cfg: OActions,
	) {}

	async scan() {
		const scanResults = this.scanner.scanText();
		if (!scanResults) return;

		if (!this.pool.isInitialized)
			await this.initializeDocumentSidenotesPool(scanResults);
		else await this.updateDocumentSidenotesPool(scanResults);
		// 🕮 <cyberbiont> 70b9807e-7739-4e0f-bfb5-7f1603cb4377.md

		this.decorator.updateDecorations();
	}

	async getHover(document: TextDocument, position: Position) {
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
		const signCommandUri = Uri.parse(
			`command:sidenotes.changeSidenoteSignature?${uriEncodedScanData}`,
		);

		const id = this.cfg.app.showIdOnHover ? scanData.id : ``;

		const contents = new MarkdownString(
			dedent`
			[Edit](${editCommandUri})
			[Delete](${deleteCommandUri})
			[Wipe](${wipeCommandUri})
			[Sign](${signCommandUri})
			by ${scanData.signature}\n
			${id}`,
		);
		const [range] = scanData.ranges;
		contents.isTrusted = true;

		return new Hover(contents, range);
	}

	async initializeDocumentSidenotesPool(scanResults: ScanData[]) {
		if (!this.utils.checkFileIsLegible()) return;
		await Promise.all(
			scanResults.map(
				this.sidenotesRepository.create,
				this.sidenotesRepository,
			),
		);
		this.pool.isInitialized = true;
	}

	async updateDocumentSidenotesPool(scanResults: ScanData[]) {
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
	} = {}) {
		try {
			if (!this.utils.checkFileIsLegible({ showMessage: true })) return;

			if (useCodeFence && !process.env.SIDENOTES_USE_CODE_FENCE)
				process.env.SIDENOTES_USE_CODE_FENCE = `true`;

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
					const promptResult = await this.userInteraction.promptExtension(
						selectExtensionBy,
					);
					if (promptResult) extension = `.${promptResult}`;
					else return;
				} else extension = undefined;

				sidenote = await this.sidenotesRepository.create({
					extension,
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

	private async getSidenoteAtCursor({
		onHoverScanData,
	}: {
		onHoverScanData?: ScanData;
	}) {
		const scanData = onHoverScanData || this.scanner.scanLine();
		if (!scanData) {
			window.showWarningMessage(
				`There is no sidenotes attached at current cursor position`,
			);
			return undefined;
		}
		return this.sidenotesRepository.obtain(scanData);
	}

	async delete({
		deleteContentFile = true,
		onHoverScanData,
	}: {
		deleteContentFile?: boolean;
		onHoverScanData?: ScanData;
	} = {}) {
		const sidenote = await this.getSidenoteAtCursor({ onHoverScanData });
		if (sidenote) {
			await this.sidenoteProcessor.delete(sidenote, { deleteContentFile });
			this.decorator.updateDecorations();
		}
	}

	async changeSidenoteSignature({
		onHoverScanData,
	}: {
		onHoverScanData?: ScanData;
	} = {}) {
		const sidenote = await this.getSidenoteAtCursor({ onHoverScanData });
		if (sidenote) {
			await this.sidenoteProcessor.changeSignature(sidenote);
			this.decorator.updateDecorations();
		}
	}

	async switchActiveSignature() {
		this.signature.switchActiveSignature();
		this.decorator.updateDecorations();
	}

	async wipeAnchor({ onHoverScanData }: { onHoverScanData?: ScanData } = {}) {
		// 🕮 <cyberbiont> ee0dfe5b-ff4d-4e76-b494-967aa73151e1.md
		//! 🕮 <cyberbiont> 11f45863-9374-4824-ae21-4698c7aaf99f.md
		let range: Range;

		if (onHoverScanData) {
			const [[start, end]] = onHoverScanData.ranges as unknown as [Position[]]; // consequence of JSON convertion
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
			edit => {
				edit.delete(lineRange);
			},
			{ undoStopAfter: false, undoStopBefore: false },
		);

		this.refresh();
	}

	async prune(category: string) {
		this.scan();

		switch (category) {
			case `broken`:
				await this.pruner.pruneBroken();
				break;
			case `empty`:
				await this.pruner.pruneEmpty();
				break;
			default:
				await this.pruner.pruneAll();
		}

		this.decorator.updateDecorations();
	}

	reset() {
		this.decorator.resetDecorations();
		this.pool.clear();
		this.pool.isInitialized = false;
	}

	refresh() {
		this.reset();
		this.scan();
	}

	switchStylesCfg() {
		const key =
			this.decoratorController.key === `default` ? `alternative` : `default`;
		this.decoratorController.update(key);
		this.refresh();
	}

	async migrate() {
		// 🕮 <cyberbiont> 2a802e28-555a-434e-8375-f3b911c79466.md
		const folders = this.fileStorage.getWorkspaceFolders();

		folders.forEach(async folder => {
			const {
				detectedKeys: detectedKeysScanData,
				files: { fileDataByFilenames: fileKeys },
			} = await this.fileStorage.analyzeWorkspaceFolder(folder.uri);
			// 🕮 <cyberbiont> e0cee32a-711d-49e8-940e-f10da2d654a0.md

			const sidenotes = await Promise.all(
				detectedKeysScanData.map(scanData =>
					this.sidenotesRepository.obtain(scanData),
				),
			);

			const broken = sidenotes.filter(sidenote =>
				this.inspector.isBroken(sidenote),
			);

			if (broken.length === 0) {
				window.showInformationMessage(
					`Sidenotes: no broken sidenote anchors was found\n
							in ${folder.uri.fsPath} workspace folder`,
				);
				return undefined;
			}

			const action = await window.showQuickPick(
				[
					{
						label: `yes`,
						description: `look for missing content files (select folder to look in)`,
					},
					{
						label: `no`,
						description: `cancel`,
					},
				],
				{
					placeHolder: `Sidenotes: ${broken.length} broken anchors was found.	Do you want to look for content files?`,
					// in ${folder.uri.fsPath} workspace folder
				},
			);

			if (action?.label === `yes`) {
				const options: OpenDialogOptions = {
					canSelectMany: false,
					canSelectFolders: true,
					defaultUri: folder.uri,
					openLabel: `Confirm selection`,
				};

				const promptResult = await window.showOpenDialog(options);
				if (!promptResult) return undefined;
				const [lookupUri] = promptResult;

				const results = await Promise.all(
					broken.map(async sidenote =>
						this.fileStorage.lookup(sidenote, lookupUri),
					),
				);

				const successfulResults = results
					.filter((result): result is Uri => Boolean(result))
					.map(uri => path.basename(uri.fsPath));

				const message =
					successfulResults.length === 0
						? `No missing files were found in specified directory`
						: `The following file(s) have been found and copied to the current workspace:\n
								${successfulResults.join(`,\n`)}`;

				window.showInformationMessage(message);

				return true;
			}

			return undefined;
		});
	}

	async extraneous() {
		const handleResults = async (
			type: string,
			uris: Uri[],
			folder: WorkspaceFolder,
		): Promise<boolean> => {
			if (uris.length === 0) {
				window.showInformationMessage(
					`Sidenotes: no ${type} files was found in "${folder.uri.fsPath}" workspace folder`,
				);
				return false;
			}

			this.channel.appendLine(
				`${uris.length} ${type} file(s) in folder ${folder.uri.fsPath}:\n(${uris
					.map(uri => uri.fsPath)
					.join(`\n`)})`,
			);

			const action = await window.showQuickPick(
				[
					{
						label: `yes`,
						description: `delete ${type} file(s)`,
					},
					{
						label: `no`,
						description: `cancel`,
					},
				],
				{
					placeHolder: dedent(`
						Sidenotes: found ${uris.length} ${type} file(s).
						Do you want to delete them now?`),
				},
			);

			if (action && action.label === `yes`) {
				const deleted = await Promise.all(
					uris.map(async (uri: Uri) => {
						await this.fs.delete(uri);
						return path.basename(uri.fsPath);
					}),
				);

				window.showInformationMessage(
					`The following file(s) have been deleted from your workspace folder:\n
					${deleted.join(`,\n`)}`,
				);
				return true;
			}

			return false;
		};

		const folders = this.fileStorage.getWorkspaceFolders();

		folders.forEach(async folder => {
			const {
				detectedKeys,
				files: { fileDataByFilenames, strayEntries },
			} = await this.fileStorage.analyzeWorkspaceFolder(folder.uri);

			const extraneous: FileData[] = [];

			for (const [filename, fileData] of Object.entries(fileDataByFilenames)) {
				if (!detectedKeys.some(scanData => scanData.key.includes(filename)))
					extraneous.push(fileData);
			}

			await handleResults(
				`extraneous`,
				extraneous.map(fileData => fileData.uri),
				folder,
			);
			await handleResults(`stray`, strayEntries, folder);
		});
	}
}
