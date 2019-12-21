import {
	Inspector,
	Sidenote,
	SidenoteProcessor,
	SidenotesDictionary,
} from './types';

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

	async pruneBroken(): Promise<void> {
		return this.prune((sidenote: Sidenote) =>
			this.inspector.isBroken(sidenote),
		);
	}

	async pruneEmpty(): Promise<void> {
		return this.prune((sidenote: Sidenote) => this.inspector.isEmpty(sidenote));
	}

	private async prune(
		getCondition: (sidenote: Sidenote) => boolean,
	): Promise<void> {
		const processSidenote = async (sidenote: Sidenote): Promise<boolean> => {
			const condition = getCondition(sidenote);
			if (condition) await this.sidenoteProcessor.delete(sidenote);
			return condition;
		};

		for await (const sidenote of this.pool[Symbol.asyncIterator](
			processSidenote,
		)) {
			// processSidenote(sidenote);
		}
	}
}
