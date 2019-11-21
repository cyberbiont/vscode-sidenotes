
import {
	IDictionary,
	HasIdProperty,
} from "./types";

// 🕮 7f52e358-d011-44ac-9073-83738f5abb44

export interface HasBuildFactoryMethod<V> {
	build: (key: any) => V | Promise<V>
}

export default class DictionaryRepository<C extends HasIdProperty, V extends HasIdProperty> {
	constructor(
		private Factory: HasBuildFactoryMethod<V>,
		private dictionary: IDictionary<V>
	) {}

	public async get(id: string): Promise<V | undefined> {
		return this.dictionary.get(id);
	}

	public async create(cfg?: C): Promise<V> {
		const value = await this.Factory.build(cfg);
		this.dictionary.add(value);
		return value;
	}

	public async obtain(cfg?: C): Promise<V>	{
		let value: V;

		if (cfg) {
			let queryResult: V | undefined = this.dictionary.get(cfg.id);
			if (queryResult) value = queryResult;
			else value = await this.create(cfg);
		} else value = await this.create(); // new sidenote

		return value;
	}
}
