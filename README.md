# Task.js [![Build Status](https://travis-ci.org/uupaa/Task.js.svg)](https://travis-ci.org/uupaa/Task.js)

[![npm](https://nodei.co/npm/uupaa.task.js.svg?downloads=true&stars=true)](https://nodei.co/npm/uupaa.task.js/)

Counter based task executor.

- Task.js made of [WebModule](https://github.com/uupaa/WebModule).
- [Spec](https://github.com/uupaa/Task.js/wiki/Task)

## Browser and NW.js(node-webkit)

```js
<script src="<module-dir>/lib/WebModule.js"></script>
<script src="<module-dir>/lib/Task.js"></script>
<script>

// --- Task ---
var task = new WebModule.Task("MyTask", 2, function(error, buffer) {
        console.log(buffer.join(" ")); // "Hello Task.js"
        console.log(task.name + " " + task.state + "ed"); // "MyTask passed"
    });
task.buffer.push("Hello");
task.buffer.push("Task.js");
task.pass();
task.pass();

// --- Task and Junction ---
var task = new WebModule.Task("Junction", 2, function() { console.log("finished"); });
var sub1 = new WebModule.Task("SubTask1", 1, task);
var sub2 = new WebModule.Task("SubTask2", 1, task);

sub1.pass();
sub2.pass(); // -> "finished"


// --- TaskMap ---
var taskArg = ["red", "green", "blue", "black"];

WebModule.TaskMap("MyTaskMap", "a > 1000 > b + c > d", {
        a: function(task, arg, index) { task.buffer.push(arg[0]); task.pass(); },
        b: function(task, arg, index) { task.buffer.push(arg[1]); task.pass(); },
        c: function(task, arg, index) { task.buffer.push(arg[2]); task.pass(); },
        d: function(task, arg, index) { task.buffer.push(arg[3]); task.pass(); },
    }, function(error, buffer) {
        console.log(buffer.join()); // "red,green,blue,black"
    }, taskArg);


</script>
```

## WebWorkers

```js
importScripts("<module-dir>lib/WebModule.js");
importScripts("<module-dir>lib/Task.js");

```

## Node.js

```js
require("<module-dir>lib/WebModule.js");
require("<module-dir>lib/Task.js");

```

