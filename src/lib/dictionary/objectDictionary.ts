// import Dictionary from './dictionary';
import { IDictionary, HasKeyProperty } from '../types';

// TODO декоратор к add, который проверяет, содержит ли добавляемый элемент такое же id, и если что не добавляет его
export default class ObjectDictionary<T extends HasKeyProperty>
	// extends Dictionary<T>
	implements IDictionary<T> {

	list: {	[key: string]: any	} = Object.create(null);

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
		for (let prop in this.list) {
			cb(prop);
		}
	}

	prune(cb) {
		for (let prop in this.list) {
			if (cb(prop)) delete this.list[prop];
		}
		return this.list;
	}

	clear() {
		for (let key in this.list) {
			delete this.list[key];
		}
		return this;
	}

	async *[Symbol.asyncIterator](cb): AsyncGenerator<T> {
		for(const key in this.list) {
			yield cb(this.list[key]);
		}
	}
}
