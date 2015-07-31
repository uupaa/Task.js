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
var Task = global["WebModule"]["Task"];

// --- define / local variables ----------------------------
// --- class / interfaces ----------------------------------
function TaskMap(taskName, // @arg String
                 flow,     // @arg TaskFlowDSLString - "a > b + c > d"
                 map,      // @arg FunctionObject - { a:fn, b:fn, c:fn, d:fn }
                 callback, // @arg Function = null - callback(error:Error, buffer:Any):void
                 arg) {    // @arg Any = null
                           // @arg Task (as Junction)
    var taskMap = TaskMap_create(flow, map);

    return TaskMap_run(taskName, taskMap, callback, arg);
}

TaskMap["create"] = TaskMap_create; // TaskMap.create(flow:TaskFlowDSLString, map:FunctionObject):TaskMapObject
TaskMap["run"]    = TaskMap_run;    // TaskMap.run(taskName:String, taskMap:TaskMapObject, callback:Function, arg:Any = null):Task

// --- implements ------------------------------------------
function TaskMap_create(flow,  // @arg TaskFlowDSLString - "a > b + c > d"
                        map) { // @arg FunctionObject - { a:fn, b:fn, c:fn, d:fn }
                               // @ret TaskMapObject - { flow, map, groups }
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(flow, "TaskFlowDSLString"), TaskMap_create, "flow");
        $valid($type(map,  "FunctionObject"),    TaskMap_create, "map");
    }
//}@dev

    // parse("a > b + c > d")
    //
    //   [  ["a"],   ["b", "c"],    ["d"]   ] <--- TaskGroups: 3 user task groups.
    //      ~~~~~    ~~~~~~~~~~     ~~~~~
    //       ~~~      ~~~  ~~~       ~~~      <--- Task:       4 user tasks.
    var tokens = flow.replace(/ +/g, " ").split(" ").map(function(value) {
                    if (value === "+")  { return ","; }     // "a > b , c > d"
                    if (value === ">" ||
                        value === "->") { return "],["; }   // "a ],[ b , c ],[ d"
                    return '"' + value + '"';               // '"a" ],[ "b" , "c" ],[ "d"'
                 }).join("");
    var groups = JSON.parse("[[" + tokens + "]]");
//{@dev
    if (!global["BENCHMARK"]) {
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

function TaskMap_run(taskName,  // @arg String
                     taskMap,   // @arg TaskMapObject - { flow, map, groups }
                     callback,  // @arg Function|Task = null
                     arg) {     // @arg Any = null
                                // @ret Task (as Junction)
    var runner = new Task(taskName, taskMap.groups.length, callback); // as Junction
    var data = {
        runner: runner,
        map:    taskMap.map,
        groups: taskMap.groups, // taskGroups
        cursor: 0,              // taskGroup cursor
        arg:    arg || null
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
        var singleTask = new Task(group[0], 1, function(error) {
                                    data.runner["done"](error);
                                    if (!error) { _nextTaskGroup(data); } // recursive call
                                });
        singleTask["buffer"] = data.runner["buffer"]; // shared buffer

        _callUserTask(singleTask);
        break;
    default:
        var parallelTask = new Task(group.join(), group.length, function(error) {
                                    data.runner["done"](error);
                                    if (!error) { _nextTaskGroup(data); } // recursive call
                                });
        parallelTask["buffer"] = data.runner["buffer"]; // shared buffer

        for (var i = 0, iz = group.length; i < iz; ++i) {
            _callUserTask( new Task(group[i], 1, parallelTask) );
        }
    }

    function _callUserTask(task) {
        var taskName = task.name;

        if (taskName in data.map) {
            try {
                data.map[taskName](task, data.arg, data.cursor - 1); // call userTask(task, arg, cursor) { ... }
            } catch (err) {
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

return TaskMap; // return entity

});
//}@taskmap

