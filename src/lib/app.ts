import {
	CancellationToken,
	ExtensionContext,
	Hover,
	HoverProvider,
	Position,
	ProviderResult,
	TextDocument,
	TextEditor,
	commands,
	languages,
	window,
	workspace,
} from 'vscode';

import { EventEmitter } from 'events';
import {
	SystemDefaultEditorService,
	ShellEditorService,
	VscodeEditorService,
} from './editorService';
import {
	// ChokidarChangeTracker,
	VSCodeFileSystemWatcherMaker,
} from './changeTracker';
import { Inspector, SidenoteBuilder, SidenoteFactory } from './sidenote';
import Anchorer from './anchorer';
import Actions from './actions';
import Styler from './styler';
import SnFileSystem from './fileSystem';
import Pruner from './pruner';
import Scanner from './scanner';
import SidenoteProcessor from './sidenoteProcessor';
import Decorator from './decorator';
import UuidProvider from './idProvider';
import { FileStorage, StorageService } from './storageService';
import { MapDictionary } from './dictionary';
import { ReferenceContainer, ReferenceController } from './referenceContainer';
import { MapRepository, DictionaryRepository } from './repository';
import { Initializable, HasEditorReference } from './mixins';
import { MarkerUtils, EditorUtils } from './utils';
import SnEvents from './events';
import EditorServiceController from './editorServiceController';
import { Cfg } from './cfg';
import {
	DocumentInitializableSidenotesRepository,
	SidenotesDictionary,
	SidenotesDecorator,
	SidenotesRepository,
} from './types';

export type OApp = {
	app: {
		hoverToolbar: boolean;
	};
};

export default class App {
	public actions!: Actions;
	private events!: SnEvents;
	private eventEmitter!: EventEmitter;
	private storageService!: StorageService;

	constructor(private cfg: Cfg, private context: ExtensionContext) {
		this.init();
	}

	async init(): Promise<void> {
		await this.compose();
		this.checkRequirements();
		this.registerCommands();
		this.setEventListeners();
		this.registerProviders();
		// this.utils.cycleEditors(this.actions.scan.bind(this.actions));
		this.actions.scan();
	}

	async compose(): Promise<void> {
		const uuidMaker = new UuidProvider();

		const eventEmitter = new EventEmitter();

		const MixinedMapDictionary = HasEditorReference(
			Initializable(MapDictionary),
		);
		// 🕮 <cyberbiont> bd961532-0e0f-4b5f-bb70-a286acdfab37.md

		// const parentContainer: { parent?: TextDocument } = {};

		const poolRepository: DocumentInitializableSidenotesRepository = new MapRepository(
			{
				// adding static create method
				...MixinedMapDictionary,
				create(): SidenotesDictionary {
					const dictionary: SidenotesDictionary = new MixinedMapDictionary();
					dictionary.editor = window.activeTextEditor!;
					return dictionary;
				},
			},
			new WeakMap(),
		);

		const editorController = await new ReferenceController(
			ReferenceContainer,
			() => window.activeTextEditor!,
		).update();
		const editor: TextEditor = editorController.getReference();

		const poolController = await new ReferenceController(
			ReferenceContainer,
			async (key: TextDocument) => poolRepository.obtain(key),
		).update(editor.document);
		const pool: SidenotesDictionary = await poolController.getReference();

		// TODO move to configuration
		function getAlternativeStylesCfg(): Cfg {
			const altCfg: Cfg = JSON.parse(JSON.stringify(this.cfg));
			altCfg.anchor.styles.settings.hideMarkers = !this.cfg.anchor.styles
				.settings.hideMarkers;
			// altCfg.anchor.styles.settings.before = 'alternative config ';
			return altCfg;
		}

		const decoratorsCollection = {
			default: new Decorator(pool, this.cfg),
			alternative: new Decorator(pool, getAlternativeStylesCfg.call(this)),
		};

		const decoratorController = await new ReferenceController(
			ReferenceContainer,
			(key: string): SidenotesDecorator => decoratorsCollection[key],
		).update('default');

		const decorator: SidenotesDecorator = decoratorController.getReference();

		const editorUtils = new EditorUtils(editor, this.cfg);
		const markerUtils = new MarkerUtils(uuidMaker, this.cfg);

		const utils = Object.create(null);
		const copyProperties = (target: object, source: object): object => {
			for (
				let o = source;
				o !== Object.prototype;
				o = Object.getPrototypeOf(o)
			) {
				for (const name of Object.getOwnPropertyNames(o)) {
					// eslint-disable-next-line no-continue
					if (name === 'constructor') continue;
					target[name] = o[name];
				}
			}
			return target;
		};

		copyProperties(utils, editorUtils);
		copyProperties(utils, markerUtils);

		const scanner = new Scanner(editor, utils);

		const fileSystem = new SnFileSystem(scanner, utils, this.cfg);

		const changeTracker = new VSCodeFileSystemWatcherMaker(
			uuidMaker,
			eventEmitter,
			utils,
			this.cfg,
			this.context,
		);
		// 🕮 <cyberbiont> a1f2b34f-bad3-45fb-8605-c5a233e65933.md
		const editorServiceController = new EditorServiceController(
			new ShellEditorService(changeTracker),
			new SystemDefaultEditorService(changeTracker),
			new VscodeEditorService(changeTracker),
			this.cfg,
		);

		const storageService = new FileStorage(
			editorServiceController,
			utils,
			fileSystem,
			this.cfg,
			commands,
		);

		const anchorer = new Anchorer(editor, utils, scanner, this.cfg);

		const inspector = new Inspector();
		const styler = new Styler(inspector, this.cfg);

		const sidenoteProcessor = new SidenoteProcessor(
			storageService,
			anchorer,
			pool,
			styler,
			inspector,
		);

		const pruner = new Pruner(pool, sidenoteProcessor, inspector);

		const sidenoteFactory = new SidenoteFactory(
			uuidMaker,
			anchorer,
			storageService,
			styler,
			utils,
			scanner,
			SidenoteBuilder,
			inspector,
			this.cfg,
		);

		const sidenotesRepository: SidenotesRepository = new DictionaryRepository(
			sidenoteFactory,
			pool,
		);

		const actions = new Actions(
			styler,
			inspector,
			pool,
			poolController,
			pruner,
			scanner,
			sidenoteProcessor,
			sidenotesRepository,
			decorator,
			decoratorController,
			utils,
			this.cfg,
		);

		const events = new SnEvents(
			actions,
			this.cfg,
			pool,
			scanner,
			sidenoteProcessor,
			decorator,
			utils,
			editorController,
			poolController,
			poolRepository,
		);

		this.actions = actions;
		this.eventEmitter = eventEmitter;
		this.storageService = storageService;
		this.events = events;
	}

