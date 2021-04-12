import { window, QuickPickItem, TextEditor } from 'vscode';
import { StorageService, Storable } from './storageService';
import Anchorer from './anchorer';
import { SidenotesDictionary } from './types';
import Styler from './styler';
import { Inspector, Sidenote } from './sidenote';

export default class SidenoteProcessor {
	constructor(
		public storageService: StorageService,
		public anchorer: Anchorer,
		public pool: SidenotesDictionary,
		public styler: Styler,
		public inspector: Inspector,
	) {}

	async delete(
		sidenote: Sidenote,
		{ deleteContentFile = true }: { deleteContentFile?: boolean } = {},
	): Promise<Sidenote> {
		const promises: Thenable<void | void[] | boolean>[] = [
			this.anchorer.delete(sidenote),
		];
		if (deleteContentFile && !this.inspector.isBroken(sidenote))
			promises.push(this.storageService.delete(sidenote));
		await Promise.all(promises);
		if (deleteContentFile) this.pool.delete(sidenote.key);
		return sidenote;
	}

	// async write(sidenote: Sidenote, ranges: Range[]): Promise<void> {
	// 	if (sidenote.content) {
	// 		await Promise.all([
	// 			this.storageService.write(sidenote, sidenote as Storable),
	// 			this.anchorer.write(sidenote, ranges),
	// 		]);
	// 	} else {
	// 		window.showErrorMessage('no content to write!');
	// 	}
	// }

	async updateContent(sidenote: Sidenote): Promise<Sidenote> {
		const data = await this.storageService.read(sidenote);
		if (data) sidenote.content = data.content;
		/* assuming that ranges hasn't change (update onEditorChange event is responsible for handling this)
		we can extract ranges from decorations */
		const ranges = Array.from(
			new Set(
				sidenote.decorations.map((decoration) => decoration.options.range),
			),
		);
		sidenote.decorations = this.styler.get(sidenote, ranges);
		return sidenote;
	}

	async open(sidenote: Sidenote) {
		this.storageService.open(sidenote);
	}

	// TODO move to UserInteraction module
	async handleBroken(sidenote: Sidenote): Promise<Sidenote | undefined> {
		const promptUserForAction = async (): Promise<
			QuickPickItem | undefined
		> => {
			const actions: QuickPickItem[] = [
				{
					label: 'delete',
					description: 'delete note comment',
				},
				{
					label: 're-create',
					description: 're-create storage entry for this note comment',
				},
			];

			if (this.storageService.lookup)
				actions.push({
					label: 'lookup',
					description: 'look for the missing sidenote file (select folder)',
				});

			const chosen = await window.showQuickPick(actions, {
				placeHolder:
					'No corresponding content file is found in workspace sidenotes folder. What do you want to do?',
			});

			return chosen;
		};

		const action = await promptUserForAction();
		if (!action) return undefined;

		switch (action.label) {
			case 'delete':
				this.anchorer.delete(sidenote);
				this.pool.delete(sidenote.id);
				return undefined;

			case 're-create':
				sidenote.content = '';
				await this.storageService.write(sidenote, sidenote as Storable);
				return sidenote;

			case 'lookup':
				return this.lookup(sidenote);

			default:
				return undefined;
		}
	}

	private async lookup(sidenote: Sidenote): Promise<Sidenote | undefined> {
		// TODO move to UserInteractions class
		if (!this.storageService.lookup) {
			console.warn('storage type does not provide lookup method');
			return undefined;
		}
		const result = await window.showOpenDialog({
			canSelectFolders: true,
			canSelectMany: false,
			// defaultUri: this.getCurrentWorkspacePath()
		});

		if (result) {
			const [lookupUri] = result;
			const success = await this.storageService.lookup(sidenote, lookupUri);
			if (success) {
				sidenote = await this.updateContent(sidenote);
				return sidenote;
			}
		}
		return undefined;
	}
}
