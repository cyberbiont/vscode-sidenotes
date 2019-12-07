import * as vscode from 'vscode';
import * as nodeFs from 'fs';
import {
	EventEmitter,
	IChangeData,
	IDictionary,
	IIdMaker,
	MarkerUtils,
	OFileChangeTracker
	// FSWatcher
} from '../types';

import FileChangeTracker from './fileChangeTracker';
import { MapDictionary } from '../dictionary';

export default class FsWatchChangeTracker extends FileChangeTracker {
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		cfg: OFileChangeTracker,
		utils: MarkerUtils,
		context: vscode.ExtensionContext,
		public pool: IDictionary<IWatch> = new MapDictionary(),
		public watcherService = nodeFs
	) {
		super(idMaker, eventEmitter, utils, cfg, context);
	}
	init(targetPath?: string) {
		if (targetPath) {
			this.setWatch(targetPath);
		}
		else if (vscode.workspace.workspaceFolders) {
			vscode.workspace.workspaceFolders.forEach(workspace => this.setWatch(this.getFullPathToSubfolder(workspace)));
			this.initListeners();
		}
		else {
			// console.log('no files or folders to watch');
		}
	}
	setWatch(path: string) {
		const watch = this.watcherService.watch(path, this.onChange.bind(this));
		this.pool.add({ key: path, watch });
	}

	stopWatch(path: string) {
		this.pool.get(path)!.watch.close();
	}

	onChange(event, fileName: string) {
		this.debounce(this.generateCustomEvent.bind(this, fileName, event)); // change args order to conform with chokidar
	}

	processEventData(eventData): IChangeData | undefined {
		if (eventData.event === 'rename' || ~eventData.fileName.indexOf('~'))
			return;
		return super.processEventData(eventData);
	}

	debounce(cb) {
		let fsWait: NodeJS.Timeout | boolean = false;
		if (fsWait)
			return;
		fsWait = setTimeout(() => { fsWait = false; }, 500);
		cb();
	}
}


export interface IWatch {
	key: string;
	watch: nodeFs.FSWatcher;
}
