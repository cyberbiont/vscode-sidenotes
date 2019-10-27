import * as vscode from 'vscode';
import { EventEmitter } from 'events';
import { IIdMaker } from './idMaker';
import { ActiveEditorUtils } from './utils'
import { IDictionary } from './dictionary';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import * as path from 'path';

// TODO update styles on file delete (delete corresponding anchor?)

export interface IChangeData {
	id: string
}

export interface IChangeTracker {
	eventEmitter: EventEmitter
	dispatch(changeData: IChangeData): void
	init(path?: String): void
}

export abstract class ChangeTracker {
	constructor(
		public idMaker: IIdMaker,
		public eventEmitter: EventEmitter
	) {
		this.idMaker = idMaker;
		this.eventEmitter = eventEmitter;
	}

	protected getIdFromFileName(fileName: string): string|null {
		const match = fileName.match(this.idMaker.ID_REGEX)
		if (match) return match[0];
		return null;
	}

	dispatch(changeData: IChangeData): void {
		this.eventEmitter.emit('sidenoteDocumentChange', changeData);
	}

}

export class VscodeChangeTracker extends ChangeTracker {
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		public context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter);
		this.context = context;
	}

	init() {
		vscode.workspace.onDidSaveTextDocument(this.onChange, this, this.context.subscriptions);
	}

	onChange(document: vscode.TextDocument): IChangeData|undefined {
		const id = this.getIdFromFileName(document.fileName);
		if (id)  {
			const changeData = {
				id
			}
			this.dispatch(changeData);
			return changeData;
		}
	}
}

export interface IWatch { id: string, watch: fs.FSWatcher }
// 2 варианта: можно установить слежение за всей папкой файлов сразу и по filename в лисенере вычислять id, какой из них изменился
// это больше похоже на случай есл  используем vscodechangetracker
// либо поддерживать pool watch ей (добавлять в пул при открытии документа)
// т.е. независимый watch для каждого файла. плюс - сразу можно рассчитать id для вотча и не гонять match на change каждый раз

export type IWatchTrackerCfg = {
	notesSubfolder: string
}

export abstract class FileChangeTracker extends ChangeTracker {
	protected watcher;
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		public cfg: IWatchTrackerCfg,
		public context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter);
		this.cfg = cfg;
		this.context = context;
	}

	getFullPath(workspace) {
		return path.join(workspace.uri.fsPath, this.cfg.notesSubfolder);
	}

	onWorkspaceChange(event: vscode.WorkspaceFoldersChangeEvent) {
		if (event.added) event.added.forEach(workspace => this.setWatch(this.getFullPath(workspace)))
		if (event.removed) event.removed.forEach(workspace => this.stopWatch(this.getFullPath(workspace)))
	}

	initListeners() {
		vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceChange.bind(this), this.context.subscriptions);
	}

	abstract init(targetPath?: string): void
	abstract setWatch(path: string): void
	abstract stopWatch(path: string): void

	onChange(fileName: string, event) {;
		const changeData = this.processEventData({ event, fileName });
		if (changeData) this.dispatch(changeData);
	}

	processEventData(eventData): IChangeData|undefined {
		const id = this.getIdFromFileName(eventData.fileName);
		if (id) {
			const changeData = { id	};
			return changeData;
		}
	}
}

export class ChokidarChangeTracker extends FileChangeTracker {
	protected watcher
	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		cfg: IWatchTrackerCfg,
		context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter, cfg, context);
	}

	init(targetPath?: string) {
		let target = targetPath ? targetPath :
			vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.map(workspace => this.getFullPath(workspace)) :
				undefined
		if (!target) return;

		this.watcher = chokidar.watch(target, {
			// ignored: /(^|[\/\\])\../, // ignore dotfiles
			persistent: true
		})
		.on('change', this.chokidarOnChangeCb.bind(this));

		this.initListeners();
		// super.init();

	}

	chokidarOnChangeCb(path) {
		this.onChange(path, 'change');
	}

	setWatch(path: string) {
		this.watcher.add(path);
	}

	stopWatch(path: string) {
		this.watcher.unwatch(path);
	}
}

export class FSWatchChangeTracker extends FileChangeTracker {

	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		cfg: IWatchTrackerCfg,
		context: vscode.ExtensionContext,
		public watcher: IFileWatcher,
		public pool: IDictionary<IWatch>,
	) {
		super(idMaker, eventEmitter, cfg, context);
		this.watcher = watcher;
		this.pool = pool;
	}

	init(targetPath?: string) {
		if (targetPath) {
			this.setWatch(targetPath);
		}
		else if (vscode.workspace.workspaceFolders) {
			vscode.workspace.workspaceFolders.forEach(workspace => this.setWatch(this.getFullPath(workspace)));
			this.initListeners();
		} else {
			// console.log('no files or folders to watch');
		}
	}

	setWatch(path: string) {
		const watch = this.watcher.watch(path, this.fsChangeCb.bind(this));
		this.pool.add({ id: path, watch });
	}

	stopWatch(path: string) {
		this.pool.get(path)!.watch.close();
	}

	fsChangeCb(event, fileName: string) {
		this.debounce(this.onChange.bind(this, fileName, event)); // change args order to conform with chokidar
	}

	processEventData(eventData): IChangeData|undefined {
		if (eventData.event === 'rename' || ~eventData.fileName.indexOf('~')) return;
		return super.processEventData(eventData);
	}

	debounce(cb) {
		let fsWait: NodeJS.Timeout|boolean = false;
		if (fsWait) return;
		fsWait = setTimeout(() => {	fsWait = false;	}, 500);
		cb();
	}
}

export interface IFileWatcher {
	watch(path, cb: (event, filename) => void): fs.FSWatcher
}

export class FsWatcher implements IFileWatcher {
	watch(path,...args): fs.FSWatcher {
		return fs.watch(path, ...args);
	}
}
