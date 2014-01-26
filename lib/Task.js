// @name: Task.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;
var _taskInstanceObject = {}; // Object - instance db. { tag: TaskInstance, ... }

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Task(taskCount,      // @arg Integer: task count, value from 1.
              callback,       // @arg Function/TaskInstance: task finished callback.
                              //           callback(err:Error, args:Array)
              taskName,       // @arg String(= ""): task name.
              tickCallback) { // @arg Function(= null): tick(on progress) callback.
                              //           tick()
                              // @throw: Error("maybe bad arguments")
                              // @desc: Counter based task executor.
                              // @help: Task
//{@assert
    _if(typeof taskCount !== "number" || taskCount < 0, "invalid Task(taskCount: " + taskCount + ")");
    _if(typeof callback !== "function" && !(callback instanceof Task), "invalid Task(,callback,,)");
    taskName && _if(typeof taskName !== "string" ||
                    taskName in _taskInstanceObject, "duplicate Task(,,taskName: " + taskName + ")");
    tickCallback && _if(typeof tickCallback !== "function", "invalid Task(,,,tickCallback)");
//}@assert

    this._ = {
        callback:       callback,           // Function/TaskInstance: finished callback.
        taskName:       taskName || "",     // String:
        taskCount:      taskCount,          // Number:
        tickCallback:   tickCallback,       // Function:
        missableCount:  0,                  // Integer: number of missable count.
        failureMessage: "",                 // String: failure message.
        passedCount:    0,                  // Integer: #pass() called count
        missedCount:    0,                  // Integer: #miss() called count
        state:          "",                 // String: current state. "" is progress,
                                            //                        "pass" or "miss" or "exit" are finished.
        args:           []                  // MixArray: #pass(arg) and #miss(arg) collections.
    };
    taskName && (_taskInstanceObject[taskName] = this); // register task instance
    _judge(this, "init");
}

Task["name"] = "Task";
Task["repository"] = "https://github.com/uupaa/Task.js/";

Task["dump"] = dump;            // Task.dump():String
Task["clear"] = clear;          // Task.clear():void
Task["flatten"] = flatten;      // Task.flatten(args:MixArray):Array;
Task["prototype"] = {
    "constructor":  Task,
    "isFinished":   isFinished, // Task#isFinished():Boolean
    "extend":       extend,     // Task#extend(count:Integer):this
    "missable":     missable,   // Task#missable(count:Integer):this
    "message":      message,    // Task#message(failureMessage:String):this
    "pass":         pass,       // Task#pass(value:Mix = undefined, key:String = ""):this
    "miss":         miss,       // Task#miss(value:Mix = undefined, key:String = ""):this
    "exit":         exit        // Task#exit(value:Mix = undefined, key:String = ""):this
};

// --- implement -------------------------------------------
function isFinished() { // @ret Boolean: true is finished
                        // @help: Task#isFinished
    return this._.state !== "";
}

function extend(count) { // @arg Integer: task count
                         // @ret this:
                         // @desc: extend task count.
                         // @help: Task#extend
//{@assert
    _if(typeof count !== "number" || count < 0, "invalid Task#extend(count: " + count + ")");
//}@assert

    this._.taskCount += count;
    return this;
}

function missable(count) { // @arg Integer: missable count
                           // @ret this:
                           // @desc: extend missable count.
                           // @help: Task#missable
//{@assert
    _if(typeof count !== "number" || count < 0, "invalid Task#missable(count: " + count + ")");
//}@assert

    this._.missableCount += count;
    return this;
}

function message(failureMessage) { // @arg String: failure message.
                                   // @ret this:
                                   // @desc: set failure message.
                                   // @help: Task#message
//{@assert
    _if(typeof failureMessage !== "string", "invalid Task#message(failureMessage: " + failureMessage + ")");
//}@assert

    this._.failureMessage = failureMessage + "";
    return this;
}

