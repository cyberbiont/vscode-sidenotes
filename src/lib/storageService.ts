import * as vscode from 'vscode';
import * as nodeFs from 'fs';
import * as path from 'path';

import {
	EditorUtils,
	IEditorService,
	ICfg
} from './types';
import { throws } from 'assert';

export interface IStorable {
	id: string;
	content: string;
}

export type OStorageService = {
	// storage: {
	// 	defaultEditorService: 'vscode'|'Typora'|'system default', //TODO
	// }
}

// TODO https://code.visualstudio.com/api/references/vscode-api#FileSystemProvider

export interface IStorageService {
	delete(id: string): boolean | Promise<boolean>;
	write(data: IStorable): boolean | Promise<boolean>;
	get(id: string): IStorable | undefined;
	open(id: string);
	checkRequirements?(): void;
	//? как разрешить имплементацию метода с другими аргументами, например?
	lookup?(
		id: string,
		lookupFolderPath?: string,
		workspace?: string,
		resolveAction?: string
	): Promise<string | boolean>;
}

export interface IFileStorage extends IStorageService {
	lookup(
		id: string,
		lookupFolderPath?: string,
		workspace?: string,
		resolveAction?: string
	): Promise<string | boolean>;
	// getFilePath(id: string): string,
}

export type OFileStorage = {
	storage: {
		files: {
			notesSubfolder: string;
			contentFileExtension: string;
		}
	}
}

// TODO implement separate 'run' command for each editor type
// TODO handle uri instead of file paths;
// TODO use fs.promises
export class FileStorage implements IFileStorage {

	private pathCache: {
		[id: string]: string;
	} = Object.create(null);

	private o: {
		notesSubfolder: string;
		contentFileExtension: string;
	}

	constructor(
		public editorService: IEditorService,
		public utils: EditorUtils,
		cfg: OFileStorage,
		public fs = nodeFs
	) {
		this.o = cfg.storage.files;
	}

	checkRequirements(): void {
		if (!vscode.workspace.workspaceFolders) {
			throw new Error('Adding notes requires an open folder.');
		}
		const notesFolder = path.join(
			this.getCurrentWorkspacePath(),
			this.o.notesSubfolder
		);

		if (!this.fs.existsSync(notesFolder)) {
			this.fs.mkdirSync(notesFolder);
		}
	}

	get(id: string): IStorable | undefined {
		try {
			const content = this.fs.readFileSync(this.getFilePath(id), {
				encoding: 'utf8'
			});
			return {
				id,
				content
			};
		} catch (e) {
			return undefined;
		}
	}

	open(id: string) {
		const path = this.getFilePath(id);
		return this.editorService.open(path);
	}

	private getCurrentWorkspacePath(): string {
		return this.utils.getWorkspaceFolderPath();
	}

	// private getNotesSubfolderPath(folderPath: string): string {
	// 	const notesSubfolderPath = path.join(folderPath, this.cfg.notesSubfolder);
	// 	if (!this.fs.existsSync(notesSubfolderPath)) this.fs.mkdirSync(notesSubfolderPath);
	// 	return notesSubfolderPath;
	// }

	private getFileName(id: string): string {
		return `${id}${this.o.contentFileExtension}`;
	}

	getFilePath(id: string): string {
		if (this.pathCache[id]) return this.pathCache[id];

		// const notesSubfolderPath = this.getNotesSubfolderPath( this.getCurrentWorkspacePath() );  // by default we look in the current document's workspace folder
		const filePath = path.join(
			this.getCurrentWorkspacePath(),
			this.o.notesSubfolder,
			this.getFileName(id)
		);
		// const filePath = this.getFilePathFromParts(notesSubfolderPath, id);

		this.pathCache[id] = filePath;

		return filePath;
	}

	delete(id): boolean {
		try {
			this.fs.unlinkSync(this.getFilePath(id));
			return true;
		} catch (e) {
			return false;
			// if file is not present, continue
		}
	}

	async write(data: IStorable): Promise<boolean> {
		const path = this.getFilePath(data.id);
		if (!this.fs.existsSync(path)) {
			this.fs.writeFileSync(path, data.content);
			return true;
		}
		return false;
	}

	async lookup(
		id: string,
		lookupFolderPath: string,
		workspace: string = this.getCurrentWorkspacePath(),
		resolveAction: string = 'copy'
	): Promise<string | boolean> {
		const fileName = this.getFileName(id);

		const lookupFilePath = path.join(
			lookupFolderPath,
			// this.o.notesSubfolder,
			fileName
		);
		const currentFilePath = path.join(
			workspace,
			this.o.notesSubfolder,
			fileName
		);

		if (
			this.fs.existsSync(lookupFilePath) &&
			!this.fs.existsSync(currentFilePath)
		) {
			if (resolveAction === 'move')
				this.fs.rename(lookupFilePath, currentFilePath, err => {
					if (err) throw err;
				});
			else if (resolveAction === 'copy')
				this.fs.copyFileSync(lookupFilePath, currentFilePath);
			return currentFilePath;
		} else {
			vscode.window.showErrorMessage(
				`Cannot find sidenote file: there is no such file in the directory that you have selected!`
			);
			return false;
		}
	}
}
