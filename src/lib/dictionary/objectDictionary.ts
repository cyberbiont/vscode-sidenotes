import Dictionary from './dictionary';
import { IDictionary, IHasIdProperty } from '../types';

// TODO декоратор к add, который проверяет, содержит ли добавляемый элемент такое же id, и если что не добавляет его
export default class ObjectDictionary<T extends IHasIdProperty>
	extends Dictionary<T>
	implements IDictionary<T> {

	list: {
		[id: string]: any
	};

	constructor() {
		super();
		this.list = Object.create(null); // to get rid of uncesessary prototype properties that will show up in for/ in cycle
		//@see diacionary pattern https://2ality.com/2013/10/dict-pattern.html
	}

	add(item) {
		this.list[item.id] = item;
		return this;
	}

	get(id) {
		return this.list[id];
	}

	delete(id) {
		// let item = this.get(id);
		delete this.list[id];
		return this;
		// return item;
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
}
