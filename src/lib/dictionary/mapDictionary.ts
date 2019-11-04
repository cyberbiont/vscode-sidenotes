import Dictionary from './dictionary';
import { IDictionary, IHasIdProperty } from '../types';

export default class MapDictionary<T extends IHasIdProperty>
	extends Dictionary<T>
	implements IDictionary<T> {

	list: Map<string, T>

	constructor() {
		super();
		this.list = new Map();
		//@see dictionary pattern https://2ality.com/2013/10/dict-pattern.html
	}

	add(item: T) {
		this.list.set(item.id, item);
		return this
	}

	get(id: string) {
		return this.list.get(id);
	}

	delete(id: string) {
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

	contains(id: string): boolean {
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
