import {
	GlobPattern,
	FileSystemWatcher,
	ExtensionContext,
	RelativePattern,
	WorkspaceFolder,
	Uri,
	workspace,
} from 'vscode';
import { EventEmitter } from 'events';
import { FileChangeTracker, OFileChangeTracker } from '.';
import { IdProvider } from '../idProvider';
import { MarkerUtils } from '../utils';

export default class VSCodeFileSystemWatcherMaker extends FileChangeTracker {
	protected watcherService: Map<GlobPattern, FileSystemWatcher> = new Map();

	constructor(
		idMaker: IdProvider,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		public cfg: OFileChangeTracker,
		public context: ExtensionContext,
	) {
		super(idMaker, eventEmitter, utils, cfg, context);
		this.o = cfg.storage.files;
		this.init();
	}

	init(): void {
		// 🕮 <cyberbiont> 2b142ca3-c392-4812-b1c3-24bd5a9cb42b.md
		// if (targetPath) this.setWatch(targetPath);
		// else
		workspace.workspaceFolders!.forEach((workspaceFolder) =>
			this.setWatch(this.getWorkspaceFolderRelativePattern(workspaceFolder)),
		);
	}

	getWorkspaceFolderRelativePattern(
		workspace: WorkspaceFolder,
	): RelativePattern {
		return new RelativePattern(
			this.getFullPathToSubfolder(workspace),
			// `*${this.cfg.storage.files.defaultContentFileExtension}`
			'**/*.*',
		);
	}

	getWatcherInstance(pattern: GlobPattern): FileSystemWatcher {
		const watcher = workspace.createFileSystemWatcher(
			pattern,
			true,
			false,
			true,
		);
		watcher.onDidChange(this.onChange, this);
		return watcher;
	}

	/* onChange = this.debounce(function (uri: vscode.Uri) {
		this.generateCustomEvent(uri.fsPath, 'change');
	}) */

	onChange(uri: Uri): void {
		// this.debounce(() => this.generateCustomEvent(uri.fsPath, 'change'));
		this.generateCustomEvent(uri.fsPath, 'change');
	}

	setWatch(pattern: GlobPattern): void {
		this.watcherService.set(pattern, this.getWatcherInstance(pattern));
	}

	stopWatch(pattern: GlobPattern): void {
		for (const watcher of this.watcherService.values()) {
			watcher.dispose();
		}
	}
}
