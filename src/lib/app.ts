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
	DocumentsPoolDriver,
	SidenotesPoolDriver,
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
import {	MapDictionary } from './dictionary';
import ActualKeeper from './actualKeeper';
import DocumentsController from './documentsController';
import MapPoolDriver from './mapPoolDriver';
import DictionaryPoolDriver from './dictionaryPoolDriver';
import FileSystem from './fileSystem';

import { Initializable } from './mixins';

import {
	MarkerUtils,
	EditorUtils,
} from './utils';

export type OApp = {
	app: {
		autoStart: boolean,
		defaultEditor: 'Typora'|'vscode'|'system default',
	}
}

export default class App {
	public actions: Actions
	private editorService: IEditorService
	private eventEmitter: EventEmitter
	private storageService: IStorageService

	constructor(
		private cfg: ICfg,
		private context: vscode.ExtensionContext
	) {
		this.init();
	}

	async init() {
		await this.compose();
		this.checkRequirements();
		this.registerCommands();
		this.setEventListeners();
	}

	async compose() {
		const uuidMaker = new UuidMaker;
		const eventEmitter = new EventEmitter;

		const InitializableMapDictionary = Initializable(MapDictionary);

		const documentsPoolDriver: DocumentsPoolDriver = new MapPoolDriver({
			...InitializableMapDictionary,
			create(key) { return new InitializableMapDictionary; }
		}, new WeakMap);

		const documentsController = new DocumentsController<SidenotesDictionary>(
			documentsPoolDriver,
			ActualKeeper,
		);
		const editor: vscode.TextEditor = documentsController.get('editor');

		const pool: SidenotesDictionary = documentsController.get('metadata');

		const utils = Object.assign(
			Object.create(null),
			new EditorUtils(editor, this.cfg),
			new MarkerUtils(uuidMaker, this.cfg),
		);

		const scanner = new Scanner(editor, utils);
		const fileSystem = new FileSystem(scanner, utils);

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
				editorService = new TyporaEditor(fileChangeTracker);
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
			utils,
			fileSystem,
			this.cfg,
			vscode.commands
		);
		const anchorer = new Anchorer(
			editor,
			utils,
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
			utils,
			scanner,
			SidenoteBuilder,
		);

		const sidenotesPoolDriver: SidenotesPoolDriver = new DictionaryPoolDriver(sidenoteFactory, pool);

		const sidenoteProcessor = new SidenoteProcessor(
			storageService,
			anchorer,
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
			fileSystem,
			pool,
			inspector,
			editor,
			utils,
			sidenotesPoolDriver,
			changeTracker,
			designer,
			documentsController,
			this.cfg
		);

		this.actions = actions;
		this.eventEmitter = eventEmitter;
		this.editorService = editorService;
		this.storageService = storageService;
	}

	checkRequirements() {
		if (this.storageService.checkRequirements)
			this.storageService.checkRequirements();

		if (!vscode.window.activeTextEditor)
			throw new Error('active text editor is undefined');
	}

	setEventListeners() {
		vscode.window.onDidChangeActiveTextEditor(
			this.editorService instanceof VscodeEditor
				? this.actions.onVscodeEditorChange
				: this.actions.onEditorChange,
				this.actions, this.context.subscriptions
		);
		vscode.workspace.onDidChangeTextDocument(this.actions.onDidChangeTextDocument, this.actions, this.context.subscriptions)
		this.eventEmitter.on('sidenoteDocumentChange', this.actions.onSidenoteDocumentChange.bind(this.actions));
	}

	registerCommands() {
		return this.context.subscriptions.push(
			vscode.commands.registerCommand('sidenotes.annotate', this.actions.run, this.actions),
			vscode.commands.registerCommand('sidenotes.delete', this.actions.delete, this.actions),
			vscode.commands.registerCommand('sidenotes.display', this.actions.scanDocumentAnchors, this.actions),
			vscode.commands.registerCommand('sidenotes.internalize', this.actions.internalize, this.actions),
			vscode.commands.registerCommand('sidenotes.pruneBroken', this.actions.prune.bind(this.actions, 'broken')),
			vscode.commands.registerCommand('sidenotes.pruneEmpty', this.actions.prune.bind(this.actions, 'empty')),
			vscode.commands.registerCommand('sidenotes.reset', this.actions.reset, this.actions),
		);
	}
}
