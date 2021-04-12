export class ReferenceContainer<T extends object> {
	item!: T;

	load(item: T): T {
		this.item = item;
		return item;
	}

	getProxy(): T {
		const proxy = (new Proxy(this, {
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			get(target, prop) {
				return Reflect.get(target.item, prop);
			},
			// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
			set(target, prop, value) {
				return Reflect.set(target.item, prop, value);
			},
		}) as unknown) as T;
		return proxy;
	}
}

export class ReferenceController<T extends object, K = string> {
	private container: ReferenceContainer<T>;

	public key?: K;

	// если написать просто public getItem: (key?: K) => Promise<T>
	// то при передаче аргумента типа async (key: TextDocument) => poolRepository.obtain(key)
	// получаем ошибку Argument of type '(key: TextDocument) => Promise<TextEditor>' is not assignable to parameter of type '(key?: TextDocument | undefined) => Promise<TextEditor>
	// очевидно нужна перегрузка

	constructor(
		ReferenceContainer: Constructor<ReferenceContainer<T>>,
		public getItem: ((key: K) => Promise<T>) | (() => Promise<T>),
	) {
		this.container = new ReferenceContainer();
		this.getItem = getItem;
	}

	getReference(): T {
		return this.container.getProxy();
	}

	async update(key?: K): Promise<this> {
		function functionNeedsNoArguments(fn: Function): fn is () => Promise<T> {
			return fn.length === 0;
		}
		let instance: T;
		if (functionNeedsNoArguments(this.getItem)) instance = await this.getItem();
		else if (key) instance = await this.getItem(key);
		else throw new Error('no key passed to ReferenceController');

		//! TODO вообще это не совсем, лучше создать отдельный подкласс KeyedReferenceController,
		// который будет иметь св-во key и принимать функцию getIten с обязательным аргументом key
		if (key) this.key = key;
		this.container.load(instance);
		return this;
	}
}

// TODO use Memento? https://code.visualstudio.com/api/references/vscode-api#Memento
// 🕮 <cyberbiont> 5ce06348-1a09-4212-8738-44547ddd8d45.md
// Proxy 🕮 <cyberbiont> fc0c663f-2767-4a60-b4f6-cd4d08e5e5c4.md
// @old 🕮 <cyberbiont> 16bd5d4a-48a2-445a-88f6-1e12a7634b70.md
