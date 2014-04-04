// @name: Task.js
// @require: Valid.js
// @cutoff: @assert @node @xbrowser

(function(global) {
"use strict";

// --- variable --------------------------------------------
//{@assert
var Valid = global["Valid"] || require("uupaa.valid.js");
//}@assert

var _inNode = "process" in global;
var _taskInstances = {}; // instances. { "taskName@counter": TaskInstance, ... }
var _taskCounter   = 0;

// --- define ----------------------------------------------
function NOP() {}

// --- interface -------------------------------------------
function Task(taskCount, // @arg Integer: task count, value from 1.
              callback,  // @arg Function/Junction(= null): callback(err:Error, buffer:Array)
              options) { // @arg Object(= {}): { tick, name, buffer }
                         //        options.tick   - Function(= null): tick(taskName) callback.
                         //        options.name   - String(= "anonymous"): task name.
                         //        options.buffer - Array(= []): buffer.
                         // @desc: Counter based task executor.
                         // @help: Task

//{@assert
    _if(!Valid.type(taskCount, "Integer") || taskCount < 0,      "Task(taskCount)");
    _if(!Valid.type(callback, "Function/Task/omit"),             "Task(,callback)");
    _if(!Valid.type(options, "Object/omit", "tick,name,buffer"), "Task(,,options)");
//}@assert

    options  = options  || {};
    callback = callback || NOP;

    var junction = callback instanceof Task;
    var tick     = options["tick"]   || null;
    var name     = options["name"]   || "anonymous";
    var buffer   = options["buffer"] || (junction ? callback["buffer"]() : []); // Junction -> Buffer share

//{@assert
    _if(!Valid.type(tick, "Function/omit"), "Task(,,options.tick)");
    _if(!Valid.type(name, "String"),        "Task(,,options.name)");
    _if(!Valid.type(buffer, "Array"),       "Task(,,options.buffer)");
//}@assert

    this._taskName = name + "@" + (++_taskCounter); // String: "task@1"
    this._ = {
        tick:           tick,       // Function:
        buffer:         buffer,     // Array:
        callback:       callback,   // Function/Junction: finished callback.
        junction:       junction,   // Boolean: callback is Junction.
        taskCount:      taskCount,  // Number:
        missableCount:  0,          // Integer: number of missable count.
        passedCount:    0,          // Integer: Task#pass() called count.
        missedCount:    0,          // Integer: Task#miss() called count.
        message:        "Error: " + this._taskName,
                                    // String: new Error(message)
        state:          ""          // String: current state. ""(progress), "pass", "miss", "exit"
    };
    _taskInstances[this._taskName] = this; // register task instance.
    if (!taskCount) {
        _update(this, "init");
    }
}

//{@xbrowser
Task["name"] = "Task";
//}@xbrowser

Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["prototype"] = {
    "constructor":  Task,
    // --- buffer accessor ---
    "push":         Task_push,      // Task#push(value:Any):this
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    // --- flow state ---
    "done":         Task_done,      // Task#done(err:Error/null):this
    "pass":         Task_pass,      // Task#pass():this
    "miss":         Task_miss,      // Task#miss():this
    "exit":         Task_exit,      // Task#exit():this
    // --- utility ---
    "buffer":       Task_buffer,    // Task#buffer():Array/null
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(message:Error/String):this
    "missable":     Task_missable,  // Task#missable(count:Integer):this
    "isFinished":   Task_isFinished // Task#isFinished():Boolean
};
Task["dump"]      = Task_dump;      // Task.dump(filter:String = ""):Object
Task["drop"]      = Task_drop;      // Task.drop():void
Task["flatten"]   = Task_flatten;   // Task.flatten(source:Array):Array
Task["arraynize"] = Task_arraynize; // Task.arraynize(source:Array):Array
Task["objectize"] = Task_objectize; // Task.objectize(source:Array):Object
// --- task runner ---
Task["run"]       = Task_run;       // Task.run(taskRoute:String,
                                    //          taskMap:TaskMapObject/TaskMapArray,
                                    //          callback:Function/Junction = null,
                                    //          options:Object = {}):Task
Task["loop"]      = Task_loop;      // Task.loop(source:Object/Array,
                                    //           tick:Function,
                                    //           callback:Function/Junction = null,
                                    //           options:Object = {}):Task
// --- implement -------------------------------------------
function Task_push(value) { // @arg Any:
                            // @ret this:
                            // @help: Task.push
    if (this._.buffer) {
        this._.buffer.push(value);
    }
    return this;
}

function Task_set(key,     // @arg String:
                  value) { // @arg Any:
                           // @ret this:
                           // @help: Task.set
    if (this._.buffer) {
        this._.buffer[key] = value;
    }
    return this;
}

function Task_done(err) { // @arg Error/null:
                          // @return this:
                          // @desc:  err is call Task#message(err.message).miss()
                          //        !err is call Task#pass()
                          // @help: Task#done
    var miss = err instanceof Error;

    if (miss) {
        this["message"](err["message"]);
    }
    return miss ? this["miss"]()
                : this["pass"]();
}

function Task_pass() { // @ret this:
                       // @desc: pass a user task.
                       // @help: Task#pass
    if (this._.tick) {
        this._.tick(this._taskName); // tick callback(taskName)
    }
    return _update(this, "pass");
}

function Task_miss() { // @ret this:
                       // @desc: miss a user task.
                       // @help: Task#miss
    if (this._.tick) {
        this._.tick(this._taskName); // tick callback(taskName)
    }
    return _update(this, "miss");
}

function Task_exit() { // @ret this:
                       // @desc: exit the Task.
                       // @help: Task#eixt
    return _update(this, "exit");
}

function _update(that, method) { // @ret this:
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
                // callback(err:Error/null, buffer:Array)
                _.callback(_.state === "pass" ? null : new Error(_.message),
                           that._.buffer);
            }
            delete _taskInstances[that._taskName]; // [!] GC
            that._.tick = null;                    // [!] GC
            that._.buffer = null;                  // [!] GC
            that._.callback = null;                // [!] GC
        }
    }
    return that;
}

