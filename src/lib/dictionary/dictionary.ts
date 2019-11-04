// @see https://www.dustinhorne.com/post/2016/06/09/implementing-a-dictionary-in-typescript

type Storage<T> = Map<string, T>|Set<T>|{ [key: string]: T }|T[];

export interface IDictionary<T> {
	list: Storage<T>
	add(item: T): this
	get(id: string): T|undefined
	delete(id: string): this
	// prune(cb: (T) => boolean): this
	each(cb: (T) => void): void
	clear(): this
	// [Symbol.asyncIterator](cb): AsyncGenerator<T>
}

export interface IHasIdProperty {
	id: string;
}

export default abstract class Dictionary<T> {
	abstract list: Storage<T>
	// isInitialized: boolean

	// constructor() {
	// 	this.isInitialized = false;
	// }

	abstract get(id: string)

	// clear() {
	// 	this.isInitialized = false;
	// }

	/* async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		// FIXME
		let sidenote;
		for (let id of this.list.keys()) {
			sidenote = this.get(id);
			await cb(sidenote);
			yield sidenote;
		}
	} */
}
