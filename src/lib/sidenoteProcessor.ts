import { Inspector, Sidenote } from './sidenote';
import { window } from 'vscode';
import { FileStorage, Storable, StorageService } from './storageService';

import Anchorer from './anchorer';
import { SidenotesDictionary } from './types';
import Signature from './signature';
import Styler from './styler';
import UserInteraction from './userInteraction';
import path from 'path';

export default class SidenoteProcessor {
	constructor(
		public fileStorage: FileStorage,
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
			promises.push(this.fileStorage.delete(sidenote));
		await Promise.all(promises);
		if (deleteContentFile) this.pool.delete(sidenote.key);
		return sidenote;
	}

	async updateContent(sidenote: Sidenote): Promise<Sidenote> {
		const data = await this.fileStorage.read(sidenote);
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
		this.fileStorage.open(sidenote);
	}

	async changeSignature(sidenote: Sidenote) {
		const newSignature = await this.userInteraction.selectSignature(
			sidenote.signature,
		);

		if (!newSignature) return;

		const oldUri = this.fileStorage.getUri(
			path.dirname(this.fileStorage.getContentFileUri(sidenote).fsPath),
		);

		await this.anchorer.replaceSignature(sidenote, newSignature);

		this.fileStorage.uriCache = new WeakMap();

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		await this.fileStorage.lookup(sidenote, oldUri, { resolveAction: `move` });
	}

	async handleBroken(sidenote: Sidenote): Promise<Sidenote | undefined> {
		const action = await this.userInteraction.promptUserForAction(
			this.fileStorage.lookup,
		);
		if (!action) return undefined;

		switch (action.label) {
			case `delete`:
				this.anchorer.delete(sidenote);
				this.pool.delete(sidenote.id);
				return undefined;

			case `re-create`:
				sidenote.content = ``;
				await this.fileStorage.write(sidenote, sidenote as Storable);
				return sidenote;

			case `lookup`:
				return this.lookup(sidenote);

			default:
				return undefined;
		}
	}

	private async lookup(sidenote: Sidenote): Promise<Sidenote | undefined> {
		// TODO move to UserInteractions class
		if (!this.fileStorage.lookup) {
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
			const success = await this.fileStorage.lookup(sidenote, lookupUri);
			if (success) {
				sidenote = await this.updateContent(sidenote);
				return sidenote;
			}
		}
		return undefined;
	}
}
