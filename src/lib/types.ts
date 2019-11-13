export { IIdMaker } from './idMaker';

export {
	IDictionary,
	IHasIdProperty
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
	ActiveEditorUtils,
	MarkerUtils,
	OActiveEditorUtils,
	OMarkerUtils,
} from './utils';

export {
	// IFileStorageCfg
	IFileStorage,
	IStorable,
	IStorageService,
	OFileStorage,
	OStorageService,
} from './storageService';

export {
	IScanData,
	default as Scanner,
} from './scanner';

export {
	IStylable,
	IStylableDecorations,
	OStyler,
	default as Styler,
} from './styler';

export {
	default as Pruner,
	// Prunable
} from './pruner';

export { default as Pool } from './pool';

export { default as SidenoteProcessor } from './sidenoteProcessor';

export {
	ISidenote,
	Inspector,
	SidenoteFactory
} from './sidenote';

export {
	FileChangeTracker,
	IChangeData,
	IChangeTracker,
	OChangeTracker,
	OFileChangeTracker,
	OVscodeChangeTracker,
	VscodeChangeTracker,
} from './changeTracker';

export { IEditorService } from './editorService';
export { ICfg } from './cfg'

export { EventEmitter } from 'events';
