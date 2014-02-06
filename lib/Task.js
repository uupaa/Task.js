// @name: Task.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;
var _taskInstances = {}; // instances. { "taskName@counter": Task, ... }
var _taskCounter   = 0;  // task counter.

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Task(taskCount, // @arg Integer: task count, value from 1.
              callback,  // @arg Function/Junction: task finished callback or Junction.
                         //            callback(err:Error, buffer:Array)
              options) { // @arg Object(= {}): { tick, name, buffer }
                         //        options.tick   - Function(= null): tick(on progress) callback. tick(taskName)
                         //        options.name   - String(= "anonymous"): task name.
                         //        options.buffer - Array(= []): buffer.
                         // @desc: Counter based task executor.
                         // @help: Task

//{@assert
    _if(!_isInteger(taskCount) || taskCount < 0, "invalid Task(taskCount)");
    _if(!_isFunction(callback) && !(callback instanceof Task), "invalid Task(,callback)");
    options && _if(!_isObject(options) ||
                   !_keys(options, { tick: 1, name: 1, buffer: 1 }), "invalid Task(,,options)");
//}@assert

    options = options || {};

    var junction = callback instanceof Task;
    var tick     = options["tick"]   || null;
    var name     = options["name"]   || "anonymous";
    var buffer   = options["buffer"] || (junction ? callback["buffer"]() : []); // Junction -> Buffer share

//{@assert
    tick   && _if(!_isFunction(tick),     "invalid Task(,,options.tick)");
    name   && _if(!_isString(name),       "invalid Task(,,options.name)");
    buffer && _if(!Array.isArray(buffer), "invalid Task(,,options.buffer)");
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
        message:        "",         // String: new Error(message)
        state:          ""          // String: current state. ""(progress), "pass", "miss", "exit"
    };
    _taskInstances[this._taskName] = this; // register task instance.
    !taskCount && _update(this, "init");
}

Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["name"] = "Task";