function pass(value,     // @arg Mix(= undefined): array value
              key,       // @arg String(= ""): object key
              compact) { // @arg Boolean(= false): memory compaction
                         // @ret this:
                         // @desc: pass a task.
                         // @help: Task#pass
//{@assert
    if (key !== undefined) {
        _if(typeof key !== "string", "invalid Task#pass(key)");
    }
    if (compact !== undefined) {
        _if(typeof compact !== "boolean", "invalid Task#pass(,compact)");
    }
//}@assert

    this._.tickCallback && this._.tickCallback();
    return _judge(this, "pass", value, key, compact);
}

function miss(value,     // @arg Mix(= undefined): args value
              key,       // @arg String(= ""): object key
              compact) { // @arg Boolean(= false): memory compaction
                         // @ret this:
                         // @desc: miss a task.
                         // @help: Task#miss
//{@assert
    if (key !== undefined) {
        _if(typeof key !== "string", "invalid Task#miss(key)");
    }
    if (compact !== undefined) {
        _if(typeof compact !== "boolean", "invalid Task#miss(,compact)");
    }
//}@assert

    this._.tickCallback && this._.tickCallback();
    return _judge(this, "miss", value, key, compact);
}

function exit(value,     // @arg Mix(= undefined): args value
              key,       // @arg String(= ""): object key (optional)
              compact) { // @arg Boolean(= false): memory compaction
                         // @ret this:
                         // @desc: exit the Task.
                         // @help: Task#eixt
//{@assert
    if (key !== undefined) {
        _if(typeof key !== "string", "invalid Task#exit(key)");
    }
    if (compact !== undefined) {
        _if(typeof compact !== "boolean", "invalid Task#exit(,compact)");
    }
//}@assert

    return _judge(this, "exit", value, key, compact);
}

function _judge(that,      // @arg this:
                method,    // @arg String(= ""): "pass", "miss", "exit" and "judge"
                value,     // @arg Mix:
                key,       // @arg String:
                compact) { // @arg Boolean: memory compaction
                           // @ret this:
    var _ = that._;

    if (_.state === "") { // on progress

        // --- args.push( value ) ---
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

        // --- update current state ---
        switch (method) {
        case "init":                  _.state = _judgeState(_); break;
        case "pass": ++_.passedCount; _.state = _judgeState(_); break;
        case "miss": ++_.missedCount; _.state = _judgeState(_); break;
        case "exit":                  _.state = "exit"; break;
        }
        // --- finishing ---
        if (_.state) { // "pass" or "miss" or "exit"
            _finishing(_);
        }
    }
    return that;
}

function _judgeState(_) { // @ret String: "miss" or "pass" or ""(progress)
    var state = _.missedCount > _.missableCount              ? "miss"
              : _.missedCount + _.passedCount >= _.taskCount ? "pass"
                                                             : "";

    return state;
}

function _finishing(_) {
    if (_.callback instanceof Task) { // callback is Junction
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

function flatten(args) { // @arg MixArray: args
                         // @ret Array: flatten values.
                         // @help: Task.flatten
//{@assert
    _if(!Array.isArray(args), "invalid Task.flatten(args)");
//}@assert

    return Array.prototype.concat.apply([], args);
}

function dump(tag) { // @arg String(= ""): dump target. "" is dump all.
                     // @ret String: JSON.stringify
                     // @desc: dump progress instances
                     // @help: Task.dump
//{@assert
    tag && _if(typeof tag !== "string", "invalid Task.dump(tag: " + tag + ")");
//}@assert

    var rv = [];

    if (tag) {
        rv.push(JSON.stringify(_taskInstanceObject[tag]._, null, 4));
    } else {
        for (var key in _taskInstanceObject) {
            rv.push(JSON.stringify(_taskInstanceObject[key]._, null, 4));
        }
    }
    return rv + "";
}

function clear() { // @desc: detach and clear progress instances.
    _taskInstanceObject = {};
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

