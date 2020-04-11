import {
	ExtensionContext,
	workspace,
	WorkspaceFoldersChangeEvent,
} from 'vscode';
import path from 'path';
import { EventEmitter } from 'events';
import ChangeTracker from './changeTracker';
import { IdProvider } from '../idProvider';
import { MarkerUtils } from '../utils';

export type OFileChangeTracker = {
	storage: {
		files: {
			notesFolder: string;
			defaultContentFileExtension: string;
		};
	};
};

// 🕮 <cyberbiont> 39bcba93-982b-44c1-8fa7-4eb99e3acab0.md
export default abstract class FileChangeTracker extends ChangeTracker {
	protected watcherService;
	protected wait: NodeJS.Timeout | boolean = false;

	protected o: {
		notesFolder: string;
		defaultContentFileExtension: string;
	};

	constructor(
		idProvider: IdProvider,
		eventEmitter: EventEmitter,
		utils: MarkerUtils,
		public cfg: OFileChangeTracker,
		public context: ExtensionContext,
	) {
		super(idProvider, eventEmitter, utils);
		this.o = cfg.storage.files;
	}

	getFullPathToSubfolder(workspace): string {
		return path.join(workspace.uri.fsPath, this.o.notesFolder);
	}

	onWorkspaceChange(event: WorkspaceFoldersChangeEvent): void {
		if (event.added)
			event.added.forEach((workspaceFolder) =>
				this.setWatch(this.getFullPathToSubfolder(workspaceFolder)),
			);
		if (event.removed)
			event.removed.forEach((workspaceFolder) =>
				this.stopWatch(this.getFullPathToSubfolder(workspaceFolder)),
			);
	}

	initListeners(): void {
		workspace.onDidChangeWorkspaceFolders(
			this.onWorkspaceChange.bind(this),
			this.context.subscriptions,
		);
	}

	debounce(cb) {
		return function (...args): void {
			if (this.wait) return;
			this.wait = setTimeout(() => {
				this.wait = false;
			}, 500);
			cb.call(this, ...args);
		};
	}

	abstract init(targetPath?: string): void;
	abstract setWatch(path: string): void;
	abstract stopWatch(path: string): void;
}
