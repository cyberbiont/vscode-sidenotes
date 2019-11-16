можно использовать в конфиге темплейт-форму
и генерировать маркер, заменяя в ней спецсимволы через regexp
// template: '%p %id'

```js
if (this.cfg.anchor.marker.template) {
marker = this.cfg.anchor.marker.template
.replace('%p', this.cfg.anchor.marker.prefix)
.replace('%id', `${this.cfg.anchor.marker.salt}${id}`);
```
