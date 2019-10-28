import * as vscode from 'vscode';
import * as chokidar from 'chokidar';
import FileChangeTracker from './fileChangeTracker';

import {
	IIdMaker,
	ActiveEditorUtils,
	EventEmitter,
	IFileChangeTrackerCfg
} from '../types';

export default class ChokidarChangeTracker extends FileChangeTracker {
	public watcher;
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		cfg: IFileChangeTrackerCfg,
		context: vscode.ExtensionContext,
		public watcherService = chokidar
	) {
		super(idMaker, eventEmitter, cfg, context);
		this.watcherService = watcherService;
	}

	init(targetPath?: string) {
		let target = targetPath ? targetPath :
			vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(workspace => this.getFullPath(workspace)) :
				undefined
		if (!target) return;

		this.watcher = this.watcherService.watch(target, {
			// ignored: /(^|[\/\\])\../, // ignore dotfiles
			persistent: true
		})
		.on('change', this.onChange.bind(this));

		this.initListeners();
	}

	onChange(path) {
		this.generateCustomEvent(path, 'change');
	}

	setWatch(path: string) {
		this.watcher.add(path);
	}

	stopWatch(path: string) {
		this.watcher.unwatch(path);
	}
}
