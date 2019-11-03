// @see https://www.dustinhorne.com/post/2016/06/09/implementing-a-dictionary-in-typescript

type Storage<T> = Map<string, T>|Set<T>|{ [key: string]: T}| T[];

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

interface IHasIdProperty {
	id: string;
}

// TODO декоратор к add, который проверяет, содержит ли добавляемый элемент такое же id, и если что не добавляет его
// export class ObjectDictionary<T extends IHasIdProperty> implements IDictionary<T>{
// 	list: {
// 		[id: string]: any
// 	};
// 	constructor() {
// 		this.list = Object.create(null); // to get rid of uncesessary prototype properties that will show up in for/ in cycle
// 		//@see diacionary pattern https://2ality.com/2013/10/dict-pattern.html
// 	}
// 	add(item) {
// 		this.list[item.id] = item;
// 		return this.list;
// 	}
// 	get(id) {
// 		return this.list[id];
// 	 }
// 	delete(id) {
// 		// let item = this.get(id);
// 		delete this.list[id];
// 		return this.list;
// 		// return item;
// 	}
// 	each(cb) {
// 		for (let prop in this.list) {
// 			cb(prop);
// 		}
// 	}
// 	prune(cb) {
// 		for (let prop in this.list) {
// 			if (cb(prop)) delete this.list[prop];
// 		}
// 		return this.list;
// 	}
// }

// export class ArrayDictionary<T> implements IDictionary<T> {

// 	list: any[];


// 	constructor() {
// 		this.list = [];
// 	}
// 	add(item) {
// 		this.list.push(item);
// 		return this.list;
// 	}
// 	get(id) {
// 		return this.list.find(el => el.id === id);
// 	}
// 	delete(id) {
// 		return this.list.splice(this.list.findIndex(el => el.id === id), 1);
// 	}
// 	each(cb) {
// 		this.list.forEach((prop, key) => {
// 			cb(prop);
// 		});
// 	}
// 	prune(cb) {
// 		this.list.forEach((el, i, arr) => { if (cb(el)) arr.splice(i, 1); });
// 		return this.list;
// 		// this.list = this.list.filter((...rest)=> !cb(...rest)) // invert callback function result to delete elements for which cb returns true
// 	}
// }

export class MapDictionary<T extends IHasIdProperty> implements IDictionary<T>{

	list: Map<string, T>

	constructor() {
		this.list = new Map();

		//@see dictionary pattern https://2ality.com/2013/10/dict-pattern.html
	}
	add(item: T): this {
		this.list.set(item.id, item);
		return this
	}
	get(id: string): T|undefined {
		return this.list.get(id);
	}
	delete(id: string): this {
		this.list.delete(id);
		return this;
	}
	each(cb) {
		this.list.forEach((prop, key) => {
			cb(prop);
		});
	}
	// prune(cb): this {
	// 	this.list.forEach((prop, key) => {
	// 		if (cb(prop)) this.delete(key);
	// 	});
	// 	// for (let prop of this.list) { if (cb(prop[1])) this.delete(prop[0]); }
	// 	return this;
	// }

	async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		let sidenote;
		for (let id of this.list.keys()) {
			sidenote = this.get(id);
			await cb(sidenote);
			yield sidenote;
		}
	}

	contains(id: string): boolean {
		return this.list.has(id);
	}
	clear(): this {
		this.list.clear();
		return this;
	}
	count(): number {
		return this.list.size;
	}
}

// export class SetDictionary<T extends IHasIdProperty> implements IDictionary<T>{

// 	list: Set<T>;

// 	constructor() {
// 		this.list = new Set();
// 	}
// 	add(item: T) {
// 		return this.list.add(item);
// 	}
// 	get(id) {
// 		for (let el of this.list) {
// 			if (id === el.id) return el;
// 		}
// 	}
// 	delete(id) {
// 		this.list.delete(id);
// 		return this.list;
// 	}
// 	each(cb) {
// 		this.list.forEach((prop, key) => {
// 			cb(prop);
// 		});
// 	}
// 	prune(cb) {
// 		this.list.forEach((prop, key) => {
// 			if (cb(prop)) this.delete(key);
// 		});
// 		// for (let prop of this.list) {
// 		// 	if (cb(prop[1])) this.delete(prop[0]);
// 		// }
// 		return this.list;
// 	}

// 	contains(id): boolean {
// 		return this.list.has(id);
// 	 }
// 	clear(): void {
// 		this.list.clear();
// 	}
// 	count(): number {
// 		return this.list.size;
// 	}
// }
