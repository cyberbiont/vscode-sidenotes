import {
	// IDictionary,
	ISidenote,
	Inspector,
	Pool,
	SidenoteProcessor,
} from './types';

// export interface IPrunable {
// 	isBroken(): boolean
// 	isEmpty(): boolean
// }

export default class Pruner {
	constructor(
		// public pool: IDictionary<ISidenote>,
		public pool: Pool<ISidenote>,
		public sidenoteProcessor: SidenoteProcessor,
		public inspector: Inspector
	) {}

	async pruneAll(): Promise<void> {
		this.pruneEmpty();
		this.pruneBroken();
	}

	// async pruneBroken(): Promise<void> { return this.prune(sidenote => sidenote.isBroken());	}
	// async pruneEmpty(): Promise<void> { return this.prune(sidenote => sidenote.isEmpty()); }

	async pruneBroken(): Promise<void> { return this.prune((sidenote: ISidenote) => this.inspector.isBroken(sidenote));	}
	async pruneEmpty(): Promise<void> { return this.prune((sidenote: ISidenote) => this.inspector.isEmpty(sidenote)); }

	private async prune(getCondition): Promise<void> {

		const processSidenote = async (sidenote: ISidenote): Promise<boolean> => {
			const condition = getCondition(sidenote);
			if (condition) await this.sidenoteProcessor.delete(sidenote);
			return condition;
		}

		for await (let sidenote of this.pool.activeDictionary[Symbol.asyncIterator](processSidenote)) {
			// processSidenote(sidenote);
		}
	}

}
