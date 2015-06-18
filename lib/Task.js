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
function Task(taskName,  // @arg String               - task name.
              taskCount, // @arg Integer              - user task count.
              callback,  // @arg Function|Task = null - finished callback. callback(error:Error|null, buffer:Any):void
              tick) {    // @arg Function = null      - tick callback. tick(task:Task):void
                         // @desc Counter based task executor.
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(taskName,  "String"),             Task, "taskName");
        $valid($type(taskCount, "Integer"),            Task, "taskCount");
        $valid($type(callback,  "Function|Task|omit"), Task, "callback");
        $valid($type(tick,      "Function|omit"),      Task, "tick");
    }
//}@dev
    callback = callback || function() {};
    tick     = tick     || function() {};

    this._taskName  = taskName; // String:
    this._taskCount = taskCount;// Number: user task count.
    this._callback  = callback; // Function:
    this._tick      = tick;     // Function
    this._buffer    = callback instanceof Task ? callback["buffer"] : []; // shared buffer
    this._missable  = 0;        // Integer: number of missable count.
    this._passed    = 0;        // Integer: Task#pass() called count.
    this._missed    = 0;        // Integer: Task#miss() called count.
    this._error     = null;     // Error:
    this._state     = "";       // String: current state. ""(in progress), "pass", "miss", "exit"

    Task["INSTANCE"].add(this); // register task instance.
}

Task["INSTANCE"]   = new Set(); // { TaskInstance, ... }
Task["dump"]       = function() { return Task["INSTANCE"];  }; // Task.dump():TaskInstanceSet
Task["drop"]       = function() { Task["INSTANCE"].clear(); }; // Task.drop():void
Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["prototype"]  = Object.create(Task, {
    "constructor":  { "value": Task             },  // new Task(taskName:String, taskCount:Integer, callback:Function|Task = null, tick:Function = null):Task
    // --- flow state ---
    "done":         { "value": Task_done        },  // Task#done(err:Error|null):void
    "pass":         { "value": Task_pass        },  // Task#pass():void
    "miss":         { "value": Task_miss        },  // Task#miss():void
    "exit":         { "value": Task_exit        },  // Task#exit():void
    // --- closure function ---
    "passfn":       { "value": Task_passfn      },  // Task#passfn():TaskPassClosureFunction
    "missfn":       { "value": Task_missfn      },  // Task#missfn():TaskMissClosureFunction
    // --- accessor ---
    "name":         { "get": function()  { return this._taskName;   } },    // Task#name:String
    "error":        { "set": function(v) { this._error = v;         } },    // Task#error:Error
    "state":        { "get": function()  { return this._state;      } },    // Task#state:String - ""(in progress), "pass", "miss", "exit"
    "buffer":       { "get": function()  { return this._buffer;     },      // Task#buffer:Array|Any
                      "set": function(v) { this._buffer = v;        } },
    "count":        { "get": function()  { return this._taskCount;  } },    // Task#count:Integer
    "extend":       { "set": function(v) { this._taskCount += v;    } },    // Task#extend:Integer
    "missable":     { "get": function()  { return this._missable; },        // Task#missable:Integer
                      "set": function(v) { this._missable += v; } },
    "finished":     { "get": function()  { return this._state !== ""; } },  // Task#finished:Boolean
});

// --- implements ------------------------------------------
function Task_done(error) { // @arg Error|null
//{@dev
    $valid($type(error, "Error|omit"), Task_done, "error");
//}@dev
    if (!this._state) { // in progress
        if (error instanceof Error) {
            this._error = error;
            Task_miss.call(this);
        } else {
            Task_pass.call(this);
        }
    }
}

function Task_pass() {
    if (!this._state) { // in progress
        this._tick(this);
        _updateState(this, 1, 0, "");
    }
}

function Task_miss() {
    if (!this._state) { // in progress
        this._tick(this);
        _updateState(this, 0, 1, "");
    }
}

function Task_exit() {
    if (!this._state) { // in progress
        _updateState(this, 0, 0, "exit");
    }
}

function _updateState(that, addPassCount, addMissCount, nextState) {
    that._passed += addPassCount;
    that._missed += addMissCount;
    that._state = nextState ? nextState
                : that._missed >  that._missable  ? "miss"
                : that._passed >= that._taskCount ? "pass"
                                                  : ""; // in progress
    if (that._state) { // task was finished
        if (that._callback instanceof Task) { // callback is Junction?
            that._callback["error"] = that._error; // set error to Junction
            that._callback[that._state]();         // call Junction method
        } else {
            switch (that._state) {
            case "pass": that._callback(null, that._buffer); break;
            case "miss":
            case "exit": that._callback(that._error || new Error(that._state), that._buffer);
            }
        }
        Task["INSTANCE"].delete(that);  // [!] GC
        that._tick = function() {};     // [!] GC
        that._buffer = [];              // [!] GC
        that._callback = function() {}; // [!] GC
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

return Task; // return entity

});

