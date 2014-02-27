export class Task {
    static name = "Task";
    static repository = "https://github.com/uupaa/Task.js/";

    _taskName: string;
    _tick: Function;
    _buffer: Array<any>; // [any, ...]
    _callback = null; // Function/Task
    _junction: boolean;
    _taskCount: number;
    _missableCount: number;
    _passedCount: number;
    _missedCount: number;
    _message: string;
    _state: string;

    constructor(taskCount:number, callback:Function, options:TaskOptions);
    constructor(taskCount:number, callback:Task, options:TaskOptions);
    constructor(taskCount:number, callback:any, options:TaskOptions = {}) {
        var junction:boolean  = callback instanceof Task;
        var tick:Function     = options["tick"]   || null;
        var name:string       = options["name"]   || "anonymous";
        var buffer:Array<any> = options["buffer"] || (junction ? callback["buffer"]() : []); // Junction -> Buffer share

        this._taskName      = TaskTracer.createTaskName(name); // String: "task@1"
        this._tick          = tick;       // Function:
        this._buffer        = buffer;     // Array:
        this._callback      = callback;   // Function/Junction: finished callback.
        this._junction      = junction;   // Boolean: callback is Junction.
        this._taskCount     = taskCount;  // Number:
        this._missableCount = 0;          // Integer: number of missable count.
        this._passedCount   = 0;          // Integer: Task#pass() called count.
        this._missedCount   = 0;          // Integer: Task#miss() called count.
        this._message       = "Error: " + this._taskName;
                                          // String: new Error(message)
        this._state         = "";         // String: current state. ""(progress), "pass", "miss", "exit"

        TaskTracer.add(this._taskName, this); // register task instance.

        if (!taskCount) {
            this.update("init");
        }
    }
    push(value:any):Task {
        if (this._buffer) {
            this._buffer.push(value);
        }
        return this;
    }
    set(key:string, value:any):Task {
        if (this._buffer) {
            this._buffer[key] = value;
        }
        return this;
    }
    done(err:Error):Task {
        var miss = err instanceof Error;

        if (miss) {
            this["message"](err["message"]);
        }
        return miss ? this["miss"]()
                    : this["pass"]();
    }
    pass():Task {
        if (this._tick) {
            this._tick(this._taskName); // tick callback(taskName)
        }
        return this.update("pass");
    }
    miss():Task {
        if (this._tick) {
            this._tick(this._taskName); // tick callback(taskName)
        }
        return this.update("miss");
    }
    exit():Task {
        return this.update("exit");
    }
    private update(method:string):Task {
        if (this._state === "") { // task in progress.
            // --- update current state ---
            switch (method) {
            case "init":                      this._state = this.judgeState(); break;
            case "pass": ++this._passedCount; this._state = this.judgeState(); break;
            case "miss": ++this._missedCount; this._state = this.judgeState(); break;
            case "exit":                      this._state = "exit";
            }
            // --- finishing ---
            if (this._state) { // task was finished. state = "pass" or "miss" or "exit"
                if (this._junction) {
                    // bubble up message and state.
                    this._callback["message"](this._message); // call Junction#message(...)
                    this._callback[this._state]();            // call Junction#pass() or #miss() or #exit()
                } else {
                    // callback(err:Error/null, buffer:Array)
                    this._callback(this._state === "pass" ? null : new Error(this._message), this._buffer);
                }
                TaskTracer.remove(this._taskName);

                this._tick = null;                     // [!] GC
                this._buffer = null;                   // [!] GC
                this._callback = null;                 // [!] GC
            }
        }
        return this;
    }
    private judgeState():string {
        return this._missedCount >  this._missableCount ? "miss"
             : this._passedCount >= this._taskCount     ? "pass"
                                                        : "";
    }
    buffer() {
        return this._buffer;
    }
    extend(count:number):Task {
        this._taskCount += count;
        return this;
    }
    message(msg:string):Task;
    message(msg:Error):Task;
    message(msg:any):Task {
        if (msg instanceof Error) {
            this._message = msg["message"];
        } else {
            this._message = msg;
        }
        return this;
    }
    missable(count:number):Task {
        this._missableCount += count;
        return this;
    }
    isFinished() {
        return this._state !== "";
    }
    static dump(filter):Object {
        return TaskTracer.dump(filter);
    }
    static drop():void {
        TaskTracer.clear();
    }
    static flatten(source):Array<any> {
        return Array.prototype.concat.apply([], source);
    }
    static arraynize(source):Array<any> {
        return Array.prototype.slice.call(source);
    }
    static objectize(source):Object {
        return Object.keys(source).reduce(function(result, key) {
            result[key] = source[key];
            return result;
        }, {});
    }
    static run(taskRoute:string, taskMap:Array<Function>, callback:Task,     options:Object);
    static run(taskRoute:string, taskMap:Object,          callback:Task,     options:Object);
    static run(taskRoute:string, taskMap:Array<Function>, callback:Function, options:Object);
    static run(taskRoute:string, taskMap:Object,          callback:Function, options:Object);
    static run(taskRoute:string, taskMap:any,             callback:any,      options:Object = null) {
        options = options || {};

        var arg    = options["arg"]    || null;
        var name   = options["name"]   || "Task.run";
        var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"]() : []); // Junction -> Buffer share

        var line = null;

        // parse("a > b + c > d") -> [  ["a"],   ["b", "c"],    ["d"]   ]
        //                               ~~~      ~~~  ~~~       ~~~      <--- 4 user tasks
        //                              ~~~~~    ~~~~~~~~~~     ~~~~~     <--- 3 user task groups
        //                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ <--- line (serialized task group)
        if (taskRoute) {
            line = JSON.parse("[[" +  taskRoute.replace(/\+/g, ",").               // "a > b , c > d"
                                                replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                                replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
        } else {
            line = JSON.parse('[["' + Object.keys(taskMap).join('"],["') + '"]]');
        }

        var junction = new Task(line.length, callback, { "name": name, "buffer": buffer });
        var param = {
                junction: junction,
                line:     line,
                index:    0,
                taskMap:  taskMap,
                arg:      arg
            };

        Task.nextGroup(param);
        return junction;
    }
    static nextGroup(param:any):void {
        if (!param.junction["isFinished"]()) {
            // --- create task group ---
            var group = param.line[param.index++]; // group: ["a"] or ["b", "c"] or ["d"]

            if (group.length === 1) {
                // --- single task ---
                Task.callUserTask(param, group[0], param.junction, true);
            } else {
                // --- parallel task ---
                var gjunc = new Task(group.length, function(err) {
                                    param.junction["done"](err);
                                    if (!err) {
                                        Task.nextGroup(param); // recursive call
                                    }
                                }, { "buffer": param.junction["buffer"]() });

                group.forEach(function(taskName) {
                    Task.callUserTask(param, taskName, gjunc, false);
                });
            }
        }
    }
    static callUserTask(param:any, taskName:string, junc:Task, singleTask:boolean):void {
        var task = new Task(1, junc, { "name": taskName });

        if (taskName in param.taskMap) {
            try {
                param.taskMap[taskName](task, param.arg); // call userTask(task, arg) { ... }
                if (singleTask) {
                    Task.nextGroup(param); // recursive call
                }
            } catch (err) {
                task["done"](err);
            }
        } else if ( /^\d+$/.test(taskName) ) { // isFinite("1000") -> sleep(1000) task
            setTimeout(function() {
                task["pass"]();
                if (singleTask) {
                    Task.nextGroup(param); // recursive call
                }
            }, parseInt(taskName, 10) | 0);
        }
    }
}

class TaskTracer {
    static _taskInstances:Object = {};
    static _taskCounter:number = 0;

    static createTaskName(baseName:string):string {
        return baseName + "@" + (++TaskTracer._taskCounter);
    }
    static add(taskName:string, instance:Task):void {
        TaskTracer._taskInstances[taskName] = instance;
    }
    static remove(taskName:string):void {
        delete TaskTracer._taskInstances[taskName];
    }
    static dump(filter):Object {
        var rv = {};

        for (var taskName in TaskTracer._taskInstances) {
            if ( !filter || filter === taskName.split("@")[0] ) {
                var instance = TaskTracer._taskInstances[taskName];

                rv[taskName] = {
                    "junction":     instance._junction,
                    "taskCount":    instance._taskCount,
                    "missableCount":instance._missableCount,
                    "passedCount":  instance._passedCount,
                    "missedCount":  instance._missedCount,
                    "state":        instance._state
                };
            }
        }
        return JSON.parse( JSON.stringify(rv) ); // dead copy
    }
    static clear():void {
        TaskTracer._taskInstances = {}; // [!] GC
        TaskTracer._taskCounter   = 0;  // [!] reset counter
    }
}

export interface TaskOptions {
    tick?: Function;
    name?: string;
    buffer?: any;
}

