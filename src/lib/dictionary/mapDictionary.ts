/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Dictionary, HasKeyProperty } from '../types';

export default class MapDictionary<T extends HasKeyProperty>
	implements
		// extends Dictionary<T>
		Dictionary<T> {
	list: Map<string, T> = new Map();

	add(item: T) {
		this.list.set(item.key, item);
		return this;
	}

	get(key: string) {
		return this.list.get(key);
	}

	delete(key: string) {
		this.list.delete(key);
		return this;
	}

	each(cb) {
		this.list.forEach((prop, key) => {
			cb(prop);
		});
	}

	has(key: string): boolean {
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
		for (const item of this.list.values()) {
			yield cb(item);
		}
	}
}
