import { TextDocument } from 'vscode';

import { Initializable, HasEditorReference } from './mixins';
import { MapDictionary } from './dictionary';
import { DictionaryRepository, MapRepository } from './repository';
import Decorator from './decorator';
import { Sidenote, SidenoteFactoryOptions } from './sidenote';

export { EventEmitter } from 'events';
export { Cfg } from './cfg';
export { EditorService as IEditorService } from './editorService';
export { IdProvider } from './idProvider';
export { OApp } from './app';
export { OActions, default as Actions } from './actions';

export { Dictionary, HasKeyProperty } from './dictionary';

export { Stylable, OStyler, default as Styler } from './styler';

export { Anchor, Anchorable, OAnchorer, default as Anchorer } from './anchorer';

export { EditorUtils, MarkerUtils, OEditorUtils, OMarkerUtils } from './utils';

export { OFileSystem, default as FileSystem } from './fileSystem';

export {
	FileStorage,
	Storable,
	StorageService,
	OFileStorage,
	OStorageService,
} from './storageService';

export { ScanData, OScanner, default as Scanner } from './scanner';

export {
	Decorable,
	DecorableDecoration,
	ODecorator,
	default as Decorator,
} from './decorator';

export {
	default as Pruner, // Prunable
} from './pruner';

export { MapRepository, DictionaryRepository } from './repository';

export { ReferenceContainer, ReferenceController } from './referenceContainer';

export { default as SidenoteProcessor } from './sidenoteProcessor';

export {
	Sidenote,
	Inspector,
	OSidenoteFactory,
	SidenoteFactory,
	SidenoteFactoryOptions,
} from './sidenote';

export {
	OEditorServiceController,
	default as EditorServiceController,
} from './editorServiceController';

export {
	FileChangeTracker,
	ChangeData,
	OChangeTracker,
	OFileChangeTracker, // OVscodeChangeTracker, // VscodeChangeTracker,
	ChangeTracker,
} from './changeTracker';

export type SidenotesDictionary = MapDictionary<Sidenote> &
	Initializable &
	HasEditorReference;

export type DocumentInitializableSidenotesRepository = MapRepository<
	TextDocument,
	SidenotesDictionary
>;

export type SidenotesDecorator = Decorator<Sidenote>;

export type SidenotesRepository = DictionaryRepository<
	SidenoteFactoryOptions,
	Sidenote
>;
