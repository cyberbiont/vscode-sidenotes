// import Dictionary from './dictionary';
import { IDictionary, HasIdProperty } from '../types';

// TODO декоратор к add, который проверяет, содержит ли добавляемый элемент такое же id, и если что не добавляет его
export default class ObjectDictionary<T extends HasIdProperty>
	// extends Dictionary<T>
	implements IDictionary<T> {

	list: {	[id: string]: any	} = Object.create(null);

	add(item) {
		this.list[item.id] = item;
		return this;
	}

	get(id) {
		return this.list[id];
	}

	delete(id) {
		delete this.list[id];
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
