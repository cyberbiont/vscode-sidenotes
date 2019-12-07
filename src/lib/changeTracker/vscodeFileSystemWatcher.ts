import * as vscode from 'vscode';
import * as path from 'path';

import {
	EventEmitter,
	IIdMaker,
	OFileChangeTracker,
	FileChangeTracker,
	MarkerUtils
} from '../types';

export default class VSCodeFileSystemWatcher extends FileChangeTracker {

	protected watcherService: Map<vscode.GlobPattern, vscode.FileSystemWatcher> = new Map();

	constructor(
		idMaker: IIdMaker,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		public cfg: OFileChangeTracker,
		public context: vscode.ExtensionContext
	) {
		super(idMaker, eventEmitter, utils, cfg, context);
		this.o = cfg.storage.files;
	}

	init(targetPath?: string): void {
		if (targetPath) this.setWatch(targetPath);
		else vscode.workspace.workspaceFolders!.forEach(workspace =>
			this.setWatch(this.getWorkspaceFolderRelativePattern(workspace))
		);
	}

	getWorkspaceFolderRelativePattern(workspace: vscode.WorkspaceFolder): vscode.RelativePattern {
		return new vscode.RelativePattern(
			this.getFullPathToSubfolder(workspace),
			// `*${this.cfg.storage.files.defaultContentFileExtension}`
			'*.*'
		);
	}

	getWatcherInstance(pattern: vscode.GlobPattern) {
		const watcher = vscode.workspace.createFileSystemWatcher(
			pattern,
			true,
			false,
			true
		);
		watcher.onDidChange(this.onChange, this);
		return watcher;
	}

	// onChange = this.debounce(function (uri: vscode.Uri) {
	// 	this.generateCustomEvent(uri.fsPath, 'change');
	// })

	onChange(uri: vscode.Uri) {
		// this.debounce(() => this.generateCustomEvent(uri.fsPath, 'change'));
		this.generateCustomEvent(uri.fsPath, 'change');
	}

	setWatch(pattern: vscode.GlobPattern): void {
		this.watcherService.set(pattern, this.getWatcherInstance(pattern));
	}

	stopWatch(pattern: vscode.GlobPattern): void {
		for (const watcher of this.watcherService.values()) {
			watcher.dispose();
		}
	}
}
