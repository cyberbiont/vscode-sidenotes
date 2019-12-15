import vscode from 'vscode';
import mimeTypes from 'mime-types';
import {
	Anchorer,
	Constructor,
	DeepPartial,
	Styler,
	EditorUtils,
	IAnchor,
	IAnchorable,
	ICfg,
	IStylable,
	IIdMaker,
	IScanData,
	IStorable,
	IStorageService,
	IDecorable,
	IDecorableDecoration,
	MarkerUtils,
	Scanner,
} from './types';

export type ISidenote =
	IStylable &
	IDecorable &
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
	decorations: IDecorableDecoration[];
	color?: string;
	constructor(
		sidenote: ISidenote,
		// status: Inspector
	) {
		Object.assign(this, sidenote);
	}
}

export class Inspector {
	isBroken(sidenote): boolean { return typeof sidenote.content === 'undefined'; }
	isEmpty(sidenote): boolean { return sidenote.content === ''; }
	isText(sidenote): boolean { return (sidenote.mime === undefined)
		? true
		: (sidenote.mime === false)
			? false
			: sidenote.mime.includes('text');
	}
}

export class SidenoteBuilder implements Partial<Sidenote> {
	// 🕮 <YL> d86498f7-fcd0-4150-bcf2-bbbdbf5f4b14.md
	key?: string;
	id?: string;
	extension?: string;
	mime?: string|false;
	signature?: string;
	anchor?: IAnchor;
	content?: string;
	decorations?: IDecorableDecoration[];

	withMeta(key: string, id: string, extension?: string, mime?: string|false, signature?: string): this & Pick<Sidenote, 'key'|'id'|'extension'|'signature'|'mime'> {
		return Object.assign(this, { key, id, mime, extension, signature });
	}

	withAnchor(anchor: IAnchor): this & Pick<Sidenote, 'anchor'> {
		return Object.assign(this, { anchor });
	}

	withContent(content?: string): this & Pick<Sidenote, 'content'> {
		return Object.assign(this, { content });
	}

	withDecorations(decorations: IDecorableDecoration[]): this & Pick<Sidenote, 'decorations'> {
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
			signature: string,
		},
		comments: {
			affectNewlineSymbols: boolean
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
		private styler: Styler,
		private utils: EditorUtils & MarkerUtils,
		private scanner: Scanner,
		private SidenoteBuilder: Constructor<Partial<Sidenote>>,
		private inspector: Inspector,
		private cfg: OSidenoteFactory
	) {}

	async build(o: NewSidenoteOptions): Promise<ISidenote>
	async build(o: ScannedSidenoteOptions): Promise<ISidenote>
	async build(o?: NewSidenoteOptions | ScannedSidenoteOptions): Promise<ISidenote> {
		let key: string;
		let id: string;
		let content: string | undefined;
		let extension: string | undefined;
		let signature: string | undefined;
		let mime: string | false;
		let ranges: vscode.Range[];
		let sidenote: ISidenote;

		if (isScannedSidenoteOptions(o)) {
			({ key, ranges, marker: { id, signature, extension }} = o);
			mime = mimeTypes.lookup(extension);
			const storageEntry = await this.storageService.get({ id, extension });
			content = storageEntry ? storageEntry.content : undefined;
			const withAnchor = new SidenoteBuilder()
				.withMeta(key, id, extension, mime, signature)
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id, extension));

			return sidenote = withAnchor.withDecorations(
				this.styler.get(withAnchor, ranges)
			).build();

		} else { // buildNewSidenote
			id = this.idMaker.makeId();
			extension = o	&& o.marker	&& o.marker.extension
				? o.marker.extension
				: this.cfg.storage.files.defaultContentFileExtension;
			mime = mimeTypes.lookup(extension);
			signature = this.cfg.anchor.marker.signature;
			key = this.utils.getKey(id, extension);

			const withMeta = new SidenoteBuilder()
				.withMeta(key, id, extension, mime, signature);

			if	(this.inspector.isText(withMeta)) {
				content = await this.utils.extractSelectionContent();
			} else {
				// remove selection
				let selection = this.utils.editor.selection;
				this.utils.editor.selection = new vscode.Selection(selection.start, selection.start);
				content = ''
			}

			const withAnchor = withMeta
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id, extension));

			/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer(we can limit it to current line based on position) */

			if (
				this.cfg.anchor.comments.affectNewlineSymbols
				&& this.utils.editor.selection.isEmpty
				&& !this.utils.getTextLine().isEmptyOrWhitespace
			) {
				await vscode.commands.executeCommand('editor.action.insertLineBefore');
			}

			const position = this.utils.editor.selection.anchor;
			let range = this.utils.getMarkerRange(withAnchor.anchor.marker, position);

			await Promise.all([
				this.storageService.write(withAnchor, { content: withAnchor.content! }),
				this.anchorer.write(withAnchor, [range])
			]);

			// re-calculate range after comment toggle
			({ ranges } = this.scanner.scanLine(
				this.utils.getTextLine(range.start)
			)!);

			return sidenote = withAnchor.withDecorations(
				this.styler.get(withAnchor, ranges)
			).build();
		}
	}
}
