import * as vscode from 'vscode';
import * as nodeFs from 'fs';
import * as path from 'path';

import {
	EditorUtils,
	FileSystem,
	ICfg,
	IEditorService,
	Scanner
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
			contentFileExtension: '.md'|'.markdown'|'.mdown';
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
		public fileSystem: FileSystem,
		cfg: OFileStorage,
		private commands,
		public fs = nodeFs,
	) {
		this.o = cfg.storage.files;
		this.commands.registerCommand('sidenotes.migrate', this.migrate, this);
		this.commands.registerCommand('sidenotes.extraneous', this.cleanExtraneous, this);
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
			const content = this.fs.readFileSync(this.getContentFilePath(id), {
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
		const path = this.getContentFilePath(id);
		return this.editorService.open(path);
	}

	private getCurrentWorkspacePath(): string {
		return this.utils.getWorkspaceFolderPath();
	}

	private getContentFileName(id: string): string {
		return `${id}${this.o.contentFileExtension}`;
	}

	getContentFilePath(id: string): string {
		if (this.pathCache[id]) return this.pathCache[id];

		// by default we look in the current document's workspace folder
		const filePath = path.join(
			this.getCurrentWorkspacePath(),
			this.o.notesSubfolder,
			this.getContentFileName(id)
		);

		this.pathCache[id] = filePath;

		return filePath;
	}

	delete(id): boolean {
		try {
			this.fs.unlinkSync(this.getContentFilePath(id));
			return true;
		} catch (e) {
			return false;
			// if file is not present, continue
		}
	}

	async write(data: IStorable): Promise<boolean> {
		const path = this.getContentFilePath(data.id);
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
		const fileName = this.getContentFileName(id);

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

	async migrate() {
		// TODO вынести в класс userInteractions
		const options: vscode.OpenDialogOptions = {
			canSelectMany: false,
			canSelectFolders: true,
			// defaultUri: this.getCurrentWorkspacePath() //TODO default URI
			openLabel: 'Select folder to look for missing sidenotes',
			// filters: {
			// 	'Text files': ['txt'],
			// 	'All files': ['*']
			// }
		};
		const lookupUri = await vscode.window.showOpenDialog(options);
		if (!lookupUri) return;

		const ids = Array.from(await this.fileSystem.scanDirectoryFilesContentsForIds());
		// TODO try to read files for all sidenotes and report statictics if there are ny broken sidenotes
		// build sidenote instances from ids to check if they are broken
		const results = await Promise.all(
			ids.map(async id => {
				return this.lookup!(id, lookupUri[0].fsPath);
			})
		);
		const successfulResults = results
			.filter((result): result is string => !!result)
			.map(filepath => path.basename(filepath));
		const message = successfulResults.length === 0 ?
			'No missing files were found in specified directory ' :
			`The following files have been found and copied to the current workspace:
			${successfulResults.join(',\n')}`;
		vscode.window.showInformationMessage(message);
	}

	async cleanExtraneous(): Promise<boolean> {
		const ids = await this.fileSystem.scanDirectoryFilesContentsForIds();

		const workspacePath = this.utils.getWorkspaceFolderPath();

		const sidenoteDirFiles = await this.fileSystem.readDirectoryRecursive(workspacePath);

		const extraneous = sidenoteDirFiles
			.filter(filepath => {
				const id = this.editorService.changeTracker.getIdFromFileName(filepath);
				if (id && !ids.has(id)) return true;
				else return false;
			});

		if (extraneous.length === 0) {
			vscode.window.showInformationMessage(
				`Sidenotes: no extraneous files was found in current sidenote directory`
			);
			return false;
		}

		const action = await vscode.window.showQuickPick(
			[{
				label: 'yes',
				description: 'delete extraneous files'
			}, {
				label: 'no',
				description: 'cancel'
			}], {
				placeHolder: `Sidenotes: found ${extraneous.length} extraneous files in current sidenote directory.
				Do you want to delete them now?`
			}
		);
		if (action && action.label === 'yes') {
			const deleted = extraneous.map(filepath => {
				this.fs.unlinkSync(filepath);
				return path.basename(filepath);
			});
			vscode.window.showInformationMessage(
				`The following files have been deleted from your sidenote folder:
				${deleted.join(',\n')}`
			);
			return true;
		}
		return false;
	}

}
