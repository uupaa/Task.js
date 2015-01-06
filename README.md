# Task.js [![Build Status](https://travis-ci.org/uupaa/Task.js.png)](http://travis-ci.org/uupaa/Task.js)

[![npm](https://nodei.co/npm/uupaa.task.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.task.js/)

Counter based task executor.

## Document

- [Task.js wiki](https://github.com/uupaa/Task.js/wiki/Task) ([Slide](http://uupaa.github.io/Slide/slide/Task.js/index.html))
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)


## How to use

### Browser

```js
<script src="lib/Task.js"></script>
<script>
var task = new Task(2, function(err) {
    console.log("task done");
});
task.pass();
task.pass();
</script>
```

### Node.js
```js
require("lib/Task.js");
```


### WebWorkers

```js
importScripts("lib/Task.js");
```

### node-webkit

```js
require("lib/Task.js");
```

