=========
Task.js
=========

![](https://travis-ci.org/uupaa/Task.js.png)

Counter based task executor.

# Document

- [WebModule](https://github.com/uupaa/WebModule) ([Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html))
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [Task.js wiki](https://github.com/uupaa/Task.js/wiki/Task)

# How to use

# for Node.js
```sh
$ node

var Task = require("uupaa.task.js"); // [!] need ".js"
var task = new Task(2, function(err) {
    console.log("task done");
});
task.pass();
task.pass();
```

# for Browser

```html
<script src="lib/Task.js"></script>
<script>
var task = new Task(2, function(err) {
    console.log("task done");
});
task.pass();
task.pass();
</script>
```

