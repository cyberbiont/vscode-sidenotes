/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Dictionary, HasKeyProperty } from '../types';

// TODO 🕮 <YL> ee5d5d6e-f19c-447e-8d7b-96d16f241125.md
export default class ObjectDictionary<T extends HasKeyProperty>
	implements
		// extends Dictionary<T>
		Dictionary<T> {
	list: { [key: string]: T } = Object.create(null);

	add(item) {
		this.list[item.key] = item;
		return this;
	}

	get(key) {
		return this.list[key];
	}

	delete(key) {
		delete this.list[key];
		return this;
	}

	each(cb) {
		for (const [key, value] of Object.entries(this.list)) cb(key, value);
		// for (const prop in this.list) {
		// 	cb(prop);
		// }
	}

	prune(cb) {
		for (const key of Object.keys(this.list)) {
			if (cb(key)) delete this.list[key];
		}
		return this.list;
	}

	clear() {
		for (const key of Object.keys(this.list)) {
			delete this.list[key];
		}
		return this;
	}

	async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		for (const key of Object.keys(this.list)) {
			yield cb(this.list[key]);
		}
	}
}
