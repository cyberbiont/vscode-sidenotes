import { EditorUtils, MarkerUtils } from './utils';
import {
	FileSystemError,
	Uri,
	WorkspaceFolder,
	window,
	workspace,
} from 'vscode';

import EditorServiceController from './editorServiceController';
import { ScanData } from './scanner';
import Signature from './signature';
import SnFileSystem from './fileSystem';
import path from 'path';

export interface Storable {
	content: string;
}

export type OStorageService = Record<string, unknown>;
type StorageKey = FileStorageKey;

export interface StorageService {
	delete(key: StorageKey): Promise<void | void[]>;
	write(key: StorageKey, data: Storable): Promise<void>;
	read(key: StorageKey): Promise<Storable | undefined>;
	open(key: StorageKey): void;
	checkStartupRequirements?(): void;
	lookup?(
		key: FileStorageKey,
		lookupFolderUri?: Uri,
		options?: {
			workspace?: string;
			resolveAction?: string;
		},
	): Promise<Uri | boolean>;
}

interface FileStorageKey {
	id: string;
	extension?: string;
	signature?: string;
}

export type FileData = {
	uri: Uri;
	id: string;
	extension: string;
	signature: string;
};

type FileDataByFilenames = { [filename: string]: FileData };
interface FileAnalysisData {
	fileDataByFilenames: FileDataByFilenames;
	strayEntries: Uri[];
}

type DefaultContentFileExtension = `.md` | `.markdown`;
// 🕮 <cyberbiont> 6abe46d6-116f-44c7-9e0f-4e2b81b64513.md

export type OFileStorage = {
	storage: {
		files: {
			notesFolder: string;
			defaultContentFileExtension: DefaultContentFileExtension;
		};
	};
};
export class FileStorage implements StorageService {
	public uriCache: WeakMap<FileStorageKey, Uri> = new WeakMap();
	// 🕮 <cyberbiont> 126a0df4-003e-4bf3-bf41-929db6ae35e7.md

	private o: {
		notesFolder: string;
		defaultContentFileExtension: DefaultContentFileExtension;
	};

	constructor(
		public editorServiceController: EditorServiceController,
		public utils: EditorUtils & MarkerUtils,
		public fs: SnFileSystem,
		public signature: Signature,
		cfg: OFileStorage,
	) {
		this.o = cfg.storage.files;
	}

	public getUri(path: string): Uri {
		return Uri.parse(`file:${path}`, true);
	}

	private getNotesFolder(
		workspace: string = this.utils.getWorkspaceFolderPath(),
	): Uri {
		return this.getUri(path.join(workspace, this.o.notesFolder));
	}

	private getContentFileName(key: FileStorageKey): string {
		// 🕮 <cyberbiont> 2190628a-b268-44c2-a81a-939ce26dd7a4.md
		const { id, extension = this.o.defaultContentFileExtension } = key;
		return `${id}${extension}`;
	}

