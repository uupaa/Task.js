(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("Task", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------

// --- class / interfaces ----------------------------------
function Task(taskCount, // @arg Integer = 0          - user task count
              callback,  // @arg Function|Task = null - callback(error:Error|null, buffer:Array):void
              options) { // @arg Object = {}          - { tick, name, buffer }
                         // @options.tick Function = null - tick(taskName:String):void
                         // @options.name String   = ""
                         // @options.buffer Any|Array  = []
                         // @desc Counter based task executor.

//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(taskCount, "Integer|omit"),       Task, "taskCount");
        $valid($type(callback,  "Function|Task|omit"), Task, "callback");
        $valid($type(options,   "Object|omit"),        Task, "options");
        $valid($keys(options,   "tick,name,buffer"),   Task, "options");
        if (options) {
            $valid($type(options.tick,   "Function|omit"),  Task, "options.tick");
            $valid($type(options.name,   "String|omit"),    Task, "options.name");
            $valid($type(options.buffer, "Any|Array|omit"), Task, "options.buffer");
        }
    }
//}@dev

    taskCount = taskCount || 0;
    callback  = callback  || function() {};
    options   = options   || {};

    var tick     = options["tick"]   || function() {};
    var taskName = options["name"]   || "";
    var buffer   = options["buffer"] || (callback instanceof Task ? callback["buffer"] : []); // share to buffer

    this._taskName      = taskName + "@" + (++Task["COUNTER"]); // String: "taskName@1"
    this._tick          = tick;       // Function:
    this._buffer        = buffer;     // Array:
    this._callback      = callback;   // Function|Task: finished callback.
    this._tick          = tick;       // Function:
    this._taskCount     = taskCount;  // Number:  user task count.
    this._missableCount = 0;          // Integer: number of missable count.
    this._passedCount   = 0;          // Integer: Task#pass() called count.
    this._missedCount   = 0;          // Integer: Task#miss() called count.
    this._error         = null;       // Error:
    this._state         = "";         // String: current state. ""(progress), "pass", "miss", "exit"

    Task["INSTANCE"][this._taskName] = this; // register task instance.
}

Task["COUNTER"] = 0;
Task["INSTANCE"] = {}; // { "taskName@counter": TaskInstance, ... }
Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["prototype"] = Object.create(Task, {
    "constructor":  { "value": Task             },  // new Task(tackCount:Integer, callback:Function|Task = null, errorback:Function = null, tickback:Function = null, options:Object = {})
    // --- flow state ---
    "done":         { "value": Task_done        },  // Task#done(err:Error|null):void
    "pass":         { "value": Task_pass        },  // Task#pass():void
    "miss":         { "value": Task_miss        },  // Task#miss():void
    "exit":         { "value": Task_exit        },  // Task#exit():void
    // --- closure function ---
    "passfn":       { "value": Task_passfn      },  // Task#passfn():TaskPassClosureFunction
    "missfn":       { "value": Task_missfn      },  // Task#missfn():TaskMissClosureFunction
    // --- utility ---
    "error":        { "set": function(v) { this._error = v;         } },    // Task#error:Error
    "state":        { "get": function()  { return this._state;      } },    // Task#state:String - ""(progress) / "pass" / "miss" / "exit"
    "buffer":       { "get": function()  { return this._buffer;     } },    // Task#buffer:Array|Any
    "extend":       { "get": function()  { return this._taskCount;  },      // Task#extend:Integer
                      "set": function(v) { this._taskCount += v;    } },
    "missable":     { "get": function()  { return this._missableCount; },   // Task#missable:Integer
                      "set": function(v) { this._missableCount += v; } },
    "finished":     { "get": function()  { return this._state !== ""; } },  // Task#finished:Boolean
});
Task["dump"] = Task_dump;  // Task.dump(filter:String = ""):Object

// --- task runner ---
Task["run"]  = Task_run;   // Task.run(taskPlan:String,
                           //          taskMap:TaskMapObject|TaskMapArray,
                           //          callback:Function|Task = null,
                           //          options:Object = {}):Task
Task["loop"] = Task_loop;  // Task.loop(source:Object|Array,
                           //           tick:Function,
                           //           callback:Function|Task = null,
                           //           options:Object = {}):Task

// --- implements ------------------------------------------
function Task_done(error) { // @arg Error|null
//{@dev
    $valid($type(error, "Error|omit"), Task_done, "error");
//}@dev
    if (this._state === "") {
        if (error instanceof Error) {
            this._error = error;
            Task_miss.call(this);
        } else {
            Task_pass.call(this);
        }
    }
}

function Task_pass() {
    if (this._state === "") {
        this._tick(this._taskName);
        this._state = _updateState(this, 1, 0);
        _judgeState(this);
    }
}

function Task_miss() {
    if (this._state === "") {
        this._tick(this._taskName);
        this._state = _updateState(this, 0, 1);
        _judgeState(this);
    }
}

function Task_exit() {
    if (this._state === "") {
        this._state = "exit";
        _judgeState(this);
    }
}

function _updateState(that, passCount, missCount) { // @ret String - "miss" or "pass" or ""(progress)
    that._passedCount += passCount;
    that._missedCount += missCount;
    return that._missedCount >  that._missableCount ? "miss"
         : that._passedCount >= that._taskCount     ? "pass"
                                                    : "";
}

function _judgeState(that) { // @ret this
    if (that._state !== "") { // task was finished
        if (that._callback instanceof Task) {
            that._callback["error"] = that._error; // set error
            that._callback[that._state](); // call a junction.pass(), miss() and exit() method.
        } else {
            switch (that._state) {
            case "pass": that._callback(null, that._buffer); break;
            case "miss":
            case "exit": that._callback(that._error || new Error(that._state), that._buffer);
            }
        }
        delete Task["INSTANCE"][that._taskName]; // [!] GC
        that._tick = function() {};              // [!] GC
        that._buffer = [];                       // [!] GC
        that._callback = function() {};          // [!] GC
    }
}

function Task_passfn() { // @ret TaskPassClosureFunction
    var that = this;

    return function() { Task_pass.call(that); };
}

function Task_missfn() { // @ret TaskMissClosureFunction
    var that = this;

    return function() { Task_miss.call(that); };
}

function Task_dump(filter) { // @arg String = "" - task name filter.
                             // @ret Object      - task info snap shot.
                             // @desc dump snapshot.
//{@dev
    $valid($type(filter, "String|omit"), Task_dump, "filter");
//}@dev

    var rv = {};

    for (var taskName in Task["INSTANCE"]) {
        if ( !filter || filter === taskName.split("@")[0] ) {
            var instance = Task["INSTANCE"][taskName];

            rv[taskName] = {
                "taskCount":    instance._taskCount,
                "missableCount":instance._missableCount,
                "passedCount":  instance._passedCount,
                "missedCount":  instance._missedCount,
                "state":        instance._state
            };
        }
    }
    return JSON.parse( JSON.stringify(rv) ); // dead copy
}

function Task_run(taskPlan,  // @arg String - task plan. "a > b + c > d"
                  taskMap,   // @arg TaskMapObject|TaskMapArray - { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                             //             fn(task:Task, arg:Any, groupIndex:Integer):void
                  callback,  // @arg Function|Task = null - finished callback. callback(error:Error|null, buffer:Array)
                  options) { // @arg Object = {}   { arg, name, buffer }
                             // @options.arg Any = null           - task argument.
                             // @options.name String = "Task.run" - junction task name.
                             // @options.buffer Any|Array = []    - shared buffer.
                             // @ret Task (as Junction)
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(taskPlan,  "String"),             Task_run, "taskPlan");
        $valid($type(taskMap,   "Object|Array"),       Task_run, "taskMap");
        $valid($type(callback,  "Function|Task|omit"), Task_run, "callback");
        $valid($type(options,   "Object|omit"),        Task_run, "options");
        $valid($keys(options,   "arg|name|buffer"),    Task_run, "options");
        if (options) {
            $valid($type(options.name,   "String|omit"),    Task_run, "options.name");
            $valid($type(options.buffer, "Any|Array|omit"), Task_run, "options.buffer");
        }
    }
