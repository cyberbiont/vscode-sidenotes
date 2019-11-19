// StringKeyDictionary

export interface IDictionary<T extends HasIdProperty> {
	list: Map<string, T> | Set<T> | { [key: string]: T } | Array<T>;
	add(item: T): this;
	get(id: string): T|undefined;
	delete(id: string): this;
	each(cb: (T) => void): void;
	clear(): this;
	[Symbol.asyncIterator](cb): AsyncGenerator<T>;
}
export interface HasIdProperty {
	id: string;
}

// 🕮 7387d8d0-b7ae-4b35-85ee-35e83d632586
// export default abstract class Dictionary<T> {

// }
// universal asyncGenerator 🕮 ae3f4100-1e07-464d-9dd8-5312ae6ca3bf

// если делать key property динамическим interface IDictionary<K, T extends K> то мы не можем жестко прописывать id в коде,
// имя св-ва должно передаваться в конструктор - не лучший вариант
