# Sidenotes

Externalize your comments.

## Features

This extension provides you an inobtrusive way to annotate your code with external notes, that are stored separately from your document and are shown in pop-ups on hover.

- create, edit and delete sidenotes;
- tooltips update as you are editing and saving your note;
- use can open your note for editing in vscode or external Markdown editor;
- multiple anchors for one note are possible.
- automatically move selected fragment to sidenote (see [Externalizing content](#Externalizing content));
- you are free to keep your notes under VCS along with the code they annotate or exclude them (see [VCS considerations](#VCS considerations));
- notes are workspace/project ased but you can migrate them to new project (see [Housekeeping](#VCS considerations));

Many times we all heard a saying that good code documents itself. To a certain extent it's true, but sometimes you need to make some extended notes regarding to particular part of your code, that it just can't say for itself. A common case is describing *why* your wrote your code in such a way to remember later and don't make the same mistake twice.  There also could be some ideas, detailed 'todos', issue analysis, conclusions, alternative code variants or something alike that you what to recall later when revising your code . How should you manage this information?

Comments are usually the poor tool for this job. Too many / too large comments clutter your code and make it hard to concentrate on the code itself. But delete them - and you may miss some important point later. Unfortunately, VSCode has no way to hide/fold all comments.

The other consideration is privacy. There may be notes that are private in nature and are not intended to be seen for other people, who might happen to read / edit your code. With usual comments there's no usual way to help it, if your code is commited under VCS other than delete them altogether. So, the only solution is to 'externalize' your notes but keep them anchored to certain lines of your code so that you can easily peek/edit them at any time.

## How it works

Sidenotes content are stored in separate files ('*content files*'), that are linked to the source document via the special comment in your code(*anchor* comments). 'Content' side and 'source' document side are linked via the common unique id that is read from anchor comment and is used to fetch associated content from content file.

## Supported extensions and languages

### source document

The extension uses VSCode 'toggle comment' action to generate anchors, so it allows extension to be agnostic about what language the document you are annotating is written in. Therefore, you can annotate any file format that allows comments inside it, you can even technically annotate markdown sidenote itself with other sidenotes over it (there's gotchas involved in this case though).

Nevertheless, it is recommended to set some restrictions as to what kind of files can be annotated, to speed up workspace-wide scan (which ihas to be performed on 'migrate' command, for example) by excluding certain extensions and directories. You can do it with appropriate glob (see [Configuration](#Configuration-options)).

### content files

The extension expects your contents to be written in Markdown, so `.md` file is what is created on default when you add new sidenote. It's generally the best choice since it allows for simple editing and useful features such as code fences and syntax highliting.  For markdown files you can choose between default VScode editor and Typora.

If you want to display an image or some other type of html-supported content, you can do so by wrapping it inside markdown file.

## Commands

#### Annotate

The main command that is used for both creating new and opening existing sidenotes (depending on whether you use it on the line that already contains sidenote), so you can use just one key binding for both. If called over existing sidenote anchor, it opens associated content file for editing. If resource is not found, it displays a dialog window, where you can choose from several options:

- *delete sidenote* - deletes orphaned anchor comment
- *re-create* - creates new file for this anchor comment keeping id;
- *look-up* - opens file browser for you to select directory where file is contained (See [Migrating notes](#Migrating notes to new project (if file storage is used))).

#### Delete

Deletes both content resource and all associated anchors from current document. (See [Deleting sidenotes](#Deleting sidenotes)).

#### Refresh

Resets decorations for document, rescans and rebuilds them (in case If something has gone awry).

#### <!--Internalize-->

<!--Writes sidenote's content into document inside a commented lined and deletes sidenote. Useful for short unformatted notes and reminders. Can be considered a reverse to initialContent feature.-->

#### Prune broken

Command is used to delete all broken notes in current document.

#### Prune empty

Command is used to delete all broken notes in current document.

#### Extraneous

Searches for extraneous (orphan) content records in your storage and prompts you to delete them.

#### Migrate

Scans your current workspace for anchors and performs global lookup for missing content files. (See [migrating notes](#Migrating notes to new project (if file storage is used)))

#### Toggle ids

Switch hiding ids.

#### Toggle markers (TODO)

Toggles visibility of markers.

## Configuration options

### <!--Global options-->

#### <!--behaviour.autostart-->

<!--By default, extension automatically starts and activates markers in current document. If you turn this off, you'll have to run 'display' or 'annotate' command for extension to initialize.-->

### File system

#### storage.defaultEditor

The default edit that will be used to open your sidenotes for editing on `annotate` command. The available options are:

##### vscode

By default, sidenote will open in vscode's rightmost panel for editing.

##### system default (TODO)

The sidenote will open in whatever program is specified in your OS as default for the content file extension.
Using this option together with contentFileExtension option, you can for example you .txt files and open them in notepad (whatever may be the reason to do so). (надо разрешить в customExtension другие опции, кроме markdown файлов

<!-- Is not guaranteed to work on all systems at the moment. -->

Uses ['Open'](https://www.npmjs.com/package/opn) npm module for cross-platform compatibility.

##### typora

To use this option, you must have Typora installed in your system and 'typora' executable in the system PATH.

Typora is a special case due to some problems that don't allow to open it from Vscode as system default editor (at least on Windows).  So I wrote special extension to let you do this.
Generally, I recommend you use to leave vscode as default and resort to Typora when you need extensive editing, using open-in-typora extension.

#### storage.files.notesSubfolder

if the File Storage is used (which is by default) defines a subfolder inside your workspace, where sidenotes content files will be stored.

#### storage.files.contentFileExtension

defines file extension. By default it is '.md'. You can change it to '.markdown' or '.mdown'
Be aware that is you change extension setting after you crated some files, the sidenotes made with another extension all be shown up as 'orphaned'.

#### <!--sources.fileFormatsAllowedForTransfer (TODO)-->

<!--File extensions which support initial content placement feature (see)-->

#### <!--sources.excludeFromAnnotation-->

<!--A glob expression(link to glob) to exclude files and directories from scanning during Migrate command.-->

### Anchor configuration

The extension uses certain Regex, based on unique id, to identify sidenote anchors in your source document and operate on them.

#### <!--anchor.comments.cleanWholeLine-->

<!--(for single-line comments only). when this is checked, when deleting the sidenote, extension will clean the whole line including all asoociated text that you might have add to it.-->

#### <!--anchor.comments.affectNewlineSymbols (TODO)-->

<!--when adding a sidenote, new line will be automatically created for this purpose and deleted when deleting sidenote. This has some performance penalty. When this is off, you can call 'annotate' command on existing line and created comment will keep all the text already present on this line as prefix.-->

### Design

#### <!--anchor.marker.salt-->

<!--In addition to Uuid extension prepends it with Unicode symbol to disambiguate with other uuids that might happen in your code.-->

<!--By default it is  🕮 with whitespace before UUID. Therefore, you can you this symbol to target your sidenote comments with other styling extensions (see about [styling](#Prefixing and additional styling sidenotes : tips)). You can change this symbol, however, since it is included in regexp search, all comments that use the former symbol will stop to be identified by extension. To fix that, yo can manually run RegExp search and replace on your workspace to transform all your anchors to new format, however, it is not recommended .-->

#### anchor.marker.prefix

Adds the string that you specify here at the beginning of the inserted marker and removes it on sidenote deletion. Note that in constrast to 'before' setting this is the actual text that will be added, i.e. it is a part of the document and it will be visible when extension is deactivated. Useful if you want to hook your sidenotes to some coment-styling extension (see [styling](#Prefixing and additional styling sidenotes : tips)).

#### anchor.design.before

adds the string that you specify as a pseudo-element at the start of all of your markers.

#### anchor.design.after

Is shown at the end of the marker, and stays in place of it when the marker is compressed. By default it is 🕮, you can specify your own string or Unicode symbol here. Changes to visualize sidenote's state.

#### anchor.design.gutterIcon

Whether to show icons in gutter. If you don't like them or use other extension which shows gutter icons (see [styling](#Prefixing and additional styling your sidenotes)) you can turn this off.

#### anchor.design.ruler

Whether sidenotes will be shown in Overview ruler

#### anchor.design.hideMarkers

Effectively hides the uuid part of markers to reduce cluttering by applying a negative letter-spacing to marker decoration.  See [Hiding ids](#Hiding ids)

#### sidenotes.colorIndication

Array of strings. Defines what part of comment anchor will change color, indicating sidenote status. Available values are "after", "text", "ruler".

### <!--Multi-line (block) vs single-line comments-->

<!--There is a possibilty to use either single-line comments or multi-line. Advantages of multi-line comments:-->

- <!--straightforward selection of comment when marker hiding mode is engaged.-->

- <!--ability to add sidenotes to the end of existing line of code.-->

- <!--ability to have several comments (i.e. sidenotes) in one line,-->

- <!--ability to place comments in between your code lines.-->

	<!--Generally,  later two couldn't be considered good practice though, but if you need these features you can turn it on.-->

<!--The main con: in certain language syntaxes (for example, bash shellScript and Pug) multi-line comments are not available or doesn't work (generally, if editor.action.blockComment is not feasible for current language, syntax extension must fall back to editor.action.commentLine, in this case everything will work, but not all extensions do so) .We cannot provide fallback manually since executeCommand method does not return anything in this case so we cannot detect if block comment was toggled successfully. (the only way is to manually check if the current line length has changed)-->

<!--All taken to all, using single-line comments is recommended.-->

<!--Using single-line comments engages Vscode editor.action.commentLine, which effectively toggle comments on the *whole* line. So, you won't be able to add sidenote comment at the end of the line of code; you'll always need a dedicated line for your note. Besides, when 'folding' your marker, with single-line comments if can be problematic to properly select the whole comment (if you want to manually move in to some other place) since comment lacks ending characters that can indicate that selection is done correctly. One way to do this right is to use ctrl + L shortcut to select the whole line.-->

<!--With single-line sidenotes, you can insert sidenotes inside block comments.-->

<!--One thing to remeber is that once you switch comments type in settings, extension will still properly display other comment type sidenotes, but won't be able to properly delete them (since another cmmand is used to toggle comment off). So you will have to do it manually.-->

<!--In some languages (html, css, php) there's only 'block' comments available, so sidenote comments will be having an ending tag.-->

## Deleting sidenotes

It was deliberately chosen that if you use `sidenotes.delete` command, it deletes both content file and all associated anchors in current document without asking confirmation. There mau be times that you don't want to delete the content file (for example, you have another associated anchors in other documents) nd want to delete only anchor, but in this case you should manually delete it (easily done with Ctrl-Shift-K shortcut - delete line action).

In case you regret your decision, you can restore your content file from recycle bin or via VCS (if your sidenotes are under VCS control).

## Hiding ids

Uuids in anchor comments are necessary, but not the most pleasant thing to see in your code. By default extension hides them (in fact, compresses) so they are not visible and 'after' pseudoelement is displayed in place of anchor. This has a one downside, that is precise selecting marker by dragging the mouse becomes a non-trivial task. To overcome this,  use Ctrl-C - Ctrl-X commands to copy / cut the whole line containing anchor marker, since in VSCode you don't have to select the whole line in order to cut/copy/delete it.

## Externalizing content

For you convenience, when you create new sidenote, if you have some text selected, this text is removed from your document and placed inside sidenote, so you don't have to cut and paste it by hand.

<!--On the other hand, if you want for some reason to place note contents back into your document, you can use **internalize** command, which will pit sidenotes content into your document in place of sidenote anchor.-->

## Prefixing and additional styling your sidenotes

### "After" option

You can change the unicode symbol that is displayed by defualt to any other allowed symbol/text that you like.

### "Before" option

'Before' option display some text you specify before each sidenote in pseudo-element, so it's plainly decorative and you cannot hook-up any external extensions on it.

### Manual commenting

You can manually type in some short charasteristic description for your note (before or after it). It will look like this:

`// a short description: 🕮`

This can be used to make certain sidenotes stand out, if your prefix sidenote with !, ? etc. special characters and use one of comment-styling vscode extensions.  I recommend [Better comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments) or [Deco comments](https://marketplace.visualstudio.com/items?itemName=GuillaumeIsabelle.gixdeko-comments) for this purpose.

### Prefixing all sidenotes

You can use `sidenotes.prefix` option to prepend some text to all of your sidenotes. It's essentially the same as above, but automatically made for all your sidenotes. This option can be useful in conjunction with [Comment anchors](https://marketplace.visualstudio.com/items?itemName=ExodiusStudios.comment-anchors)  extension to make all your sidenotes show up in comment anchors' navigation pane, if you set your prefix to one of predefined comment anchor types, such as 'NOTE '.

You can also do this, making use of integrated unicode uuid prefix.  To do so, you'll have to create create custom anchor type in comment anchor settings.json like this:

```json
"commentAnchors.tags.list": [
    {
        "tag": "🕮",
        "iconColor": "blurple",
        "highlightColor": "#896afc",
        "scope": "file"
    }
]
```

## Multiple anchors for the same sidenote

You can can have more than one anchor for content file, if you manually copy anchor comment.

Repeating anchors in the same document will be highlighted with colored dotted border for easier discerning (its color is randomly generated for each group).

When you delete sidenote with `delete` command, all repetitive anchors in current document with the same ID are also deleted.

Note that if there are other relevant anchors left wherever in your project, they will receive 'broken' status as their content file will be deleted. You can then deal with them as you like (see [Housekeeping](#Managing your sidenotes / Housekeeping)).

## Managing your sidenotes / Housekeeping

By default, local directory inside your workspace folder is used to store notes. This lets you put your sidenotes under VCS control and commit them with the rest of your project (see VCS). However, because storage is workspace-bound,  this imposes some difficulties, one of them is the need to migrate your notes, if you want to move/copy your source document to another project/workspace.

Note that, in order for extension with file storage used to work, you need to have workspace open in VSCode. You cannot annotate documents that are outside of currently opened workspace, and, if you try, the extension will warn you.

### Broken notes

*Broken* sidenote is defined as note, for which there's a leftover comment anchor in your source document, but  associated content file is missing. Extension automatically detects such notes and highlights them in red. When you are trying to open 'broken' sidenote There' s a couple of options opened for you. You can:

- re-create missing file
- delete broken comment
- look for missing sidenote file

In latter case you have to specify the directory when the sidenote is stored through 'open file' dialog. Make sure you select the directory that *immideately* has the file (nested files are not detected).

You also can use `prune broken` command, that will delete all broken sidenote anchors from current document.

### Empty sidenotes

*Empty* sidenote is defined as note, which content file is empty. Thay are automatically detected and highlighted. You can use `prune empty` command, to delete these notes from current document together with content files.

### Migrating notes to new project

There will be times you'll want to move your files to another project. If you just do it without copying sidenotes directory with them, you will  left up with broken notes.  To manage this, **migrate** command exists. It scans all sidenotes in the current workspace and tries to find their content files in the directory that you specify. So, the proposed order of actions is this:

- you move/copy some annotated files into another project;
- you open this project as workspace in VScode;
- you run 'migrate' command and specify for lookup the former sidenotes folder from the project you have moved you files from.
- extension checks sidenotes in your current workspace and copies needed content files to your new new project.
- then you can run `cleanExtraneous` command on your original project in order to delete any content files left that are not used anymore.

### Other storage types (to be implemented)

Potentially, note's contents can be stored in centralized database or cloud service (such as Evernote). This has some benefits, (no need to migrate your files between projects) but makes sidenotes independent of VCS control (see VCS considerations).

## VCS considerations

It's up to you whether you want to commit your sidenotes to VCS or leave them off. Commiting has the benefit that any repositiory version you checkout with VCS will have sidenotes in accordance to this version state. It is useful if sidenote is coupled tightly with the code and you want to keep ot 'in sync' with annotated document.  Therefore, it is generally recommended. But, your notes won't be private that way (one way to help it is to use something like [node-cipher](https://www.npmjs.com/package/node-cipher) to encrypt your notes folder).

You can also exclude your sidenotes folder from VCS. In that case, you get notes privacy (they won't be commited and therefore shared with other collaborators through VCS), but you are at risk of getting 'extraneous'  or 'broken' notes if you check out the version where sidenote anchor still doesn't exist, or, otherwise, still exists though you could have deleted note and content file in one of later versions. However, if you really want the sidenote to be independent of VCS, it's the way to go.

If you want to exclude, it is recommended that you do it via global [git exclude](https://help.github.com/en/github/using-git/ignoring-files#explicit-repository-excludes) rather than .gitignore.

## Removing anchors during build

Tip: if your workflow involves some kind of biuld process, usually you'll want to delete sidenote comments during build process.

If you do it on 'delete-all-comments' basis, using your minifier, for example, sidenote comments will be deleted together with all others (since they are just simple comments).

If you want to delete sidenote comments only you'll probably need Regexp to match them.

## Requirements

For 'typora' setting to work, you need Typora installed on your system and typora.exe in your system PATH.

## Known Issues  /  Gotchas

### Anchor comments will be present  in your code.

The only way all this can work is comment anchors must be persisted in your code, there's no help for it.

It's not really big problem, since Sidenotes are intended to use in development only and if your code undergoes some sort of build process or minification, when comments are usually deleted from your code (see [Removing anchors during build](#Removing anchors during build)).

But, if you collaborate on code with other people who aren't acquainted with sidenite comments, in order to not scare them too much with uuids in tyou code, it can be a good idea to place some explanation/warning in your repository README so that your collaborators ignore these comments and won't delete them (but if they do, though, you can restore it via VCS).

### Manually moving / cutting  / copying markers

When you manually move / copy / paste your anchor markers, the decorations need to be updated to account for the new marker position, until then they will be rendered at their old position. Sadly, VSCode currently has no way of detecting cut/copy/paste events, so the closest event you can get after moving your marker is the document change event, which happens after you paste your text.  On this event extension will scan changes and update decorations if any markers are involved. So, when you cut fragment of code that contains sidenote markers, the decorations will stay in their old place until you paste your code / switch editors.

Obviously, if you want to move your sidenote to other file, that uses different comment syntax, you'll have to manually edit comment to match. (untoggle comment before moving/toggle back after);

Since sidenotes scanning is done lazily, you have to make editor active to initialize it. This can be seen on application start if you have several editors visible simoultaneosly in different panes.

## Credits

Though extension concept idea occured to me independently, some initial implementation ideas came from [marginalia](https://marketplace.visualstudio.com/publishers/jamesnorton)
by [James Norton](https://marketplace.visualstudio.com/publishers/jamesnorton)

<div>Icon made by <a href="https://www.flaticon.com/authors/kiranshastry" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>

## By me a beer:
