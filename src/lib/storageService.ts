import vscode from 'vscode';
import path from 'path';

import {
	EditorServiceController,
	EditorUtils,
	FileSystem,
	ICfg,
	MarkerUtils,
	Scanner
} from './types';

export interface IStorable {
	content: string;
}

export type OStorageService = {
}
type StorageKey = FileStorageKey // & ...

export interface IStorageService {
	delete(key: StorageKey): Promise<void | void[]>;
	write(key: StorageKey, data: IStorable): Promise<void>;
	get(key: StorageKey): Promise<IStorable | undefined>;
	open(key: StorageKey);
	checkStartupRequirements?(): void;
	lookup?(
		key: FileStorageKey,
		lookupFolderUri?: vscode.Uri,
		workspace?: string,
		resolveAction?: string
	): Promise<vscode.Uri | boolean>;
}

interface FileStorageKey {
	id: string,
	extension?: string
}

export interface IFileStorage extends IStorageService {
}

type DefaultContentFileExtension = '.md'|'.markdown';
// 🕮 <YL> 6abe46d6-116f-44c7-9e0f-4e2b81b64513.md

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
	private uriCache: WeakMap<FileStorageKey, vscode.Uri> = new WeakMap;
	// 🕮 <YL> 126a0df4-003e-4bf3-bf41-929db6ae35e7.md

	private o: {
		notesSubfolder: string;
		defaultContentFileExtension: DefaultContentFileExtension;
	}

	private notesFolder: vscode.Uri

	constructor(
		public editorServiceController: EditorServiceController,
		public utils: EditorUtils & MarkerUtils,
		public fs: FileSystem,
		cfg: OFileStorage,
		private commands,
	) {
		this.o = cfg.storage.files;
		this.notesFolder = this.getUri(path.join(
			this.utils.getWorkspaceFolderPath(),
			this.o.notesSubfolder
		));
		this.commands.registerCommand('sidenotes.migrate', this.migrate, this);
		this.commands.registerCommand('sidenotes.extraneous', this.cleanExtraneous, this);
	}

	async get(key: FileStorageKey): Promise<IStorable | undefined> {
		try {
			const uri = this.getContentFileUri(key);
			const content = await this.fs.read(uri);
			return { content	};
		} catch (e) {
			return undefined;
		}
	}

	async open(key: FileStorageKey) {
		const { extension = this.o.defaultContentFileExtension } = key;
		const uri = this.getContentFileUri(key);
		return this.editorServiceController.open(uri, extension);
	}

	private getUri(path: string): vscode.Uri {
		return vscode.Uri.parse('file:'+ path, true);
	}

	private getContentFileName(key: FileStorageKey): string {
		// 🖉 2190628a-b268-44c2-a81a-939ce26dd7a4
		const { id, extension = this.o.defaultContentFileExtension } = key;
		return `${id}${extension}`;
	}

	private getContentFileUri(key: FileStorageKey): vscode.Uri {
		// if (this.pathCache.has(key)) return this.pathCache.get(key)!;
		if (this.uriCache.has(key)) return this.uriCache.get(key)!;
		// by default we look in the current document's workspace folder
		const filePath = path.join(
			this.utils.getWorkspaceFolderPath(),
			this.o.notesSubfolder,
			this.getContentFileName(key)
		);

		const fileUri = this.getUri(filePath);

		this.uriCache.set(key, fileUri);

		return fileUri;
	}

	async delete(key: FileStorageKey): Promise<void[]> {
		const uri = this.getContentFileUri({id: key.id, extension: '.assets'});
		try {
			const promises = [ this.fs.delete(this.getContentFileUri(key)) ];

			const assetsUri = this.getContentFileUri({
				id: key.id,
				extension: '.assets'
			});
			if (this.fs.exists(assetsUri.fsPath)) promises.push(this.fs.delete(assetsUri)); // delete assets subfolder if such exists

			return Promise.all(promises);

		} catch (e) {
			throw new Error('failed to delete file' + e);
		}
	}

	async ensureNotesFolderExists() {
		// 🕮 <YL> 5a7d9cf7-71ee-4a84-abbe-ea320afe220f.md
		if (!this.fs.exists(this.notesFolder.fsPath)) {
			try {
				await this.fs.createDirectory(this.notesFolder);
				console.log(`Sidenotes: created missing subfolder ${this.o.notesSubfolder} for content files`)
			}	catch (e) {
				throw vscode.FileSystemError.FileNotFound(this.notesFolder);
			}
		}
	}

	async write(key: FileStorageKey, data: IStorable): Promise<void> {
		const uri = this.getContentFileUri(key);

		try {
			// 🕮 <YL> 40e7f83a-036c-4944-9af1-c63be09f369d.md
			if (!this.fs.exists(uri.fsPath)) {
				return this.fs.write(uri, data.content);
				// return true;
			} else {
				console.warn('content file already exists, aborting write file action');
			}
		} catch (err) {
			if (err.code === 'ENOENT') {
				// console.log(`content files directory seems to not exist at specified location. Creating directory and trying again`);
				await this.ensureNotesFolderExists();
				return this.write(key, data);
				// return true;
			} else {
				throw new vscode.FileSystemError(`Unknown error while trying to write content file`);
			}
		}
		// return false;
	}

	async lookup(
		key: FileStorageKey,
		lookupFolderUri: vscode.Uri,
		workspace: string = this.utils.getWorkspaceFolderPath(),
		resolveAction: string = 'copy'
	): Promise<vscode.Uri | boolean> {
		const fileName = this.getContentFileName(key);

		const lookupUri = this.getUri(path.join(
			lookupFolderUri.fsPath,
			// this.o.notesSubfolder,
			fileName
		));

		const currentFileUri = this.getUri(path.join(
			workspace,
			this.o.notesSubfolder,
			fileName
		));

		const action = (resolveAction === 'move') ? this.fs.rename : this.fs.copy;

		if (
			this.fs.exists(lookupUri.fsPath) &&
			!this.fs.exists(currentFileUri.fsPath)
		) {
			const promises = [ action.call(this, lookupUri, currentFileUri) ];

			// support handling assets folder
			const assetsFolderName = this.getContentFileName({id: key.id, extension: '.assets'});
			const assetslookupUri = this.getUri(path.join(
				lookupFolderUri.fsPath,
				assetsFolderName
			));
			if (this.fs.exists(assetslookupUri.fsPath)) {
				const assetsCurrentUri = this.getUri(path.join(
					workspace,
					this.o.notesSubfolder,
					assetsFolderName
				));
				promises.push(action.call(this, assetslookupUri, assetsCurrentUri));
			}

			await Promise.all(promises);

			return currentFileUri;

		} else {
			vscode.window.showErrorMessage(
				`Cannot find sidenote file: there is no such file in the directory that you have selected!`
			);
			return false;
		}
	}

	private getFolders(): vscode.WorkspaceFolder[] {
		const folders = vscode.workspace.workspaceFolders;
		if (!folders || folders.length === 0) {
			// const message = `You need to have at least one workspace folder open to run this command`
			// vscode.window.showInformationMessage(

			// );
			throw vscode.FileSystemError.Unavailable(`You need to have at least one workspace folder open to run this command`);
		}
		return folders;
	}

	async migrate(): Promise<void> {

		const folders = this.getFolders();

		folders.forEach(async folder => {
			const { detectedKeys, files: { fileUrisByFilenames: fileKeys, strayEntries }} = await this.analyzeWorkspaceFolder(folder.uri);
			const broken: string[] = [];

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

				const promptResult = await vscode.window.showOpenDialog(options);
				if (!promptResult) return;
				const [ lookupUri ] = promptResult;

				const results = await Promise.all(
					// ids.map
					broken.map(async key => {
						const [ id, extension ] = key.split('.');
						// 🕮 <YL> 8fc4b127-f19f-498b-afea-70c6d27839bf.md
						return await this.lookup({ id, extension }, lookupUri);
					})
				);

				const successfulResults = results
					.filter((result): result is vscode.Uri => !!result)
					.map(uri => path.basename(uri.fsPath));

				const message = successfulResults.length === 0
					?	`No missing files were found in specified directory`
					: `The following files have been found and copied to the current workspace:\n
						${successfulResults.join(',\n')}`;

				vscode.window.showInformationMessage(message);

				return true;
			}
		})
	}

	async cleanExtraneous(): Promise<void> {

		const handleResults = async (
			type: string,
			uris: vscode.Uri[],
			folder: vscode.WorkspaceFolder
		): Promise<boolean> => {
			if (uris.length === 0) {
				vscode.window.showInformationMessage(
					`Sidenotes: no ${type} files was found in ${folder.uri.fsPath} sidenote subfolder`
				);
				return false;
			}

			console.log(`Sidenotes: ${uris.length} ${type} files in folder ${folder.uri.fsPath}:\n(${uris.join(')\n(')})`);
			// paths.forEach(path => console.log(path));

			const action = await vscode.window.showQuickPick(
				[{
					label: 'yes',
					description: `delete ${type} files`
				}, {
					label: 'no',
					description: 'cancel'
				}], {
					placeHolder: `Sidenotes: found ${uris.length} ${type} files
					in ${folder.uri.fsPath} sidenote directory.
					Do you want to delete them now?`
				}
			);

			if (action && action.label === 'yes') {
				const deleted = await Promise.all(
					uris.map(async (uri: vscode.Uri) => {
						await this.fs.delete(uri);
						return path.basename(uri.fsPath);
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

		const folders = this.getFolders();

		folders.forEach(async folder => {
			const { detectedKeys, files: { fileUrisByFilenames, strayEntries }} = await this.analyzeWorkspaceFolder(folder.uri);
			const extraneous: vscode.Uri[] = [];

			for (const filename in fileUrisByFilenames) {
				if (!detectedKeys.includes(filename)) extraneous.push(fileUrisByFilenames[filename])
			}

			await handleResults('extraneous', extraneous, folder);
			await handleResults('stray', strayEntries, folder);
		});
	}

	async analyzeWorkspaceFolder(folder: vscode.Uri) {
		// 🕮 <YL> 577caec8-36d6-4f29-93ba-d8e357563aef.md
		const attachDefaultExtension = (key: string): string => {
			if (!path.extname(key)) key = `${key}${this.o.defaultContentFileExtension}`;
			return key;
		}

		const detectedKeysSet = await this.fs.scanDirectoryFilesContentsForKeys(folder);
		const detectedKeys: string[] = Array.from(detectedKeysSet).map(attachDefaultExtension);

		const files = await this.analyzeFolderContentFiles(folder);

		return {
			detectedKeys, files
		}
	}

	async analyzeFolderContentFiles(folder: vscode.Uri): Promise<{
		fileUrisByFilenames: { [filename: string]: vscode.Uri	},
		strayEntries: vscode.Uri[]
	}> {
		// 🕮 <YL> d7ba6b50-007c-4c92-84e9-d0c10e0386ef.md
		const notesSubfolderPath = path.join(
			folder.fsPath,
			this.o.notesSubfolder
		);

		const fileUrisByFilenames: { [filename: string]: vscode.Uri	} = Object.create(null);
		const strayEntries: vscode.Uri[] = [];

		const subfolderUri = folder.with({ path: notesSubfolderPath });

		for (const [ name, type ] of await vscode.workspace.fs.readDirectory(subfolderUri)) {
			const uri = this.getUri(path.join(notesSubfolderPath, name));

			const id = this.utils.getIdFromString(uri.fsPath);
			// if (type === vscode.FileType.File) {

			if (!id) strayEntries.push(uri);
			else {
				const filename = this.getContentFileName({
					id,
					extension: path.extname(uri.fsPath)
				});
				fileUrisByFilenames[filename] = uri;
			}
			// } else if (type === vscode.FileType.Directory) {
			// 	strayEntries.push(filePath);
			// }
		}

		return {
			fileUrisByFilenames: fileUrisByFilenames, strayEntries
		};
	}

}
