// @name: Task.js
// @require: MappedArray.js

(function(global) {

// --- variable --------------------------------------------
var MappedArray = global["MappedArray"] || require("uupaa.mappedarray.js");

var _inNode = "process" in global;
var _taskInstanceKeeper = {}; // instance keeper. { taskName: TaskInstance, ... }
var _taskInstenceCounter = 0; // task instance counter

// --- define ----------------------------------------------

// --- interface -------------------------------------------
function Task(taskCount, // @arg Integer: task count, value from 1.
              callback,  // @arg Function/JunctionTaskInstance: task finished callback or Junction.
                         //            callback(err:Error, buffer:MappedArray, task:Task)
              options) { // @arg Object(= {}): { prefix, buffer, tick }
                         //        options.prefix - String(= "anonymous"): task name prefix.
                         //        options.buffer - MappedArray(= null): MappedArray instance.
                         //        options.tick - Function(= null): tick(on progress) callback. tick(taskName)
                         // @desc: Counter based task executor.
                         // @help: Task

//{@assert
    _if(typeof taskCount !== "number" || taskCount < 0, "invalid Task(taskCount)");
    _if(typeof callback !== "function" && !(callback instanceof Task), "invalid Task(,callback)");
    options != null && _if(options.constructor !== ({}).constructor, "invalid Task(,,options)");
//}@assert
//
    options = options || {};
    var prefix = options.prefix || "anonymous";
    var buffer = options.buffer || new MappedArray();
    var tick   = options.tick   || null;

//{@assert
    _if(typeof prefix !== "string", "invalid Task(,,options.prefix)");
    tick && _if(typeof tick !== "function", "invalid Task(,,options.tick)");
//}@assert

    this._taskName = prefix + "_" + (++_taskInstenceCounter); // String: "task_1"
    this._ = {
        buffer:         buffer,     // MappedArray: MappedArray
        callback:       callback,   // Function/JunctionTaskInstance: finished callback.
        taskCount:      taskCount,  // Number:
        tickCallback:   tick,       // Function:
        missableCount:  0,          // Integer: number of missable count.
        failureMessage: "",         // String: failure message.
        passedCount:    0,          // Integer: Task#pass() called count.
        missedCount:    0,          // Integer: Task#miss() called count.
        state:          ""          // String: current state. ""(progress), "pass", "miss", "exit"
    };
    _taskInstanceKeeper[this._taskName] = this; // register task instance.
    _update(this, "init");
}

Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["name"] = "Task";

Task["dump"] = Task_dump;           // Task.dump(taskNamePrefix:String = ""):Object
Task["reset"] = Task_reset;         // Task.reset():void
Task["prototype"] = {
    "constructor":  Task,
    // --- buffer accessor ---
    "buffer":       Task_buffer,    // Task#buffer():MappedArray/null
    "push":         Task_push,      // Task#push(value:Any):this
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    // --- flow state ---
    "pass":         Task_pass,      // Task#pass():this
    "miss":         Task_miss,      // Task#miss():this
    "exit":         Task_exit,      // Task#exit():this
    // --- utility ---
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(failureMessage:String):this
    "missable":     Task_missable,  // Task#missable(count:Integer):this
    "isFinished":   Task_isFinished // Task#isFinished():Boolean
};

// --- implement -------------------------------------------
function Task_buffer() { // @ret MappedArray/null: task finished is null.
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
    this._.buffer && this._.buffer.set(key, value);
    return this;
}

function Task_pass() { // @ret this:
                       // @desc: pass a task.
                       // @help: Task#pass
    this._.tickCallback && this._.tickCallback(this._taskName);
    return _update(this, "pass");
}

function Task_miss() { // @ret this:
                       // @desc: miss a task.
                       // @help: Task#miss
    this._.tickCallback && this._.tickCallback(this._taskName);
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
                // callback(err:Error, buffer:MappedArray, task:Task)
                _.callback(_.state === "pass" ? null
                                              : new Error(_.failureMessage),
                           that._.buffer, that);
            }
            delete _taskInstanceKeeper[that._taskName]; // [!] GC
            that._.buffer = null;                       // [!] GC
            that._.callback = null;                     // [!] GC
            that._.tickCallback = null;                 // [!] GC
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

function Task_message(failureMessage) { // @arg String: failure message.
                                        // @ret this:
                                        // @desc: set failure message.
                                        // @help: Task#message
//{@assert
    _if(typeof failureMessage !== "string", "invalid Task#message(failureMessage: " + failureMessage + ")");
//}@assert

    this._.failureMessage = failureMessage + "";
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
                                     // @desc: dump progress instances
//{@assert
    taskNamePrefix && _if(typeof taskNamePrefix !== "string", "invalid Task.dump(taskNamePrefix)");
//}@assert

    var rv = {};

    for (var taskName in _taskInstanceKeeper) {
        if ( !taskNamePrefix ||
              taskNamePrefix === taskName.split("_")[0] ) {

            rv[taskName] = _taskInstanceKeeper[taskName]._;
        }
    }
    return JSON.parse( JSON.stringify(rv) );
}

function Task_reset() { // @help: Task.reset
                        // @desc: detach and clear debug information.
    _taskInstanceKeeper = {}; // [!] GC
    _taskInstenceCounter = 0; // [!] reset
}

//{@assert
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

