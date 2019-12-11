import * as vscode from 'vscode';

import {
	DocumentInitializableSidenotesRepository,
	FileChangeTracker,
	ICfg,
	IChangeTracker,
	IEditorService,
	IStorageService,
	OStyler,
	SidenotesDictionary,
	SidenotesRepository,
	SidenotesStyler,
} from './types';

import {
	SystemDefaultEditor,
	TyporaEditor,
	VscodeEditor,
} from './editorService';

import {
	// ChokidarChangeTracker,
	VSCodeFileSystemWatcher
} from './changeTracker';

import {
	Inspector,
	SidenoteBuilder,
	SidenoteFactory,
} from './sidenote';

import Anchorer from './anchorer';
import Actions from './actions';
import Designer from './designer';
import FileSystem from './fileSystem';
import Pruner from './pruner';
import Scanner from './scanner';
import SidenoteProcessor from './sidenoteProcessor';
import Styler from './styler';
import UuidMaker from './idMaker';
import { EventEmitter } from 'events';
import { FileStorage } from './storageService';
import { MapDictionary, HasKeyProperty } from './dictionary';
import {
	ReferenceContainer,
	ReferenceController
} from './referenceContainer';
import {
	MapRepository,
	DictionaryRepository
} from './repository';

import { Initializable, HasEditorReference } from './mixins';

import {
	MarkerUtils,
	EditorUtils,
} from './utils';
import Events from './events';

import EditorServiceController from './editorServiceController';

export type OApp = {
	app: {
		hoverToolbar: boolean
	}
}

