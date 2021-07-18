import Anchorer, { Anchorable } from './anchorer';
import { Decorable, DecorableDecoration } from './decorator';
import { EditorUtils, MarkerUtils } from './utils';
/* eslint-disable max-classes-per-file */
import { Range, Selection, commands } from 'vscode';
import Scanner, { ScanData } from './scanner';
import Styler, { Stylable } from './styler';

import { IdProvider } from './idProvider';
import Signature from './signature';
import { StorageService } from './storageService';
import mimeTypes from 'mime-types';

export type NewSidenoteCfg = DeepPartial<ScanData>;

export type SidenoteFactoryOptions = ScanData | NewSidenoteCfg;

function isScanData(o?: SidenoteFactoryOptions): o is ScanData {
	return (o as ScanData).ranges !== undefined;
}
export class Sidenote implements Stylable, Decorable, Anchorable {
	content?: string;
	color?: string;
	mime?: string | false;

	key!: string;

	marker!: string;
	signature!: string;
	id!: string;
	extension!: string;

	ranges!: Range[];
	decorations!: DecorableDecoration[];

	constructor(
		sidenote: Sidenote,
		// status: Inspector
	) {
		Object.assign(this, sidenote);
	}
}

export class Inspector {
	constructor(private utils: EditorUtils & MarkerUtils) {}

	isBroken(sidenote: Pick<Sidenote, `content`>): boolean {
		return typeof sidenote.content === `undefined`;
	}

	isEmpty(sidenote: Pick<Sidenote, `content`>): boolean {
		return sidenote.content === ``;
	}

	isText(sidenote: Pick<Sidenote, `mime`>): boolean {
		return this.utils.isText(sidenote.mime);
	}
}

export class SidenoteBuilder implements Partial<Sidenote> {
	content?: string;
	mime?: string | false;

	key?: string;

	marker!: string;
	signature!: string;
	id!: string;
	extension!: string;

	ranges!: Range[];
	decorations?: DecorableDecoration[];

	withMeta(
		key: string,
		marker: string,
		signature: string,
		id: string,
		extension: string,
		mime?: string | false,
	): this &
		Pick<
			Sidenote,
			`key` | `marker` | `signature` | `id` | `extension` | `mime`
		> {
		return Object.assign(this, { key, marker, signature, id, extension, mime });
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

	async build(o: NewSidenoteCfg): Promise<Sidenote>;
	async build(o: ScanData): Promise<Sidenote>;
	async build(o?: NewSidenoteCfg | ScanData): Promise<Sidenote> {
		let id: string;
		let extension: string;
		let signature: Optional<string>;

		let key: string;

		let mime: string | false;
		let content: Optional<string>;

		let ranges: Range[];
		let marker: string;

		let sidenote: Sidenote;

		// build sidenote object for existing anchor
		if (isScanData(o)) {
			({ key, ranges, id, signature, extension, marker } = o);

			mime = mimeTypes.lookup(extension);

			const storageEntry = await this.storageService.read({
				id,
				signature,
				extension,
			});

			content = storageEntry?.content;

			const withAnchor = new this.SidenoteBuilder()
				.withMeta(key, marker, signature, id, extension, mime)
				.withContent(content);

			sidenote = withAnchor
				.withDecorations(this.styler.get(withAnchor, ranges))
				.build();

			return sidenote;
		}

		// 🕮 <cyberbiont> 9f240e78-cfdb-45ae-a894-f8f6c255be4f.md
		// create new sidenote
		id = this.idProvider.makeId();
		extension =
			o?.extension || this.cfg.storage.files.defaultContentFileExtension;
		signature = this.signature.active;
		marker = this.utils.getMarker(id, extension);
		key = this.utils.getKey(id, extension);
		mime = mimeTypes.lookup(extension);

		const withMeta = new SidenoteBuilder().withMeta(
			key,
			marker,
			signature,
			id,
			extension,
			mime,
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

		const withContent = withMeta.withContent(content);

		/* cannot generate decoration with proper range before write method,
			because comment toggling changes range and it may vary with language,
			so regexp rescan is needed inside designer function (we can limit it to current line based on position) */

		// TODO🕮 <cyberbiont> bfbedd7e-99ed-4fc3-857f-d6be44f9d497.md
		if (
			this.cfg.anchor.comments.affectNewlineSymbols &&
			this.utils.editor.selection.isEmpty &&
			!this.utils.getTextLine().isEmptyOrWhitespace
		) {
			await commands.executeCommand(`editor.action.insertLineBefore`);
		}

		const position = this.utils.editor.selection.anchor;
		const range = this.utils.getMarkerRange(withContent.marker, position);

		await Promise.all([
			this.storageService.write(withContent, {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				content: withContent.content!,
			}),
			this.anchorer.write(withContent, [range]),
		]);

		// re-calculate range after comment toggle
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		({ ranges } = this.scanner.scanLine(this.utils.getTextLine(range.start))!);

		sidenote = withContent
			.withDecorations(this.styler.get(withContent, ranges))
			.build();

		return sidenote;
	}
}
