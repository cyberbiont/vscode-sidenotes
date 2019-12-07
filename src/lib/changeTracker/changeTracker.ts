import {
	EventEmitter,
	IIdMaker,
	MarkerUtils
} from '../types';

import * as path from 'path';

export type OChangeTracker = {

}

export type IChangeData = {
	id: string,
	path: string
}

export interface IChangeTracker {
	eventEmitter: EventEmitter
	generateCustomEvent(fileName: string, event: string): void
	dispatch(changeData: IChangeData): void
	init(path?: String): void
	getIdFromFileName(fileName: string): string|null
}

export default abstract class ChangeTracker {
	constructor(
		public idMaker: IIdMaker,
		public eventEmitter: EventEmitter,
		public utils: MarkerUtils
	) {}

	generateCustomEvent(fileName: string, event: string): void {
		const changeData = this.processEventData({ event, fileName });
		if (changeData) this.dispatch(changeData);
	}

	dispatch(changeData: IChangeData): void {
		this.eventEmitter.emit('sidenoteDocumentChange', changeData);
	}

	processEventData(eventData): IChangeData|undefined {
		const id = this.getIdFromFileName(eventData.fileName);
		if (id) {
			const changeData = {
				id,
				path: eventData.fileName
			};
			return changeData;
		}
	}

	getIdFromFileName(fileName: string): string|null {
		return this.utils.getIdFromString(fileName);
	}
}
