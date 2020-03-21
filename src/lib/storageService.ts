import {
	Uri,
	FileSystemError,
	OpenDialogOptions,
	window,
	workspace,
	WorkspaceFolder,
} from 'vscode';
import path from 'path';
import SnFileSystem from './fileSystem';
import EditorServiceController from './editorServiceController';
import { EditorUtils, MarkerUtils } from './utils';

export interface Storable {
	content: string;
}

export type OStorageService = {};
type StorageKey = FileStorageKey;

export interface StorageService {
	delete(key: StorageKey): Promise<void | void[]>;
	write(key: StorageKey, data: Storable): Promise<void>;
	read(key: StorageKey): Promise<Storable | undefined>;
	open(key: StorageKey);
	checkStartupRequirements?(): void;
	lookup?(
		key: FileStorageKey,
		lookupFolderUri?: Uri,
		workspace?: string,
		resolveAction?: string,
	): Promise<Uri | boolean>;
}

interface FileStorageKey {
	id: string;
	extension?: string;
	signature?: string;
}

interface FileAnalisysData {
	fileUrisByFilenames: { [filename: string]: Uri };
	strayEntries: Uri[];
}

type DefaultContentFileExtension = '.md' | '.markdown';
// 🕮 <cyberbiont> 6abe46d6-116f-44c7-9e0f-4e2b81b64513.md

export type OFileStorage = {
	storage: {
		files: {
			notesSubfolder: string;
			signatureSubfolder: string;
			defaultContentFileExtension: DefaultContentFileExtension;
		};
	};
};

export class FileStorage implements StorageService {
	private uriCache: WeakMap<FileStorageKey, Uri> = new WeakMap();
	// 🕮 <cyberbiont> 126a0df4-003e-4bf3-bf41-929db6ae35e7.md

	private o: {
		notesSubfolder: string;
		signatureSubfolder: string;
		defaultContentFileExtension: DefaultContentFileExtension;
	};

	private notesFolder: Uri;

	constructor(
		public editorServiceController: EditorServiceController,
		public utils: EditorUtils & MarkerUtils,
		public fs: SnFileSystem,
		cfg: OFileStorage,
		private commands,
	) {
		this.o = cfg.storage.files;
		this.notesFolder = this.getUri(
			path.join(this.utils.getWorkspaceFolderPath(), this.o.notesSubfolder),
		);
		this.commands.registerCommand('sidenotes.migrate', this.migrate, this);
		this.commands.registerCommand(
			'sidenotes.extraneous',
			this.cleanExtraneous,
			this,
		);
	}

	async read(key: FileStorageKey): Promise<Storable | undefined> {
		try {
			const uri = this.getContentFileUri(key);
			const content = await this.fs.read(uri);
			return { content };
		} catch (e) {
			return undefined;
		}
	}

	async open(key: FileStorageKey): Promise<void> {
		const { extension = this.o.defaultContentFileExtension } = key;
		const uri = this.getContentFileUri(key);
		this.editorServiceController.open(uri, extension);
	}

	private getUri(path: string): Uri {
		return Uri.parse(`file:${path}`, true);
	}

	private getContentFileName(key: FileStorageKey): string {
		// 🕮 <cyberbiont> 2190628a-b268-44c2-a81a-939ce26dd7a4.md
		const { id, extension = this.o.defaultContentFileExtension } = key;
		return `${id}${extension}`;
	}

	private getContentFileUri(key: FileStorageKey, ownSignature?: boolean): Uri {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (this.uriCache.has(key)) return this.uriCache.get(key)!;
		// by default we look in the current document's workspace folder
		const pathParts: string[] = [
			this.utils.getWorkspaceFolderPath(),
			this.o.notesSubfolder,
			this.getContentFileName(key),
		];
		if (ownSignature) pathParts.splice(2, 0, this.o.signatureSubfolder);
		else if (key.signature) pathParts.splice(2, 0, key.signature);

		const filePath = path.join.apply(null, pathParts);
		// 🕮 <cyberbiont> 88f3b639-a288-408e-b926-046d9a59b95b.md

		const fileUri = this.getUri(filePath);

		this.uriCache.set(key, fileUri);

		return fileUri;
	}

	async delete(key: FileStorageKey): Promise<void[]> {
		const uri = this.getContentFileUri({ id: key.id, extension: '.assets' });
		try {
			const promises = [this.fs.delete(this.getContentFileUri(key))];

			const assetsUri = this.getContentFileUri({
				id: key.id,
				extension: '.assets',
			});
			if (this.fs.exists(assetsUri.fsPath))
				promises.push(this.fs.delete(assetsUri)); // delete assets subfolder if such exists

			return Promise.all(promises);
		} catch (e) {
			throw new Error(`failed to delete file${e}`);
		}
	}