	getContentFileUri(
		key: FileStorageKey,
		workspace: string = this.utils.getWorkspaceFolderPath(),
		{ ownSignature }: { ownSignature?: boolean } = {},
	): Uri {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (this.uriCache.has(key)) return this.uriCache.get(key)!;

		// 🕮 <cyberbiont> 9ab282a9-d285-4309-b68d-6b5e03088340.md
		const pathParts: string[] = [
			workspace,
			this.o.notesFolder,
			this.getContentFileName(key),
		];
		if (ownSignature) pathParts.splice(2, 0, this.signature.subfolderName);
		else if (key.signature) pathParts.splice(2, 0, key.signature);

		// 🕮 <cyberbiont> 88f3b639-a288-408e-b926-046d9a59b95b.md
		const fileUri = this.getUri(path.join.apply(null, pathParts));

		this.uriCache.set(key, fileUri);

		return fileUri;
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

	async open(key: FileStorageKey) {
		const { extension = this.o.defaultContentFileExtension } = key;
		const uri = this.getContentFileUri(key);
		this.editorServiceController.open(uri, extension);
	}

	async delete(key: FileStorageKey): Promise<void[]> {
		const uri = this.getContentFileUri({ id: key.id, extension: `.assets` });
		try {
			const promises = [this.fs.delete(this.getContentFileUri(key))];

			const assetsUri = this.getContentFileUri({
				id: key.id,
				extension: `.assets`,
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
		const notesFolder = this.getNotesFolder();
		if (!this.fs.exists(notesFolder.fsPath)) {
			try {
				await this.fs.createDirectory(notesFolder);
				console.log(
					`Sidenotes: created missing folder ${notesFolder} for content files`,
				);
			} catch (e) {
				throw FileSystemError.FileNotFound(notesFolder);
			}
		}
		// 🕮 <cyberbiont> 175f9a7b-c71a-4392-891e-14c707744cb0.md
	}

	async write(key: FileStorageKey, data: Storable): Promise<void> {
		const uri = this.getContentFileUri(key);

		try {
			// 🕮 <cyberbiont> 40e7f83a-036c-4944-9af1-c63be09f369d.md
			if (!this.fs.exists(uri.fsPath)) await this.fs.write(uri, data.content);
			else
				console.warn(`content file already exists, aborting write file action`);
		} catch (err) {
			if (err.code === `ENOENT`) {
				// console.log(`content files directory seems to not exist at specified location. Creating directory and trying again`);
				await this.ensureNotesFolderExists();
				await this.write(key, data);
				// return true;
			} else
				throw new FileSystemError(
					`Unknown error while trying to write content file`,
				);
		}
	}

	async lookup(
		key: FileStorageKey,
		lookupFolderUri: Uri,
		{
			workspace = this.utils.getWorkspaceFolderPath(),
			resolveAction = `copy`,
		} = {},
	): Promise<Uri | boolean> {
		const fileName = this.getContentFileName(key);

		const lookupUri = this.getUri(
			path.join(
				lookupFolderUri.fsPath,
				// this.o.notesSubfolder,
				fileName,
			),
		);

		const currentFileUri = this.getContentFileUri(key);

		const action = resolveAction === `move` ? this.fs.rename : this.fs.copy;

		if (
			this.fs.exists(lookupUri.fsPath) &&
			!this.fs.exists(currentFileUri.fsPath)
		) {
			const promises = [action.call(this, lookupUri, currentFileUri)];

			// support handling assets folder
			const assetsFolderName = this.getContentFileName({
				id: key.id,
				extension: `.assets`,
			});
			const assetslookupUri = this.getUri(
				path.join(lookupFolderUri.fsPath, assetsFolderName),
			);
			if (this.fs.exists(assetslookupUri.fsPath)) {
				const assetsCurrentUri = this.getUri(
					path.join(workspace, this.o.notesFolder, assetsFolderName),
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

	getWorkspaceFolders(): readonly WorkspaceFolder[] {
		const { workspaceFolders } = workspace;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw FileSystemError.Unavailable(
				`You need to have at least one workspace folder open to run this command`,
			);
		}
		return workspaceFolders;
	}

	async analyzeWorkspaceFolder(workspaceFolder: Uri): Promise<{
		detectedKeys: ScanData[];
		files: FileAnalysisData;
	}> {
		// 🕮 <cyberbiont> 577caec8-36d6-4f29-93ba-d8e357563aef.md

		const detectedKeys = await this.fs.scanDirectoryFilesContentsForKeys(
			workspaceFolder,
		);

		// const keysOnly: string[] = flat.map(scanData => scanData.key);
		// 	// 🕮 <cyberbiont> 55586d82-4c4d-4553-917f-1b19f28cc35f.md
		// 	return keysOnly;

		const files = await this.analyzeWorkspaceContentFiles(workspaceFolder);

		return {
			detectedKeys,
			files,
		};
	}

	async analyzeWorkspaceContentFiles(
		workspaceFolder: Uri,
	): Promise<FileAnalysisData> {
		const sigFolders = await workspace.fs.readDirectory(
			this.getNotesFolder(workspaceFolder.fsPath),
		);
		const sigFoldersOnly = sigFolders.filter(entry => entry[1] === 2);

		const sigFoldersData = await Promise.all(
			sigFoldersOnly.map(sigFolderTuple =>
				this.analyzeFolderContentFiles(workspaceFolder, sigFolderTuple[0]),
			),
		);
		// gather info from all workspaces
		const reduced = sigFoldersData.reduce((acc, current) => ({
			fileDataByFilenames: {
				...acc.fileDataByFilenames,
				...current.fileDataByFilenames,
			},
			strayEntries: { ...acc.strayEntries, ...current.strayEntries },
		}));

		return reduced;

		// 🕮 <cyberbiont> 93a94260-1109-4f86-9a54-e5e03355e683.md
	}

	async analyzeFolderContentFiles(
		workspaceFolder: Uri,
		sigFolderName: string,
	): Promise<FileAnalysisData> {
		// 🕮 <cyberbiont> d7ba6b50-007c-4c92-84e9-d0c10e0386ef.md

		const fileDataByFilenames: FileDataByFilenames = Object.create(null);

		const strayEntries: Uri[] = [];

		const folder = this.getUri(
			path.join(
				this.getNotesFolder(workspaceFolder.fsPath).fsPath,
				sigFolderName,
			),
		);

		for (const [name] of await workspace.fs.readDirectory(folder)) {
			const uri = this.getUri(path.join(folder.fsPath, name));

			const id = this.utils.getIdFromString(uri.fsPath);
			const extension = path.extname(uri.fsPath);
			// if (type === vscode.FileType.File) {
			if (!id) strayEntries.push(uri);
			else {
				const filename = this.getContentFileName({
					id,
					extension,
				});

				fileDataByFilenames[filename] = {
					uri,
					id,
					extension,
					signature: sigFolderName,
				};
			}
			// } else if (type === vscode.FileType.Directory) {
			// 	strayEntries.push(filePath);
			// }
		}

		return {
			fileDataByFilenames,
			strayEntries,
		};
	}
}
