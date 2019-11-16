import * as vscode from 'vscode';

import {
	FileChangeTracker,
	ICfg,
	IChangeData,
	IChangeTracker,
	IDictionary,
	IEditorService,
	IFileStorage,
	IScanData,
	ISidenote,
	IStorageService,
} from './types';

import {
	TyporaEditor,
	VscodeEditor,
} from './editorService';

import {
	ChokidarChangeTracker,
	FsWatchChangeTracker,
	VscodeChangeTracker,
} from './changeTracker';

import {
	Inspector,
	SidenoteBuilder,
	SidenoteFactory,
} from './sidenote';

import {
	MarkerUtils,
	ActiveEditorUtils,
} from './utils';

import Anchorer from './anchorer';
import Commands from './commands';
import Designer from './designer';
import Pool from './pool';
import Pruner from './pruner';
import Scanner from './scanner';
import SidenoteProcessor from './sidenoteProcessor';
import Styler from './styler';
import UuidMaker from './idMaker';
import { EventEmitter } from 'events';
import { FileStorage } from './storageService';
import { MapDictionary } from './dictionary';

export type OApp = {
	app: {
		autoStart: boolean,
		defaultEditor: 'Typora'|'vscode'|'system default',
	}
}

export default class App {
	private activeEditorUtils: ActiveEditorUtils
	private markerUtils: MarkerUtils
	private changeTracker: IChangeTracker
	private commands: Commands
	private editorService: IEditorService
	private eventEmitter: EventEmitter
	public pool: Pool<ISidenote>
	private sidenoteProcessor: SidenoteProcessor
	public styler: Styler<ISidenote>
	private scanner: Scanner
	private designer: Designer;

	constructor(
		private cfg: ICfg,
		private context: vscode.ExtensionContext
	) {
		this.init();
	}

	async init() {
		await this.wire();
		this.checkRequirements();
		this.registerCommands();
		this.setEventListeners();
	}

	async wire() {
		const uuidMaker = new UuidMaker;
		const eventEmitter = new EventEmitter;
		const pool = new Pool<ISidenote>(MapDictionary);

		const activeEditorUtils = new ActiveEditorUtils(this.cfg);
		const markerUtils = new MarkerUtils(uuidMaker, this.cfg);
		const scanner = new Scanner(markerUtils, activeEditorUtils);

		let editorService: IEditorService;
		let changeTracker: IChangeTracker;
		switch (this.cfg.app.defaultEditor) {
			case 'Typora':
				// changeTracker = new FsWatchChangeTracker(uuidMaker, eventEmitter, this.cfg, this.context);
				const fileChangeTracker: FileChangeTracker = new ChokidarChangeTracker(uuidMaker, eventEmitter, this.cfg, this.context);
				changeTracker = fileChangeTracker;
				editorService = new TyporaEditor(fileChangeTracker, activeEditorUtils);
				break;

			case 'vscode':
			default:
				const vscodeChangeTracker: VscodeChangeTracker = new VscodeChangeTracker(uuidMaker, eventEmitter, this.context);
				changeTracker = vscodeChangeTracker;
				editorService = new VscodeEditor(vscodeChangeTracker);
				break;
		}

		const storageService = new FileStorage(editorService, activeEditorUtils, this.cfg);
		const anchorer = new Anchorer(markerUtils, activeEditorUtils, scanner, this.cfg);
		const inspector = new Inspector;
		const designer = new Designer(inspector,this.cfg);
		const sidenoteFactory = new SidenoteFactory(uuidMaker, anchorer, storageService, designer, activeEditorUtils, markerUtils, scanner, SidenoteBuilder);
		const sidenoteProcessor = new SidenoteProcessor(storageService, anchorer, sidenoteFactory, pool, designer);
		const styler = new Styler<ISidenote>(pool, this.cfg);
		const pruner = new Pruner(pool, sidenoteProcessor, inspector);
		const commands = new Commands(styler, pruner, sidenoteProcessor, scanner, pool, inspector, activeEditorUtils);

		this.styler = styler;
		this.sidenoteProcessor = sidenoteProcessor;
		this.eventEmitter = eventEmitter;
		this.commands = commands;
		this.pool = pool;
		this.activeEditorUtils = activeEditorUtils;
		this.changeTracker = changeTracker;
		this.editorService = editorService;
		this.scanner = scanner;
		this.designer = designer;
		this.markerUtils = markerUtils;
	}

	checkRequirements() {
		if (this.sidenoteProcessor.storageService.checkRequirements) this.sidenoteProcessor.storageService.checkRequirements();

		if (!vscode.window.activeTextEditor) {
			throw new Error('active text editor is undefined');
		}
	}

