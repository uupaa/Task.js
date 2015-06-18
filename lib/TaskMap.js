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
function TaskMap(taskName,  // @arg TaskNameString
                 plan,      // @arg TaskPlanString - "a > b + c > d"
                 map,       // @arg FunctionObject|FunctionArray - { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                 callback,  // @arg Function
                 taskArg) { // @arg Any = null
                            // @arg Task (as Junction)
    var taskMap = TaskMap_create(plan, map);

    return TaskMap_run(taskName, taskMap, callback, taskArg);
}

TaskMap["create"] = TaskMap_create; // TaskMap.create(plan:TaskPlanString, map:FunctionObject|FunctionArray):TaskMapObject
TaskMap["run"]    = TaskMap_run;    // TaskMap.run(taskName:String, taskMap:TaskMapObject, callback:Function, taskArg:Any = null):Task

// --- implements ------------------------------------------
function TaskMap_create(plan,  // @arg TaskPlanString - "a > b + c > d"
                        map) { // @arg FunctionObject|FunctionArray - { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                               // @ret TaskMapObject - { plan, map, groups }
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(plan, "TaskPlanString"),               TaskMap_create, "plan");
        $valid($type(map,  "FunctionObject|FunctionArray"), TaskMap_create, "map");
    }
//}@dev

    var groups = null;

    // parse("a > b + c > d")
    //
    //   [  ["a"],   ["b", "c"],    ["d"]   ] <--- TaskGroups: 3 user task groups.
    //      ~~~~~    ~~~~~~~~~~     ~~~~~
    //       ~~~      ~~~  ~~~       ~~~      <--- Task:       4 user tasks.

    if (plan) {
        groups = JSON.parse("[[" +  plan.replace(/\+/g, ",").               // "a > b , c > d"
                                         replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                         replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
    } else {
        groups = JSON.parse('[["' + Object.keys(map).join('"],["') + '"]]');
    }

//{@dev
    if (!global["BENCHMARK"]) {
        if (groups.length > 1000) {
            throw new TypeError("Too many user tasks. TaskMap_fromString(plan)");
        }
        if ( !_validateTaskMap(groups, map) ) {
            throw new TypeError("Invalid user task. TaskMap_fromString(plan, map)");
        }
    }
//}@dev

    return { "plan": plan, "map": map, "groups": groups };
}

function TaskMap_run(taskName,  // @arg String
                     taskMap,   // @arg TaskMapObject - { plan, map, groups }
                     callback,  // @arg Function|Task
                     taskArg) { // @arg Any = null
                                // @ret Task (as Junction)

    var runner = new Task(taskName, taskMap.groups.length, callback); // as Junction

//  runner["buffer"] = (callback instanceof Task ? callback["buffer"] : []); // share buffer

    var data = {
        runner:         runner,
        mapData:        taskMap.map,
        groups:         taskMap.groups,     // taskGroups
        index:          0,                  // taskGroup index
        taskArg:        taskArg || null
    };
    _nextTaskGroup(data);

    return runner;
}

function _nextTaskGroup(data) {
    if (data.runner["finished"]) { return; }

    // --- create task group ---
    var group = data.groups[data.index++]; //  [  ["a"],   ["b", "c"],   ["d"]  ]  <--- taskGroups
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

        if (taskName in data.mapData) {
            try {
                data.mapData[taskName](task, data.taskArg, data.index - 1); // call userTask(task, arg, index) { ... }
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