Task["prototype"] = {
    "constructor":  Task,
    // --- buffer accessor ---
    "push":         Task_push,      // Task#push(value:Any):this
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    // --- flow state ---
    "pass":         Task_pass,      // Task#pass():this
    "miss":         Task_miss,      // Task#miss():this
    "exit":         Task_exit,      // Task#exit():this
    // --- utility ---
    "buffer":       Task_buffer,    // Task#buffer():Array/null
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(message:String):this
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
                                    //          callback:Function/Junction,
                                    //          options:Object = {}):Task

// --- implement -------------------------------------------
function Task_push(value) { // @arg Any:
                            // @ret this:
                            // @help: Task.push
    this._.buffer && this._.buffer.push(value);
    return this;
}

function Task_set(key,     // @arg String:
                  value) { // @arg Any:
                           // @ret this:
                           // @help: Task.set
    this._.buffer && (this._.buffer[key] = value);
    return this;
}

function Task_pass() { // @ret this:
                       // @desc: pass a task.
                       // @help: Task#pass
    this._.tick && this._.tick(this._taskName);
    return _update(this, "pass");
}

function Task_miss() { // @ret this:
                       // @desc: miss a task.
                       // @help: Task#miss
    this._.tick && this._.tick(this._taskName);
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
        if (_.state) { // task was finished. "pass" or "miss" or "exit"
            if (_.junction) {
                _.callback["message"](_.message);
                _.callback[_.state](); // call Junction#pass() or #miss() or #exit()
            } else {
             // callback(err:Error/null, buffer:Array, task:Task)
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
    return _.missedCount > _.missableCount              ? "miss"
         : _.missedCount + _.passedCount >= _.taskCount ? "pass"
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
    _if(!_isInteger(count) || count < 0, "invalid Task#extend(count)");
//}@assert

    this._.taskCount += count;
    return this;
}

function Task_message(message) { // @arg String: message.
                                 // @ret this:
                                 // @desc: set message
                                 // @help: Task#message
//{@assert
    _if(!_isString(message), "invalid Task#message(message)");
//}@assert

    this._.message = message;
    return this;
}

function Task_missable(count) { // @arg Integer: missable count
                                // @ret this:
                                // @help: Task#missable
                                // @desc: extend missable count.
//{@assert
    _if(!_isInteger(count) || count < 0, "invalid Task#missable(count)");
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
    filter && _if(!_isString(filter), "invalid Task.dump(filter)");
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
                                // @help: Task#flatten
    return Array.prototype.concat.apply([], source);
}

function Task_arraynize(source) { // @arg Array:
                                  // @ret Array:
                                  // @help: Task#arraynize
    return Array.prototype.slice.call(source);
}

function Task_objectize(source) { // @arg Array:
                                  // @ret Object:
                                  // @help: Task#objectize
    return Object.keys(source).reduce(function(result, key) {
        result[key] = source[key];
        return result;
    }, {});
}

function Task_run(taskRoute, // @arg String: route setting. "a > b + c > d"
                  taskMap,   // @arg TaskMapObject/TaskMapArray: { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                  callback,  // @arg Function/Junction: callback(err:Error, buffer:Array)
                  options) { // @arg Object(= {}): { args, name, buffer }
                             //       options.args   - Object(= {}): task arguments.
                             //       options.name   - String(= "Task.run"): junction task name.
                             //       options.buffer - Array(= []): shared buffer.
                             // @ret Task: Junction
                             // @help: Task.run
//{@assert
    taskRoute && _if(!_isString(taskRoute), "invalid Task.run(taskRoute)");
    _if(!taskMap  || (!_isObject(taskMap)    && !Array.isArray(taskMap)),     "invalid Task.run(,taskMap)");
    _if(!callback || (!_isFunction(callback) && !(callback instanceof Task)), "invalid Task.run(,,callback)");
    options && _if(!_isObject(options) ||
                   !_keys(options, { args: 1, name: 1, buffer: 1 }), "invalid Task.run(,,,options)");
//}@assert

    var line = null;

    // parse("a > b + c > d") -> [  ["a"],   ["b", "c"],    ["d"]   ]
    //                               ~~~      ~~~  ~~~       ~~~      <--- task  (4 tasks)
    //                              ~~~~~    ~~~~~~~~~~     ~~~~~     <--- group (3 groups)
    //                           ~~~~~~~~~~~-~~~~~~~~~~~~~~~~~~~~~~~~ <--- line (serialized task group)
    if (taskRoute) {
        line = JSON.parse("[[" + taskRoute.replace(/\+/g, ",").               // "a > b , c > d"
                                           replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                           replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
    } else {
        line = JSON.parse('[["' + Object.keys(taskMap).join('"],["') + '"]]');
    }

//{@assert
    if ( !_validate(line, taskMap) ) {
        return callback( new TypeError("invalid Task.run(taskRoute)") );
    }
//}@assert

    options = options || {};

    var args   = options["args"]   || {};
    var name   = options["name"]   || "Task.run";
    var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"]() : []); // Junction -> Buffer share

    var junction = new Task(line.length, callback, { "name": name, "buffer": buffer });

    _nextGroup(junction, line, 0, taskMap, args);
    return junction;
}

function _nextGroup(junction, line, lineIndex, taskMap, args) {
    if (!junction["isFinished"]()) {

        // --- create task group ---
        var group = line[lineIndex]; // ["a"] or ["b", "c"] or ["d"]
        var groupJunction = new Task(group.length, function(err) {
                if (err) {
                    junction["message"](err["message"])["miss"]();
                } else {
                    junction["pass"]();
                    _nextGroup(junction, line, lineIndex + 1, taskMap, args); // recursive call
                }
            }, { "buffer": junction["buffer"]() });

        // --- execute parallel task ---
        group.forEach(function(taskName) {
            var task = new Task(1, groupJunction, { "name": taskName });

            if (taskName in taskMap) {
                try {
                    taskMap[taskName](task, args); // function(task, args) { task.pass(); }
                } catch (err) {
                    task["message"](err["message"])["miss"]();
                }
            } else if ( isFinite(taskName) ) { // isFinite("1000") -> delay
                setTimeout(function() {
                    task["pass"]();
                }, parseInt(taskName) || 0);
            }
        });
    }
}

//{@assert
function _validate(groupArray, // @arg TaskGroupArray:
                   taskMap) {  // @arg TaskMapObject/TaskMapArray:
                               // @ret Boolean:
    var taskNames = Object.keys(taskMap); // ["task_a", "task_b", "task_c"]

    return groupArray.every(function(taskGroup) {
        return taskGroup.every(function(taskName) {
            if (taskName in taskMap && !taskMap[taskName].length) {
                return false; // function taskName() { ... } has not arguments
            }
            if (taskNames.indexOf(taskName) >= 0) { // task exsists -> true
                return true;
            }
            return isFinite(taskName); // isFinite("1000") -> delay -> true
        });
    });
}

//{@assert
function _isFunction(target) {
    return target !== undefined && (typeof target === "function");
}
function _isString(target) {
    return target !== undefined && (typeof target === "string");
}
function _isInteger(target) {
    return _isNumber(target) && (Math.ceil(target) === target);
}
function _isNumber(target) {
    return target !== undefined && (typeof target === "number");
}
function _isObject(target) {
    return target && (target.constructor === ({}).constructor);
}
function _keys(target, model) {
    return Object.keys(target).every(function(key) { return key in model; });
}
function _if(booleanValue, errorMessageString) {
    if (booleanValue) {
        throw new Error(errorMessageString);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = Task;
}
//}@node
global["Task"] ? (global["Task_"] = Task) // already exsists
               : (global["Task"]  = Task);

})(this.self || global);