function _judgeState(_) { // @ret String: "miss" or "pass" or ""(progress)
    return _.missedCount >  _.missableCount ? "miss"
         : _.passedCount >= _.taskCount     ? "pass"
                                            : "";
}

function Task_buffer() { // @ret Array/null: task finished is null.
                         // @help: Task#Buffer
    return this._.buffer;
}

function Task_extend(count) { // @arg Integer: task count
                              // @ret this:
                              // @help: Task#extend
                              // @desc: extend task count.
//{@assert
    _if(!Valid.type(count, "Integer") || count < 0, "Task#extend(count)");
//}@assert

    this._.taskCount += count;
    return this;
}

function Task_message(message) { // @arg Error/String: message.
                                 // @ret this:
                                 // @desc: set message
                                 // @help: Task#message
//{@assert
    _if(!Valid.type(message, "Error/String"), "Task#message(message)");
//}@assert

    this._.message = message["message"] || message;
    return this;
}

function Task_missable(count) { // @arg Integer: missable count
                                // @ret this:
                                // @help: Task#missable
                                // @desc: extend missable count.
//{@assert
    _if(!Valid.type(count, "Integer") || count < 0, "Task#missable(count)");
//}@assert

    this._.missableCount += count;
    return this;
}

function Task_isFinished() { // @ret Boolean: true is finished
                             // @help: Task#isFinished
    return this._.state !== "";
}