	setEventListeners() {
		this.eventEmitter.on('sidenoteDocumentChange', async (changeData: IChangeData) => {
			// event is generated by editorService after onDidSaveDocument
			// const sidenote = await this.sidenoteProcessor.getOrCreate({ id: changeData.id, ranges: [] });
			const sidenote = await this.sidenoteProcessor.get(changeData.id);
			if (!sidenote) throw new Error('sidenote being edited is not present in pool');
			// тут надо вызвать просто get на самом деле)
			this.sidenoteProcessor.updateContent(sidenote);
			this.styler.updateDecorations();
			// действия update и update decorations должны выполяться последовательно, т.е. должны быть в одной функции
			// требуется обращение к styler, поэтому не можем разместить ниже styler,
			// или в самом styler, т.к. styler у нас generic, а тут одно действий происходит над конкретным типом
			// надо либо весь styler переписать на ISidenote,
			// либо присвоить sidenote конкретный тип ISidenote перед выполнением update (вряд ли получится)
			// const sidenote = this.pool.get(id) as unknown as ISidenote;
		});

		const updateOnEditorChange = (editor: vscode.TextEditor) => {
			// run updates in order
			this.activeEditorUtils.onDidChangeActiveTextEditor(editor);
			this.pool.onDidChangeActiveTextEditor(editor);
			this.commands.scanDocumentAnchors();
		}

		const onDidChangeActiveEditorHandler =
			this.editorService instanceof VscodeEditor
				? (editor: vscode.TextEditor) => {
						// add additional check to prevent triggering scan on sidenote files
						if (
							this.changeTracker.getIdFromFileName(
								editor.document.fileName
							)
						)
							return;
						updateOnEditorChange(editor);
				  }
				: (editor: vscode.TextEditor) => updateOnEditorChange(editor);
		vscode.window.onDidChangeActiveTextEditor(onDidChangeActiveEditorHandler, this, this.context.subscriptions);

		const onDidChangeTextDocument = async (event: vscode.TextDocumentChangeEvent) => {
			// if (activeEditor && event.document === activeEditor.document)
			// if (timeout) {
			// 	clearTimeout(timeout);
			// 	timeout = undefined;
			// }
			// timeout = setTimeout(updateDecorations, 500);

			const updateDecorationRange = async (scanData: IScanData): Promise<ISidenote> => {
				const sidenote = await this.sidenoteProcessor.getOrCreate(scanData);
				sidenote.decorations = this.designer.get(
					sidenote, scanData.ranges
				);
				return sidenote;
			}

			if (!event.contentChanges.some(
				change => {
					// при удалении мы не можем отследить, что именно было удалено (с-вот text = '')
					// поэтому придется обрабатывать все удаления
					// rangeLength содержит длину удаленного фрагемнта и 0 если ничего не было удалено
					const condition = (
						(change.rangeLength &&
							change.rangeLength >= this.markerUtils.BARE_MARKER_SYMBOLS_COUNT) ||
						(this.markerUtils.BARE_MARKER_SYMBOLS_COUNT 	&&
							change.text.indexOf(this.cfg.anchor.marker.salt) !== -1) // includes marker
					);
					return condition;
				}
			)) return;

			// rescan positions for decorations in current document
			const scanResults = this.scanner.getIdsFromText();
			if (!scanResults) return;

			await Promise.all(scanResults.map(updateDecorationRange));

			this.styler.updateDecorations();
		}

		vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, this, this.context.subscriptions)
	}

	registerCommands() {
		return this.context.subscriptions.push(
			vscode.commands.registerCommand('sidenotes.annotate', this.commands.run, this.commands),
			vscode.commands.registerCommand('sidenotes.display', this.commands.scanDocumentAnchors, this.commands),
			vscode.commands.registerCommand('sidenotes.delete', this.commands.delete, this.commands),
			vscode.commands.registerCommand('sidenotes.pruneBroken', this.commands.prune.bind(this.commands, 'broken')),
			vscode.commands.registerCommand('sidenotes.pruneEmpty', this.commands.prune.bind(this.commands, 'empty')),
			vscode.commands.registerCommand('sidenotes.reset', this.commands.reset, this.commands),
			vscode.commands.registerCommand('sidenotes.internalize', this.commands.internalize, this.commands),
			vscode.commands.registerCommand('sidenotes.migrate', this.commands.migrate, this.commands),
			vscode.commands.registerCommand('sidenotes.extraneous', this.commands.cleanExtraneous, this.commands)
		)
	}
}
