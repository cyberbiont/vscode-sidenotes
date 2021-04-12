import {
	Uri,
	FileSystemError,
	OpenDialogOptions,
	window,
	workspace,
	WorkspaceFolder,
	commands,
	TextEditor,
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
	open(key: StorageKey): void;
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

interface FileAnalysisData {
	fileUrisByFilenames: { [filename: string]: Uri };
	strayEntries: Uri[];
}

type DefaultContentFileExtension = '.md' | '.markdown';
// 🕮 <cyberbiont> 6abe46d6-116f-44c7-9e0f-4e2b81b64513.md

export type OFileStorage = {
	storage: {
		files: {
			notesFolder: string;
			signatureSubfolderName: string;
			defaultContentFileExtension: DefaultContentFileExtension;
		};
	};
};

interface Paths {
	workspace: string;
	root: Uri;
	ownSig: Uri;
}
export class FileStorage implements StorageService {
	private uriCache: WeakMap<FileStorageKey, Uri> = new WeakMap();
	// 🕮 <cyberbiont> 126a0df4-003e-4bf3-bf41-929db6ae35e7.md

	private o: {
		notesFolder: string;
		signatureSubfolderName: string;
		defaultContentFileExtension: DefaultContentFileExtension;
	};

	constructor(
		public editorServiceController: EditorServiceController,
		public utils: EditorUtils & MarkerUtils,
		public fs: SnFileSystem,
		cfg: OFileStorage,
	) {
		this.o = cfg.storage.files;
		commands.registerCommand('sidenotes.migrate', this.migrate, this);
		commands.registerCommand(
			'sidenotes.extraneous',
			this.cleanExtraneous,
			this,
		);
	}

	private getUri(path: string): Uri {
		return Uri.parse(`file:${path}`, true);
	}

	private getNotesFolder(
		workspace: string = this.utils.getWorkspaceFolderPath(),
	): Uri {
		return this.getUri(path.join(workspace, this.o.notesFolder));
	}

	// private getOwnSigNotesFolder(
	// 	workspace: string = this.utils.getWorkspaceFolderPath(),
	// ): Uri {
	// 	return this.getUri(
	// 		path.join(workspace, this.o.notesFolder, this.o.signatureSubfolderName),
	// 	);
	// }

	private getContentFileName(key: FileStorageKey): string {
		// 🕮 <cyberbiont> 2190628a-b268-44c2-a81a-939ce26dd7a4.md
		const { id, extension = this.o.defaultContentFileExtension } = key;
		return `${id}${extension}`;
	}

	private getContentFileUri(
		key: FileStorageKey,
		workspace: string = this.utils.getWorkspaceFolderPath(),
		{ ownSignature }: { ownSignature?: boolean } = {},
	): Uri {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		if (this.uriCache.has(key)) return this.uriCache.get(key)!;

		// workspace'ов может быть несколько! и могут добавляться новые в процессе работы
		// поэтому нельзя жестко прописать путь при инциализации и использовать его,
		// нужно считать каждый раз динамически

		// by default we look in the current document's workspace folder
		const pathParts: string[] = [
			workspace,
			this.o.notesFolder,
			this.getContentFileName(key),
		];
		if (ownSignature) pathParts.splice(2, 0, this.o.signatureSubfolderName);
		else if (key.signature) pathParts.splice(2, 0, key.signature);

		// 🕮 <cyberbiont> 88f3b639-a288-408e-b926-046d9a59b95b.md
		const fileUri = this.getUri(path.join.apply(null, pathParts));

		// let fileUri: Uri;
		// const fileName = this.getContentFileName(key);
		// if (!ownSignature && key.signature)
		// 	fileUri = this.paths.root.with({
		// 		path: path.join(this.paths.root.path, key.signature, fileName),
		// 	});
		// else
		// 	fileUri = this.paths.ownSig.with({
		// 		path: path.join(this.paths.ownSig.path, fileName),
		// 	});
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

		const currentFileUri = this.getContentFileUri(key);

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

	private getWorkspaceFolders(): readonly WorkspaceFolder[] {
		const workspaceFolders = workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			// const message = `You need to have at least one workspace folder open to run this command`
			// vscode.window.showInformationMessage(

			// );
			throw FileSystemError.Unavailable(
				`You need to have at least one workspace folder open to run this command`,
			);
		}
		return workspaceFolders;
	}

	async migrate(): Promise<void> {
		const folders = this.getWorkspaceFolders();

		folders.forEach(async (folder) => {
			const {
				detectedKeys,
				files: { fileUrisByFilenames: fileKeys },
			} = await this.analyzeWorkspaceFolder(folder.uri);

			const broken: string[] = [];

			detectedKeys.forEach((key) => {
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
					broken.map(async (key) => {
						// const [id, extension] = key.split('.');
						const { name: id, ext: extension } = path.parse(key);
						// 🕮 <cyberbiont> 8fc4b127-f19f-498b-afea-70c6d27839bf.md
						return this.lookup({ id, extension }, lookupUri);
					}),
				);

				const successfulResults = results
					.filter((result): result is Uri => !!result)
					.map((uri) => path.basename(uri.fsPath));

				const message =
					successfulResults.length === 0
						? `No missing files were found in specified directory`
						: `The following file(s) have been found and copied to the current workspace:\n
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
					`Sidenotes: no ${type} files was found in "${folder.uri.fsPath}" workspace folder`,
				);
				return false;
			}

			console.log(
				`Sidenotes: ${uris.length} ${type} file(s) in folder ${
					folder.uri.fsPath
				}:\n(${uris.join(')\n(')})`,
			);
			// paths.forEach(path => console.log(path));

			const action = await window.showQuickPick(
				[
					{
						label: 'yes',
						description: `delete ${type} file(s)`,
					},
					{
						label: 'no',
						description: 'cancel',
					},
				],
				{
					placeHolder: `Sidenotes: found ${uris.length} ${type} file(s)
					in "${folder.uri.fsPath}" workspace folder.
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
					`The following file(s) have been deleted from your workspace folder:\n
					${deleted.join(',\n')}`,
				);
				return true;
			}

			return false;
		};

		const folders = this.getWorkspaceFolders();

		folders.forEach(async (folder) => {
			const {
				detectedKeys,
				// files
				files: { fileUrisByFilenames, strayEntries },
			} = await this.analyzeWorkspaceFolder(folder.uri);

			const extraneous: Uri[] = [];
			// const stray: Uri[] = [];

			// files.forEach((sigFolderFiles) => {

			// 	const { fileUrisByFilenames, strayEntries } = sigFolderFiles;
			// 	stray.push(..strayEntries);

			for (const [filename, fileUris] of Object.entries(fileUrisByFilenames)) {
				if (!detectedKeys.includes(filename)) extraneous.push(fileUris);
			}
			// });

			await handleResults('extraneous', extraneous, folder);
			await handleResults('stray', strayEntries, folder);
		});
	}

	async analyzeWorkspaceFolder(
		workspaceFolder: Uri,
	): Promise<{
		detectedKeys: string[];
		files: FileAnalysisData;
	}> {
		// 🕮 <cyberbiont> 577caec8-36d6-4f29-93ba-d8e357563aef.md
		const attachDefaultExtension = (key: string): string => {
			if (!path.extname(key))
				key = `${key}${this.o.defaultContentFileExtension}`;
			return key;
		};

		const detectedKeysSet = await this.fs.scanDirectoryFilesContentsForKeys(
			workspaceFolder,
		);
		const detectedKeys = Array.from(detectedKeysSet).map(
			attachDefaultExtension,
		);

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
		const sigFoldersOnly = sigFolders.filter((entry) => entry[1] == 2);

		const sigFoldersData = await Promise.all(
			sigFoldersOnly.map((sigFolderTuple) =>
				this.analyzeFolderContentFiles(workspaceFolder, sigFolderTuple[0]),
			),
		);

		// let combinedData;
		const reduced = sigFoldersData.reduce((acc, current) => {
			return {
				fileUrisByFilenames: {
					...acc.fileUrisByFilenames,
					...current.fileUrisByFilenames,
				},
				strayEntries: [...acc.strayEntries, ...current.strayEntries],
			};
		});
		// const combinedData = sigFoldersData.reduce((acc, current) => {
		// 	return Object.assign(acc, current);
		// })
		// const combinedData = Object.assign.apply(null, sigFoldersData);
		return reduced;

		// 🕮 <cyberbiont> 93a94260-1109-4f86-9a54-e5e03355e683.md
	}

	async analyzeFolderContentFiles(
		workspaceFolder: Uri,
		sigFolderName?: string,
	): Promise<FileAnalysisData> {
		// 🕮 <cyberbiont> d7ba6b50-007c-4c92-84e9-d0c10e0386ef.md

		const fileUrisByFilenames: {
			[filename: string]: Uri;
		} = Object.create(null);

		const strayEntries: Uri[] = [];

		const folder = sigFolderName
			? this.getUri(
					path.join(
						this.getNotesFolder(workspaceFolder.fsPath).fsPath,
						sigFolderName,
					),
			  )
			: this.getNotesFolder(workspaceFolder.fsPath);

		for (const [name] of await workspace.fs.readDirectory(folder)) {
			const uri = this.getUri(path.join(folder.fsPath, name));

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
