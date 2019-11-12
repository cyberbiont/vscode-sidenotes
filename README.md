# Sidenotes

## Why

As they say it, good code documents itself. But sometimes you need to make some extended notes regarding to particular part of your code, describing *why* your wrote it in such a way.  There also could be some ideas, detailed 'todos', issue analysis, conclusions, alternative code variants that you what to recall later or something alike. That big notes doesn't do well as simple comments, because they clutter your code. Also, such notes are often private in nature and are not intended to be seen for other people, who might happen to read / edit your code. With usual comments there's no usual way to help it, if your code is commited under VCS other than delete them altogether. So, the only solution is to 'externalize' your notes but keep them anchored to certain lines of your code so that you can easily peek/edit them at any time.

## How it works

Sidenotes content are stored in separate files, that are linked to the source document via the special comment in your code. 'Content' side and 'source document' side are linked via the common unique id that is read from anchor comment and is used to fetch associated content from content file.

> Tip: if collaborate on code with other people who aren't acquainted with sidenite comments, it can be a good idea to place some explanation/warning in your repository README so that your collaborators ignore these comments and won't delete them.
>
> If they do, though, you can restore it though VCS)

## Features

This extension allows you to annotate your code with external notes in inobtrusive way, that are stored separately from your document and are shown as in pop-ups on hover.  

- create, edit and delete sidenotes
- single-line or multiline comments are supported.
- tooltip updates as you are editing and saving your note;
- use can use vscode or external Markdown editor to edit your note (I recommend Typora);
- local worskspace 

### Multiple anchors

You can can have more than one anchor for content file, if you manually copy anchor comment inside or between documents.

One thing to keep in mind os that when you copy it, the copy's tooltip won't be updated until the next time you edit and save content file, re-scan all anchors with **scan** command (of course, also happens on vscode window reload).

## Supported extensions and languages

### source document

