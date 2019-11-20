import * as vscode from 'vscode';
import {
	Anchorer,
	Designer,
	ISidenote,
	IStorable,
	IStorageService,
	SidenotesDictionary,
 } from './types';

export default class SidenoteProcessor {
	constructor(
		public storageService: IStorageService,
		public anchorer: Anchorer,
		public pool: SidenotesDictionary,
		public designer: Designer
	) {}

	async delete(sidenote: ISidenote): Promise<ISidenote> {
		const promise = await Promise.all([
			Promise.resolve(this.storageService.delete(sidenote.id)),
			this.anchorer.delete(sidenote)
		]);
		this.pool.delete(sidenote.id);
		return sidenote;
	}

	async write(sidenote: ISidenote, ranges: vscode.Range[]): Promise<void> {
		if (sidenote.content) {
			// const { id, content } = sidenote;
			const writeResults = await Promise.all([
				this.storageService.write(sidenote as IStorable),
				this.anchorer.write(sidenote, ranges)
			]);
			this.pool.add(sidenote);
			// return writeResults[1];
		} else {
			vscode.window.showErrorMessage('no content to write!');
		}
	}

	updateContent(sidenote: ISidenote): ISidenote {
		const data = this.storageService.get(sidenote.id);
		if (data) sidenote.content = data.content;
		// assuming the ranges hasn't change; update onTExteditorChange us responsible for handling this
		// so we can extract ranges from decorations
		const ranges = Array.from(new Set(
			sidenote.decorations.map(decoration => decoration.options.range)
		));
		sidenote.decorations = this.designer.get(sidenote, ranges);
		return sidenote;
	}

	async open(sidenote: ISidenote): Promise<vscode.TextEditor> {
		return this.storageService.open(sidenote.id);
	}

	// TODO move to UserInteraction module
	async handleBroken(sidenote): Promise<ISidenote|undefined> {

		const promptUserForAction = async (): Promise<vscode.QuickPickItem|undefined> => {
			const actions: vscode.QuickPickItem[] = [{
					label: 'delete',
					description: 'delete note comment'
				}, {
					label: 're-create',
					description: 're-create storage entry for this note comment'
			}];

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

					// TODO move to UserInteractions class
					const lookupUri = await vscode.window.showOpenDialog({
						canSelectFolders: true,
						canSelectMany: false
						// defaultUri: this.getCurrentWorkspacePath()
					});

					if (lookupUri) {
						const success = await this.storageService.lookup!(sidenote.id, lookupUri[0].fsPath);
						if (success) {
							sidenote = this.updateContent(sidenote);
							return sidenote;
						}
					}
					return undefined;

				};
				return lookup(sidenote);

			default: return undefined;
		}
	}
}
