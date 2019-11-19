// import Dictionary from './dictionary';
import { IDictionary, HasIdProperty } from '../types';

export default class MapDictionary<T extends HasIdProperty>
	// extends Dictionary<T>
	implements IDictionary<T> {

	list: Map<string, T> = new Map();

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

	has(id: string): boolean {
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
		for(const item of this.list.values()) {
			yield cb(item);
		}
	}
}
