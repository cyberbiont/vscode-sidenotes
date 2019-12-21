import { ExtensionContext, workspace } from 'vscode';
import chokidar from 'chokidar';
import FileChangeTracker from './fileChangeTracker';

import {
	EventEmitter,
	IdProvider,
	MarkerUtils,
	OFileChangeTracker,
} from '../types';

export default class ChokidarChangeTracker extends FileChangeTracker {
	public watcher;
	constructor(
		idProvider: IdProvider,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		cfg: OFileChangeTracker,
		context: ExtensionContext,
		public watcherService = chokidar,
	) {
		super(idProvider, eventEmitter, utils, cfg, context);
	}

	init(targetPath?: string): void {
		const target =
			targetPath ||
			(workspace.workspaceFolders
				? workspace.workspaceFolders.map(workspaceFolder =>
						this.getFullPathToSubfolder(workspaceFolder),
				  )
				: undefined);
		if (!target) return;

		this.watcher = this.watcherService
			.watch(target, {
				// ignored: /(^|[\/\\])\../, // ignore dotfiles
				persistent: true,
			})
			.on('change', this.onChange.bind(this));

		this.initListeners();
	}

	onChange = this.debounce(function(path: string, stats) {
		this.generateCustomEvent(path, 'change');
	});

	setWatch(path: string): void {
		this.watcher.add(path);
	}

	stopWatch(path: string): void {
		this.watcher.unwatch(path);
	}
}
