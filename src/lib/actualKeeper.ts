export default class ActualKeeper<T extends object> {
	item: T;
	// добавлять или нет initial item? в классе пул например пул изначально пустой.
	// По идее решение, кто будет первым итемом, принимает контроллер,
	//  и изначальный итем не всегда может быть нужен. поэтому оставим без аргументов

	setActual(item: T): T {
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

// прокси 🕮 fc0c663f-2767-4a60-b4f6-cd4d08e5e5c4
// @old 🕮 16bd5d4a-48a2-445a-88f6-1e12a7634b70
