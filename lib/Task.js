// @name: Task.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;
var _taskInstanceObject = {}; // instance db. { taskName: TaskInstance, ... }

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Task(taskCount,      // @arg Integer: task count, value from 1.
              callback,       // @arg Function/TaskInstance: task finished callback.
                              //           callback(err:Error, args:Array)
              taskNamePrefix, // @arg String(= ""): task name prefix.
              tickCallback) { // @arg Function(= null): tick(on progress) callback.
                              // @throw: Error("maybe bad arguments")
                              // @desc: Counter based task executor.
                              // @help: Task
//{@assert
    _if(typeof taskCount !== "number" || taskCount < 0, "invalid Task(taskCount)");
    _if(typeof callback !== "function" && !(callback instanceof Task), "invalid Task(,callback)");
    tickCallback && _if(typeof tickCallback !== "function", "invalid Task(,,,tickCallback)");
//}@assert

    this._ = {
        callback:       callback,             // Function/TaskInstance: finished callback.
        taskName:       "",                   // String: "{{taskNamePrefix}}_random"
        taskCount:      taskCount,            // Number:
        tickCallback:   tickCallback,         // Function:
        missableCount:  0,                    // Integer: number of missable count.
        failureMessage: "",                   // String: failure message.
        passedCount:    0,                    // Integer: #pass() called count
        missedCount:    0,                    // Integer: #miss() called count
        state:          "",                   // String: current state. "" is progress,
                                              //                        "pass" or "miss" or "exit" are finished.
        args:           []                    // MixArray: #pass(arg) and #miss(arg) collections.
    };
    if (taskNamePrefix) {
        this._.taskName = taskNamePrefix + "_" + (Math.random() + "").slice(2);
        _taskInstanceObject[this._.taskName] = this; // register task instance
    }
    _update(this._, "init");
}

Task["name"] = "Task";
Task["repository"] = "https://github.com/uupaa/Task.js/";

Task["prototype"] = {
    "constructor":  Task,
    "pass":         Task_pass,      // Task#pass(value:Any = undefined, key:String = ""):this
    "miss":         Task_miss,      // Task#miss(value:Any = undefined, key:String = ""):this
    "exit":         Task_exit,      // Task#exit(value:Any = undefined, key:String = ""):this
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(failureMessage:String):this
    "missable":     Task_missable,  // Task#missable(count:Integer):this
    "isFinished":   Task_isFinished // Task#isFinished():Boolean
};
Task["dump"]      = Task_dump;      // Task.dump():String
Task["clear"]     = Task_clear;     // Task.clear():void
Task["flatten"]   = Task_flatten;   // Task.flatten(args:MixArray):Array;

// --- implement -------------------------------------------
function Task_pass(value,     // @arg Any(= undefined): array value
                   key,       // @arg String(= ""): object key
                   compact) { // @arg Boolean(= false): true is memory compaction
                              // @ret this:
                              // @desc: pass a task.
                              // @help: Task#pass
//{@assert
    key             && _if(typeof key     !== "string",  "invalid Task#pass(,key)");
    compact != null && _if(typeof compact !== "boolean", "invalid Task#pass(,,compact)");
//}@assert

    this._.tickCallback && this._.tickCallback();

    _pushValue(this._, value, key, compact);
    _update(this._, "pass");

    return this;
}

function Task_miss(value,     // @arg Any(= undefined): args value
                   key,       // @arg String(= ""): object key
                   compact) { // @arg Boolean(= false): true is memory compaction
                              // @ret this:
                              // @desc: miss a task.
                              // @help: Task#miss
//{@assert
    key             && _if(typeof key     !== "string",  "invalid Task#miss(,key)");
    compact != null && _if(typeof compact !== "boolean", "invalid Task#miss(,,compact)");
//}@assert

    this._.tickCallback && this._.tickCallback();

    _pushValue(this._, value, key, compact);
    _update(this._, "miss");

    return this;
}

function Task_exit(value,     // @arg Any(= undefined): args value
                   key,       // @arg String(= ""): object key (optional)
                   compact) { // @arg Boolean(= false): true is memory compaction
                              // @ret this:
                              // @desc: exit the Task.
                              // @help: Task#eixt
//{@assert
    key             && _if(typeof key     !== "string",  "invalid Task#exit(,key)");
    compact != null && _if(typeof compact !== "boolean", "invalid Task#exit(,,compact)");
//}@assert

    _pushValue(this._, value, key, compact);
    _update(this._, "exit");

    return this;
}

function _pushValue(_, value, key, compact) {
    if (_.state === "") { // task in progress.
        if (value !== undefined) {
            if (key) {
                _.args[key] = value;    // array[key] = value; (trick)
                if (!compact) {
                    _.args.push(value); // array.push(value);
                }
            } else {
                _.args.push(value);     // array.push(value);
            }
        }
    }
}

function _update(_, method) {
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
            _finish(_);
        }
    }
}

function _judgeState(_) { // @ret String: "miss" or "pass" or ""(progress)
    return _.missedCount > _.missableCount              ? "miss"
         : _.missedCount + _.passedCount >= _.taskCount ? "pass"
                                                        : "";
}

function _finish(_) {
    if (_.callback instanceof Task) { // _.callback is Junction
        _.callback[_.state](_.args);  // junction#pass(...), miss(...), exit(...)
    } else {
        var err = _.state === "pass" ? null                         // pass -> null
                                     : new Error(_.failureMessage); // miss or exit -> Error
        _.callback(err, _.args);
    }
    // --- destructor ---
    if (_.taskName) {
        delete _taskInstanceObject[_.taskName];
    }
    _.args = [];
    _.callback = _.tickCallback = null;
}

function Task_extend(count) { // @arg Integer: task count
                              // @ret this:
                              // @desc: extend task count.
                              // @help: Task#extend
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
                                // @desc: extend missable count.
                                // @help: Task#missable
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
                                     // @ret String: JSON.stringify
                                     // @desc: dump progress instances
                                     // @help: Task.dump
//{@assert
    taskNamePrefix && _if(typeof taskNamePrefix !== "string", "invalid Task.dump(taskNamePrefix)");
//}@assert

    var rv = [];

    if (taskNamePrefix) {
        Object.keys(_taskInstanceObject).forEach(function(taskName) {
            if ( taskNamePrefix === taskName.split("_")[0] ) {
                rv.push( JSON.stringify( _taskInstanceObject[taskName]._, null, 4 ) );
            }
        });
    } else {
        for (var key in _taskInstanceObject) {
            rv.push( JSON.stringify( _taskInstanceObject[key]._, null, 4 ) );
        }
    }
    return rv + "";
}

function Task_clear() { // @desc: detach and clear progress instances.
    _taskInstanceObject = {};
}

function Task_flatten(args) { // @arg MixArray: args
                              // @ret Array: flatten values.
                              // @help: Task.flatten
                              // @desc: callback args flatten.
//{@assert
    _if(!Array.isArray(args), "invalid Task.flatten(args)");
//}@assert

    return Array.prototype.concat.apply([], args);
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

