Task.js
=======

Task.js is counter based task executor.


# Document

https://github.com/uupaa/Task.js/wiki/Task

# Install dependency tools

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

    or

$ node node_modules/uupaa.minify.js --keep --output ./lib/Task.min.js ./lib/Task.js
```

# Test

```sh
$ npm run test

  or

$ npm test
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