	async ensureNotesFolderExists(): Promise<void> {
		// 🕮 <cyberbiont> 5a7d9cf7-71ee-4a84-abbe-ea320afe220f.md
		if (!this.fs.exists(this.notesFolder.fsPath)) {
			try {
				await this.fs.createDirectory(this.notesFolder);
				console.log(
					`Sidenotes: created missing subfolder ${this.o.notesSubfolder} for content files`,
				);
			} catch (e) {
				throw FileSystemError.FileNotFound(this.notesFolder);
			}
		}
	}

	async write(key: FileStorageKey, data: Storable): Promise<void> {
		const uri = this.getContentFileUri(key);

		try {
			// 🕮 <cyberbiont> 40e7f83a-036c-4944-9af1-c63be09f369d.md
			if (!this.fs.exists(uri.fsPath)) {
				await this.fs.write(uri, data.content);
			} else
				console.warn('content file already exists, aborting write file action');
		} catch (err) {
			if (err.code === 'ENOENT') {
				// console.log(`content files directory seems to not exist at specified location. Creating directory and trying again`);
				await this.ensureNotesFolderExists();
				await this.write(key, data);
				// return true;
			} else
				throw new FileSystemError(
					`Unknown error while trying to write content file`,
				);
		}
		// return false;
	}

	async lookup(
		key: FileStorageKey,
		lookupFolderUri: Uri,
		workspace: string = this.utils.getWorkspaceFolderPath(),
		resolveAction = 'copy',
	): Promise<Uri | boolean> {
		const fileName = this.getContentFileName(key);

		const lookupUri = this.getUri(
			path.join(
				lookupFolderUri.fsPath,
				// this.o.notesSubfolder,
				fileName,
			),
		);

		const currentFileUri = this.getUri(
			path.join(workspace, this.o.notesSubfolder, fileName),
		);

		const action = resolveAction === 'move' ? this.fs.rename : this.fs.copy;

		if (
			this.fs.exists(lookupUri.fsPath) &&
			!this.fs.exists(currentFileUri.fsPath)
		) {
			const promises = [action.call(this, lookupUri, currentFileUri)];

			// support handling assets folder
			const assetsFolderName = this.getContentFileName({
				id: key.id,
				extension: '.assets',
			});
			const assetslookupUri = this.getUri(
				path.join(lookupFolderUri.fsPath, assetsFolderName),
			);
			if (this.fs.exists(assetslookupUri.fsPath)) {
				const assetsCurrentUri = this.getUri(
					path.join(workspace, this.o.notesSubfolder, assetsFolderName),
				);
				promises.push(action.call(this, assetslookupUri, assetsCurrentUri));
			}

			await Promise.all(promises);

			return currentFileUri;
		}
		window.showErrorMessage(
			`Cannot find sidenote file: there is no such file in the directory that you have selected!`,
		);
		return false;
	}

	private getFolders(): WorkspaceFolder[] {
		const folders = workspace.workspaceFolders;
		if (!folders || folders.length === 0) {
			// const message = `You need to have at least one workspace folder open to run this command`
			// vscode.window.showInformationMessage(

			// );
			throw FileSystemError.Unavailable(
				`You need to have at least one workspace folder open to run this command`,
			);
		}
		return folders;
	}

	async migrate(): Promise<void> {
		const folders = this.getFolders();

		folders.forEach(async folder => {
			const {
				detectedKeys,
				files: { fileUrisByFilenames: fileKeys },
			} = await this.analyzeWorkspaceFolder(folder.uri);

			const broken: string[] = [];

			detectedKeys.forEach(key => {
				if (
					!(
						(key in fileKeys && typeof this.fs.read(fileKeys[key]) === 'string') // ensure that content note is readable
					)
				) {
					broken.push(key);
				}
			});

			if (broken.length === 0) {
				window.showInformationMessage(
					`Sidenotes: no broken sidenote anchors was found\n
					in ${folder.uri.fsPath} workspace folder`,
				);
				return undefined;
			}

			const action = await window.showQuickPick(
				[
					{
						label: 'yes',
						description: `look for missing content files (select folder to look in)`,
					},
					{
						label: 'no',
						description: 'cancel',
					},
				],
				{
					placeHolder: `Sidenotes: ${broken.length} broken anchors was found.	Do you want to look for content files?`,
					// in ${folder.uri.fsPath} workspace folder
				},
			);

			if (action?.label === 'yes') {
				const options: OpenDialogOptions = {
					canSelectMany: false,
					canSelectFolders: true,
					defaultUri: folder.uri,
					openLabel: 'Confirm selection',
				};

				const promptResult = await window.showOpenDialog(options);
				if (!promptResult) return undefined;
				const [lookupUri] = promptResult;

				const results = await Promise.all(
					// ids.map
					broken.map(async key => {
						// const [id, extension] = key.split('.');
						const { name: id, ext: extension } = path.parse(key);
						// 🕮 <cyberbiont> 8fc4b127-f19f-498b-afea-70c6d27839bf.md
						return this.lookup({ id, extension }, lookupUri);
					}),
				);

				const successfulResults = results
					.filter((result): result is Uri => !!result)
					.map(uri => path.basename(uri.fsPath));

				const message =
					successfulResults.length === 0
						? `No missing files were found in specified directory`
						: `The following files have been found and copied to the current workspace:\n
						${successfulResults.join(',\n')}`;

				window.showInformationMessage(message);

				return true;
			}

			return undefined;
		});
	}

