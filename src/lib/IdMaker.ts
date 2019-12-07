import { v4 as uuid } from 'uuid';

export interface IIdMaker {
	makeId(): string
	ID_REGEX_STRING: string
	ID_REGEX: RegExp
	symbolsCount: number

}
export default class UuidMaker implements IIdMaker {
	makeId(): string {
		return uuid();
	}
	ID_REGEX_STRING = '((?:\\d|[a-z]){8}-(?:\\d|[a-z]){4}-(?:\\d|[a-z]){4}-(?:\\d|[a-z]){4}-(?:\\d|[a-z]){12})'
	ID_REGEX = new RegExp(this.ID_REGEX_STRING, 'g')
	symbolsCount = 36
}
