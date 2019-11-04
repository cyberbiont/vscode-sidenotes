import * as vscode from 'vscode';
import {
	IStorageService,
	// IDictionary,
	Pool,
	Anchorer,
	Designer,
	ISidenote,
	SidenoteFactory,
	IScanResultData,
	IStorable
 } from './types';

import { FileStorage } from './storageService'; //TODO @? импортируем класс чтобы сравнить

export default class SidenoteProcessor {
	constructor(
		public storageService: IStorageService,
		public anchorer: Anchorer,
		public sidenoteFactory: SidenoteFactory,
		// public pool: IDictionary<ISidenote>,
		public pool: Pool<ISidenote>,
		public designer: Designer
	) {}

	async delete(sidenote: ISidenote): Promise<void> {
		await Promise.all([
			Promise.resolve(this.storageService.delete(sidenote.id)),
			this.anchorer.delete(sidenote)
		]);
		this.pool.delete(sidenote.id);
	}

	async write(sidenote: ISidenote): Promise<vscode.Position|void> {
		if (sidenote.content) {
			// const { id, content } = sidenote;
			const writeResults = await Promise.all([
				this.storageService.write(sidenote as IStorable),
				this.anchorer.write(sidenote)
			]);
			this.pool.add(sidenote);
			return writeResults[1];
		} else {
			vscode.window.showErrorMessage('no content to write!');
		}
	}

	update(sidenote: ISidenote): ISidenote {
		const data = this.storageService.get(sidenote.id);
		if (data) sidenote.content = data.content;

		sidenote.decorations = this.designer.get(sidenote);

		return sidenote;
	}

	async open(sidenote: ISidenote): Promise<vscode.TextEditor> {
		return this.storageService.open(sidenote.id);
	}

	// TODO сделать все-таки чтобы функция принимала id + option bag
	// реализовать через overloading
	// async get(id?: string): Promise<ISidenote>
	async get(
		scanResult?: IScanResultData
	): Promise<ISidenote> {

		let sidenote: ISidenote;
		let queryResult: ISidenote|undefined;

		if (scanResult) {
			const { id, markerStartPos } = scanResult;
			queryResult = this.pool.get(scanResult.id);
			if (queryResult) {
				sidenote = queryResult;
			} else {
				sidenote = await this.sidenoteFactory.build(id, markerStartPos);
				this.pool.add(sidenote);
			}
		} else { // new sidenote
			sidenote = await this.sidenoteFactory.build(null);
			this.pool.add(sidenote);
		}

		return sidenote;
	}

	async handleBroken(sidenote): Promise<ISidenote|undefined> {

		const promptUserForAction = async (): Promise<vscode.QuickPickItem|undefined> => {

			const actions: vscode.QuickPickItem[] = [
				{
					label: 'delete',
					description: 'delete note comment'
				}, {
					label: 're-create',
					description: 're-create storage entry for this note comment'
				}
			]
			if (this.storageService.lookup) actions.push({
				label: 'lookup',
				description: 'look for the missing sidenote file (select folder)'
			});

			const chosen = await vscode.window.showQuickPick(actions, {
				placeHolder: 'No corresponding file is found in workspace sidenotes folder. What do you want to do?'
			});

			return chosen;
		}

		const action = await promptUserForAction();

		if (!action) return undefined;

		switch (action.label) {
			case 'delete':
				this.anchorer.delete(sidenote);
				this.pool.delete(sidenote.id);
				return undefined;

			case 're-create':
				sidenote.content = '';
				this.storageService.write(sidenote);
				return sidenote;

			case 'lookup':
				const lookup = async (sidenote): Promise<ISidenote|undefined> => {

					const lookupUri = await vscode.window.showOpenDialog({
						canSelectFolders: true,
						canSelectMany: false
						// defaultUri: this.getCurrentWorkspacePath()
					});

					if (lookupUri) {
						const success = await this.storageService.lookup!(sidenote.id, lookupUri[0].fsPath);
						if (success) {
							sidenote = this.update(sidenote);
							return sidenote;
						}
					}
					return undefined;

				}
				return lookup(sidenote);

			default: return undefined;
		}



	}
}
