import * as vscode from 'vscode';
import * as path from 'path';

import {
	EditorServiceController,
	EditorUtils,
	FileSystem,
	ICfg,
	MarkerUtils,
	// IEditorService,
	Scanner
} from './types';
import { throws } from 'assert';

export interface IStorable {
	// id: string;
	content: string;
	// extension?: string;
}

export type OStorageService = {
}

type StorageKey = FileStorageKey // & ...

export interface IStorageService {
	delete(key: StorageKey): boolean | Promise<boolean>;
	write(key: StorageKey, data: IStorable): boolean | Promise<boolean>;
	get(key: StorageKey): IStorable | undefined;
	open(key: StorageKey);
	checkRequirements?(): void;
	lookup?(
		key: StorageKey,
		lookupFolderPath?: string,
		workspace?: string,
		resolveAction?: string
	): Promise<string | boolean>;
}

interface FileStorageKey {
	id: string,
	extension?: string
}

export interface IFileStorage extends IStorageService {
	lookup(
		key: FileStorageKey,
		lookupFolderPath?: string,
		workspace?: string,
		resolveAction?: string
	): Promise<string | boolean>;
}

type DefaultContentFileExtension = '.md'|'.markdown'|'.mdown'|'.txt';

export type OFileStorage = {
	storage: {
		files: {
			notesSubfolder: string;
			defaultContentFileExtension: DefaultContentFileExtension;
		}
	}
}

// TODO 🕮 <YL> 1744f795-4133-4688-97d3-e8f02b26c886.md
export class FileStorage implements IFileStorage {
	private pathCache: WeakMap<FileStorageKey, string> = new WeakMap;
	// 🕮 <YL> 126a0df4-003e-4bf3-bf41-929db6ae35e7.md

	private o: {
		notesSubfolder: string;
		defaultContentFileExtension: DefaultContentFileExtension;
	}

	private notesFolder: string