//}@dev

    options  = options  || {};
    callback = callback || function() {};

    var arg    = options["arg"]    || null;
    var name   = options["name"]   || "Task.run";
    var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"] : []); // share buffer


    var line = null;

    // parse("a > b + c > d") -> [  ["a"],   ["b", "c"],    ["d"]   ]
    //                               ~~~      ~~~  ~~~       ~~~      <--- 4 user tasks
    //                              ~~~~~    ~~~~~~~~~~     ~~~~~     <--- 3 user task groups
    //                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ <--- line (serialized task group)
    if (taskPlan) {
        line = JSON.parse("[[" +  taskPlan.replace(/\+/g, ",").               // "a > b , c > d"
                                           replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                           replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
    } else {
        line = JSON.parse('[["' + Object.keys(taskMap).join('"],["') + '"]]');
    }

//{@dev
    if (!global["BENCHMARK"]) {
        if (line.length > 1000) {
            throw new TypeError("Too many user tasks. Task.run(taskPlan)");
        }
        if ( !_validateTaskMap(line, taskMap) ) {
            throw new TypeError("Invalid user task. Task.run(taskPlan, taskMap)");
        }
    }
//}@dev

    var junction = new Task(line.length, callback, { "name": name, "buffer": buffer });
    var param = { junction: junction, line: line, groupIndex: 0, taskMap: taskMap, arg: arg };

    _nextGroup(param);
    return junction;
}