Sidenotes uses VSCode 'toggle comment' action to generate anchors, so it allows extension to be agnostic about what language the document you are annotating is written in. Therefore, you can annotate any file format that allows comments inside it, you can even annotate markdown sidenote itself with other sidenotes over it (there's gotchas in this case though).

Nevertheless, it is recommended to set some restrictions as to what kind of files can be annotated, to speed up  workspace-wide scan (whicj is performed on 'migrate' command, for example) by excluding certain extensions and directories. You can do it with glob (see  [Configuration](#Configuration-options))

### content files

By default, sidenotes expects your contents to be written in Markdown .md file is what is created on default when you add new sidenote. It's generally the best choice since it allows for simple editing and useful features such as code fences and syntax highliting.  For markdown files you can choose between default VScode editor and Typora.

If you want to display an image or some other type of html-supportedcontent, you can do so by wrapping it inside markdown file.

(TODO) The possibility to append other file types as content files is still appealing so that you can use Mind map files (for example .mmap) . Those contents won't be displayed in tooltip but you will be able to open associated file right from your document.

## Configuration options

### Anchor configuration

The extension uses certain Regex, based on unique id, to identify sidenote anchors in your source document and operate on them. 





Some configuration options, which define the structure of sidenote marker comment, may be respon 

### Multi-line (block) vs single-line comments

There is a possibilty to use either single-line comments or multi-line. Advantages of multi-line comments:

- straightforward selection of comment when marker hiding mode is engaged.

- ability to add sidenotes to the end of existing line of code.

- ability to have several comments (i.e. sidenotes) in one line, 

- ability to place comments in between your code lines. 

	Generally,  later two couldn't be considered good practice though, but if you need these features you can turn it on. 

The main con: in certain language syntaxes (for example, bash shellScript and Pug) multi-line comments are not available or doesn't work (generally, if editor.action.blockComment is not feasible for current language, syntax extension must fall back to editor.action.commentLine, in this case everything will work, but not all extensions do so) .We cannot provide fallback manually since executeCommand method does not return anything in this case so we cannot detect if block comment was toggled successfully. (the only way is to manually check if the current line length has changed)

All taken to all, using single-line comments is recommended.

Using single-line comments engages Vscode editor.action.commentLine, which effectively toggle comments on the *whole* line. So, you won't be able to add sidenote comment at the end of the line of code; you'll always need a dedicated line for your note. Besides, when 'folding' your marker, with single-line comments if can be problematic to properly select the whole comment (if you want to manually move in to some other place) since comment lacks ending characters that can indicate that selection is done correctly. One way to do this right is to use ctrl + L shortcut to select the whole line.

With single-line sidenotes, you can insert sidenotes inside block comments.

One thing to remeber is that once you switch comments type in settings, extension will still properly display other comment type sidenotes, but won't be able to properly delete them (since another cmmand is used to toggle comment off). So you will have to do it manually.

## Commands

> TIp:  one command is used to both create new note or open note in editor if called over existing sidenote anchor. 
>
> So you can use just one key binding for both. 

## Removing anchors during build

Tip: if your workflow involves some kind of biuld process, usually you'll want to delete sidenote comments during build process. 

If you do it on 'delete-all-comments' basis, using your minifier, for example, sidenote comments will be deleted together with all others 9since they are just simple comments). 

If you want to delete sidenote comments only you'll probably need Regexp to match them.

## Internalize and externalize content

For you convenience, when you create new sidenote, if you have some text selected, this text is removed from your document and placed inside sidenote, so you don't have to cut and paste it by hand.

On the other hand, if you want for some reason to place note contents back into your document, you can use **internalize** command, which will pit sidenotes content into your document in place of sidenote anchor. 

## Notes storage

By default, local directory inside your workspace folder is used to store notes. This lets you put your sidenotes under VCS control and commit them with the rest of your project (see VCS). However, because storage is workspace-bound,  this imposes some difficulties, one of them is the need to migrate your notes, if you want to move/copy your source document to another project/workspace.

Note that, in order for extension with file storage used to work, you need to have workspace open in VSCode. You cannot annotate documents that are outside of currently opened workspace, and, if you try, the extension will warn you. 

### Broken notes

*Broken* sidenote is defined as note, for which there's a leftover comment anchor in your source document, but  associated content file is missing. Extension automatically detects such notes and highlights them in red. When you are trying to open 'broken' sidenote There' s a couple of options opened for you. You can:

- re-create missing file
- delete broken comment
- look for missing sidenote file

In latter case you have to specify the directory when the sidenote is stored through 'open file' dialog. Make sure you select the directory that *immideately* has the file (nested files are not detected).

You also can use **'prune broken**' command, that will delete all broken sidenote anchors from current document.

### Empty sidenotes

*Empty* sidenote is defined as note, which content file is empty. Thay are automatically detected and highlighted. You can use **'prune empty' command, to delete these notes from current document together with content files.

### Migrating notes to new project (if file storage is used)

There will be times you'll want to move your files to another project. If you just do it without copying sidenotes directory with them, you will  left up with broken notes.  To manage this, **migrate** command exists. It scans all sidenotes in the current workspace and tries to find their content files in the directory that you specify. So, the proposed order of actions is this: you move/copy some annotated files into another project; you open this project as workspace in VScode; you run 'migrate' command and specify for lookup the former sidenotes folder from the project you have moved you files from. Extension checks sidenotes in your current workspace and copies needed content files to your new new project.

Then you can run **'cleanExtraneous'** command on your original project, to delete any content files left that are not used anymore.

### Other storage types (to be implemented)

Potentially, note's contents can be stored in centralized database or cloud service (such as Evernote). This has some benefits, (no need to migrate your files between projects) but makes sidenotes independent of VCS control (see VCS considerations).

## VCS considerations

It's up to you whether you want to commint your sidenotes to VCS or leave them off. Commiting has the benefit that any version you checkout with VCS will have sidenotes in accordance to this version state. It is useful if sidenote is coupled tightly with the code and you want to keep ot 'in sync' with annotated document.  Therefore, it is generally recommended. But, your notes won't be private that way (though you can something like node-cipher to encrrypt your notes folder TODO).

You can also exclude your sidenotes folder from VCS. In that case, you get notes privacy (they won't be commited and therefore shared with other collaborators through VCS), but you are at risk of getting 'extraneous'  or 'broken' notes if you check out the version when sidenote anchor comment still doesn't exist, or, otherwise, still exists though you could have deleted note and content file in one of later versions. However, if you really want the sidenote to be independent of VCS, it's the way to go.

If you want to exclude, it is recommended that you do it via global [git exclude](https://help.github.com/en/github/using-git/ignoring-files#explicit-repository-excludes) rather than .gitignore. 

## Gotchas

### Cut  / copy markers

When you manually move / copy your anchor markers, the decorations need to be updated to account for new marker position, until then they will be rendered at their old position. Sadly, VSCode currently has no way of detecting cut/copy/paste events, so the closest event you can get after moving your marker is *document save* event.  On this event extension will scan changes and update decorations if any markersa are involved. So, when you manually paste fragment of code that includes sidenote markers, you'll have to save you document to update view.

When you cut fragment of code that contains sidenote markers, 

## Credits

Though extension concept idea occured to me independently, some initial implementation ideas came from [marginalia](https://marketplace.visualstudio.com/publishers/jamesnorton)
by [James Norton](https://marketplace.visualstudio.com/publishers/jamesnorton)

<div>Icon made by <a href="https://www.flaticon.com/authors/kiranshastry" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>

## By me a beer:



Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

-----------------------------------------------------------------------------------------------------------





## 