	constructor(
		public editorServiceController: EditorServiceController,
		public utils: EditorUtils & MarkerUtils,
		public fs: FileSystem,
		cfg: OFileStorage,
		private commands,
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

	get(key: FileStorageKey): IStorable | undefined {
		// TODO make async
		try {
			const path = this.getContentFilePath(key);
			const content = this.fs.read(path);
			return {
				content
			};
		} catch (e) {
			return undefined;
		}
	}

	open(key: FileStorageKey) {
		const { extension = this.o.defaultContentFileExtension } = key;
		const path = this.getContentFilePath(key);
		return this.editorServiceController.open(path, extension);
	}

	private getContentFileName(key: FileStorageKey): string {
		// 🖉 2190628a-b268-44c2-a81a-939ce26dd7a4
		const { id, extension = this.o.defaultContentFileExtension } = key;
		return `${id}${extension}`;
	}

	private getContentFilePath(key: FileStorageKey): string {
		if (this.pathCache.has(key)) return this.pathCache.get(key)!;

		// by default we look in the current document's workspace folder
		const filePath = path.join(
			this.utils.getWorkspaceFolderPath(),
			this.o.notesSubfolder,
			this.getContentFileName(key)
		);

		this.pathCache.set(key, filePath);

		return filePath;
	}

	async delete(key: FileStorageKey): Promise<boolean> {
		try {
			await this.fs.delete(this.getContentFilePath(key));
			return true;
		} catch (e) {
			return false;
			// if file is not present, continue
		}
	}

	async ensureNotesFolderExists() {
		// 🕮 <YL> 5a7d9cf7-71ee-4a84-abbe-ea320afe220f.md
		if (!this.fs.exists(this.notesFolder)) {
			try {
				await this.fs.createDirectory(this.notesFolder);
				console.log(`Sidenotes: created missing subfolder ${this.o.notesSubfolder} for content files`)
			}	catch (e) {
				throw vscode.FileSystemError.FileNotFound(this.notesFolder);
			}
		}
	}

	async write(key: FileStorageKey, data: IStorable): Promise<boolean> {
		const path = this.getContentFilePath(key);

		try {
			// 🕮 <YL> 40e7f83a-036c-4944-9af1-c63be09f369d.md
			if (!this.fs.exists(path)) {
				this.fs.write(path, data.content);
				return true;
			} else {
				console.warn('content file already exists, aborting write file action');
			}
		} catch (err) {
			if (err.code === 'ENOENT') {
				// console.log(`content files directory seems to not exist at specified location. Creating directory and trying again`);
				await this.ensureNotesFolderExists();
				await this.write(key, data);
				return true;
			} else {
				throw new vscode.FileSystemError(`Unknown error while trying to write content file`);
			}
		}
		return false;
	}

	async lookup(
		key: FileStorageKey,
		lookupFolderPath: string,
		workspace: string = this.utils.getWorkspaceFolderPath(),
		resolveAction: string = 'copy'
	): Promise<string | boolean> {
		const fileName = this.getContentFileName(key);

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
			this.fs.exists(lookupFilePath) &&
			!this.fs.exists(currentFilePath)
		) {
			if (resolveAction === 'move')
				this.fs.rename(lookupFilePath, currentFilePath);
			else if (resolveAction === 'copy')
				await this.fs.copy(lookupFilePath, currentFilePath);
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
				const { detectedKeys, files: { fileIds: fileKeys, strayEntries }} = await this.analyzeWorkspaceFolder(folder.uri);
				const broken: string[] = [];

				// const keys = Array.from(detectedKeys);
				detectedKeys.forEach(key => {
					if (!(
						key in fileKeys
						&& typeof this.fs.read(fileKeys[key]) === 'string' // ensure that content note is readable
					)) {
						broken.push(key);
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
						broken.map(async key => {
							const [ id, extension ] = key.split('.');
							// 🕮 <YL> 8fc4b127-f19f-498b-afea-70c6d27839bf.md
							return this.lookup({ id, extension }, lookupUri[0].fsPath);

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

			console.log(`Sidenotes: ${paths.length} ${type} files in folder ${folder.uri.fsPath}:\n(${paths.join(')\n(')})`);
			// paths.forEach(path => console.log(path));

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
						await this.fs.delete(filepath);
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
			const { detectedKeys, files: { fileIds, strayEntries }} = await this.analyzeWorkspaceFolder(folder.uri);
			const extraneous: string[] = [];

			for (const id in fileIds) {
				if (!detectedKeys.includes(id)) extraneous.push(fileIds[id])
			}

			await handleResults('extraneous', extraneous, folder);
			await handleResults('stray', strayEntries, folder);
		});
	}

	async analyzeWorkspaceFolder(folder: vscode.Uri) {
		const attachDefaultExtension = (key: string): string => {
			if (!path.extname(key)) key = `${key}${this.o.defaultContentFileExtension}`
			return key;
		}

		const detectedKeysSet = await this.fs.scanDirectoryFilesContentsForKeys(folder);
		const detectedKeys = Array.from(detectedKeysSet).map(attachDefaultExtension);

		const files = await this.analyzeFolderContentFiles(folder);

		return {
			detectedKeys, files
		}
	}

	async analyzeFolderContentFiles(folder: vscode.Uri): Promise<{
		fileIds: { [id: string]: string	},
		strayEntries: string[]
	}> {
		// 🕮 <YL> d7ba6b50-007c-4c92-84e9-d0c10e0386ef.md
		const notesSubfolderPath = path.join(
			folder.fsPath,
			this.o.notesSubfolder
		);
		const fileIds = Object.create(null);
		const strayEntries: string[] = [];

		for (const [name, type] of await vscode.workspace.fs.readDirectory(folder.with({ path: notesSubfolderPath }))) {
			const filePath = path.join(notesSubfolderPath, name);
			if (type === vscode.FileType.File) {
				const id = this.utils.getIdFromString(filePath);
				if (!id) strayEntries.push(filePath);
 				else {
					const key = this.getContentFileName({
						id,
						extension: path.extname(filePath)
					});
					fileIds[key] = filePath;
				}
			} else {
				strayEntries.push(filePath);
			}
		}

		return {
			fileIds, strayEntries
		};
	}

}
