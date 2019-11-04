import Dictionary from './dictionary';
import { IDictionary, IHasIdProperty } from '../types';

export default class SetDictionary<T extends IHasIdProperty>
	extends Dictionary<T>
	implements IDictionary<T>{

	list: Set<T>;

	constructor() {
		super();
		this.list = new Set();
	}

	add(item: T) {
		this.list.add(item);
		return this;
	}

	get(id) {
		for (let el of this.list) {
			if (id === el.id) return el;
		}
	}

	delete(id): this {
		this.list.delete(id);
		return this;
	}

	each(cb) {
		this.list.forEach((prop, key) => {
			cb(prop);
		});
	}

	prune(cb) {
		this.list.forEach((prop, key) => {
			if (cb(prop)) this.delete(key);
		});
		// for (let prop of this.list) {
		// 	if (cb(prop[1])) this.delete(prop[0]);
		// }
		return this.list;
	}

	contains(id): boolean {
		return this.list.has(id);
	}

	clear() {
		this.list.clear();
		return this;
	}

	count(): number {
		return this.list.size;
	}
}
