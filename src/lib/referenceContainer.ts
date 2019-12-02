import { Constructor } from './types';

export class ReferenceContainer<T extends object> {
	item: T;

	load(item: T): T {
		return this.item = item;
	}

	getProxy(): T {
		const proxy = new Proxy(this, {
			get(target, prop) {
				return Reflect.get(target.item, prop);
			},
			set(target, prop, value) {
				return Reflect.set(target.item, prop, value);
			}
		}) as unknown as T;
		return proxy;
	}
}

export class ReferenceController<T extends object, K = string> {
	private container: ReferenceContainer<T>;
	public key: K;

	constructor(
		ReferenceContainer: Constructor<ReferenceContainer<any>>,
		public getInstance: (key?: K) => T
	) {
		this.container = new ReferenceContainer();
	}

	getReference(): T {
		return this.container.getProxy();
	}

	async update(key?: K): Promise<this> {
		const instance = await this.getInstance(key);
		this.container.load(instance);
		if (key) this.key = key;
		return this;
	}
}

// 🕮 5ce06348-1a09-4212-8738-44547ddd8d45
// Proxy 🕮 fc0c663f-2767-4a60-b4f6-cd4d08e5e5c4
// @old 🕮 16bd5d4a-48a2-445a-88f6-1e12a7634b70
