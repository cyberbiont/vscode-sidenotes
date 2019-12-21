import { TextDocument } from 'vscode';

import { Initializable, HasEditorReference } from './mixins';
import { MapDictionary } from './dictionary';
import { DictionaryRepository, MapRepository } from './repository';
import Decorator from './decorator';
import { Sidenote, SidenoteFactoryOptions } from './sidenote';

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
