// import Dictionary from './dictionary';
import { IDictionary, HasIdProperty } from '../types';

export default class SetDictionary<T extends HasIdProperty>
	// extends Dictionary<T>
	implements IDictionary<T>{

	list: Set<T> = new Set();

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
		return this.list;
	}

	has(id): boolean {
		return this.list.has(id);
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
