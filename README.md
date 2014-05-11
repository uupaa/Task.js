=========
Task.js
=========

![](https://travis-ci.org/uupaa/Task.js.png)

Counter based task executor.

# Document

- [Task.js wiki](https://github.com/uupaa/Task.js/wiki/Task) ([Slide](http://uupaa.github.io/Slide/slide/Task.js/index.html))
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebModule](https://github.com/uupaa/WebModule) ([Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html))

# How to use

## Node.js
```js
var Task = require("uupaa.task.js"); // [!] need ".js"
var task = new Task(2, function(err) {
    console.log("task done");
});
task.pass();
task.pass();
```

## Browser

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

## WebWorkers

```js
importScripts("lib/Task.js");

var task = new Task(2, function(err) {
    console.log("task done");
});
task.pass();
task.pass();
```

