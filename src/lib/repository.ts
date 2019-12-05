import * as vscode from 'vscode';

import {
	Constructor,
	IDictionary,
	HasKeyProperty,
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
export class MapRepository<K extends object, V> {

	constructor(
		private Factory: HasFactoryMethod<V>,
		protected map: Map<K, V> | WeakMap<K, V>
	) {}

	async obtain(key: K, create: boolean = true): Promise<V> {
		let item: V;

		const queryResult = this.map.get(key);
		if (queryResult) item = queryResult;
		else {
			item = await this.create(key);
			this.set(key, item);
			// 🕮 af58a51e-96f7-4c16-9509-d16211d116a5
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
	}
}

// 🕮 7f52e358-d011-44ac-9073-83738f5abb44
export interface HasBuildFactoryMethod<V> {
	build: (key: any) => V | Promise<V>
}

export class DictionaryRepository<C extends HasKeyProperty, V extends HasKeyProperty> {
	constructor(
		private Factory: HasBuildFactoryMethod<V>,
		private dictionary: IDictionary<V>
	) {}

	public async get(key: string): Promise<V | undefined> {
		return this.dictionary.get(key);
	}

	public async create(cfg?: C): Promise<V> {
		const value = await this.Factory.build(cfg);
		this.dictionary.add(value);
		return value;
	}

	public async obtain(cfg?: C): Promise<V>	{
		let value: V;

		if (cfg) {
			let queryResult: V | undefined = this.dictionary.get(cfg.key);
			if (queryResult) value = queryResult;
			else value = await this.create(cfg);
		}
		else value = await this.create(); // new sidenote

		return value;
	}
}

// TODO introduce separate classes MapPool & WeakMapPool 🕮 fea781b6-9af8-435c-9a7e-9f42f1affc14
// what to use as a key 🕮 9ec1095e-abfb-49f5-af6d-4a9fed205b6c
// 🕮 f82a72dc-baae-448e-8737-126f0dec5e2d
// @old 🕮 7e2a51d6-a376-4fa0-b1b9-09cbfb35d967
// 🕮 3d6ba811-d108-408c-9692-58671b29f68f
