# Task.js [![Build Status](https://travis-ci.org/uupaa/Task.js.svg)](https://travis-ci.org/uupaa/Task.js)

[![npm](https://nodei.co/npm/uupaa.task.js.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.task.js/)



- Task.js made of [WebModule](https://github.com/uupaa/WebModule).
- [Spec](https://github.com/uupaa/Task.js/wiki/Task)

## Browser and NW.js(node-webkit)

```js
<script src="<your-install-dir>/lib/WebModule.js"></script>
<script src="<your-install-dir>/lib/Task.js"></script>
<script>
var task = new WebModule.Task(2, function(err) {
    console.log("task done");
});
task.pass();
task.pass();
</script>
```

## WebWorkers

```js
importScripts("<your-install-dir>lib/WebModule.js");
importScripts("<your-install-dir>lib/Task.js");

```

## Node.js

```js
require("<your-install-dir>lib/WebModule.js");
require("<your-install-dir>lib/Task.js");

```

