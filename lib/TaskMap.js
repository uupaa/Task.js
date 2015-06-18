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
    var taskMap = TaskMap_fromString(plan, map);

    return TaskMap_run(taskName, taskMap, callback, taskArg);
}

TaskMap["fromString"] = TaskMap_fromString; // TaskMap.fromString(source:Array, tick:Function):TaskMapObject
TaskMap["fromArray"]  = TaskMap_fromArray;  // TaskMap.fromArray(source:Array, tick:Function):TaskMapObject
TaskMap["run"]        = TaskMap_run;        // TaskMap.run(taskName:String, taskMap:TaskMapObject, callback:Function, taskArg:Any = null):Task

// --- implements ------------------------------------------
function TaskMap_fromString(plan,  // @arg TaskPlanString - "a > b + c > d"
                            map) { // @arg FunctionObject|FunctionArray - { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                                   // @ret TaskMapObject - { plan, map, project }
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(plan, "TaskPlanString"),               TaskMap_fromString, "plan");
        $valid($type(map,  "FunctionObject|FunctionArray"), TaskMap_fromString, "map");
    }
//}@dev

    var project = null;

    // parse("a > b + c > d")
    //
    //   [  ["a"],   ["b", "c"],    ["d"]   ] <--- PROJECT:    1 project.
    //      ~~~~~    ~~~~~~~~~~     ~~~~~     <--- TASK-GROUP: 3 user task groups.
    //       ~~~      ~~~  ~~~       ~~~      <--- TASK:       4 user tasks.

    if (plan) {
        project = JSON.parse("[[" +  plan.replace(/\+/g, ",").               // "a > b , c > d"
                                          replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                          replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
    } else {
        project = JSON.parse('[["' + Object.keys(map).join('"],["') + '"]]');
    }

//{@dev
    if (!global["BENCHMARK"]) {
        if (project.length > 1000) {
            throw new TypeError("Too many user tasks. TaskMap_fromString(plan)");
        }
        if ( !_validateTaskMap(project, map) ) {
            throw new TypeError("Invalid user task. TaskMap_fromString(plan, map)");
        }
    }
//}@dev

    return { "plan": plan, "map": map, "project": project };
}

function TaskMap_fromArray(source, // @arg Array - for loop and for-in loop data. [1, 2, 3]
                           tick) { // @arg Function - tick callback function. tick(task:Task, key:String, source:Array):void
                                   // @ret TaskMapObject - { plan, map, project }
//{@dev
    if (!global["BENCHMARK"]) {
        $valid($type(source, "Object|Array"), TaskMap_fromArray, "source");
        $valid($type(tick,   "Function"),     TaskMap_fromArray, "tick");
    }
//}@dev

    var keys = Object.keys(source);
    var plan = new Array(keys.length + 1).join("_").split("").join(">"); // "_>_>_ ..."
    var map  = {
            "_": function(task, arg, index) {
                tick(task, keys[index], source);
            }
        };
    return TaskMap_fromString(plan, map);
}

function TaskMap_run(taskName,  // @arg String
                     taskMap,   // @arg TaskMapObject - { plan, map, project }
                     callback,  // @arg Function|Task
                     taskArg) { // @arg Any = null
                                // @ret Task (as Junction)

    var projectJunction = new Task(taskName, taskMap.project.length, callback);

    projectJunction["buffer"] = (callback instanceof Task ? callback["buffer"] : []); // share buffer

    var data = {
        projectJunction:    projectJunction,
        projectData:        taskMap.project,
        mapData:            taskMap.map,
        taskGroupIndex:     0,                // taskGroup index
        taskArg:            taskArg || null
    };
    _nextTaskGroup(data);

    return projectJunction;
}

function _nextTaskGroup(data) {
    if (data.projectJunction["finished"]) { return; }

    // --- create task group ---
    var taskGroup = data.projectData[data.taskGroupIndex++]; // PROJECT:    [  ["a"],  ["b", "c"], ["d"]  ]
                                                             // TASK-GROUP:    ~~~~~   ~~~~~~~~~~  ~~~~~
                                                             //                 [0]        [1]      [2]
    if (taskGroup.length === 0) { // task is empty
        data.projectJunction["pass"]();
        _nextTaskGroup(data);
    } else {
        var groupJunction = new Task(taskGroup.join(), taskGroup.length, function(error) {
                                    data.projectJunction["done"](error);
                                    if (!error) { _nextTaskGroup(data); } // recursive call
                                });
        groupJunction["buffer"] = data.projectJunction["buffer"]; // shared buffer

        for (var i = 0, iz = taskGroup.length; i < iz; ++i) {
            _callUserTask(taskGroup[i]);
        }
    }

    function _callUserTask(taskName) {
        var task = new Task(taskName, 1, groupJunction);

        if (taskName in data.mapData) {
            try {
                data.mapData[taskName](task, data.taskArg, data.taskGroupIndex - 1); // call userTask(task, arg, index) { ... }
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
function _validateTaskMap(project,   // @arg TaskGroupArray
                          taskMap) { // @arg TaskMapObject|TaskMapArray
                                     // @ret Boolean
    var taskNames = Object.keys(taskMap); // ["task_a", "task_b", "task_c"]

    return project.every(function(group) {
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

