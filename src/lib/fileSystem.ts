import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { IScanData, EditorUtils, Scanner } from './types';

export type OFileSystem = {}

export default class FileSystem {
	constructor(
		private scanner: Scanner,
		public utils: EditorUtils,
	) {}

	/**
	 * @param {string} dir
	 * @returns {Promise<string[]>} flat array of files(paths) in directory (including nested)
	 * @memberof FileSystem
	 */
	async readDirectoryRecursive(dir: string): Promise<string[]> {
		const dirents: fs.Dirent[] = await fs.promises.readdir(dir, { withFileTypes: true });
		const files = await Promise.all(
			dirents.map(async dirent => {
				const fullPath = path.resolve(dir, dirent.name);
				return dirent.isDirectory() ? this.readDirectoryRecursive(fullPath) : fullPath;
			})
		);
		return Array.prototype.concat(...files);	// return files.flat();
	}

	/**
	 * @param {*} [dir=this.utils.getWorkspaceFolderPath()]
	 * @returns {Promise<Set<string>>} Collection of ids found in directory's files
	 * @memberof FileSystem
	 */
	async scanDirectoryFilesContentsForIds(dir = this.utils.getWorkspaceFolderPath()): Promise<Set<string>> {
		const readFiles = async (filePaths: string[]) => {
			return Promise.all(
				filePaths.map(filePath => fs.promises.readFile(filePath, { encoding: 'utf-8' }) as Promise<string>)
				// returns string when encoding is specified, see fs docs
			);
		}

		const scanContents = (contents: string[]) => {
			const fileMatches = contents
				.map(content => this.scanner.getIdsFromText(content), this.scanner)
				.filter(scanData => scanData !== undefined) as unknown as IScanData[]; // 🕮 c02edcce-c3e0-48a5-ab51-c4d3053ec7d5
			const flat = Array.prototype.concat(...fileMatches); // return files.flat();
			const idsOnly: string[] = flat.map(scanData => scanData.id);
			return idsOnly;
		};

		const filePaths = await this.readDirectoryRecursive(dir);
		const contents = await readFiles(filePaths);
		const ids = scanContents(contents);
		const uniqueIds = new Set(ids);
		return uniqueIds;
	}

}