export default class App {
	public actions: Actions
	private events: Events
	private eventEmitter: EventEmitter
	private storageService: IStorageService
	private utils: EditorUtils

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
		this.registerProviders();
		// this.utils.cycleEditors(this.actions.scan.bind(this.actions));
		this.actions.scan();
	}

	async compose() {
		const uuidMaker = new UuidMaker;

		const eventEmitter = new EventEmitter;

		const MixinedMapDictionary = HasEditorReference(Initializable(MapDictionary));
		// 🕮 <YL> bd961532-0e0f-4b5f-bb70-a286acdfab37.md

		let parentContainer: { parent?: vscode.TextDocument } = { };

		const poolRepository: DocumentInitializableSidenotesRepository =	new MapRepository(
			{ // adding static create method
				...MixinedMapDictionary,
				create() {
					const dictionary: SidenotesDictionary = new MixinedMapDictionary;
					dictionary.editor = vscode.window.activeTextEditor!;
					return dictionary;
				}
			},
			new WeakMap
		);

		const editorController = await new ReferenceController(
			ReferenceContainer,
			() => vscode.window.activeTextEditor!,
		).update();
		const editor: vscode.TextEditor = editorController.getReference();

		const poolController = await new ReferenceController(
			ReferenceContainer,
			async (key: vscode.TextDocument) => poolRepository.obtain(key)
		).update(editor.document);
		const pool: SidenotesDictionary = await poolController.getReference();

		// TODO move to configuration
		function getAlternativeStylesCfg() {
			const altCfg = JSON.parse(JSON.stringify(this.cfg));
			altCfg.anchor.styles.settings.hideMarkers = !this.cfg.anchor.styles.settings.hideMarkers;
			// altCfg.anchor.styles.settings.before = 'alternative config ';
			return altCfg;
		}

		const stylersCollection = {
			default: new Styler(pool, this.cfg),
			alternative: new Styler(pool, getAlternativeStylesCfg.call(this))
		};

		const stylerController = await new ReferenceController(
			ReferenceContainer,
			(key: string): SidenotesStyler => stylersCollection[key],
		).update('default');

		const styler: SidenotesStyler = await stylerController.getReference();

		const editorUtils = new EditorUtils(editor, this.cfg);
		const markerUtils = new MarkerUtils(uuidMaker, this.cfg);

		let utils = Object.create(null);
		copyProperties(utils, editorUtils);
		copyProperties(utils, markerUtils);

		function copyProperties(target, source) {
			for (let o = source; o !== Object.prototype; o = Object.getPrototypeOf(o)) {
				for (let name of Object.getOwnPropertyNames(o)) {
					if (name === 'constructor') continue;
					target[name] = o[name];
				}
			}
			return target;
		}

		const scanner = new Scanner(editor, utils);

		const fileSystem = new FileSystem(scanner, utils,this.cfg);

		let changeTracker = new VSCodeFileSystemWatcher(
			uuidMaker,
			eventEmitter,
			utils,
			this.cfg,
			this.context
		);
		// 🕮 <YL> a1f2b34f-bad3-45fb-8605-c5a233e65933.md

		const editorServiceController = new EditorServiceController(
			new TyporaEditor(changeTracker, editor),
			new SystemDefaultEditor(changeTracker),
			new VscodeEditor(
				changeTracker,
				parentContainer
			),
			this.cfg
		);

		const storageService = new FileStorage(
			editorServiceController,
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

		const sidenoteProcessor = new SidenoteProcessor(
			storageService,
			anchorer,
			pool,
			designer
		);

		const pruner = new Pruner(pool, sidenoteProcessor, inspector);

		const sidenoteFactory = new SidenoteFactory(
			uuidMaker,
			anchorer,
			storageService,
			designer,
			utils,
			scanner,
			SidenoteBuilder,
			this.cfg
		);

		const sidenotesRepository: SidenotesRepository = new DictionaryRepository(sidenoteFactory, pool);

		const actions = new Actions(
			designer,
			inspector,
			pool,
			poolController,
			pruner,
			scanner,
			sidenoteProcessor,
			sidenotesRepository,
			styler,
			stylerController,
			utils,
			this.cfg
		);

		const events = new Events(
			actions,
			this.cfg,
			editor,
			pool,
			scanner,
			sidenoteProcessor,
			styler,
			utils,
			editorController,
			poolController,
			poolRepository
		);

		this.actions = actions;
		this.eventEmitter = eventEmitter;
		this.storageService = storageService;
		this.events = events;
		this.utils = utils;
	}

	checkRequirements() {
		if (this.storageService.checkRequirements)
			this.storageService.checkRequirements();

		if (!vscode.window.activeTextEditor)
			throw new Error('active text editor is undefined');
	}

	setEventListeners() {
		vscode.window.onDidChangeActiveTextEditor(this.events.onEditorChange,	this.events, this.context.subscriptions);
		vscode.workspace.onDidChangeTextDocument(this.events.onDidChangeTextDocument, this.events, this.context.subscriptions)
		this.eventEmitter.on('sidenoteDocumentChange', this.events.onSidenoteDocumentChange.bind(this.events));
	}

	registerCommands() {
		return this.context.subscriptions.push(
			vscode.commands.registerCommand('sidenotes.annotate', this.actions.run, this.actions),
			vscode.commands.registerCommand('sidenotes.annotateCode', this.actions.run.bind(this.actions, { useCodeFence: true }), this.actions),
			vscode.commands.registerCommand('sidenotes.annotatePickExt', this.actions.run.bind(this.actions, { selectExtensionBy: 'pick' }), this.actions),
			vscode.commands.registerCommand('sidenotes.annotateInputExt', this.actions.run.bind(this.actions, { selectExtensionBy: 'input' }), this.actions),
			vscode.commands.registerCommand('sidenotes.delete', this.actions.delete, this.actions),
			vscode.commands.registerCommand('sidenotes.wipeAnchor', this.actions.wipeAnchor, this.actions),
			vscode.commands.registerCommand('sidenotes.pruneBroken', this.actions.prune.bind(this.actions, 'broken')),
			vscode.commands.registerCommand('sidenotes.pruneEmpty', this.actions.prune.bind(this.actions, 'empty')),
			vscode.commands.registerCommand('sidenotes.refresh', this.actions.refresh, this.actions),
			vscode.commands.registerCommand('sidenotes.showMarkers', this.actions.switchStylesCfg, this.actions)
		);
	}

	registerProviders() {
		const app = this;
		// 🕮 <YL> 59cd0823-4911-4a88-a657-88fcd4f1dcba.md
		if (this.cfg.app.hoverToolbar) vscode.languages.registerHoverProvider(
			// '*',
			{
				scheme: 'file'
			},
			new class implements vscode.HoverProvider {
				provideHover(
					document: vscode.TextDocument,
					position: vscode.Position,
					token: vscode.CancellationToken
				): vscode.ProviderResult<vscode.Hover> {
					return app.actions.getHover(document, position);
				}
			}()
		);
	}
}
