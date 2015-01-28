(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var _taskInstances = {}; // instances. { "taskName@counter": TaskInstance, ... }
var _taskNumber = 0;

function NOP() {}

// --- class / interfaces ----------------------------------
function Task(taskCount, // @arg Integer              - user task count, value from 1.
              callback,  // @arg Function|Task = null - callback(err:Error, buffer:Array)
              options) { // @arg Object = {}          - { tick, name, buffer }
                         // @options.tick Function = null      - tick(taskName) callback.
                         // @options.name String = "anonymous" - task name.
                         // @options.buffer Array = []         - buffer.
                         // @desc Counter based task executor.

//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(taskCount, "Integer") && taskCount >= 0, Task, "taskCount");
        $valid($type(callback, "Function|Task|omit"),         Task, "callback");
        $valid($type(options, "Object|omit"),                 Task, "options");
        $valid($keys(options, "tick,name,buffer"),            Task, "options");
    }
//}@dev

    options  = options  || {};
    callback = callback || NOP;

    var junction = callback instanceof Task;
    var tick     = options["tick"]   || null;
    var name     = options["name"]   || "anonymous";
    var buffer   = options["buffer"] || (junction ? callback["buffer"]() : []); // Junction -> Buffer share

//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(tick, "Function|omit"), Task, "options.tick");
        $valid($type(name, "String"),        Task, "options.name");
        $valid($type(buffer, "Array"),       Task, "options.buffer");
    }
//}@dev

    this["name"] = name + "@" + (++_taskNumber); // String: "task@1"
    this._ = {
        tick:           tick,       // Function:
        buffer:         buffer,     // Array:
        callback:       callback,   // Function|Task: finished callback.
        junction:       junction,   // Boolean: callback is Junction.
        taskCount:      taskCount,  // Number:  user task count.
        missableCount:  0,          // Integer: number of missable count.
        passedCount:    0,          // Integer: Task#pass() called count.
        missedCount:    0,          // Integer: Task#miss() called count.
        message:        "",         // String: new Error(message)
        state:          ""          // String: current state. ""(progress), "pass", "miss", "exit"
    };
    _taskInstances[this["name"]] = this; // register task instance.
    if (!taskCount) {
        _update(this, "init"); // user task count is zero -> finished.
    }
}

//{@dev
Task["repository"] = "https://github.com/uupaa/Task.js/"; // GitHub repository URL. http://git.io/Help
//}@dev

Task["prototype"] = {
    "constructor":  Task,           // new Task(tackCount:Integer, callback:Function|Task = null, options:Object = {})
    // --- buffer accessor ---
    "pop":          Task_pop,       // Task#pop():Any|undefined
    "push":         Task_push,      // Task#push(value:Any):this
    "shift":        Task_shift,     // Task#shift():Any|undefined
    "unshift":      Task_unshift,   // Task#unshift(value:Any):this
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    // --- flow state ---
    "done":         Task_done,      // Task#done(err:Error|null):this
    "pass":         Task_pass,      // Task#pass():this
    "miss":         Task_miss,      // Task#miss():this
    "exit":         Task_exit,      // Task#exit():this
    // --- closure function ---
    "passfn":       Task_passfn,    // Task#passfn():TaskPassClosureFunction
    "missfn":       Task_missfn,    // Task#missfn():TaskMissClosureFunction
    // --- utility ---
    "state":        Task_state,     // Task#state():String
    "buffer":       Task_buffer,    // Task#buffer():Array|null
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(message:Error|String):this
    "missable":     Task_missable,  // Task#missable(count:Integer):this
    "isFinished":   Task_isFinished // Task#isFinished():Boolean
};
Task["dump"]      = Task_dump;      // Task.dump(filter:String = ""):Object
Task["clear"]     = Task_clear;     // Task.clear():void
Task["drop"]      = Task_clear;     // [DEPRECATED] Task.drop():void
Task["flatten"]   = Task_flatten;   // Task.flatten(source:Array):Array
Task["arraynize"] = Task_arraynize; // Task.arraynize(source:Array):Array
Task["objectize"] = Task_objectize; // Task.objectize(source:Array):Object