	async cleanExtraneous(): Promise<void> {
		const handleResults = async (
			type: string,
			uris: Uri[],
			folder: WorkspaceFolder,
		): Promise<boolean> => {
			if (uris.length === 0) {
				window.showInformationMessage(
					`Sidenotes: no ${type} files was found in ${folder.uri.fsPath} sidenote subfolder`,
				);
				return false;
			}

			console.log(
				`Sidenotes: ${uris.length} ${type} files in folder ${
				folder.uri.fsPath
				}:\n(${uris.join(')\n(')})`,
			);
			// paths.forEach(path => console.log(path));

			const action = await window.showQuickPick(
				[
					{
						label: 'yes',
						description: `delete ${type} files`,
					},
					{
						label: 'no',
						description: 'cancel',
					},
				],
				{
					placeHolder: `Sidenotes: found ${uris.length} ${type} files
					in ${folder.uri.fsPath} sidenote directory.
					Do you want to delete them now?`,
				},
			);

			if (action && action.label === 'yes') {
				const deleted = await Promise.all(
					uris.map(async (uri: Uri) => {
						await this.fs.delete(uri);
						return path.basename(uri.fsPath);
					}),
				);

				window.showInformationMessage(
					`The following files have been deleted from your sidenote folder:\n
					${deleted.join(',\n')}`,
				);
				return true;
			}

			return false;
		};

		const folders = this.getFolders();

		folders.forEach(async folder => {
			const {
				detectedKeys,
				files: { fileUrisByFilenames, strayEntries },
			} = await this.analyzeWorkspaceFolder(folder.uri);
			const extraneous: Uri[] = [];

			for (const [filename, fileUris] of Object.entries(fileUrisByFilenames)) {
				if (!detectedKeys.includes(filename)) extraneous.push(fileUris);
			}

			await handleResults('extraneous', extraneous, folder);
			await handleResults('stray', strayEntries, folder);
		});
	}

	async analyzeWorkspaceFolder(
		folder: Uri,
	): Promise<{
		detectedKeys: string[];
		files: FileAnalisysData;
	}> {
		// 🕮 <cyberbiont> 577caec8-36d6-4f29-93ba-d8e357563aef.md
		const attachDefaultExtension = (key: string): string => {
			if (!path.extname(key))
				key = `${key}${this.o.defaultContentFileExtension}`;
			return key;
		};

		const detectedKeysSet = await this.fs.scanDirectoryFilesContentsForKeys(
			folder,
		);
		const detectedKeys = Array.from(detectedKeysSet).map(
			attachDefaultExtension,
		);

		const files = await this.analyzeFolderContentFiles(folder);

		return {
			detectedKeys,
			files,
		};
	}

	async analyzeFolderContentFiles(folder: Uri): Promise<FileAnalisysData> {
		// 🕮 <cyberbiont> d7ba6b50-007c-4c92-84e9-d0c10e0386ef.md
		const notesSubfolderPath = path.join(folder.fsPath, this.o.notesSubfolder);

		const fileUrisByFilenames: {
			[filename: string]: Uri;
		} = Object.create(null);
		const strayEntries: Uri[] = [];

		const subfolderUri = folder.with({ path: notesSubfolderPath });

		for (const [name, type] of await workspace.fs.readDirectory(subfolderUri)) {
			const uri = this.getUri(path.join(notesSubfolderPath, name));

			const id = this.utils.getIdFromString(uri.fsPath);
			// if (type === vscode.FileType.File) {

			if (!id) strayEntries.push(uri);
			else {
				const filename = this.getContentFileName({
					id,
					extension: path.extname(uri.fsPath),
				});
				fileUrisByFilenames[filename] = uri;
			}
			// } else if (type === vscode.FileType.Directory) {
			// 	strayEntries.push(filePath);
			// }
		}

		return {
			fileUrisByFilenames,
			strayEntries,
		};
	}
}
