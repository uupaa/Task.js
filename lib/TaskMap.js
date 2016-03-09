//{@taskmap
(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("TaskMap", function moduleClosure(global) {
"use strict";

// --- dependency modules ----------------------------------
var VERIFY  = global["WebModule"]["verify"]  || false;
var VERBOSE = global["WebModule"]["verbose"] || false;

// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function TaskMap(taskName,   // @arg String
                 flow,       // @arg TaskFlowDSLString - "a > b + c > d"
                 map,        // @arg FunctionObject - { a:fn, b:fn, c:fn, d:fn }
                 callback) { // @arg Function|Task|Junction = null - callback(error:Error, buffer:Any):void
                             // @arg Task (as Junction)
//{@dev
    if (VERBOSE && arguments.length > 4) {
        console.error("TaskMap(,,,, arg) is ignore, arg is DEPERECATED");
    }
//}@dev

    var taskMap = TaskMap_create(flow, map);

    return TaskMap_run(taskName, taskMap, callback);
}

TaskMap["create"] = TaskMap_create; // TaskMap.create(flow:TaskFlowDSLString, map:FunctionObject):TaskMapObject
TaskMap["run"]    = TaskMap_run;    // TaskMap.run(taskName:String, taskMap:TaskMapObject, callback:Function):Task
TaskMap["each"]   = TaskMap_each;   // TaskMap.each(taskName:String, source:Object|Array|TypedArray, callback:Function|Task|Junction = null, tick:Function, that:Object = null):Task

// --- implements ------------------------------------------
function TaskMap_create(flow,  // @arg TaskFlowDSLString - "a > b + c > d"
                        map) { // @arg FunctionObject - { a:fn, b:fn, c:fn, d:fn }
                               // @ret TaskMapObject - { flow, map, groups }
//{@dev
    if (VERIFY) {
        $valid($type(flow, "TaskFlowDSLString"), TaskMap_create, "flow");
        $valid($type(map,  "FunctionObject"),    TaskMap_create, "map");
    }
//}@dev

    // flow("a > b + c > d") -> JSON.parse([["a"], ["b", "c"], ["d"]])
    //
    //   [  ["a"],   ["b", "c"],    ["d"]   ] <--- TaskGroups: 3 user task groups.
    //      ~~~~~    ~~~~~~~~~~     ~~~~~
    //       ~~~      ~~~  ~~~       ~~~      <--- Task:       4 user tasks.
    var tokens = flow.replace(/ +/g, " ").split(" ").map(_tokenizer).join("");
    var groups = JSON.parse("[[" + tokens + "]]");

//{@dev
    if (VERIFY) {
        if (groups.length > 1000) {
            throw new TypeError("Too many user tasks");
        }
        if ( !_validateTaskMap(groups, map) ) {
            throw new TypeError("Invalid user task");
        }
    }
//}@dev

    return { "flow": flow, "map": map, "groups": groups };
}

function _tokenizer(value) {
    if (value === "+")                   { return ",";   } // "a > b , c > d"
    if (value === ">" || value === "->") { return "],["; } // "a ],[ b , c ],[ d"
    return '"' + value + '"';                              // '"a" ],[ "b" , "c" ],[ "d"'
}

function TaskMap_run(taskName,   // @arg String
                     taskMap,    // @arg TaskMapObject - { flow, map, groups }
                     callback) { // @arg Function|Task|Junction = null
                                 // @ret Task (as Junction)
    var runner = new global["WebModule"]["Task"](taskName, taskMap["groups"].length, callback); // as Junction
    var data = {
        runner: runner,
        map:    taskMap["map"],
        groups: taskMap["groups"], // taskGroups
        cursor: 0,                 // taskGroup cursor
    };

    _nextTaskGroup(data);
    return runner;
}

function _nextTaskGroup(data) {
    if (data.runner["finished"]) { return; }

    // --- create task group ---
    var group = data.groups[data.cursor++]; //  [  ["a"],   ["b", "c"],   ["d"]  ]  <--- taskGroups
                                            //     ~~~~~    ~~~~~~~~~~    ~~~~~
                                            //      [0]         [1]        [2]      <--- taskGroupIndex
                                            //
                                            //   singleTask             singleTask
                                            //
                                            //             parallelTask
    switch (group.length) {
    case 0:
        data.runner["pass"]();
        _nextTaskGroup(data);
        break;
    case 1:
        var singleTask = new global["WebModule"]["Task"](group[0], 1, function(error) {
                                    //if (!data.runner["finished"] && buffer !== data.runner["buffer"]) {
                                    //  if (buffer !== data.runner["buffer"]) {
                                    //      throw new ReferenceError(REFERENCE_ERROR + singleTask.name);
                                    //  }
                                    data.runner["done"](error);
                                    if (!error) { _nextTaskGroup(data); } // recursive call
                                });
        singleTask["buffer"] = data.runner["buffer"]; // shared buffer

        _callUserTask(singleTask);
        break;
    default:
        var parallelTask = new global["WebModule"]["Task"](group.join(), group.length, function(error) {
                                    //if (!data.runner["finished"] && buffer !== data.runner["buffer"]) {
                                    //  if (buffer !== data.runner["buffer"]) {
                                    //      throw new ReferenceError(REFERENCE_ERROR + parallelTask.name);
                                    //  }
                                    data.runner["done"](error);
                                    if (!error) { _nextTaskGroup(data); } // recursive call
                                });
        parallelTask["buffer"] = data.runner["buffer"]; // shared buffer

        for (var i = 0, iz = group.length; i < iz; ++i) {
            _callUserTask( new global["WebModule"]["Task"](group[i], 1, parallelTask) );
        }
    }

    function _callUserTask(task) {
        var taskName = task.name;

        if (taskName in data.map) {
            try {
                data.map[taskName].call(data.map, task, data.cursor - 1); // call userTask(task, cursor) { ... }
            } catch (err) {
                if (VERBOSE && err["stack"] && !err["dumped"]) { // ignore duplicate dump
                    console.error(err["stack"]);
                    err["dumped"] = true; // set dumped flag
                }
                if (err instanceof EvalError   ||
                    err instanceof RangeError  ||
                    err instanceof SyntaxError ||
                    err instanceof ReferenceError) {
                    throw err;
                }
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
function _validateTaskMap(groups,    // @arg TaskGroupArray
                          taskMap) { // @arg TaskMapObject|TaskMapArray
                                     // @ret Boolean
    var taskNames = Object.keys(taskMap); // ["task_a", "task_b", "task_c"]

    return groups.every(function(group) {
        return group.every(function(taskName) {
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

function TaskMap_each(taskName,         // @arg String
                      source,           // @arg Object|Array|TypedArray - iteratable object. [1, 2, 3], { a: 1, b: 2, c: 3 }, etc...
                      finishedCallback, // @arg Function|Task|Junction  - finishedCallback(err:Error, buffer:Array)
                      tickCallback,     // @arg Function                - tickCallback(task:Task, key:String, source:Object|Array|TypedArray):void
                      options) {        // @arg Object = null           - { tickThis, sleep, filter }
                                        // @options.tickThis Object = null   - tickCallback.call(tickThis) object
                                        // @options.sleep    UINT32 = 0      - tick between sleep. 0 is no sleep. tick > sleep > tick > sleep > ...
                                        // @options.filter   Function = null - keys filter function. filter(keys:KeyStringArray):KeyStringArray
                                        // @ret Task Junction
//{@dev
    if (VERIFY) {
        $valid($type(taskName,          "String"),                  TaskMap_each, "taskName");
        $valid($type(source,            "Object|Array|TypedArray"), TaskMap_each, "source");
        $valid($type(finishedCallback,  "Function|Task"),           TaskMap_each, "finishedCallback");
        $valid($type(tickCallback,      "Function"),                TaskMap_each, "tickCallback");
        $valid($type(options,           "Object|omit"),             TaskMap_each, "options");
        if (options) {
            $valid($keys(options,          "tickThis|sleep|filter"), TaskMap_each, "options");
            $valid($type(options.tickThis, "Object|omit"),           TaskMap_each, "options.tickThis");
            $valid($type(options.sleep,    "UINT32|omit"),           TaskMap_each, "options.sleep");
            $valid($type(options.filter,   "Function|omit"),         TaskMap_each, "options.filter");
        }
    }
//}@dev

    options = options || {};

    var sleep    = options["sleep"]    || 0;
    var tickThis = options["tickThis"] || null;
    var filter   = options["filter"]   || function(keys) { return keys; };
    var glue     = sleep ? (" > " + sleep + " > ")  // "_ > 10 > _ > 10 > _ > ..."
                         :  " > ";                  // "_ > _ > _ ..."
    var keys = filter(Object.keys(source));
    var flow = new Array(keys.length + 1).join("_").split("").join(glue);
    var map = {
            "_": function(task, cursor) {
                if (tickThis) {
                    tickCallback.call(tickThis, task, keys[cursor], source);
                } else {
                    tickCallback(task, keys[cursor], source);
                }
            }
        };
    var taskMap = TaskMap_create(flow, map);

    return TaskMap_run(taskName, taskMap, finishedCallback);
}

return TaskMap; // return entity

});
//}@taskmap

