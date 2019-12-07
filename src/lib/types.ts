import * as vscode from 'vscode';

export { EventEmitter } from 'events';
export { ICfg } from './cfg';
export { IEditorService } from './editorService';
export { IIdMaker } from './idMaker';
export { OApp } from './app';
export {
	OActions,
	default as Actions
} from './actions';

export interface OnOpenData {
	parentDocument: vscode.TextDocument
}

export {
	IDictionary,
	HasKeyProperty
} from './dictionary';

export {
	IDesignable,
	ODesigner,
	default as Designer,
} from './designer';

export {
	IAnchor,
	IAnchorable,
	OAnchorer,
	default as Anchorer,
} from './anchorer';

export {
	EditorUtils,
	MarkerUtils,
	OEditorUtils,
	OMarkerUtils,
} from './utils';

export {
	OFileSystem,
	default as FileSystem,
} from './fileSystem';

export {
	IFileStorage,
	IStorable,
	IStorageService,
	OFileStorage,
	OStorageService,
} from './storageService';

export {
	IScanData,
	OScanner,
	default as Scanner,
} from './scanner';

export {
	IStylable,
	IStylableDecoration,
	OStyler,
	default as Styler,
} from './styler';

export {
	default as Pruner,
	// Prunable
} from './pruner';

export {
	MapRepository,
	DictionaryRepository
} from './repository';

export {
	ReferenceContainer,
	ReferenceController
} from './referenceContainer';

export { default as SidenoteProcessor } from './sidenoteProcessor';

export {
	ISidenote,
	Inspector,
	OSidenoteFactory,
	SidenoteFactory,
	SidenoteFactoryOptions
} from './sidenote';

export {
	OEditorServiceController,
	default as EditorServiceController
} from './editorServiceController'

export {
	FileChangeTracker,
	IChangeData,
	IChangeTracker,
	OChangeTracker,
	OFileChangeTracker,
	// OVscodeChangeTracker,
	// VscodeChangeTracker,
} from './changeTracker';

export type Constructor<T = {}> = new (...args: any[]) => T;
export type AnyFunction<T = any> = (...input: any[]) => T
export type Mixin<T extends AnyFunction> = InstanceType<ReturnType<T>>
export type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

import {	Initializable, HasParentDocument } from './mixins';
import {
	HasKeyProperty,
	IDictionary,
	MapDictionary,
} from './dictionary';
import {
	DictionaryRepository,
	MapRepository,
} from './repository';
import Styler from './styler';
import { IScanData } from './scanner';
import { ISidenote, SidenoteFactoryOptions } from './sidenote';
// import ReferenceContainer from './referenceContainer';

export type SidenotesDictionary
	= MapDictionary<ISidenote> & Initializable & HasParentDocument

export type DocumentInitializableSidenotesRepository
	=	MapRepository<
		vscode.TextDocument,
		SidenotesDictionary
	>;

export type SidenotesStyler = Styler<ISidenote>;
export type SidenotesRepository
	= DictionaryRepository<SidenoteFactoryOptions, ISidenote>;
