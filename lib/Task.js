// @name: Task.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;
var _taskInstanceKeeper = {}; // instance keeper. { taskName: TaskInstance, ... }
var _taskInstenceCounter = 0; // task instance counter

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Task(taskCount, // @arg Integer: task count, value from 1.
              callback,  // @arg Function/Junction: task finished callback or Junction.
                         //            callback(err:Error, buffer:Array, task:Task)
              options) { // @arg Object(= {}): { tick, buffer, prefix }
                         //        options.tick   - Function(= null): tick(on progress) callback. tick(taskName)
                         //        options.buffer - Array(= []): Array instance.
                         //        options.prefix - String(= "anonymous"): task name prefix.
                         // @desc: Counter based task executor.
                         // @help: Task

//{@assert
    _if(!_isNumber(taskCount) || taskCount < 0, "invalid Task(taskCount)");
    _if(!_isFunction(callback) && !(callback instanceof Task), "invalid Task(,callback)");
    options && _if(!_isObject(options) ||
                   !_keys(options, { tick: 1, buffer: 1, prefix: 1 }), "invalid Task(,,options)");
//}@assert

    options = options || {};
    var tick   = options.tick   || null;
    var buffer = options.buffer || [];
    var prefix = options.prefix || "anonymous";

//{@assert
    tick   && _if(!_isFunction(tick), "invalid Task(,,options.tick)");
    buffer && _if(!Array.isArray(buffer), "invalid Task(,,options.buffer)");
    prefix && _if(!_isString(prefix), "invalid Task(,,options.prefix)");
//}@assert

    this._taskName = prefix + "@" + (++_taskInstenceCounter); // String: "task@1"
    this._ = {
        tick:           tick,       // Function:
        buffer:         buffer,     // Array:
        callback:       callback,   // Function/JunctionTaskInstance: finished callback.
        taskCount:      taskCount,  // Number:
        missableCount:  0,          // Integer: number of missable count.
        passedCount:    0,          // Integer: Task#pass() called count.
        missedCount:    0,          // Integer: Task#miss() called count.
        message:        "",         // String: message.
        state:          ""          // String: current state. ""(progress), "pass", "miss", "exit"
    };
    _taskInstanceKeeper[this._taskName] = this; // register task instance.
    !taskCount && _update(this, "init");
}

Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["name"] = "Task";

Task["dump"] = Task_dump;           // Task.dump(taskNamePrefix:String = ""):Object
Task["drop"] = Task_drop;           // Task.drop():void
Task["prototype"] = {
    "constructor":  Task,
    // --- buffer accessor ---
    "buffer":       Task_buffer,    // Task#buffer():Array/null
    "push":         Task_push,      // Task#push(value:Any):this
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    // --- flow state ---
    "pass":         Task_pass,      // Task#pass():this
    "miss":         Task_miss,      // Task#miss():this
    "exit":         Task_exit,      // Task#exit():this
    // --- utility ---
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(message:String):this
    "missable":     Task_missable,  // Task#missable(count:Integer):this
    "isFinished":   Task_isFinished // Task#isFinished():Boolean
};
Task["flatten"]   = Task_flatten;   // Task.flatten(source:Array):Array
Task["arraynize"] = Task_arraynize; // Task.arraynize(source:Array):Array
Task["objectize"] = Task_objectize; // Task.objectize(source:Array):Object

// --- implement -------------------------------------------
function Task_buffer() { // @ret Array/null: task finished is null.
                         // @help: Task.Buffer
    return this._.buffer;
}

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
            if (_.callback instanceof Task) { // _.callback is Junction
                _.callback[_.state](); // call JunctionTask#pass()
                                       //  or  JunctionTask#miss()
                                       //  or  JunctionTask#exit()
            } else {
                // callback(err:Error, buffer:Array, task:Task)
                _.callback(_.state === "pass" ? null
                                              : new Error(_.message),
                           that._.buffer, that);
            }
            delete _taskInstanceKeeper[that._taskName]; // [!] GC
            that._.tick = null;                         // [!] GC
            that._.buffer = null;                       // [!] GC
            that._.callback = null;                     // [!] GC
        }
    }
    return that;
}

function _judgeState(_) { // @ret String: "miss" or "pass" or ""(progress)
    return _.missedCount > _.missableCount              ? "miss"
         : _.missedCount + _.passedCount >= _.taskCount ? "pass"
                                                        : "";
}

function Task_extend(count) { // @arg Integer: task count
                              // @ret this:
                              // @help: Task#extend
                              // @desc: extend task count.
//{@assert
    _if(typeof count !== "number" || count < 0, "invalid Task#extend(count: " + count + ")");
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
    _if(typeof count !== "number" || count < 0, "invalid Task#missable(count: " + count + ")");
//}@assert

    this._.missableCount += count;
    return this;
}

function Task_isFinished() { // @ret Boolean: true is finished
                             // @help: Task#isFinished
    return this._.state !== "";
}

function Task_dump(taskNamePrefix) { // @arg String(= ""): dump target. "" is all.
                                     // @ret Object: cloned internal structure. { taskName: { internal-info }, ... }
                                     // @help: Task.dump
                                     // @desc: dump snapshot.
//{@assert
    taskNamePrefix && _if(typeof taskNamePrefix !== "string", "invalid Task.dump(taskNamePrefix)");
//}@assert

    var rv = {};

    for (var taskName in _taskInstanceKeeper) {
        if ( !taskNamePrefix ||
              taskNamePrefix === taskName.split("@")[0] ) {

            rv[taskName] = _taskInstanceKeeper[taskName]._;
        }
    }
    return JSON.parse( JSON.stringify(rv) );
}

function Task_drop() { // @help: Task.drop
                       // @desc: drop snapshot.
    _taskInstanceKeeper = {}; // [!] GC
    _taskInstenceCounter = 0; // [!] reset counter
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

//{@assert
function _isFunction(target) {
    return target !== undefined && (typeof target === "function");
}
function _isBoolean(target) {
    return target !== undefined && (typeof target === "boolean");
}
function _isString(target) {
    return target !== undefined && (typeof target === "string");
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

