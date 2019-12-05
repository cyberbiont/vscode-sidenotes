import * as vscode from 'vscode';
import {
	Anchorer,
	Constructor,
	Designer,
	EditorUtils,
	IAnchor,
	IAnchorable,
	ICfg,
	IDesignable,
	IIdMaker,
	IScanData,
	IStorable,
	IStorageService,
	IStylable,
	IStylableDecoration,
	MarkerUtils,
	Scanner,
} from './types';
import { Tracing } from 'trace_events';

export type ISidenote =
	IDesignable &
	IStylable &
	IAnchorable &
	{
		id: string,
		key: string
	}

export class Sidenote implements ISidenote {
	// 🖉 11d423eb-b5c9-4ce9-9750-6d2a5bfdae93
	key: string;
	id: string;
	content?: string;
	signature?: string;
	extension?: string;
	anchor: IAnchor;
	decorations: IStylableDecoration[];
	color?: string;
	constructor(
		sidenote: ISidenote,
	) {
		Object.assign(this, sidenote);
	}
	// isBroken(): boolean { return typeof this.content === 'undefined'; }
	// isEmpty(): boolean { return this.content === ''; }
}

export class Inspector {
	isBroken(sidenote): boolean { return typeof sidenote.content === 'undefined'; }
	isEmpty(sidenote): boolean { return sidenote.content === ''; }
}

export class SidenoteBuilder implements Partial<Sidenote> {
	// works even without making all properties optional
	key?: string;
	id?: string;
	extension?: string;
	signature?: string;
	anchor?: IAnchor;
	content?: string;
	decorations?: IStylableDecoration[];

	withId(key: string, id: string, extension?: string, signature?: string): this & Pick<Sidenote, 'key'|'id'|'extension'|'signature'> {
		return Object.assign(this, { key, id, extension, signature });
	}

	withAnchor(anchor: IAnchor): this & Pick<Sidenote, 'anchor'> {
		return Object.assign(this, { anchor });
	}

	withContent(content?: string): this & Pick<Sidenote, 'content'> {
		return Object.assign(this, { content });
	}

	withDecorations(decorations: IStylableDecoration[]): this & Pick<Sidenote, 'decorations'> {
		return Object.assign(this, { decorations });
	}

	build(this: Sidenote) {
		return new Sidenote(this);
	}
}

export type OSidenoteFactory = {
	storage: {
		files: {
			defaultContentFileExtension: string
		}
	},
	anchor: {
		marker: {
			signature: string
		}
	}
}

export class SidenoteFactory {
	constructor(
		private idMaker: IIdMaker,
		private anchorer: Anchorer,
		private storageService: IStorageService,
		private designer: Designer,
		private utils: EditorUtils & MarkerUtils,
		private scanner: Scanner,
		private SidenoteBuilder: Constructor<Partial<Sidenote>>,
		private cfg: ICfg
	) {}

	async build(scanData?: IScanData, customExtension?: string): Promise<ISidenote> {
		let key: string;
		let id: string;
		let extension: string | undefined;
		let signature: string | undefined;
		let ranges: vscode.Range[];
		let sidenote: ISidenote;
		// let position: vscode.Position;

		if (!scanData) { // buildNewSidenote
			const id = this.idMaker.makeId();
			extension = customExtension
				? customExtension
				: this.cfg.storage.files.defaultContentFileExtension;
			signature = this.cfg.anchor.marker.signature;

			key = this.utils.getKey(id, extension);
			const undecorated = new SidenoteBuilder()
				.withId(key, id, extension, signature)
				.withContent(await this.utils.extractSelectionContent())
				.withAnchor(this.anchorer.getAnchor(id, extension));

			/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer(we can limit it to current line based on position) */

			const position = undecorated.anchor.editor.selection.anchor;
			let range = this.utils.getMarkerRange(undecorated.anchor.marker, position);
			await Promise.all([
				this.storageService.write(undecorated, { content: undecorated.content! }),
				this.anchorer.write(undecorated, [range])
			]);

			// re-calculate range after comment toggle
			({ ranges } = this.scanner.scanLine(
				this.utils.getTextLine(range.start)
			)!);

			return sidenote = undecorated.withDecorations(
				this.designer.get(undecorated, ranges)
			).build();

		} else {
			({ key, ranges, marker: { id, signature, extension }} = scanData);
			const storageEntry = this.storageService.get({ id, extension });
			const content = storageEntry ? storageEntry.content : undefined;
			const undecorated = new SidenoteBuilder()
				.withId(key, id, extension, signature)
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id, extension));

			return sidenote = undecorated.withDecorations(
				this.designer.get(undecorated, ranges)
			).build();
		}
	}
}