function Task_dump(filter) { // @arg String(= ""): task name filter.
                             // @ret Object: task info snap shot.
                             // @help: Task.dump
                             // @desc: dump snapshot.
//{@assert
    _if(!Valid.type(filter, "String/omit"), "Task.dump(filter)");
//}@assert

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

function Task_drop() { // @help: Task.drop
                       // @desc: drop snapshot.
    _taskInstances = {}; // [!] GC
    _taskCounter   = 0;  // [!] reset counter
}

function Task_flatten(source) { // @arg Array:
                                // @ret Array:
                                // @help: Task.flatten
//{@assert
    _if(!Valid.type(source, "Array"), "Task.flatten(source)");
//}@assert

    return Array.prototype.concat.apply([], source);
}

function Task_arraynize(source) { // @arg Array:
                                  // @ret Array:
                                  // @help: Task.arraynize
//{@assert
    _if(!Valid.type(source, "Array"), "Task.arraynize(source)");
//}@assert

    return Array.prototype.slice.call(source);
}

function Task_objectize(source) { // @arg Array:
                                  // @ret Object:
                                  // @help: Task.objectize
//{@assert
    _if(!Valid.type(source, "Array"), "Task.objectize(source)");
//}@assert

    return Object.keys(source).reduce(function(result, key) {
        result[key] = source[key];
        return result;
    }, {});
}

function Task_run(taskRoute, // @arg String: route setting. "a > b + c > d"
                  taskMap,   // @arg TaskMapObject/TaskMapArray: { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                             //             fn(task:Task, arg:Any, groupIndex:Integer):void
                  callback,  // @arg Function/Junction = null: finished callback. callback(err:Error, buffer:Array)
                  options) { // @arg Object(= {}): { arg, name, buffer }
                             //       options.arg    - Any(= null): task argument.
                             //       options.name   - String(= "Task.run"): junction task name.
                             //       options.buffer - Array(= []): shared buffer.
                             // @ret Task: Junction
                             // @help: Task.run
//{@assert
    _if(!Valid.type(taskRoute, "String"),            "Task.run(taskRoute)");
    _if(!Valid.type(taskMap,   "Object/Array"),      "Task.run(,taskMap)");
    _if(!Valid.type(callback,  "Function/Task/omit"),"Task.run(,,callback)");
    _if(!Valid.type(options,   "Object/omit", "arg,name,buffer"), "Task.run(,,,options)");
//}@assert

    options  = options  || {};
    callback = callback || NOP;

    var arg    = options["arg"]    || null;
    var name   = options["name"]   || "Task.run";
    var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"]() : []); // Junction -> Buffer share

//{@assert
    _if(!Valid.type(name, "String"),  "Task.run(,,,options.name)");
    _if(!Valid.type(buffer, "Array"), "Task.run(,,,options.buffer)");
//}@assert

    var line = null;

    // parse("a > b + c > d") -> [  ["a"],   ["b", "c"],    ["d"]   ]
    //                               ~~~      ~~~  ~~~       ~~~      <--- 4 user tasks
    //                              ~~~~~    ~~~~~~~~~~     ~~~~~     <--- 3 user task groups
    //                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ <--- line (serialized task group)
    if (taskRoute) {
        line = JSON.parse("[[" +  taskRoute.replace(/\+/g, ",").               // "a > b , c > d"
                                            replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                            replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
    } else {
        line = JSON.parse('[["' + Object.keys(taskMap).join('"],["') + '"]]');
    }

//{@assert
    if (line.length > 1000) {
        throw new TypeError("Too many user tasks. Task.run(taskRoute)");
    }
    if ( !_validateTaskMap(line, taskMap) ) {
        throw new TypeError("Invalid user task. Task.run(taskRoute, taskMap)");
    }
//}@assert

    var junction = new Task(line.length, callback, { "name": name, "buffer": buffer });
    var param = { junction: junction, line: line, groupIndex: 0, taskMap: taskMap, arg: arg };

    _nextGroup(param);
    return junction;
}

function _nextGroup(param) {
    if (!param.junction["isFinished"]()) {
        // --- create task group ---
        var group = param.line[param.groupIndex++]; // group: ["a"] or ["b", "c"] or ["d"]

        if (group.length === 1) {
            // --- single task ---
            _callUserTask(param, group[0], param.junction, true);
        } else {
            // --- parallel task ---
            var gjunc = new Task(group.length, function(err) {
                                param.junction["done"](err);
                                if (!err) {
                                    _nextGroup(param); // recursive call
                                }
                            }, { "buffer": param.junction["buffer"]() });

            group.forEach(function(taskName) {
                _callUserTask(param, taskName, gjunc, false);
            });
        }
    }

    function _callUserTask(param, taskName, junc, singleTask) {
        var task = new Task(1, junc, { "name": taskName });

        if (taskName in param.taskMap) {
            try {
                param.taskMap[taskName](task, param.arg, param.groupIndex - 1); // call userTask(task, arg, groupIndex) { ... }
                if (singleTask) {
                    _nextGroup(param); // recursive call
                }
            } catch (err) {
                task["done"](err);
            }
        } else if ( isFinite(taskName) ) { // isFinite("1000") -> sleep(1000) task
            setTimeout(function() {
                task["pass"]();
                if (singleTask) {
                    _nextGroup(param); // recursive call
                }
            }, parseInt(taskName, 10) | 0);
        }
    }
}

//{@assert
function _validateTaskMap(groupArray, // @arg TaskGroupArray:
                          taskMap) {  // @arg TaskMapObject/TaskMapArray:
                                      // @ret Boolean:
    var taskNames = Object.keys(taskMap); // ["task_a", "task_b", "task_c"]

    return groupArray.every(function(taskGroup) {
        return taskGroup.every(function(taskName) {
            if (taskName in taskMap && !taskMap[taskName].length) {
                return false; // function taskName() { ... } has not arguments
            }
            if (taskNames.indexOf(taskName) >= 0) { // user task exsists -> true
                return true;
            }
            return isFinite(taskName); // isFinite("1000") -> sleep(1000) task -> true
        });
    });
}
//}@assert

function Task_loop(source,    // @arg Object/Array: for loop and for-in loop data. [1, 2, 3], { a: 1, b: 2, c: 3 }
                   tick,      // @arg Function: tick callback function. tick(task:Task, key:String, source:Object/Array):void
                   callback,  // @arg Function/Junction(= null): finished callback(err:Error, buffer:Array)
                   options) { // @arg Object(= {}): { arg, name, buffer }
                              //       options.arg    - Any(= null): task argument.
                              //       options.name   - String(= "Task.loop"): junction task name.
                              //       options.buffer - Array(= []): shared buffer.
                              // @ret Task: Junction
                              // @help: Task.loop
//{@assert
    _if(!Valid.type(source, "Object/Array"), "Task.loop(source)");
    _if(!Valid.type(tick,   "Function"),     "Task.loop(,tick)");
//}@assert

    var keys = Object.keys(source);
    var taskRoute = new Array(keys.length + 1).join("_").split("").join(">"); // "_>_>_ ..."
    var taskMap = {
            "_": function(task, arg, groupIndex) {
                tick(task, keys[groupIndex], source);
            }
        };

    options = options || {};
    options["name"] = options["name"] || "Task.loop";

    return Task_run(taskRoute, taskMap, callback, options);
}

//{@assert
function _if(value, msg) {
    if (value) {
        console.error(Valid.stack(msg));
        throw new Error(msg);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = Task;
}
//}@node
if (global["Task"]) {
    global["Task_"] = Task; // already exsists
} else {
    global["Task"]  = Task;
}

})((this || 0).self || global);

