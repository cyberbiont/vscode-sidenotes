import { EventEmitter, IdProvider, MarkerUtils } from '../types';

export type OChangeTracker = {};

export type ChangeData = {
	id: string;
	path: string;
};

interface ChangeTracker {
	init(path?: string): void;
}

abstract class ChangeTracker {
	constructor(
		public idProvider: IdProvider,
		public eventEmitter: EventEmitter,
		public utils: MarkerUtils,
	) {}

	generateCustomEvent(fileName: string, event: string): void {
		const changeData = this.processEventData({ event, fileName });
		if (changeData) this.dispatch(changeData);
	}

	dispatch(changeData: ChangeData): void {
		this.eventEmitter.emit('sidenoteDocumentChange', changeData);
	}

	processEventData(eventData): ChangeData | undefined {
		const id = this.getIdFromFileName(eventData.fileName);
		if (id) {
			const changeData = {
				id,
				path: eventData.fileName,
			};
			return changeData;
		}
		return undefined;
	}

	getIdFromFileName(fileName: string): string | null {
		return this.utils.getIdFromString(fileName);
	}
}

export default ChangeTracker;
