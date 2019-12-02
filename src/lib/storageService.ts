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
}

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
}

type ContentFileExtension = '.md'|'.markdown'|'.mdown'|'.txt';

export type OFileStorage = {
	storage: {
		files: {
			notesSubfolder: string;
			contentFileExtension: ContentFileExtension;
		}
	}
}

// TODO 🕮 1744f795-4133-4688-97d3-e8f02b26c886
export class FileStorage implements IFileStorage {

	private pathCache: {
		[id: string]: string;
	} = Object.create(null);

	private o: {
		notesSubfolder: string;
		contentFileExtension: ContentFileExtension;
	}

	private notesFolder: string

	constructor(
		public editorService: IEditorService,
		public utils: EditorUtils,
		public fileSystem: FileSystem,
		cfg: OFileStorage,
		private commands,
		public fs = nodeFs,
		public fsv = vscode.workspace.fs,
	) {
		this.o = cfg.storage.files;
		this.notesFolder = path.join(
			this.utils.getWorkspaceFolderPath(),
			this.o.notesSubfolder
		);
		this.commands.registerCommand('sidenotes.migrate', this.migrate, this);
		this.commands.registerCommand('sidenotes.extraneous', this.cleanExtraneous, this);
	}

	checkRequirements(): void {
		if (!vscode.workspace.workspaceFolders) {
			throw new Error('Adding notes requires an open folder.');
		}
	}

