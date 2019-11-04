import * as vscode from 'vscode';
import * as nodeFs from 'fs';
import * as path from 'path';

import {
	ActiveEditorUtils,
	IEditorService,
} from  './types';

export interface IStorable {
	id: string
	content: string
}

export interface IStorageService {
	delete(id: string): boolean|Promise<boolean>
	write(data: IStorable): boolean|Promise<boolean>
	get(id: string): IStorable|undefined
	open(id: string);
	checkRequirements?(): void
	// TODO как разрешить имплементацию с другими аругментами, например?
	lookup?(
		id: string,
		lookupFolderPath?: string,
		workspace?: string,
		resolveAction?: string
	): Promise<boolean>
}

export interface IFileStorage extends IStorageService {
	lookup(
		id: string,
		lookupFolderPath?: string,
		workspace?: string,
		resolveAction?: string
	): Promise<boolean>
	// getFilePath(id: string): string,
}

export type IFileStorageCfg = {
	notesSubfolder: string
}

// export abstract class StorageService implements IStorageService {
// 	abstract delete(id: string): boolean|Promise<boolean>
// 	abstract write(data: IStorable): boolean|Promise<boolean>
// 	abstract get(id: string): IStorable
// 	abstract open(id: string)
// }

export class FileStorage
	// extends StorageService
	implements IFileStorage	{
	//TODO handle uri instead of file paths;

	private pathCache: {
		[id: string]: string
	}

	private o: {
		ext: string
	} & IFileStorageCfg

	constructor(
		public editorService: IEditorService,
		public activeEditorUtils: ActiveEditorUtils,
		cfg: IFileStorageCfg,
		// public ext: string = '.md',
		public fs = nodeFs
	) {
		this.pathCache = {};
		this.o = Object.assign({
			ext: '.md'
		}, cfg);
	}

	checkRequirements(): void {
		if (!vscode.workspace.workspaceFolders) {
			throw new Error('Adding notes requires an open folder.');
		}
	}

	get(id: string): IStorable|undefined {
		try {
			const content = this.fs.readFileSync(this.getFilePath(id), { encoding: 'utf8' });
			return {
				id,
				content
			}
		} catch (e)	{
			// const action = this.handleBroken(id);
			// vscode.window.showErrorMessage(`<Failed to open file>. ${e.message}`);
			// return {
			// 	id,
			// 	content: undefined
			// }
			return undefined;
		}
	}

	open(id: string) {
		const path = this.getFilePath(id);
		return this.editorService.open(path);
	}

	private getCurrentWorkspacePath(): string {
		return this.activeEditorUtils.getWorkspaceFolderPath();
	}

	// private getNotesSubfolderPath(folderPath: string): string {
	// 	const notesSubfolderPath = path.join(folderPath, this.cfg.notesSubfolder);
	// 	if (!this.fs.existsSync(notesSubfolderPath)) this.fs.mkdirSync(notesSubfolderPath);
	// 	return notesSubfolderPath;
	// }

	private getFileName(id: string): string {
		return `${id}${this.o.ext}`;
	}

	getFilePath(id: string): string {
		if (this.pathCache[id]) return this.pathCache[id];

		// const notesSubfolderPath = this.getNotesSubfolderPath( this.getCurrentWorkspacePath() );  // by default we look in the current document's workspace folder
		const filePath = path.join(
			this.getCurrentWorkspacePath(),
			this.o.notesSubfolder,
			this.getFileName(id)
		)
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
	): Promise<boolean> {

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

		if (this.fs.existsSync(lookupFilePath) && !this.fs.existsSync(currentFilePath)) {
			if (resolveAction === 'move') this.fs.rename(lookupFilePath, currentFilePath, err => {
				if (err) throw err;
			});
			else if (resolveAction === 'copy') this.fs.copyFileSync(lookupFilePath, currentFilePath);
			return true;
		} else {
			vscode.window.showErrorMessage(`Cannot find sidenote file: there is no such file in the directory that you have selected!`);
			return false;
		}
	}

	/* async scanCurrentWorkspace() {

		interface IFile {
			filename: string,
			content: string
		}
		const readFilePromises: Promise<IFile>[] = [];
		const foundIds: string[] = [];
		const readFiles = filename => {
			if (!filename) {} // TODO filter allowed file types
			// const name = path.parse(filename).name;
			// const ext = path.parse(filename).ext;
			const filepath = path.resolve(workspace, filename);

			readFilePromises.push(
				new Promise((res, rej) => {
					this.fs.readFile(filepath, 'utf-8', (err, content) => {
						if (err) return rej(err);
						return res({ filename, content });
					});
				})
			);
		};
		const scanFileText = text => {
			const fileMatches = this.scanner.getIdsFromText(text);
			foundIds.push(...fileMatches);
		};

		const workspace = this.getCurrentWorkspacePath();
		const filenames = await new Promise<string[]>((rs, rj) => this.fs.readdir(workspace, (err, filenames) => {
			if (err) rj(err);
			else rs(filenames);
		}));

		filenames.forEach(readFiles);
		const fileTexts = await Promise.all(readFilePromises);

		fileTexts.forEach(scanFileText);

		// foundIds.forEach()
		// matches.map()

	}
 */
}
