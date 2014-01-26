Task.js
=======

Task.js is counter based task executor.


# API Document

https://github.com/uupaa/Task.js/wiki/Task

# Install, Setup modules

```sh
$ brew install closure-compiler

$ git clone git@github.com:uupaa/Task.js.git
$ cd Task.js
$ npm install
```

# Minify

```sh
$ npm start

  or

$ node node_modules/uupaa.minify.js --keep --output ./lib/Task.min.js ./lib/Task.js
```

# Test

```sh
$ npm test
```

# for Node.js
```sh
$ node

    var Task = require("uupaa.task.js"); // [!] need ".js"
    var task = new Task(2, function(err, args) {
        console.log("task done");
    });
    task.pass();
    task.pass();
```

# for Browser

```html
<script src="lib/Task.js"></script>
<script>
var task = new Task(2, function(err, args) {
    console.log("task done");
});
task.pass();
task.pass();
</script>
```

