можно использовать в конфиге темплейт-форму
и генерировать маркер, заменяя в ней спецсимволы через regexp
// template: '%p %id'

а вообще для этого есть tagged templates https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
```js
if (this.cfg.anchor.marker.template) {
marker = this.cfg.anchor.marker.template
.replace('%p', this.cfg.anchor.marker.prefix)
.replace('%id', `${this.cfg.anchor.marker.salt}${id}`);
```

Вообще должно получиться что-то вроде
((?:\d|[a-z]){8}-(?:\d|[a-z]){4}-(?:\d|[a-z]){4}-(?:\d|[a-z]){4}-(?:\d|[a-z]){12})(\.md|\.mdown|\.markdown|\.mmap)?