// --- task runner ---
Task["run"]       = Task_run;       // Task.run(taskPlan:String,
                                    //          taskMap:TaskMapObject|TaskMapArray,
                                    //          callback:Function|Task = null,
                                    //          options:Object = {}):Task
Task["loop"]      = Task_loop;      // Task.loop(source:Object|Array,
                                    //           tick:Function,
                                    //           callback:Function|Task = null,
                                    //           options:Object = {}):Task
// --- implements ------------------------------------------
function Task_pop() { // @ret Any|undefined
    if (this._.buffer) {
        return this._.buffer.pop();
    }
    return this;
}
function Task_push(value) { // @arg Any
                            // @ret this
    if (this._.buffer) {
        this._.buffer.push(value);
    }
    return this;
}
function Task_shift() { // @ret Any|undefined
    if (this._.buffer) {
        return this._.buffer.shift();
    }
    return this;
}
function Task_unshift(value) { // @arg Any
                               // @ret this
    if (this._.buffer) {
        this._.buffer.unshift(value);
    }
    return this;
}

function Task_set(key,     // @arg String
                  value) { // @arg Any
                           // @ret this
    if (this._.buffer) {
        this._.buffer[key] = value;
    }
    return this;
}

function Task_done(err) { // @arg Error|null
                          // @ret this
                          // @desc err is call Task#message(err.message).miss()
                          //       !err is call Task#pass()
    var miss = err instanceof Error;

    if (miss) {
        this["message"](err["message"]);
    }
    return miss ? this["miss"]()
                : this["pass"]();
}

function Task_pass() { // @ret this
                       // @desc pass a user task.
    if (this._.tick) {
        this._.tick(this["name"]); // tick callback(taskName)
    }
    return _update(this, "pass");
}

function Task_miss() { // @ret this
                       // @desc miss a user task.
    if (this._.tick) {
        this._.tick(this["name"]); // tick callback(taskName)
    }
    return _update(this, "miss");
}

function Task_exit() { // @ret this
                       // @desc exit the Task.
    return _update(this, "exit");
}

function _update(that, method) { // @ret this
    var _ = that._;

    if (_.state === "") { // task in progress.
        // --- update current state ---
        switch (method) {
        case "init":                  _.state = _judgeState(_); break;
        case "pass": ++_.passedCount; _.state = _judgeState(_); break;
        case "miss": ++_.missedCount; _.state = _judgeState(_); break;
        case "exit":                  _.state = "exit";
        }
        // --- finishing ---
        if (_.state) { // task was finished. state = "pass" or "miss" or "exit"
            if (_.junction) {
                // bubble up message and state.
                _.callback["message"](_.message); // call Junction#message(...)
                _.callback[_.state]();            // call Junction#pass() or #miss() or #exit()
            } else {
                _.callback(_createError(that), _.buffer);
            }
            delete _taskInstances[that["name"]]; // [!] GC
            _.tick = null;                       // [!] GC
            _.buffer = null;                     // [!] GC
            _.callback = null;                   // [!] GC
        }
    }
    return that;
}

function _judgeState(_) { // @ret String - "miss" or "pass" or ""(progress)
    return _.missedCount >  _.missableCount ? "miss"
         : _.passedCount >= _.taskCount     ? "pass"
                                            : "";
}

function _createError(that) { // @ret Error|null
    if (that._.state === "pass") {
        return null;
    }
    return new Error(that._.message || ("Error: " + that["name"]));
}

function Task_passfn() { // @ret TaskPassClosureFunction
                         // @desc pass a user task.
    var that = this;

    return function() { that["pass"](); };
}

function Task_missfn() { // @ret TaskMissClosureFunction
                         // @desc miss a user task.
    var that = this;

    return function() { that["miss"](); };
}

function Task_state() { // @ret String - task state "" / "pass" / "miss" / "exit"
                        // @desc get state
    return this._.state;
}

function Task_buffer() { // @ret Array|null - task finished is null.
    return this._.buffer;
}

function Task_extend(count) { // @arg Integer - task count
                              // @ret this
                              // @desc extend task count.
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(count, "Integer") && count >= 0, Task_extend, "count");
    }
//}@dev

    this._.taskCount += count;
    return this;
}

