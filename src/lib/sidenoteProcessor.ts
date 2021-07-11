import { Inspector, Sidenote } from './sidenote';
import { QuickPickItem, TextEditor, window } from 'vscode';
import { Storable, StorageService } from './storageService';

import Anchorer from './anchorer';
import { SidenotesDictionary } from './types';
import Signature from './signature';
import Styler from './styler';
import UserInteraction from './userInteraction';

export default class SidenoteProcessor {
	constructor(
		public storageService: StorageService,
		public anchorer: Anchorer,
		public pool: SidenotesDictionary,
		public styler: Styler,
		public inspector: Inspector,
		public userInteraction: UserInteraction,
		public signature: Signature,
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
			new Set(sidenote.decorations.map(decoration => decoration.options.range)),
		);
		sidenote.decorations = this.styler.get(sidenote, ranges);
		return sidenote;
	}

	async open(sidenote: Sidenote) {
		this.storageService.open(sidenote);
	}

	async changeSignature(sidenote: Sidenote) {
		const newSignature = this.userInteraction.selectSignature(
			this.signature.active,
		);
		/* NOT IMPLEMENTED  */
		// re-write marker
		// move file
	}

	async handleBroken(sidenote: Sidenote): Promise<Sidenote | undefined> {
		const action = await this.userInteraction.promptUserForAction(
			this.storageService.lookup,
		);
		if (!action) return undefined;

		switch (action.label) {
			case `delete`:
				this.anchorer.delete(sidenote);
				this.pool.delete(sidenote.id);
				return undefined;

			case `re-create`:
				sidenote.content = ``;
				await this.storageService.write(sidenote, sidenote as Storable);
				return sidenote;

			case `lookup`:
				return this.lookup(sidenote);

			default:
				return undefined;
		}
	}

	private async lookup(sidenote: Sidenote): Promise<Sidenote | undefined> {
		// TODO move to UserInteractions class
		if (!this.storageService.lookup) {
			console.warn(`this storage type does not provide the lookup method`);
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
