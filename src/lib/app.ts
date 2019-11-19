import * as vscode from 'vscode';

import {
	Constructor,
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

	SidenotesDictionary,
	DocumentsPool,
	SidenotesPool,
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
import Actions from './actions';
import Designer from './designer';
import Pruner from './pruner';
import Scanner from './scanner';
import SidenoteProcessor from './sidenoteProcessor';
import Styler from './styler';
import UuidMaker from './idMaker';
import { EventEmitter } from 'events';
import { FileStorage } from './storageService';
import {
	MapDictionary,
	SetDictionary,
	ObjectDictionary,
} from './dictionary';

import ActualKeeper from './actualKeeper';
import DocumentsController from './documentsController';
import MapPool from './mapPool';
import DictionaryPoolDriver from './dictionaryPool';

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
	private actions: Actions
	private editorService: IEditorService
	private eventEmitter: EventEmitter
	public pool: SidenotesDictionary
	private sidenoteProcessor: SidenoteProcessor
	public styler: Styler<ISidenote>
	private scanner: Scanner
	private designer: Designer;
	private documentsController: DocumentsController< SidenotesDictionary>

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
		const activeEditorUtils = new ActiveEditorUtils(this.cfg);
		const markerUtils = new MarkerUtils(uuidMaker, this.cfg);
		const scanner = new Scanner(markerUtils, activeEditorUtils);

		let editorService: IEditorService;
		let changeTracker: IChangeTracker;
		switch (this.cfg.app.defaultEditor) {
			case 'Typora':
				// changeTracker = new FsWatchChangeTracker(uuidMaker, eventEmitter, this.cfg, this.context);
				const fileChangeTracker: FileChangeTracker = new ChokidarChangeTracker(
					uuidMaker,
					eventEmitter,
					this.cfg,
					this.context
				);
				changeTracker = fileChangeTracker;
				editorService = new TyporaEditor(fileChangeTracker, activeEditorUtils);
				break;

			case 'vscode':
			default:
				const vscodeChangeTracker: VscodeChangeTracker = new VscodeChangeTracker(
					uuidMaker,
					eventEmitter,
					this.context
				);
				changeTracker = vscodeChangeTracker;
				editorService = new VscodeEditor(vscodeChangeTracker);
				break;
		}

		const storageService = new FileStorage(
			editorService,
			activeEditorUtils,
			this.cfg
		);
		const anchorer = new Anchorer(
			markerUtils,
			activeEditorUtils,
			scanner,
			this.cfg
		);
		const inspector = new Inspector();
		const designer = new Designer(inspector, this.cfg);
		const sidenoteFactory = new SidenoteFactory(
			uuidMaker,
			anchorer,
			storageService,
			designer,
			activeEditorUtils,
			markerUtils,
			scanner,
			SidenoteBuilder,
		);

		const documentsPool: DocumentsPool = new MapPool({
				...MapDictionary,
				create(key) { return new MapDictionary; }
		}, new WeakMap);

		const actualSidenotesDictionaryKeeper = new ActualKeeper<SidenotesDictionary>();
		const documentsController = new DocumentsController<SidenotesDictionary>(
			documentsPool,
			actualSidenotesDictionaryKeeper,
			scanner,
			activeEditorUtils,
			// this.context
		);
		const actualSidenotesDictionary: SidenotesDictionary = documentsController.get();
		const pool = actualSidenotesDictionary;

		const sidenotesPool: SidenotesPool = new DictionaryPoolDriver(sidenoteFactory, actualSidenotesDictionary);
		// TODOк sidenotesPool должны обращаться все команды на получение, создание, изменение пула (из actions)

		const sidenoteProcessor = new SidenoteProcessor(
			storageService,
			anchorer,
			sidenoteFactory,
			pool,
			designer
		);
		const styler = new Styler<ISidenote>(pool, this.cfg);
		const pruner = new Pruner(pool, sidenoteProcessor, inspector);
		const actions = new Actions(
			styler,
			pruner,
			sidenoteProcessor,
			scanner,
			pool,
			inspector,
			activeEditorUtils
		);
		// TODO заменить на что-то пул

		this.styler = styler;
		this.sidenoteProcessor = sidenoteProcessor;
		this.eventEmitter = eventEmitter;
		this.actions = actions;
		this.pool = pool;
		this.activeEditorUtils = activeEditorUtils;
		this.changeTracker = changeTracker;
		this.editorService = editorService;
		this.scanner = scanner;
		this.designer = designer;
		this.markerUtils = markerUtils;
		this.documentsController = documentsController;
	}

	checkRequirements() {
		if (this.sidenoteProcessor.storageService.checkRequirements)
			this.sidenoteProcessor.storageService.checkRequirements();

		if (!vscode.window.activeTextEditor)
			throw new Error('active text editor is undefined');
	}

	setEventListeners() {
		const onEditorChange = async (editor: vscode.TextEditor) => {
			// run updates in order
			/* this.activeEditorUtils.onDidChangeActiveTextEditor(editor);
			this.pool.onDidChangeActiveTextEditor(editor);
			this.actions.scanDocumentAnchors(); */
			this.activeEditorUtils.onEditorChange(editor);
			// const sidenotes = await this.documentsController.onEditorChange(editor.document);
			// sidenotes.each((sidenote: ISidenote) => {
			await this.documentsController.onEditorChange(editor.document);
			this.pool.each((sidenote: ISidenote) => {
				sidenote.anchor.editor = this.activeEditorUtils.editor;
			});
			this.actions.scanDocumentAnchors();
			// this.styler.updateDecorations();
		};

		const onVscodeEditorChange = (editor: vscode.TextEditor) => {
			// add additional check to prevent triggering scan on sidenote files
			if (this.changeTracker.getIdFromFileName(editor.document.fileName)) return;
			onEditorChange(editor);
		};

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
						(this.markerUtils.BARE_MARKER_SYMBOLS_COUNT &&
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
		};

		const onSidenoteDocumentChange = async (changeData: IChangeData) => {
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
		};

		vscode.window.onDidChangeActiveTextEditor(
			this.editorService instanceof VscodeEditor
				? onVscodeEditorChange
				: onEditorChange,
			this, this.context.subscriptions
		);
		vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument, this, this.context.subscriptions)
		this.eventEmitter.on('sidenoteDocumentChange', onSidenoteDocumentChange);
	}

	registerCommands() {
		return this.context.subscriptions.push(
			vscode.commands.registerCommand('sidenotes.annotate', this.actions.run, this.actions),
			vscode.commands.registerCommand('sidenotes.delete', this.actions.delete, this.actions),
			vscode.commands.registerCommand('sidenotes.display', this.actions.scanDocumentAnchors, this.actions),
			vscode.commands.registerCommand('sidenotes.extraneous', this.actions.cleanExtraneous, this.actions),
			vscode.commands.registerCommand('sidenotes.internalize', this.actions.internalize, this.actions),
			vscode.commands.registerCommand('sidenotes.migrate', this.actions.migrate, this.actions),
			vscode.commands.registerCommand('sidenotes.pruneBroken', this.actions.prune.bind(this.actions, 'broken')),
			vscode.commands.registerCommand('sidenotes.pruneEmpty', this.actions.prune.bind(this.actions, 'empty')),
			vscode.commands.registerCommand('sidenotes.reset', this.actions.reset, this.actions),
		);
	}
}
