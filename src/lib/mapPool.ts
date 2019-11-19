import * as vscode from 'vscode';

import {
	Constructor,
	IDictionary,
} from './types';

export interface HasFactoryMethod<V> {
	create: (key: any) => V | Promise<V>
}

/**
* keeps the registry of I class instances,
* created by object constructor with certain config, with config as key
* stores one of them as active(actual) instance
* and returns it for global use by other modules in application
*/

/* Key: если делать K конфигом, то если хотим создавать объекты в пуле (в чем
собственно его смысл и состоит) то надо в метод get передавать полный конфиг
смысла в дополнительных аргументах у фабрики нет, если мы ее планируем
использовать только через пул по сути get это замена метода create, точнее
типа как декоратор над ним (над фабрикой), который дополнительно включает кэширование инстансов в пуле
но вот вопрос с ключом... конфиг для создания объектов может отличаться,
но не все из этого конфига может быть использовано как ключ
Ситуация с сайднотом - мы имеем дополнительно ranges
*/

export default class MapPool<K extends object, V> {

	constructor(
		private Factory: HasFactoryMethod<V>,
		protected map: Map<K, V> | WeakMap<K, V>
	) {}

	async get(key: K, create: boolean = true): Promise<V> {
		let item: V;

		const queryResult = this.map.get(key);
		if (queryResult) item = queryResult;
		else {
			item = await this.create(key);
			this.set(key, item);
			// подходит толко для Map. мы не можем использовать dictionaryт т.к. там set принимает один аргумент
		}

		return item;
	}

	/**
	 * adds instance to pool
	 * can have different implementations depending on used collection type
	 */
	set(key: K, item: V) {
		this.map.set(key, item);
		return item;
	}

	protected create(key: K): V | Promise<V> {
		return this.Factory.create(key);
		/* чтобы предусмотреть возможность того,
		что фабрика будет работать асинхронно и возвращать промис,
		придется create и get делать асинхронными */
	}
}

// TODO refactor into separate classes MapPool WeakMapPool

// export class WeakMapPool<K extends object, V> extends MapPool <K, V> {
// 	// protected map: WeakMap<K, V> = new WeakMap;
// 	constructor(
// 		Factory: HasFactoryMethod<V>,
// 		protected map: WeakMap<K, V> = new WeakMap,
// 	) {
// 		super(Factory);
// 	}

// 	set(key: K, item: V) {
// 		this.map.set(key, item);
// 		return item;
// 	}
// }

// export class PoolMap<K, V> extends Pool<K, V> {
// 	constructor(
// 		Factory: HasFactoryMethod<V>,
// 		protected map: Map<K, V> = new Map,
// 	) {
// 		super(Factory);
// 	}
// }


// 🕮 f82a72dc-baae-448e-8737-126f0dec5e2d
// @old 🕮 7e2a51d6-a376-4fa0-b1b9-09cbfb35d967
// 🕮 3d6ba811-d108-408c-9692-58671b29f68f Добавление стейта, Proxy
