export default class ActualKeeper<T extends object> {
	item: T;

	set(item: T): T {
		return this.item = item;
	}

	get(): T {
		const proxy = new Proxy(this, {
			get(target, prop) {
				return Reflect.get(target.item, prop);
			}
		}) as unknown as T;
		return proxy;
	}
}

// 🕮 5ce06348-1a09-4212-8738-44547ddd8d45
// прокси 🕮 fc0c663f-2767-4a60-b4f6-cd4d08e5e5c4
// @old 🕮 16bd5d4a-48a2-445a-88f6-1e12a7634b70
