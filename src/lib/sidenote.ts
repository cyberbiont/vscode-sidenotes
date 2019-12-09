import * as vscode from 'vscode';
import * as mimeTypes from 'mime-types';
import {
	Anchorer,
	Constructor,
	DeepPartial,
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

export type ISidenote =
	IDesignable &
	IStylable &
	IAnchorable &
	{
		id: string,
		key: string
	}

export class Sidenote implements ISidenote {
	key: string;
	id: string;
	content?: string;
	signature?: string;
	extension?: string;
	mime?: string|false;
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
	mime?: string|false;
	signature?: string;
	anchor?: IAnchor;
	content?: string;
	decorations?: IStylableDecoration[];

	withMeta(key: string, id: string, extension?: string, mime?: string|false, signature?: string): this & Pick<Sidenote, 'key'|'id'|'extension'|'signature'|'mime'> {
		return Object.assign(this, { key, id, mime, extension, signature });
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

export type ScannedSidenoteOptions = {
	key: string
	marker: {
		id: string
		extension?: string
		signature?: string
	}
	ranges: vscode.Range[]
}

export type NewSidenoteOptions = DeepPartial<ScannedSidenoteOptions>

export type SidenoteFactoryOptions = ScannedSidenoteOptions | NewSidenoteOptions

function isScannedSidenoteOptions(o?: SidenoteFactoryOptions): o is ScannedSidenoteOptions {
	return (o as ScannedSidenoteOptions).ranges !== undefined;
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
		private cfg: OSidenoteFactory
	) {}

	async build(o: NewSidenoteOptions): Promise<ISidenote>
	async build(o: ScannedSidenoteOptions): Promise<ISidenote>
	async build(o?: NewSidenoteOptions | ScannedSidenoteOptions): Promise<ISidenote> {
		let key: string;
		let id: string;
		let extension: string | undefined;
		let signature: string |undefined;
		let mime: string|false;
		let ranges: vscode.Range[];
		let sidenote: ISidenote;

		if (isScannedSidenoteOptions(o)) {
			({ key, ranges, marker: { id, signature, extension }} = o);
			mime = mimeTypes.lookup(extension);
			const storageEntry = this.storageService.get({ id, extension });
			const content = storageEntry ? storageEntry.content : undefined;
			const undecorated = new SidenoteBuilder()
				.withMeta(key, id, extension, mime, signature)
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id, extension));

			return sidenote = undecorated.withDecorations(
				this.designer.get(undecorated, ranges)
			).build();
		} else { // buildNewSidenote
			const id = this.idMaker.makeId();
			const extension = o && o.marker && o.marker.extension
				? o.marker.extension
				: this.cfg.storage.files.defaultContentFileExtension;
			mime = mimeTypes.lookup(extension);
			signature = this.cfg.anchor.marker.signature;

			key = this.utils.getKey(id, extension);
			const undecorated = new SidenoteBuilder()
				.withMeta(key, id, extension, mime, signature)
				.withContent(await this.utils.extractSelectionContent())
				.withAnchor(this.anchorer.getAnchor(id, extension));

			/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer(we can limit it to current line based on position) */

			// const position = undecorated.anchor.editor.selection.anchor;
			const position = this.utils.editor.selection.anchor;

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
		}
	}
}
