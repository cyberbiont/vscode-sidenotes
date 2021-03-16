/* eslint-disable max-classes-per-file */
import { Selection, commands, Range } from 'vscode';
import mimeTypes from 'mime-types';
import Styler, { Stylable } from './styler';
import { Decorable, DecorableDecoration } from './decorator';
import Anchorer, { Anchorable, Anchor } from './anchorer';
import { IdProvider } from './idProvider';
import { StorageService } from './storageService';
import { EditorUtils, MarkerUtils } from './utils';
import Scanner from './scanner';
// import SidenoteProcessor from './sidenoteProcessor';

export class Sidenote implements Stylable, Decorable, Anchorable {
	id: string;
	key: string;
	anchor: Anchor;
	decorations: DecorableDecoration[];
	content?: string;
	color?: string;
	signature?: string;
	extension?: string;
	mime?: string | false;
	constructor(
		sidenote: Sidenote,
		// status: Inspector
	) {
		Object.assign(this, sidenote);
	}
}

export class Inspector {
	isBroken(sidenote: Pick<Sidenote, 'content'>): boolean {
		return typeof sidenote.content === 'undefined';
	}

	isEmpty(sidenote: Pick<Sidenote, 'content'>): boolean {
		return sidenote.content === '';
	}

	isText(sidenote: Pick<Sidenote, 'mime'>): boolean {
		const { mime } = sidenote;
		if (mime === undefined) return true;
		if (mime === false) return false;
		return mime.includes('text');
	}
}

export class SidenoteBuilder implements Partial<Sidenote> {
	// 🕮 <cyberbiont> d86498f7-fcd0-4150-bcf2-bbbdbf5f4b14.md
	key?: string;
	id?: string;
	extension?: string;
	mime?: string | false;
	signature?: string;
	anchor?: Anchor;
	content?: string;
	decorations?: DecorableDecoration[];

	withMeta(
		key: string,
		id: string,
		extension?: string,
		mime?: string | false,
		signature?: string,
	): this & Pick<Sidenote, 'key' | 'id' | 'extension' | 'signature' | 'mime'> {
		return Object.assign(this, { key, id, mime, extension, signature });
	}

	withAnchor(anchor: Anchor): this & Pick<Sidenote, 'anchor'> {
		return Object.assign(this, { anchor });
	}

	withContent(content?: string): this & Pick<Sidenote, 'content'> {
		return Object.assign(this, { content });
	}

	withDecorations(
		decorations: DecorableDecoration[],
	): this & Pick<Sidenote, 'decorations'> {
		return Object.assign(this, { decorations });
	}

	build(this: Sidenote): Sidenote {
		return new Sidenote(this);
	}
}

export type OSidenoteFactory = {
	storage: {
		files: {
			defaultContentFileExtension: string;
		};
	};
	anchor: {
		marker: {
			signature: string;
		};
		comments: {
			affectNewlineSymbols: boolean;
		};
	};
};

export type ScannedSidenoteOptions = {
	key: string;
	marker: {
		id: string;
		extension?: string;
		signature?: string;
	};
	ranges: Range[];
};

export type NewSidenoteOptions = DeepPartial<ScannedSidenoteOptions>;

export type SidenoteFactoryOptions =
	| ScannedSidenoteOptions
	| NewSidenoteOptions;

function isScannedSidenoteOptions(
	o?: SidenoteFactoryOptions,
): o is ScannedSidenoteOptions {
	return (o as ScannedSidenoteOptions).ranges !== undefined;
}

export class SidenoteFactory {
	constructor(
		private idProvider: IdProvider,
		private anchorer: Anchorer,
		private storageService: StorageService,
		private styler: Styler,
		private utils: EditorUtils & MarkerUtils,
		private scanner: Scanner,
		private SidenoteBuilder: Constructor<SidenoteBuilder>,
		private inspector: Inspector,
		private cfg: OSidenoteFactory, // private sidenoteProcessor: SidenoteProcessor,
	) {}

	async build(o: NewSidenoteOptions): Promise<Sidenote>;
	async build(o: ScannedSidenoteOptions): Promise<Sidenote>;
	async build(
		o?: NewSidenoteOptions | ScannedSidenoteOptions,
	): Promise<Sidenote> {
		let key: string;
		let id: string;
		let content: Optional<string>;
		let extension: Optional<string>;
		let signature: Optional<string>;
		let mime: string | false;
		let ranges: Range[];
		let sidenote: Sidenote;

		if (isScannedSidenoteOptions(o)) {
			({
				key,
				ranges,
				marker: { id, signature, extension },
			} = o);
			mime = mimeTypes.lookup(extension);
			const storageEntry = await this.storageService.read({
				id,
				signature,
				extension,
			});
			content = storageEntry ? storageEntry.content : undefined;
			const withAnchor = new this.SidenoteBuilder()
				.withMeta(key, id, extension, mime, signature)
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id, extension));

			sidenote = withAnchor
				.withDecorations(this.styler.get(withAnchor, ranges))
				.build();

			return sidenote;
		} // buildNewSidenote
		id = this.idProvider.makeId();
		extension =
			o && o.marker && o.marker.extension
				? o.marker.extension
				: this.cfg.storage.files.defaultContentFileExtension;
		mime = mimeTypes.lookup(extension);
		signature = this.cfg.anchor.marker.signature;
		key = this.utils.getKey(id, extension);

		const withMeta = new SidenoteBuilder().withMeta(
			key,
			id,
			extension,
			mime,
			signature,
		);

		if (this.inspector.isText(withMeta)) {
			content = await this.utils.extractSelectionContent();
		} else {
			// remove selection
			const { selection } = this.utils.editor;
			this.utils.editor.selection = new Selection(
				selection.start,
				selection.start,
			);
			content = '';
		}

		const withAnchor = withMeta
			.withContent(content)
			.withAnchor(this.anchorer.getAnchor(id, extension));

		/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer(we can limit it to current line based on position) */

		if (
			this.cfg.anchor.comments.affectNewlineSymbols &&
			this.utils.editor.selection.isEmpty &&
			!this.utils.getTextLine().isEmptyOrWhitespace
		) {
			await commands.executeCommand('editor.action.insertLineBefore');
		}

		const position = this.utils.editor.selection.anchor;
		const range = this.utils.getMarkerRange(withAnchor.anchor.marker, position);

		await Promise.all([
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			this.storageService.write(withAnchor, { content: withAnchor.content! }),
			this.anchorer.write(withAnchor, [range]),
		]);
		// await this.sidenoteProcessor.write(withAnchor, range);

		// re-calculate range after comment toggle
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		({ ranges } = this.scanner.scanLine(this.utils.getTextLine(range.start))!);

		sidenote = withAnchor
			.withDecorations(this.styler.get(withAnchor, ranges))
			.build();

		return sidenote;
	}
}
