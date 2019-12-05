// import Dictionary from './dictionary';
import { IDictionary, HasKeyProperty } from '../types';

export default class SetDictionary<T extends HasKeyProperty>
	// extends Dictionary<T>
	implements IDictionary<T>{

	list: Set<T> = new Set();

	add(item: T) {
		this.list.add(item);
		return this;
	}

	get(key) {
		for (let el of this.list) {
			if (key === el.key) return el;
		}
	}

	delete(key): this {
		this.list.delete(key);
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
		return this.list;
	}

	has(key): boolean {
		return this.list.has(key);
	}

	clear() {
		this.list.clear();
		return this;
	}

	count(): number {
		return this.list.size;
	}

	async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		for(const item of this.list) {
			yield cb(item);
		}
	}
}
