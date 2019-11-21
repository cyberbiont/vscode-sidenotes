import * as vscode from 'vscode';

import {
	Constructor,
	DocumentInitializableSidenotesRepository,
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
	SidenotesRepository,
	SidenotesStyler,
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
import { MapDictionary, HasIdProperty } from './dictionary';
import ReferenceContainer from './referenceContainer';
import DocumentsController from './documentsController';
import MapRepository from './mapRepository';
import DictionaryRepository from './dictionaryRepository';
import FileSystem from './fileSystem';

import { Initializable } from './mixins';

import {
	MarkerUtils,
	EditorUtils,
} from './utils';

export type OApp = {
	app: {
		autoStart: boolean,
		defaultEditor: 'typora'|'vscode'|'system default',
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
		this.actions.scanDocumentAnchors();
	}

	async compose() {
		const uuidMaker = new UuidMaker;

		const eventEmitter = new EventEmitter;

		const InitializableMapDictionary = Initializable(MapDictionary);
		// 🕮 bd961532-0e0f-4b5f-bb70-a286acdfab37

		const documentsRepository: DocumentInitializableSidenotesRepository =
			new MapRepository({
			...InitializableMapDictionary,
			create(key) {
				return new InitializableMapDictionary;
			}
		}, new WeakMap);

		const documentsController =
			await new DocumentsController(
				documentsRepository,
				ReferenceContainer,
			);
		const editorReference: vscode.TextEditor = documentsController.getProxy('editor');

		const poolReference: SidenotesDictionary = documentsController.getProxy('metadata');

		const utils = Object.assign(
			Object.create(null),
			new EditorUtils(editorReference, this.cfg),
			new MarkerUtils(uuidMaker, this.cfg),
		);

		const scanner = new Scanner(editorReference, utils);

		const fileSystem = new FileSystem(scanner, utils);

		let editorService: IEditorService;
		let changeTracker: IChangeTracker;
		switch (this.cfg.app.defaultEditor) {
			case 'typora':
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
			editorReference,
			utils,
			scanner,
			this.cfg
		);

		const inspector = new Inspector();
		const designer = new Designer(inspector, this.cfg);
		const styler: SidenotesStyler = new Styler(poolReference, this.cfg);

		const sidenoteProcessor = new SidenoteProcessor(
			storageService,
			anchorer,
			poolReference,
			designer
		);

		const pruner = new Pruner(poolReference, sidenoteProcessor, inspector);

		const sidenoteFactory = new SidenoteFactory(
			uuidMaker,
			anchorer,
			storageService,
			designer,
			utils,
			scanner,
			SidenoteBuilder,
		);

		const sidenotesRepository: SidenotesRepository = new DictionaryRepository(sidenoteFactory, poolReference);

		const actions = new Actions(
			styler,
			pruner,
			sidenoteProcessor,
			scanner,
			fileSystem,
			poolReference,
			inspector,
			editorReference,
			utils,
			sidenotesRepository,
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
			vscode.commands.registerCommand('sidenotes.pruneBroken', this.actions.prune.bind(this.actions, 'broken')),
			vscode.commands.registerCommand('sidenotes.pruneEmpty', this.actions.prune.bind(this.actions, 'empty')),
			vscode.commands.registerCommand('sidenotes.reset', this.actions.reset, this.actions),
		);
	}
}
