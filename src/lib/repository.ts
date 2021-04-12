import { Dictionary, HasKeyProperty } from './dictionary';

export interface HasFactoryMethod<K, V> {
	create: (key: K) => V | Promise<V>;
}

/**
 * keeps the registry of the class instances,
 * created by object constructor with certain config, with config as key
 */
export class MapRepository<K extends object, V> {
	constructor(
		private Factory: HasFactoryMethod<K, V>,
		protected map: Map<K, V> | WeakMap<K, V>,
	) {}

	async obtain(key: K, create = true): Promise<V> {
		let item: V;

		const queryResult = this.map.get(key);
		if (queryResult) item = queryResult;
		else {
			item = await this.create(key);
			this.set(key, item);
			// 🕮 <cyberbiont> af58a51e-96f7-4c16-9509-d16211d116a5.md
		}

		return item;
	}

	/**
	 * adds instance to pool
	 * can have different implementations depending on used collection type
	 */
	set(key: K, item: V): V {
		this.map.set(key, item);
		return item;
	}

	protected create(key: K): V | Promise<V> {
		return this.Factory.create(key);
	}
}

// 🕮 <cyberbiont> 7f52e358-d011-44ac-9073-83738f5abb44.md
export interface HasBuildFactoryMethod<V> {
	build: (key: any) => V | Promise<V>;
}

export class DictionaryRepository<C, V extends HasKeyProperty> {
	constructor(
		private Factory: HasBuildFactoryMethod<V>,
		private dictionary: Dictionary<V>,
	) {}

	public async get(key: string): Promise<V | undefined> {
		return this.dictionary.get(key);
	}

	public async create(cfg?: C): Promise<V> {
		const value = await this.Factory.build(cfg);
		this.dictionary.add(value);
		return value;
	}

	public async obtain(keyedCfg: C & HasKeyProperty): Promise<V> {
		let value: V;

		const queryResult: V | undefined = this.dictionary.get(keyedCfg.key);
		if (queryResult) value = queryResult;
		else value = await this.create(keyedCfg);

		return value;
	}
}

// TODO introduce separate classes MapPool & WeakMapPool
// 🕮 <cyberbiont> 51d5cc18-0851-4abd-9d0a-c2899a6e94eb.md
//
// what to use as a key 🕮 <cyberbiont> 9ec1095e-abfb-49f5-af6d-4a9fed205b6c.md
// 🕮 <cyberbiont> f82a72dc-baae-448e-8737-126f0dec5e2d.md
// @old 🕮 <cyberbiont> 7e2a51d6-a376-4fa0-b1b9-09cbfb35d967.md
// 🕮 <cyberbiont> 3d6ba811-d108-408c-9692-58671b29f68f.md
