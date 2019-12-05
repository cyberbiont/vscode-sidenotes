// import Dictionary from './dictionary';
import { IDictionary, HasKeyProperty } from '../types';

export default class ArrayDictionary<T extends HasKeyProperty>
	// extends Dictionary<T>
	implements IDictionary<T> {

	list: Array<T> = [];

	add(item) {
		this.list.push(item);
		return this;
	}

	get(key) {
		return this.list.find(el => el.key === key);
	}

	delete(key) {
		this.list.splice(this.list.findIndex(el => el.key === key), 1);
		return this;
	}

	each(cb) {
		this.list.forEach((prop, key) => {
			cb(prop);
		});
	}

	clear() {
		this.list.length = 0;
		return this;
	}

	async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		for(const item of this.list) {
			yield cb(item);
		}
	}
	// prune(cb) {
	// 	this.list.forEach((el, i, arr) => { if (cb(el)) arr.splice(i, 1); });
	// 	return this.list;
	// 	// this.list = this.list.filter((...rest)=> !cb(...rest)) // invert callback function result to delete elements for which cb returns true
	// }
}