	get(id: string): IStorable | undefined {
		// TODO make async
		try {
			const content = this.fileSystem.read(this.getContentFilePath(id));
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

	private getContentFileName(id: string): string {
		return `${id}${this.o.contentFileExtension}`;
	}

	private getContentFilePath(id: string): string {
		if (this.pathCache[id]) return this.pathCache[id];

		// by default we look in the current document's workspace folder
		const filePath = path.join(
			this.utils.getWorkspaceFolderPath(),
			this.o.notesSubfolder,
			this.getContentFileName(id)
		);

		this.pathCache[id] = filePath;

		return filePath;
	}

	async delete(id): Promise<boolean> {
		try {
			await this.fileSystem.delete(this.getContentFilePath(id));
			return true;
		} catch (e) {
			return false;
			// if file is not present, continue
		}
	}

	async ensureNotesFolderExists() {
		// 🕮 5a7d9cf7-71ee-4a84-abbe-ea320afe220f
		if (!this.fileSystem.exists(this.notesFolder)) {
			try {
				await this.fileSystem.createDirectory(this.notesFolder);
				console.log(`Sidenotes: created missing subfolder ${this.o.notesSubfolder} for content files`)
			}	catch (e) {
				throw vscode.FileSystemError.FileNotFound(this.notesFolder);
			}
		}
	}

	async write(data: IStorable): Promise<boolean> {
		const path = this.getContentFilePath(data.id);

		try {
			// 🕮 40e7f83a-036c-4944-9af1-c63be09f369d
			if (!this.fileSystem.exists(path)) {
				this.fileSystem.write(path, data.content);
				return true;
			} else {
				console.warn('content file already exists, aborting write file action');
			}
		} catch (err) {
			if (err.code === 'ENOENT') {
				// console.log(`content files directory seems to not exist at specified location. Creating directory and trying again`);
				await this.ensureNotesFolderExists();
				await this.write(data);
				return true;
			} else {
				throw new vscode.FileSystemError(`Unknown error while trying to write content file`);
			}
		}
		return false;
	}

	async lookup(
		id: string,
		lookupFolderPath: string,
		workspace: string = this.utils.getWorkspaceFolderPath(),
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
			this.fileSystem.exists(lookupFilePath) &&
			!this.fileSystem.exists(currentFilePath)
		) {
			if (resolveAction === 'move')
				this.fileSystem.rename(lookupFilePath, currentFilePath);
			else if (resolveAction === 'copy')
				await this.fileSystem.copy(lookupFilePath, currentFilePath);
			return currentFilePath;
		} else {
			vscode.window.showErrorMessage(
				`Cannot find sidenote file: there is no such file in the directory that you have selected!`
			);
			return false;
		}
	}

	async migrate(): Promise<void> {

		const folders = vscode.workspace.workspaceFolders;
		if (folders && folders.length > 0) {
			folders.forEach(async folder => {
				const { detectedIds, files: { fileIds, strayEntries }} = await this.analyzeWorkspaceFolder(folder.uri);
				const broken: string[] = [];

				const ids = Array.from(detectedIds);
				ids.forEach(id => {
					if (!(
						id in fileIds
						&& typeof this.fileSystem.read(fileIds[id]) === 'string' // ensure that content note is readable
					)) {
						broken.push(id);
					}
				})

				if (broken.length === 0) {
					vscode.window.showInformationMessage(
						`Sidenotes: no broken sidenote anchors was found\n
						in ${folder.uri.fsPath} workspace folder`
					);
					return;
				}

				const action = await vscode.window.showQuickPick(
					[{
						label: 'yes',
						description: `look for missing content files (select folder to look in)`
					}, {
						label: 'no',
						description: 'cancel'
					}], {
						placeHolder: `Sidenotes: ${broken.length} broken anchors was found in ${folder.uri.fsPath} workspace folder. \&nbsp
						Do you want to look for content files?`
					}
				);

				if (action && action.label === 'yes') {
					const options: vscode.OpenDialogOptions = {
						canSelectMany: false,
						canSelectFolders: true,
						defaultUri: folder.uri,
						openLabel: 'Confirm selection'
					};

					const lookupUri = await vscode.window.showOpenDialog(options);
					if (!lookupUri) return;

					const results = await Promise.all(
						// ids.map
						broken.map(async id => {
							return this.lookup!(id, lookupUri[0].fsPath);
						})
					);
					const successfulResults = results
						.filter((result): result is string => !!result)
						.map(filepath => path.basename(filepath));
					const message = successfulResults.length === 0
						?	`No missing files were found in specified directory`
						: `The following files have been found and copied to the current workspace:\n
							${successfulResults.join(',\n')}`;
					vscode.window.showInformationMessage(message);
					return true;
				}
			})
		}
	}

	async cleanExtraneous(): Promise<void> {

		const handleResults = async (type: string, paths: string[], folder: vscode.WorkspaceFolder): Promise<boolean> => {
			if (paths.length === 0) {
				vscode.window.showInformationMessage(
					`Sidenotes: no ${type} files was found in ${folder.uri.fsPath} sidenote subfolder`
				);
				return false;
			}

			const action = await vscode.window.showQuickPick(
				[{
					label: 'yes',
					description: `delete ${type} files`
				}, {
					label: 'no',
					description: 'cancel'
				}], {
					placeHolder: `Sidenotes: found ${paths.length} ${type} files
					in ${folder.uri.fsPath} sidenote directory.
					Do you want to delete them now?`
				}
			);

			if (action && action.label === 'yes') {
				const deleted = await Promise.all(
					paths.map(async (filepath: string) => {
						await this.fileSystem.delete(filepath);
						return path.basename(filepath);
					})
				);

				vscode.window.showInformationMessage(
					`The following files have been deleted from your sidenote folder:\n
					${deleted.join(',\n')}`
				);
				return true;
			}

			return false;
		}

		const folders = vscode.workspace.workspaceFolders;
		if (folders && folders.length > 0) folders.forEach(async folder => {
			const { detectedIds, files: { fileIds, strayEntries }} = await this.analyzeWorkspaceFolder(folder.uri);
			const extraneous: string[] = [];

			for (const id in fileIds) {
				if (!detectedIds.has(id)) extraneous.push(fileIds[id])
			}

			await handleResults('extraneous', extraneous, folder);
			await handleResults('stray', strayEntries, folder);
		});
	}

	async analyzeWorkspaceFolder(folder: vscode.Uri) {
		const detectedIds = await this.fileSystem.scanDirectoryFilesContentsForIds(folder);
		const files = await this.analyzeFolderContentFiles(folder);

		return {
			detectedIds, files
		}
	}

	async analyzeFolderContentFiles(folder: vscode.Uri): Promise<{
		fileIds: { [id: string]: string	},
		strayEntries: string[]
	}> {
		// 🕮 d7ba6b50-007c-4c92-84e9-d0c10e0386ef
		const notesSubfolderPath = path.join(
			folder.fsPath,
			this.o.notesSubfolder
		);
		const fileIds = Object.create(null);
		const strayEntries: string[] = [];

		for (const [name, type] of await this.fsv.readDirectory(folder.with({ path: notesSubfolderPath }))) {
			const filePath = path.join(notesSubfolderPath, name);
			if (type === vscode.FileType.File) {
				const id = this.editorService.changeTracker.getIdFromFileName(filePath);
				if (!id) strayEntries.push(filePath);
 				else fileIds[id] = filePath;
			} else {
				strayEntries.push(filePath);
			}
		}

		return {
			fileIds, strayEntries
		};
	}

}