	checkRequirements(): void {
		if (this.storageService.checkStartupRequirements)
			this.storageService.checkStartupRequirements();

		if (!window.activeTextEditor)
			throw new Error('active text editor is undefined');
	}

	setEventListeners(): void {
		window.onDidChangeActiveTextEditor(
			this.events.onEditorChange,
			this.events,
			this.context.subscriptions,
		);
		workspace.onDidChangeTextDocument(
			this.events.onDidChangeTextDocument,
			this.events,
			this.context.subscriptions,
		);
		this.eventEmitter.on(
			'sidenoteDocumentChange',
			this.events.onSidenoteDocumentChange.bind(this.events),
		);
	}

	registerCommands(): number {
		return this.context.subscriptions.push(
			commands.registerCommand(
				'sidenotes.annotate',
				this.actions.run,
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.annotateCode',
				this.actions.run.bind(this.actions, { useCodeFence: true }),
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.annotatePickExt',
				this.actions.run.bind(this.actions, { selectExtensionBy: 'pick' }),
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.annotateInputExt',
				this.actions.run.bind(this.actions, { selectExtensionBy: 'input' }),
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.delete',
				this.actions.delete,
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.wipeAnchor',
				this.actions.wipeAnchor,
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.pruneBroken',
				this.actions.prune.bind(this.actions, 'broken'),
			),
			commands.registerCommand(
				'sidenotes.pruneEmpty',
				this.actions.prune.bind(this.actions, 'empty'),
			),
			commands.registerCommand(
				'sidenotes.refresh',
				this.actions.refresh,
				this.actions,
			),
			commands.registerCommand(
				'sidenotes.showMarkers',
				this.actions.switchStylesCfg,
				this.actions,
			),
		);
	}

	registerProviders(): void {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const app = this;
		// 🕮 <cyberbiont> 59cd0823-4911-4a88-a657-88fcd4f1dcba.md
		if (this.cfg.app.hoverToolbar)
			languages.registerHoverProvider(
				// '*',
				{
					scheme: 'file',
				},
				new (class implements HoverProvider {
					provideHover(
						document: TextDocument,
						position: Position,
						token: CancellationToken,
					): ProviderResult<Hover> {
						return app.actions.getHover(document, position);
					}
				})(),
			);
	}
}
