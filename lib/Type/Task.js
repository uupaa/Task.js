var Task = (function () {
    function Task(taskCount, callback, options) {
        if (typeof options === "undefined") { options = {}; }
        this._callback = null;
        var junction = callback instanceof Task;
        var tick = options["tick"] || null;
        var name = options["name"] || "anonymous";
        var buffer = options["buffer"] || (junction ? callback["buffer"]() : []);

        this._taskName = TaskTracer.createTaskName(name); // String: "task@1"
        this._tick = tick; // Function:
        this._buffer = buffer; // Array:
        this._callback = callback; // Function/Junction: finished callback.
        this._junction = junction; // Boolean: callback is Junction.
        this._taskCount = taskCount; // Number:
        this._missableCount = 0; // Integer: number of missable count.
        this._passedCount = 0; // Integer: Task#pass() called count.
        this._missedCount = 0; // Integer: Task#miss() called count.
        this._message = "Error: " + this._taskName;

        // String: new Error(message)
        this._state = ""; // String: current state. ""(progress), "pass", "miss", "exit"

        TaskTracer.add(this._taskName, this); // register task instance.

        if (!taskCount) {
            this.update("init");
        }
    }
    Task.prototype.push = function (value) {
        if (this._buffer) {
            this._buffer.push(value);
        }
        return this;
    };
    Task.prototype.set = function (key, value) {
        if (this._buffer) {
            this._buffer[key] = value;
        }
        return this;
    };
    Task.prototype.done = function (err) {
        var miss = err instanceof Error;

        if (miss) {
            this["message"](err["message"]);
        }
        return miss ? this["miss"]() : this["pass"]();
    };
    Task.prototype.pass = function () {
        if (this._tick) {
            this._tick(this._taskName); // tick callback(taskName)
        }
        return this.update("pass");
    };
    Task.prototype.miss = function () {
        if (this._tick) {
            this._tick(this._taskName); // tick callback(taskName)
        }
        return this.update("miss");
    };
    Task.prototype.exit = function () {
        return this.update("exit");
    };
    Task.prototype.update = function (method) {
        if (this._state === "") {
            switch (method) {
                case "init":
                    this._state = this.judgeState();
                    break;
                case "pass":
                    ++this._passedCount;
                    this._state = this.judgeState();
                    break;
                case "miss":
                    ++this._missedCount;
                    this._state = this.judgeState();
                    break;
                case "exit":
                    this._state = "exit";
            }

            // --- finishing ---
            if (this._state) {
                if (this._junction) {
                    // bubble up message and state.
                    this._callback["message"](this._message); // call Junction#message(...)
                    this._callback[this._state](); // call Junction#pass() or #miss() or #exit()
                } else {
                    // callback(err:Error/null, buffer:Array)
                    this._callback(this._state === "pass" ? null : new Error(this._message), this._buffer);
                }
                TaskTracer.remove(this._taskName);

                this._tick = null; // [!] GC
                this._buffer = null; // [!] GC
                this._callback = null; // [!] GC
            }
        }
        return this;
    };
    Task.prototype.judgeState = function () {
        return this._missedCount > this._missableCount ? "miss" : this._passedCount >= this._taskCount ? "pass" : "";
    };
    Task.prototype.buffer = function () {
        return this._buffer;
    };
    Task.prototype.extend = function (count) {
        this._taskCount += count;
        return this;
    };

    Task.prototype.message = function (msg) {
        if (msg instanceof Error) {
            this._message = msg["message"];
        } else {
            this._message = msg;
        }
        return this;
    };
    Task.prototype.missable = function (count) {
        this._missableCount += count;
        return this;
    };
    Task.prototype.isFinished = function () {
        return this._state !== "";
    };
    Task.dump = function (filter) {
        return TaskTracer.dump(filter);
    };
    Task.drop = function () {
        TaskTracer.clear();
    };
    Task.flatten = function (source) {
        return Array.prototype.concat.apply([], source);
    };
    Task.arraynize = function (source) {
        return Array.prototype.slice.call(source);
    };
    Task.objectize = function (source) {
        return Object.keys(source).reduce(function (result, key) {
            result[key] = source[key];
            return result;
        }, {});
    };

    Task.run = function (taskRoute, taskMap, callback, options) {
        if (typeof options === "undefined") { options = null; }
        options = options || {};

        var arg = options["arg"] || null;
        var name = options["name"] || "Task.run";
        var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"]() : []);

        var line = null;

        // parse("a > b + c > d") -> [  ["a"],   ["b", "c"],    ["d"]   ]
        //                               ~~~      ~~~  ~~~       ~~~      <--- 4 user tasks
        //                              ~~~~~    ~~~~~~~~~~     ~~~~~     <--- 3 user task groups
        //                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ <--- line (serialized task group)
        if (taskRoute) {
            line = JSON.parse("[[" + taskRoute.replace(/\+/g, ",").replace(/>/g, "],[").replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
        } else {
            line = JSON.parse('[["' + Object.keys(taskMap).join('"],["') + '"]]');
        }

        var junction = new Task(line.length, callback, { "name": name, "buffer": buffer });
        var param = {
            junction: junction,
            line: line,
            index: 0,
            taskMap: taskMap,
            arg: arg
        };

        Task.nextGroup(param);
        return junction;
    };
    Task.nextGroup = function (param) {
        if (!param.junction["isFinished"]()) {
            // --- create task group ---
            var group = param.line[param.index++];

            if (group.length === 1) {
                // --- single task ---
                Task.callUserTask(param, group[0], param.junction, true);
            } else {
                // --- parallel task ---
                var gjunc = new Task(group.length, function (err) {
                    param.junction["done"](err);
                    if (!err) {
                        Task.nextGroup(param); // recursive call
                    }
                }, { "buffer": param.junction["buffer"]() });

                group.forEach(function (taskName) {
                    Task.callUserTask(param, taskName, gjunc, false);
                });
            }
        }
    };
    Task.callUserTask = function (param, taskName, junc, singleTask) {
        var task = new Task(1, junc, { "name": taskName });

        if (taskName in param.taskMap) {
            try  {
                param.taskMap[taskName](task, param.arg); // call userTask(task, arg) { ... }
                if (singleTask) {
                    Task.nextGroup(param); // recursive call
                }
            } catch (err) {
                task["done"](err);
            }
        } else if (/^\d+$/.test(taskName)) {
            setTimeout(function () {
                task["pass"]();
                if (singleTask) {
                    Task.nextGroup(param); // recursive call
                }
            }, parseInt(taskName, 10) | 0);
        }
    };
    Task.name = "Task";
    Task.repository = "https://github.com/uupaa/Task.js/";
    return Task;
})();
exports.Task = Task;

var TaskTracer = (function () {
    function TaskTracer() {
    }
    TaskTracer.createTaskName = function (baseName) {
        return baseName + "@" + (++TaskTracer._taskCounter);
    };
    TaskTracer.add = function (taskName, instance) {
        TaskTracer._taskInstances[taskName] = instance;
    };
    TaskTracer.remove = function (taskName) {
        delete TaskTracer._taskInstances[taskName];
    };
    TaskTracer.dump = function (filter) {
        var rv = {};

        for (var taskName in TaskTracer._taskInstances) {
            if (!filter || filter === taskName.split("@")[0]) {
                var instance = TaskTracer._taskInstances[taskName];

                rv[taskName] = {
                    "junction": instance._junction,
                    "taskCount": instance._taskCount,
                    "missableCount": instance._missableCount,
                    "passedCount": instance._passedCount,
                    "missedCount": instance._missedCount,
                    "state": instance._state
                };
            }
        }
        return JSON.parse(JSON.stringify(rv));
    };
    TaskTracer.clear = function () {
        TaskTracer._taskInstances = {}; // [!] GC
        TaskTracer._taskCounter = 0; // [!] reset counter
    };
    TaskTracer._taskInstances = {};
    TaskTracer._taskCounter = 0;
    return TaskTracer;
})();
