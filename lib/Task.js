// @name: Task.js

(function(global) {

// --- variable --------------------------------------------
var _inNode = "process" in global;
var _taskInstanceKeeper = {}; // instance keeper. { taskName: TaskInstance, ... }
var _taskInstenceCounter = 0; // instance counter

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function Task(taskCount,      // @arg Integer: task count, value from 1.
              callback,       // @arg Function/JunctionTaskInstance: task finished callback or Junction.
                              //            callback(err:Error, payload:PayloadAnyArray, task:Task)
              taskNamePrefix, // @arg String(= "anonymous"): task name prefix.
              tickCallback) { // @arg Function(= null): tick(on progress) callback. tickCallback(taskName)
                              // @desc: Counter based task executor.
                              // @help: Task
//{@assert
    _if(typeof taskCount !== "number" || taskCount < 0, "invalid Task(taskCount)");
    _if(typeof callback !== "function" && !(callback instanceof Task), "invalid Task(,callback)");
    tickCallback && _if(typeof tickCallback !== "function", "invalid Task(,,,tickCallback)");
//}@assert

    var junction = callback instanceof Task ? callback : null;

    this._ = {
        callback:       callback,             // Function/JunctionTaskInstance: finished callback.
        taskName:       (taskNamePrefix || "anonymous") + "_" + (++_taskInstenceCounter),
                                              // String: task name. eg "task_1"
        taskCount:      taskCount,            // Number:
        tickCallback:   tickCallback,         // Function:
        missableCount:  0,                    // Integer: number of missable count.
        failureMessage: "",                   // String: failure message.
        passedCount:    0,                    // Integer: Task#pass() called count.
        missedCount:    0,                    // Integer: Task#miss() called count.
        state:          "",                   // String: current state. ""(progress), "pass", "miss", "exit"
        junction:       junction,             // Task: junction task instance.
        payload:        junction ? junction["payload"]() : []
                                              // PayloadAnyArray: Task#set(), Task#push() value collections.
    };
    _taskInstanceKeeper[this._.taskName] = this; // register task instance.
    _update(this, "init");
}

Task["name"] = "Task";
Task["repository"] = "https://github.com/uupaa/Task.js/";

Task["prototype"] = {
    "constructor":  Task,
    // --- payload accessor ---
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    "push":         Task_push,      // Task#push(value:Any):this
    "clear":        Task_clear,     // Task#clear():this
    "payload":      Task_payload,   // Task#payload():PayloadAnyArray
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
// --- debug ---
Task["dump"]      = Task_dump;      // Task.dump(taskNamePrefix:String = ""):Object
Task["reset"]     = Task_reset;     // Task.reset():void
Task["flatten"]   = Task_flatten;   // Task.flatten(payload:PayloadAnyArray):Array;

// --- implement -------------------------------------------
function Task_set(key,     // @arg String: object key.
                  value) { // @arg Any: object value.
                           // @ret this:
                           // @desc: set { key: value }
                           // @help: Task#set
//{@assert
    key && _if(typeof key !== "string", "invalid Task#set(key)");
//}@assert

    if (this._.state === "") { // task in progress.
        if (this._.junction) {
            this._.junction["set"](key, value);
        } else {
            this._.payload[key] = value;
        }
    }
    return this;
}

function Task_push(value) { // @arg Any:
                            // @ret this:
                            // @desc: push value.
                            // @help: Task#push
    if (this._.state === "") { // task in progress.
        if (this._.junction) {
            this._.junction["push"](value);
        } else {
            this._.payload.push(value);
        }
    }
    return this;
}

function Task_pass() { // @ret this:
                       // @desc: pass a task.
                       // @help: Task#pass
    this._.tickCallback && this._.tickCallback(this._.taskName);
    return _update(this, "pass");
}

function Task_miss() { // @ret this:
                       // @desc: miss a task.
                       // @help: Task#miss
    this._.tickCallback && this._.tickCallback(this._.taskName);
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
                _.junction[_.state](); // call JunctionTask#pass()
                                       //  or  JunctionTask#miss()
                                       //  or  JunctionTask#exit()
            } else {
                // callback(err:Error, payload:PayloadAnyArray, task:Task)
                _.callback(_.state === "pass" ? null
                                              : new Error(_.failureMessage),
                           that["payload"](), that);
            }
            delete _taskInstanceKeeper[_.taskName];     // [!] GC
            that._.payload = [];                        // [!] GC
            that._.junction = null;                     // [!] GC
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

function Task_clear() { // @ret this:
                        // @help: Task#clear
                        // @desc: clear payload.
    if (this._.junction) {
        this._.junction["clear"]();
        this._.payload = this._.junction["payload"](); // [!] relink
    } else {
        this._.payload = [];
    }
    return this;
}

function Task_payload() { // @ret PayloadAnyArray:
                          // @help: Task#payload
                          // @desc: get payload reference
    if (this._.junction) {
        return this._.junction["payload"]();
    }
    return this._.payload || [];
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

function Task_flatten(payload) { // @arg PayloadAnyArray:
                                 // @ret Array: flatten values.
                                 // @help: Task.flatten
                                 // @desc: callback payload flatten.
//{@assert
    _if(!Array.isArray(payload), "invalid Task.flatten(payload)");
//}@assert

    return Array.prototype.concat.apply([], payload);
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