function Task_message(message) { // @arg Error|String - message.
                                 // @ret this
                                 // @desc set message
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(message, "Error|String"), Task_message, "message");
    }
//}@dev

    this._.message = message["message"] || message;
    return this;
}

function Task_missable(count) { // @arg Integer - missable count
                                // @ret this
                                // @desc extend missable count.
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(count, "Integer") && count >= 0, Task_missable, "count");
    }
//}@dev

    this._.missableCount += count;
    return this;
}

function Task_isFinished() { // @ret Boolean - true is finished
    return this._.state !== "";
}

function Task_dump(filter) { // @arg String = "" - task name filter.
                             // @ret Object      - task info snap shot.
                             // @desc dump snapshot.
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(filter, "String|omit"), Task_dump, "filter");
    }
//}@dev

    var rv = {};

    for (var taskName in _taskInstances) {
        if ( !filter || filter === taskName.split("@")[0] ) {
            var _ = _taskInstances[taskName]._;

            rv[taskName] = {
                "junction":     _.junction,
                "taskCount":    _.taskCount,
                "missableCount":_.missableCount,
                "passedCount":  _.passedCount,
                "missedCount":  _.missedCount,
                "state":        _.state
            };
        }
    }
    return JSON.parse( JSON.stringify(rv) ); // dead copy
}

function Task_clear() { // @desc clear snapshot.
    _taskInstances = {}; // [!] GC
    _taskNumber = 0;     // [!] reset
}

function Task_flatten(source) { // @arg Array
                                // @ret Array
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(source, "Array"), Task_flatten, "source");
    }
//}@dev

    return Array.prototype.concat.apply([], source);
}

function Task_arraynize(source) { // @arg Array
                                  // @ret Array
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(source, "Array"), Task_arraynize, "source");
    }
//}@dev

    return Array.prototype.slice.call(source);
}

function Task_objectize(source) { // @arg Array
                                  // @ret Object
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(source, "Array"), Task_objectize, "source");
    }
//}@dev

    return Object.keys(source).reduce(function(result, key) {
        result[key] = source[key];
        return result;
    }, {});
}

function Task_run(taskPlan,  // @arg String - plan. "a > b + c > d"
                  taskMap,   // @arg TaskMapObject|TaskMapArray - { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                             //             fn(task:Task, arg:Any, groupIndex:Integer):void
                  callback,  // @arg Function|Task = null - finished callback. callback(err:Error, buffer:Array)
                  options) { // @arg Object = {}   { arg, name, buffer }
                             // @options.arg Any = null           - task argument.
                             // @options.name String = "Task.run" - junction task name.
                             // @options.buffer Array = []        - shared buffer.
                             // @ret Task (as Junction)
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(taskPlan,  "String"),            Task_run, "taskPlan");
        $valid($type(taskMap,   "Object|Array"),      Task_run, "taskMap");
        $valid($type(callback,  "Function|Task|omit"),Task_run, "callback");
        $valid($type(options,   "Object|omit"),       Task_run, "options");
        $valid($keys(options,   "arg|name|buffer"),   Task_run, "options");
    }
//}@dev

    options  = options  || {};
    callback = callback || NOP;

    var arg    = options["arg"]    || null;
    var name   = options["name"]   || "Task.run";
    var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"]() : []); // Junction -> Buffer share

//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(name, "String"),  Task_run, "options.name");
        $valid($type(buffer, "Array"), Task_run, "options.buffer");
    }
//}@dev

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
    if (!param.junction["isFinished"]()) {
        // --- create task group ---
        var taskGroup = param.line[param.groupIndex++]; // ["a"] or ["b", "c"] or ["d"]

        var groupJunction = new Task(taskGroup.length, function(err) {
                                param.junction["done"](err);
                                if (!err) {
                                    _nextGroup(param); // recursive call
                                }
                            }, { "buffer": param.junction["buffer"]() });

        for (var i = 0, iz = taskGroup.length; i < iz; ++i) {
            _callUserTask(param, taskGroup[i], groupJunction);
        }
    }

    function _callUserTask(param, taskName, groupJunction) {
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
                   callback,  // @arg Function|Task = null - finished callback(err:Error, buffer:Array)
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

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Task;
}
global["Task" in global ? "Task_" : "Task"] = Task; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

