import { ExtensionContext, workspace } from 'vscode';
import nodeFs from 'fs';
import { EventEmitter } from 'events';
import FileChangeTracker, { OFileChangeTracker } from './fileChangeTracker';
import { MapDictionary, Dictionary } from '../dictionary';
import { IdProvider } from '../idProvider';
import { MarkerUtils } from '../utils';
import { ChangeData } from '.';

export default class FsWatchChangeTracker extends FileChangeTracker {
	constructor(
		idProvider: IdProvider,
		eventEmitter: EventEmitter,
		cfg: OFileChangeTracker,
		utils: MarkerUtils,
		context: ExtensionContext,
		public pool: Dictionary<Watch> = new MapDictionary(),
		public watcherService = nodeFs,
	) {
		super(idProvider, eventEmitter, utils, cfg, context);
	}

	init(targetPath?: string): void {
		if (targetPath) {
			this.setWatch(targetPath);
		} else if (workspace.workspaceFolders) {
			workspace.workspaceFolders.forEach(workspaceFolder =>
				this.setWatch(this.getFullPathToSubfolder(workspaceFolder)),
			);
			this.initListeners();
		} else {
			// console.log('no files or folders to watch');
		}
	}

	setWatch(path: string): void {
		const watch = this.watcherService.watch(path, this.onChange.bind(this));
		this.pool.add({ key: path, watch });
	}

	stopWatch(path: string): void {
		this.pool.get(path)!.watch.close();
	}

	onChange = this.debounce(function(event, fileName: string) {
		this.generateCustomEvent(fileName, event); // change args order to conform with chokidar
	});

	processEventData(eventData): ChangeData | undefined {
		if (eventData.event === 'rename' || ~eventData.fileName.indexOf('~'))
			return undefined;
		return super.processEventData(eventData);
	}
}

export interface Watch {
	key: string;
	watch: nodeFs.FSWatcher;
}
