import Anchorer, { Anchor, Anchorable } from './anchorer';
import { Decorable, DecorableDecoration } from './decorator';
import { EditorUtils, MarkerUtils } from './utils';
/* eslint-disable max-classes-per-file */
import { Range, Selection, commands } from 'vscode';
import Styler, { Stylable } from './styler';

import { IdProvider } from './idProvider';
import Scanner from './scanner';
import Signature from './signature';
import { StorageService } from './storageService';
import mimeTypes from 'mime-types';

// import SidenoteProcessor from './sidenoteProcessor';

export class Sidenote implements Stylable, Decorable, Anchorable {
	content?: string;
	decorations!: DecorableDecoration[];
	color?: string;
	mime?: string | false;

	id!: string;
	key!: string;
	signature?: string;
	extension?: string;

	anchor!: Anchor;
	ranges!: Range[];

	constructor(
		sidenote: Sidenote,
		// status: Inspector
	) {
		Object.assign(this, sidenote);
	}
}

export class Inspector {
	isBroken(sidenote: Pick<Sidenote, `content`>): boolean {
		return typeof sidenote.content === `undefined`;
	}

	isEmpty(sidenote: Pick<Sidenote, `content`>): boolean {
		return sidenote.content === ``;
	}

	isText(sidenote: Pick<Sidenote, `mime`>): boolean {
		const { mime } = sidenote;
		if (mime === undefined) return true;
		if (mime === false) return false;
		return mime.includes(`text`);
	}
}

export class SidenoteBuilder implements Partial<Sidenote> {
	// 🕮 <cyberbiont> d86498f7-fcd0-4150-bcf2-bbbdbf5f4b14.md
	content?: string;
	decorations?: DecorableDecoration[];
	mime?: string | false;

	key?: string;
	id?: string;
	extension?: string;
	signature?: string;

	anchor?: Anchor;
	ranges!: Range[];

	withMeta(
		key: string,
		id: string,
		extension?: string,
		mime?: string | false,
		signature?: string,
	): this & Pick<Sidenote, `key` | `id` | `extension` | `signature` | `mime`> {
		return Object.assign(this, { key, id, mime, extension, signature });
	}

	withAnchor(anchor: Anchor): this & Pick<Sidenote, `anchor`> {
		return Object.assign(this, { anchor });
	}

	withContent(content?: string): this & Pick<Sidenote, `content`> {
		return Object.assign(this, { content });
	}

	withDecorations(
		decorations: DecorableDecoration[],
	): this & Pick<Sidenote, `decorations`> {
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
		comments: {
			affectNewlineSymbols: boolean;
		};
	};
};

export type ScannedSidenoteOptions = {
	key: string;
	marker: {
		id: string;
		extension: string;
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
		private signature: Signature,
		private cfg: OSidenoteFactory,
	) {}

	async build(o: NewSidenoteOptions): Promise<Sidenote>;
	async build(o: ScannedSidenoteOptions): Promise<Sidenote>;
	async build(
		o?: NewSidenoteOptions | ScannedSidenoteOptions,
	): Promise<Sidenote> {
		let key: string;
		let id: string;
		let content: Optional<string>;
		let extension: string;
		let signature: Optional<string>;
		let mime: string | false;
		let ranges: Range[];
		let sidenote: Sidenote;

		// build sidenote object for existing anchor
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

			content = storageEntry?.content;

			const withAnchor = new this.SidenoteBuilder()
				.withMeta(key, id, extension, mime, signature)
				.withContent(content)
				.withAnchor(this.anchorer.getAnchor(id, extension));

			sidenote = withAnchor
				.withDecorations(this.styler.get(withAnchor, ranges))
				.build();

			return sidenote;
		}

		// create new sidenote
		id = this.idProvider.makeId();
		extension =
			o?.marker?.extension ||
			this.cfg.storage.files.defaultContentFileExtension;
		mime = mimeTypes.lookup(extension);
		key = this.utils.getKey(id, extension);

		const withMeta = new SidenoteBuilder().withMeta(
			key,
			id,
			extension,
			mime,
			this.signature.active,
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
			content = ``;
		}

		const withAnchor = withMeta
			.withContent(content)
			.withAnchor(this.anchorer.getAnchor(id, extension));

		/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer function (we can limit it to current line based on position) */

		if (
			this.cfg.anchor.comments.affectNewlineSymbols &&
			this.utils.editor.selection.isEmpty &&
			!this.utils.getTextLine().isEmptyOrWhitespace
		) {
			await commands.executeCommand(`editor.action.insertLineBefore`);
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
