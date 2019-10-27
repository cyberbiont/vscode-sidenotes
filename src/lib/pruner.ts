import {
	IDictionary,
	ISidenote,
	Inspector,
	SidenoteProcessor
} from './types';

// export interface IPrunable {
// 	isBroken(): boolean
// 	isEmpty(): boolean
// }

export default class Pruner {
	constructor(
		public pool: IDictionary<ISidenote>,
		public sidenoteProcessor: SidenoteProcessor,
		public inspector: Inspector
	) {
		this.pool = pool;
		this.sidenoteProcessor = sidenoteProcessor;
		this.inspector = inspector;
	}

	async pruneAll(): Promise<void> {
		this.pruneEmpty();
		this.pruneBroken();
	}

	// async pruneBroken(): Promise<void> { return this.prune(sidenote => sidenote.isBroken());	}
	// async pruneEmpty(): Promise<void> { return this.prune(sidenote => sidenote.isEmpty()); }

	async pruneBroken(): Promise<void> { return this.prune((sidenote: ISidenote) => this.inspector.isBroken(sidenote));	}
	async pruneEmpty(): Promise<void> { return this.prune((sidenote: ISidenote) => this.inspector.isEmpty(sidenote)); }

	private async prune(getCondition): Promise<void> {

		const cb = async (sidenote: ISidenote): Promise<boolean> => {
			const condition = getCondition(sidenote);
			if (condition) await this.sidenoteProcessor.delete(sidenote);
			return condition;
		}

		for await (let sidenote of this.pool[Symbol.asyncIterator](cb)) {
			// REVIEW
			// if (getCondition()) {
			// 	await sidenote.wipe();
			// 	this.dictionary.delete(sidenote.id);
			// }
		}
	}

}
