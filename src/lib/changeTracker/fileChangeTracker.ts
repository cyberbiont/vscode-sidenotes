import * as vscode from 'vscode';
import ChangeTracker from './changeTracker';
import * as path from 'path';
import {
	EventEmitter,
	ICfg,
	IChangeData,
	IIdMaker,
	MarkerUtils
} from '../types';
import { FileStorage } from '../storageService';

export type OFileChangeTracker = {
	storage: {
		files: {
			notesSubfolder: string,
			defaultContentFileExtension: string
		}
	}
}

// 🕮 39bcba93-982b-44c1-8fa7-4eb99e3acab0
export default abstract class FileChangeTracker extends ChangeTracker {
	protected watcherService;

	protected o: {
		notesSubfolder: string,
		defaultContentFileExtension: string
	};

	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		public cfg: OFileChangeTracker,
		public context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter, utils);
		this.o = cfg.storage.files;
	}

	getFullPathToSubfolder(workspace) {
		return path.join(workspace.uri.fsPath, this.o.notesSubfolder);
	}

	onWorkspaceChange(event: vscode.WorkspaceFoldersChangeEvent) {
		if (event.added) event.added.forEach(workspace => this.setWatch(this.getFullPathToSubfolder(workspace)))
		if (event.removed) event.removed.forEach(workspace => this.stopWatch(this.getFullPathToSubfolder(workspace)))
	}

	initListeners() {
		vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceChange.bind(this), this.context.subscriptions);
	}

	abstract init(targetPath?: string): void
	abstract setWatch(path: any): void
	abstract stopWatch(path: any): void
}
