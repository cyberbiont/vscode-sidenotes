/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { workspace, RelativePattern, Uri } from 'vscode';
import nodeFs from 'fs';
import { TextEncoder, TextDecoder } from 'util';
import Scanner, { ScanData } from './scanner';
import { EditorUtils } from './utils';

export type OSnFileSystem = {
	// 🕮 <cyberbiont> e4f5fe76-3db2-4c20-a796-1300f779ff6f.md
	worskspaceFilter: {
		include: string;
		exclude: string;
	};
};

export default class SnFileSystem
// implements vscode.FileSystem
{
	private textEncoder: TextEncoder = new TextEncoder();
	private textDecoder: TextDecoder = new TextDecoder();
	// 🕮 <cyberbiont> 9753d71e-a4e4-4778-af8c-181e62776254.md

	constructor(
		private scanner: Scanner,
		public utils: EditorUtils,
		private cfg: OSnFileSystem,
		private fs = workspace.fs,
		private nfs = nodeFs,
	) {}

	async scanDirectoryFilesContentsForKeys(folder: Uri): Promise<Set<string>> {
		// 🕮 <cyberbiont> 9a3ca084-350c-49c3-8fa8-631dbc63a254.md
		const getFiles = async (folder: Uri): Promise<Uri[]> => {
			return workspace.findFiles(
				new RelativePattern(folder.fsPath, this.cfg.worskspaceFilter.include),
				new RelativePattern(folder.fsPath, this.cfg.worskspaceFilter.exclude),
			);
		};

		const readFiles = (fileUris: Uri[]): Promise<string[]> => {
			return Promise.all(
				fileUris.map(async (uri) => {
					const data = await workspace.fs.readFile(uri);
					return this.textDecoder.decode(data);
				}),
			);
		};

		const scanContents = (contents: string[]): string[] => {
			const fileMatches = (contents
				.map((content) => this.scanner.scanText(content), this.scanner)
				.filter((scanData) => scanData !== undefined) as unknown) as ScanData[]; // 🕮 <cyberbiont> c02edcce-c3e0-48a5-ab51-c4d3053ec7d5.md
			const flat = fileMatches.flat();
			const keysOnly: string[] = flat.map((scanData) => scanData.key);
			return keysOnly;
		};

		const fileUris = await getFiles(folder);
		const contents = await readFiles(fileUris);
		const keys = scanContents(contents);
		const uniqueKeys = new Set(keys);
		return uniqueKeys;
	}

	createDirectory(uri: Uri) {
		return this.fs.createDirectory(uri);
	}

	delete(uri: Uri) {
		return this.fs.delete(uri, { recursive: true, useTrash: true });
	}

	// TODO get done without it
	exists(path: string) {
		return this.nfs.existsSync(path);
	}

	async read(uri: Uri) {
		const data = await this.fs.readFile(uri);
		return this.textDecoder.decode(data);
	}

	write(uri: Uri, data: string) {
		const encodedData = this.textEncoder.encode(data);
		return this.fs.writeFile(uri, encodedData);
	}

	copy(src: Uri, dest: Uri) {
		return this.fs.copy(src, dest, { overwrite: false });
	}

	rename(oldName: Uri, newName: Uri) {
		return this.fs.rename(oldName, newName);
	}
}
