Task.js
=======

Counter based task executor.


# Document

- http://uupaa.github.io/Slide/slide/Task.js/index.html
- https://github.com/uupaa/Task.js/wiki/Task

and

- https://github.com/uupaa/WebModule and [slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
- https://github.com/uupaa/Help.js and [slide](http://uupaa.github.io/Slide/slide/Help.js/index.html)

# Install development dependency tools

```sh
$ brew install closure-compiler
$ brew install node
$ npm install -g plato
```

# Clone Repository and Install

```sh
$ git clone git@github.com:uupaa/Task.js.git
$ cd Task.js
$ npm install
```

# Build and Minify

```sh
$ npm run build
```

# Test

```sh
$ npm run test
```

# Lint

```sh
$ npm run lint
```

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

