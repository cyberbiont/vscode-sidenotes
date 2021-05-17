import { Inspector, Sidenote } from './sidenote';

import SidenoteProcessor from './sidenoteProcessor';
import { SidenotesDictionary } from './types';

export default class Pruner {
	constructor(
		public pool: SidenotesDictionary,
		public sidenoteProcessor: SidenoteProcessor,
		public inspector: Inspector,
	) {}

	async pruneAll(): Promise<void> {
		this.pruneEmpty();
		this.pruneBroken();
	}

	async pruneBroken(): Promise<boolean> {
		return this.prune((sidenote: Sidenote) =>
			this.inspector.isBroken(sidenote),
		);
	}

	async pruneEmpty(): Promise<boolean> {
		return this.prune((sidenote: Sidenote) => this.inspector.isEmpty(sidenote));
	}

	private async prune(
		getCondition: (sidenote: Sidenote) => boolean,
	): Promise<boolean> {
		// batch processing of different sidenotes. Has to be done via async for loop, because in adding / deleting anchors consequency matters
		const processSidenote = async (sidenote: Sidenote): Promise<Sidenote> => {
			const condition = getCondition(sidenote);
			if (!condition) return sidenote;
			return this.sidenoteProcessor.delete(sidenote);
		};

		for (const sidenote of this.pool) {
			// eslint-disable-next-line no-await-in-loop
			await processSidenote(sidenote);
		}

		return true;
	}
}
