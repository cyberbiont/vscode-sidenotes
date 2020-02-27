// StringKeyDictionary
export interface HasKeyProperty {
	key: string;
}

export interface Dictionary<T> {
	list: Map<string, T> | Set<T> | { [key: string]: T } | Array<T>;
	add(item: T): this;
	get(key: string): T | undefined;
	delete(key: string): this;
	each(cb: (T) => void): void;
	clear(): this;
	[Symbol.asyncIterator](cb): AsyncGenerator<T>;
}

// 🕮 <cyberbiont> 7387d8d0-b7ae-4b35-85ee-35e83d632586.md

// universal asyncGenerator 🕮 <cyberbiont> ae3f4100-1e07-464d-9dd8-5312ae6ca3bf.md

// если делать key property динамическим interface IDictionary<K, T extends K> то мы не можем жестко прописывать id в коде,
// имя св-ва должно передаваться в конструктор - не лучший вариант
