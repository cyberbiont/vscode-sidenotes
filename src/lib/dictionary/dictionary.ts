// @see https://www.dustinhorne.com/post/2016/06/09/implementing-a-dictionary-in-typescript

type Storage<T> = Map<string, T>|Set<T>|{ [key: string]: T }|T[];

export interface IDictionary<T> {
	//обозначаем как generic, т.е. вместо <T> можно будет передать снаружи любой нужный нам тип, Sidenote в данном случае
	list: Storage<T>
	add(item: T): this
	get(id: string): T|undefined
	delete(id: string): this
	// prune(cb: (T) => boolean): this
	each(cb: (T)): void
	clear(): this
	[Symbol.asyncIterator](cb): AsyncGenerator<T>
}

export interface IHasIdProperty {
	id: string;
}

export default abstract class Dictionary<T> {
	abstract list;

	abstract get(id: string)

	async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		let sidenote;
		for (let id of this.list.keys()) {
			sidenote = this.get(id);
			await cb(sidenote);
			yield sidenote;
		}
	}
}
