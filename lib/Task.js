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
function Task(taskName,  // @arg String = ""          - task name.
              taskCount, // @arg UINT16 = 1           - user task count.
              callback,  // @arg Function|Task = null - finished callback. callback(error:Error|null, buffer:Any):void
              tick) {    // @arg Function = null      - tick callback. tick(task:Task):void
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(taskName,  "String|omit"),        Task, "taskName");
        $valid($type(taskCount, "UINT16|omit"),        Task, "taskCount");
        $valid($type(callback,  "Function|Task|omit"), Task, "callback");
        $valid($type(tick,      "Function|omit"),      Task, "tick");
    }
//}@dev

    this._taskName  = taskName  || "";  // String:
    this._taskCount = taskCount || 1;   // UINT16: user task count.
    this._callback  = callback  || function() {};
    this._tick      = tick      || function() {};
    this._buffer    = this._callback instanceof Task ? this._callback["buffer"] : []; // shared buffer
    this._missable  = 0;                // UINT16: missable count.
    this._passed    = 0;                // UINT16: Task#pass() called count.
    this._missed    = 0;                // UINT16: Task#miss() called count.
    this._error     = null;             // Error:
    this._state     = "";               // String: current state. ""(in progress), "pass", "miss", "exit"

    Task["SS"].add(this);               // add snap shot
}

Task["repository"] = "https://github.com/uupaa/Task.js/";
Task["prototype"] = Object.create(Task, {
    "constructor":  { "value": Task      }, // new Task(taskName:String = "", taskCount:UINT16 = 1, callback:Function|Task = null, tick:Function = null):Task
    // --- flow state ---
    "done":         { "value": Task_done }, // Task#done(err:Error|null):void
    "pass":         { "value": Task_pass }, // Task#pass():void
    "miss":         { "value": Task_miss }, // Task#miss():void
    "exit":         { "value": Task_exit }, // Task#exit():void
    // --- accessor ---
    "name":         { "get": function()  { return this._taskName;   } },    // Task#name:String
    "error":        { "set": function(v) { this._error = v;         } },    // Task#error:Error
    "state":        { "get": function()  { return this._state;      } },    // Task#state:String - ""(in progress), "pass", "miss", "exit"
    "buffer":       { "get": function()  { return this._buffer;     },      // Task#buffer:Array|Any
                      "set": function(v) { this._buffer = v;        } },
    "extend":       { "set": function(v) { this._taskCount += v;    } },    // Task#extend:UINT16
    "missable":     { "set": function(v) { this._missable += v;     } },    // Task#missable:UINT16
    "finished":     { "get": function()  { return !!this._state;    } },    // Task#finished:Boolean
    // --- closure function ---
    "passfn":       { "get": function()  { return Task_pass.bind(this); } },// Task#passfn:TaskPassClosureFunction
    "missfn":       { "get": function()  { return Task_miss.bind(this); } },// Task#missfn:TaskMissClosureFunction
});
Task["SS"] = new Set(); // { TaskSnapShot, ... }
Task["dump"] = function() { return Task["SS"];  }; // Task.dump():TaskSnapShotSet
Task["drop"] = function() { Task["SS"].clear(); }; // Task.drop():void

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
                : that._passed >= that._taskCount ? "pass" : "";
    if (that._state) { // task was finished
        if (that._callback instanceof Task) { // callback is Junction?
            that._callback["error"] = that._error; // bubble up error
            that._callback[that._state]();         // bubble up state
        } else {
            switch (that._state) {
            case "pass": that._callback(null, that._buffer); break;
            case "miss":
            case "exit": that._callback(that._error || new Error(that._state), that._buffer);
            }
        }
        Task["SS"].delete(that);    // [!] GC
        that._buffer = [];          // [!] GC
        that._tick = null;          // [!] GC
        that._callback = null;      // [!] GC
    }
}

return Task; // return entity

});