function _nextGroup(param) {
    if (!param.junction["finished"]) {
        // --- create task group ---
        var taskGroup = param.line[param.groupIndex++]; // ["a"] or ["b", "c"] or ["d"]

        var groupJunction = new Task(taskGroup.length, function(err) {
                                param.junction["done"](err);
                                if (!err) {
                                    _nextGroup(param); // recursive call
                                }
                            }, { "buffer": param.junction["buffer"] });
        if (taskGroup.length === 0) {
            groupJunction["pass"]();
        } else {
            for (var i = 0, iz = taskGroup.length; i < iz; ++i) {
                _callUserTask(taskGroup[i]);
            }
        }
    }

    function _callUserTask(taskName) {
        var task = new Task(1, groupJunction, { "name": taskName });

        if (taskName in param.taskMap) {
            try {
                param.taskMap[taskName](task, param.arg, param.groupIndex - 1); // call userTask(task, arg, groupIndex) { ... }
            } catch (err) {
                task["done"](err);
            }
        } else if ( isFinite(taskName) ) { // isFinite("1000") -> sleep(1000) task
            setTimeout(function() {
                task["pass"]();
            }, parseInt(taskName, 10) | 0);
        }
    }
}

//{@dev
function _validateTaskMap(groupArray, // @arg TaskGroupArray
                          taskMap) {  // @arg TaskMapObject|TaskMapArray
                                      // @ret Boolean
    var taskNames = Object.keys(taskMap); // ["task_a", "task_b", "task_c"]

    return groupArray.every(function(taskGroup) {
        return taskGroup.every(function(taskName) {
            if (taskName in taskMap && !taskMap[taskName].length) {
                return false; // function taskName() { ... } has no argument.
            }
            if (taskNames.indexOf(taskName) >= 0) { // user task exsists -> true
                return true;
            }
            return isFinite(taskName); // isFinite("1000") -> sleep(1000) task -> true
        });
    });
}
//}@dev

function Task_loop(source,    // @arg Object|Array         - for loop and for-in loop data. [1, 2, 3], { a: 1, b: 2, c: 3 }
                   tick,      // @arg Function             - tick callback function. tick(task:Task, key:String, source:Object/Array):void
                   callback,  // @arg Function|Task = null - finished callback(error:Error|null, buffer:Array)
                   options) { // @arg Object = {}          - { arg, name, buffer }
                              // @options.arg Any = null            - task argument.
                              // @options.name String = "Task.loop" - junction task name.
                              // @options.buffer Array = []         - shared buffer.
                              // @ret Task Junction
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(source, "Object|Array"), Task_loop, "source");
        $valid($type(tick,   "Function"),     Task_loop, "tick");
    }
//}@dev

    var keys = Object.keys(source);
    var taskPlan = new Array(keys.length + 1).join("_").split("").join(">"); // "_>_>_ ..."
    var taskMap = {
            "_": function(task, arg, groupIndex) {
                tick(task, keys[groupIndex], source);
            }
        };

    options = options || {};
    options["name"] = options["name"] || "Task.loop";

    return Task_run(taskPlan, taskMap, callback, options);
}

return Task; // return entity

});

