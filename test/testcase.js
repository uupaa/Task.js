var ModuleTestTask = (function(global) {

var test = new Test(["Task", "TaskMap"], { // Add the ModuleName to be tested here (if necessary).
        disable:    false, // disable all tests.
        browser:    true,  // enable browser test.
        worker:     true,  // enable worker test.
        node:       true,  // enable node test.
        nw:         true,  // enable nw.js test.
        el:         true,  // enable electron (render process) test.
        button:     true,  // show button.
        both:       true,  // test the primary and secondary modules.
        ignoreError:false, // ignore error.
        callback:   function() {
        },
        errorback:  function(error) {
            console.error(error.message);
        }
    }).add([
        testNoArguments,
        // --- Task ---
        testPassWithoutArgument,
        testMissWithoutArgument,
        testExitWithoutArgument,
        testPassWithObjectKey,
        testExecuteSyncAndAsyncTask,
        testMissable,
      //testMessageFromString,
        testMessageFromError,
        testBufferKeyAccess,
        testBufferPushPopShiftUnshift,
        testFinisedAndFailureMessage,
        testJunctionSuccess,
        testJunctionFail,
        testJunctionWithSelfSharedBuffer,
        testJunctionWithSharedBuffer,
        testJunctionWithSharedBuffer2,
//      testCallback3rdArgIsTaskInstance,
      //testDrop,
        testDump,
        testZeroTaskCount,
        // --- Task.run ---
        testSharedBuffer,
        testNoTask,
        testTaskCancel,
        testBasicFunction,
        testParallelExecution,
        testDelay,
        testZeroDelay,
      //testArrayTask,
      //testArrayWithRoute,
        testMapWithoutRoute,
        testArg,
        testThrowTask,
        // --- TaskPassFunction, TaskMissFunction ---
        testClosureFunction,
        testClosureFunctionDone,
        // --- README.md ---
        testREADME1,
        testREADME2,
        testREADME3,
        testUnicodeIdentify,
        // --- -> ---
        testTaskMap_allow,
        // --- TaskMap.each ---
        testTaskMap_eachObject,
        testTaskMap_eachArray,
        testTaskMap_eachObject_tickThis,
        testTaskMap_eachArray_tickThis,
        testDelay,
        testTaskMap_eachArray_sleep_20,
        testTaskMap_eachArray_fliter,
    ]);

if (0) {
    if (this["XMLHttpRequest"]) {
        test.add([ testMissableRecover ]);
    }
    if (this["Promise"]) {
        test.add([ test500PromiseBench ]);
    }
    test.add([ test500TaskBench ]);
}

// --- test cases ------------------------------------------
function testNoArguments(test, pass, miss) {
    var task = new Task();

    task.pass();
    test.done(pass());
}

function testPassWithoutArgument(test, pass, miss) {
    var task = new Task("testPassWithoutArgument", 2, callback);

    task.pass();
    task.pass(); // -> done
    task.buffer.push("ignore"); task.pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []
        if (err === null && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testMissWithoutArgument(test, pass, miss) {
    var task = new Task("testMissWithoutArgument", 2, callback);

    task.miss();
    task.miss(); // -> done
    task.buffer.push("ignore"); task.miss(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err instanceof Error && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testExitWithoutArgument(test, pass, miss) {
    var task = new Task("testExitWithoutArgument", 2, callback);

    task.exit(); // -> done
    task.buffer.push("ignore"); task.pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err instanceof Error && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testPassWithObjectKey(test, pass, miss) {
    var task = new Task("testPassWithObjectKey", 4, callback);

    task.buffer.push(0);    task.pass();
    task.buffer["one"] = 1; task.pass();
    task.buffer["two"] = 2; task.pass();
    task.buffer.push(3);    task.pass();

    function callback(err, buffer) { // buffer = [0, 3] + { one: 1, two: 2 },

        var flattenValues = Array.from(buffer); // [0, 3]
        var buffer_left = JSON.stringify(_array_toObject(buffer)); // { "0": 0, "1": 3, "one": 1, "two": 2 }

        if (err === null &&
            flattenValues.join() === [0, 3].join() &&
            buffer_left === JSON.stringify({ "0": 0, "1": 3, "one": 1, "two": 2 })) {

            test.done(pass());
        } else {
            test.done(miss());
        }
    }
    function _array_toObject(array) {
        var result = {};
        var keys = Object.keys(array);
        for (var i = 0, iz = keys.length; i < iz; ++i) {
            var key = keys[i];
            var value = array[key];
            result[key] = value;
        }
        return result;
    }
}

function Object_toArray(source) { // @arg Array|ArrayLikeObject
                                  // @ret Array
    return Array.prototype.slice.call(source);
}
function Array_toObject(source) { // @arg Array
                                  // @ret Object
    return Object.keys(source).reduce(function(result, key) {
        result[key] = source[key];
        return result;
    }, {});
}

function testExecuteSyncAndAsyncTask(test, pass, miss) { // task sync 4 events
    var task = new Task("testExecuteSyncAndAsyncTask", 4, callback);
    var testResult = [1, 2, 3, 4];

    // sync task
    [1,2,3].forEach(function(value) {
        //console.log("testExecuteSyncAndAsyncTask: " + value);
        task.buffer.push(value); task.pass();
    });

    // async task
    setTimeout(function() {
        //console.log("testExecuteSyncAndAsyncTask: " + 4);
        task.buffer.push(4); task.pass();
    }, 100);

    setTimeout(function() {
        if (!task.finished) {
            //console.log("testExecuteSyncAndAsyncTask: " + "timeout");
            task.miss();
        }
    }, 1000);

    function callback(err, buffer) { // err = null, buffer = [1,2,3,4]
        if ( buffer.join() === testResult.join() ) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testMissable(test, pass, miss) {
    var task = new Task("testMissable", 4, callback);

    task.missable = 2;

    var time1 = Math.random() * 10;
    var time2 = Math.random() * 10;
    var time3 = Math.random() * 10;
    var time4 = Math.random() * 10;
    var time5 = Math.random() * 10;
    var time6 = Math.random() * 10;


    setTimeout(function() { task.buffer.push(1); task.pass(); }, time1);
    setTimeout(function() { task.buffer.push(2); task.pass(); }, time2);
    setTimeout(function() { task.buffer.push(3); task.pass(); }, time3);
    setTimeout(function() { task.buffer.push(4); task.miss(); }, time4);
    setTimeout(function() { task.buffer.push(5); task.miss(); }, time5);
    setTimeout(function() { task.buffer.push(6); task.pass(); }, time6);

    // watch dog timer
    setTimeout(function() { task.exit(); }, 1000 * 10); // 10sec

    function callback(err, buffer) {
        if (err) {
            console.log("testMissable times: ", time1, time2, time3, time4, time5, time6);
            console.log( JSON.stringify(Task.dump(), null, 2) );
            test.done(miss());
        } else {
            test.done(pass());
        }
    }
}

function testMissableRecover(test, pass, miss) {
    var task = new Task("testMissableRecover", 1, callback);

    task.missable = 2;

    download(["http://cdn1.example.com/image.png",
              "http://cdn2.example.com/image.png",
              "ok"], task);

    function download(urls, task) {
        var xhr = new XMLHttpRequest();

        xhr.onload = function() {
            task.pass();
        };
        xhr.onerror = function() {
            task.miss();
            if ( !task.finished ) {
                download(urls, task);
            }
        };

        // for test code
        if (urls[0] === "ok") {
            task.pass();
            return;
        }

        xhr.open("GET", urls.shift(), true);
        xhr.send()
    }

    function callback(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    }
}

function testMessageFromString(test, pass, miss) {
    var task = new Task("testMessageFromString", 1, callback);
    var error = new TypeError("O_o");

    task.message(error.message);
    task.miss();

    function callback(err, buffer) {
        if (err) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testMessageFromError(test, pass, miss) {
    var task = new Task("testMessageFromError", 1, callback);
    var error = new TypeError("O_o");

    //task.message(error);
    //task.miss();
    task.done(error);

    function callback(err, buffer) {
        if (err) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testBufferKeyAccess(test, pass, miss) {
    var task4 = new Task("testBufferKeyAccess", 3, function(err, buffer) { // ["value0"] + { key1: "value1", key2: "value2" }
            var buf = buffer;

            if (buf[0] === "value0" &&
                buf.length === 1 &&
                buf.key1 === "value1" &&
                buf.key2 === "value2") {

                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    task4.buffer["key1"] = "value1"; task4.pass(); // { key1: "value1" }
    task4.buffer["key2"] = "value2"; task4.pass(); // { key2: "value2" }
    task4.buffer.push("value0"); task4.pass();
}

function testBufferPushPopShiftUnshift(test, pass, miss) {
    var task5 = new Task("testBufferPushPopShiftUnshift", 1, function(err, buffer) {
            var buf = buffer;

            if (buf.length === 4 &&
                buf[0] === 5 &&
                buf[1] === 4 &&
                buf[2] === 2 &&
                buf[3] === 3) {

                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    task5.buffer.push(0);      // []      -> [0]
    task5.buffer.pop();        // [0]     -> []
    task5.buffer.unshift(1);   // []      -> [1]
    task5.buffer.shift();      // [1]     -> []
    task5.buffer.push(2);      // []      -> [2]
    task5.buffer.push(3);      // [2]     -> [2,3]
    task5.buffer.unshift(4);   // [2,3]   -> [4,2,3]
    task5.buffer.unshift(5);   // [4,2,3] -> [5,4,2,3]

    if (task5.buffer.join() === "5,4,2,3") {
        task5.pass();
    } else {
        task5.miss();
    }
}

function testFinisedAndFailureMessage(test, pass, miss) {
    var task = new Task("testFinisedAndFailureMessage", 1, function(err,    // Error("fail reason")
                                                                    buffer) { // ["value"] + { key: "value" }
            if (err && err.message === "fail reason") {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });


//  task.message("ignore").
//       message("fail reason").set("key", "value").miss(); // { key: "value" }
    task.buffer["key"] = "value";
    task.done(new Error("fail reason"));
}

function testJunctionSuccess(test, pass, miss) {
    var junction = new Task("testJunctionSuccess", 2, function(err, buffer) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var task1 = new Task("testJunctionSuccess-1", 2, junction);
    var task2 = new Task("testJunctionSuccess-2", 2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
}

function testJunctionFail(test, pass, miss) {
    var junction = new Task("testJunctionFail", 2, function(err) {
            if (err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var task1 = new Task("testJunctionFail-1", 2, junction);
    var task2 = new Task("testJunctionFail-2", 2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.miss(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.miss(); }, Math.random() * 1000);
}

function testJunctionWithSelfSharedBuffer(test, pass, miss) {
    function callback(err, buffer) { // [1,2,3,4]

        if (buffer.sort().join() === "1,2,3,4") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }

    var taskBuffer = [];

    var junction = new Task("testJunctionWithSelfSharedBuffer-j", 2, callback);
    var task1    = new Task("testJunctionWithSelfSharedBuffer-1", 2, junction);
    var task2    = new Task("testJunctionWithSelfSharedBuffer-2", 2, junction);

    junction.buffer = taskBuffer;
    task1.buffer = taskBuffer;
    task2.buffer = taskBuffer;

    setTimeout(function() { task1.buffer.push(1); task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.buffer.push(2); task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.buffer.push(3); task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.buffer.push(4); task2.pass(); }, Math.random() * 1000);
}

function testJunctionWithSharedBuffer(test, pass, miss) {
    function callback(err, buffer) { // [1,2,3,4]

        if (buffer.sort().join() === "1,2,3,4") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }

    var junction = new Task("testJunctionWithSharedBuffer-j", 2, callback);
    var task1    = new Task("testJunctionWithSharedBuffer-1", 2, junction);
    var task2    = new Task("testJunctionWithSharedBuffer-2", 2, junction);

    setTimeout(function() { task1.buffer.push(1); task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.buffer.push(2); task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.buffer.push(3); task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.buffer.push(4); task2.pass(); }, Math.random() * 1000);
}

function testJunctionWithSharedBuffer2(test, pass, miss) {
    function callback(err,      // null
                      buffer) { // [ "SHARE PAYLOAD", 1.1, 2.2, 3.3, 4.4 ] + { a: 1, b: 2, c: 3, d: 4 }

        if (buffer.join() === "SHARE PAYLOAD,1.1,2.2,3.3,4.4") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }

  //var taskBuffer = [];
  //var junction = new Task(2, callback, { buffer: taskBuffer });
    var junction = new Task("testJunctionWithSharedBuffer2-j", 2, callback);

    junction.buffer.push("SHARE PAYLOAD");

  //var task1 = new Task(2, junction, { buffer: taskBuffer });
  //var task2 = new Task(2, junction, { buffer: taskBuffer });
    var task1 = new Task("testJunctionWithSharedBuffer2-1", 2, junction);
    var task2 = new Task("testJunctionWithSharedBuffer2-2", 2, junction);

    task1.buffer.push(1.1); task1.buffer["a"] = 1; task1.pass();
    task1.buffer.push(2.2); task1.buffer["b"] = 2; task1.pass();
    task2.buffer.push(3.3); task2.buffer["c"] = 3; task2.pass();
    task2.buffer.push(4.4); task2.buffer["d"] = 4; task2.pass();
}

/*
function testCallback3rdArgIsTaskInstance(test, pass, miss) {
    function callback(err, buffer) {

        if (task === junction) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
    var junction = new Task(2, callback);
    var task1 = new Task(1, junction);
    var task2 = new Task(1, junction);

    task1.pass();
    task2.pass();
}
 */

function testDump(test, pass, miss) {
    function callback(err, buffer) {
    }

  //Task.drop();

    var task1 = new Task("testDump-1", 1, callback);
    var task2 = new Task("testDump-2", 1, callback);
    var task3 = new Task("testDump-3", 1, callback);

    var result = Task.dump();

    console.log(result);
    test.done(pass());
}

function testDrop(test, pass, miss) {
    function callback(err, buffer) {
    }
    var task1 = new Task("testDrop-1", 1, callback);
    var task2 = new Task("testDrop-2", 1, callback);
    var task3 = new Task("testDrop-3", 1, callback);

    Task.drop();

    var result = Task.dump();

    test.done(pass());
}

function testZeroTaskCount(test, pass, miss) {
    function callback(err, buffer) {
        if (!err && buffer[0] === "OK") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
    var task1 = new Task("testZeroTaskCount", 0, callback); // taskCount = 0;

    setTimeout(function() {
        task1.buffer.push("OK");
        task1.pass();
    }, 2000);
}

function testSharedBuffer(test, pass, miss) {
    var taskMap = {
            task1: function(task) { task.buffer["key1"] = "value"; task.pass(); },
            task2: function(task) { task.buffer.push("value2");    task.pass(); },
        };

    var junction = new Task("testSharedBuffer", 2, function(err, buffer, junction) {
            if (_array_flatten(buffer).join() === "value2,value2") {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    TaskMap("testSharedBuffer-1", "task1 > 1000 > task2", taskMap, junction);
    TaskMap("testSharedBuffer-2", "task1 > task2 > 1000", taskMap, junction);

    function _array_flatten(array) {
        return Array.prototype.concat.apply([], array);
    }
}
function Array_flatten(that) { // @ret Array
    return Array.prototype.concat.apply([], that);
}

function testNoTask(test, pass, miss) {
    try {
        TaskMap("testNoTask", " > ", {

        }, function() {
        });

        test.done(pass());
    } catch(o_o) {
        test.done(miss());
    }
}

function testTaskCancel(test, pass, miss) {

    var task = TaskMap("testTaskCancel", "1000 > 1000 > 1000", {

    }, function(err, buffer) {
        if (err && err.message === "exit task") { // exit task
            test.done(pass());
        } else {
            test.done(miss());
        }
    });
    // task cancel(error exit)
    setTimeout(function() {
        console.log("1000ms after...");
      //task.message("exit task").exit();
        task.error = new Error("exit task");
        task.exit();
    }, 1000);
}

function testBasicFunction(test, pass, miss) {

    var route = "";

    TaskMap("testBasicFunction",
            "task_a > task_b > task_c", {
        task_a: function(task) { route += "a"; task.pass(); },
        task_b: function(task) { route += "b"; route === "ab" ? task.pass()
                                                              : task.miss(); },
        task_c: function(task) { route += "c"; route === "abc" ? task.pass()
                                                               : task.miss(); },
    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}

function testParallelExecution(test, pass, miss) {

    var route = "";

    TaskMap("testParallelExecution",
            "task_a > task_b + task_c + task_d > task_e", {
        task_a: function(task) { route += "a"; task.pass(); },
        task_b: function(task) { route += "b"; /[a]/.test(route) ? task.pass()
                                                                 : task.miss(); },
        task_c: function(task) { route += "c"; /[a]/.test(route) ? task.pass()
                                                                 : task.miss(); },
        task_d: function(task) { route += "d"; /[a]/.test(route) ? task.pass()
                                                                 : task.miss(); },
        task_e: function(task) { route += "e"; route.split("").sort().join("") === "abcde" ? task.pass()
                                                                                           : task.miss() },
    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}

function testDelay(test, pass, miss) {

    var route = "";
    var last = 0;

    TaskMap("testDelay",
            "task_a > 1000 > task_b", {
        task_a: function(task) { last = Date.now(); task.pass(); },
        task_b: function(task) { Date.now() - last ? task.pass() : task.miss() },
    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}

function testZeroDelay(test, pass, miss) {

    TaskMap("testZeroDelay", "0 > 0 > 0", {

    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}

/*
function testArrayTask(test, pass, miss) {

    var route = "";

    TaskMap("testArrayTask", "", [
        function(task) { route += "a"; task.pass(); },
        function(task) { route += "b"; route === "ab" ? task.pass()
                                                      : task.miss(); },
        function(task) { route += "c"; route === "abc" ? task.pass()
                                                       : task.miss(); },
    ], function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}
 */

/*
function testArrayWithRoute(test, pass, miss) {

    var route = "";

    TaskMap("testArrayWithRoute", "0 > 2 > 1", [
        function(task) { route += "a"; task.pass(); },
        function(task) { route += "b"; route === "acb" ? task.pass()
                                                       : task.miss(); },
        function(task) { route += "c"; route === "ac" ? task.pass()
                                                      : task.miss(); },
    ], function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}
 */


function testMapWithoutRoute(test, pass, miss) {

    var route = "";

    TaskMap("testMapWithoutRoute", "task_a > task_c > task_b", {
        task_a: function(task) { route += "a"; task.pass(); },
        task_b: function(task) { route += "b"; route === "acb" ? task.pass()
                                                               : task.miss(); },
        task_c: function(task) { route += "c"; route === "ac" ? task.pass()
                                                              : task.miss(); },
    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}


function testArg(test, pass, miss) {

    var route = "";

    TaskMap("testArg", "task_a > task_c > task_b", {
        arg: { a: 1, b: 2, c: 3 },
        task_a: function(task) { route += this.arg.a; task.pass(); },
        task_b: function(task) { route += this.arg.b; route === "132" ? task.pass()
                                                                      : task.miss(); },
        task_c: function(task) { route += this.arg.c; route === "13" ? task.pass()
                                                                     : task.miss(); },
    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}

function testThrowTask(test, pass, miss) {
    var errorMessage = "throw! throw!";

    function callback(err, buffer) {
        if (err && err.message === errorMessage) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }

    TaskMap("testThrowTask", "task_a > task_b", {
        task_a: function(task) {
            throw new TypeError(errorMessage);
        },
        task_b: function(task) {
            task.pass();
        },
    }, callback);
}


function test500TaskBench(test, pass, miss) {

    function callback(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            console.log("test500TaskBench: " + (Date.now() - time));
            test.done(pass());
        }
    }

    // create task
    var tasks = 500;
    var taskMap = {};
    for (var i = 0; i < tasks; ++i) {
        taskMap[i] = function(task) { task.pass(); };
    }

    var time = Date.now();

    TaskMap("test500TaskBench", Object.keys(taskMap).join(" > "), taskMap, callback);
}

function test500PromiseBench(test, pass, miss) {

    function callback() {
        console.log("test500PromiseBench: " + (Date.now() - time));
        test.done(pass());
    }

    // create task
    var tasks = 500;
    var taskMap = [];
    for (var i = 0; i < tasks; ++i) {
        taskMap[i] = function() {
            new Promise(function(resolve, reject) {
                resolve();
            });
        };
    }

    var time = Date.now();

    Promise.all(taskMap).then(callback);
}

function testClosureFunction(test, pass, miss) {
    var task = new Task("testClosureFunction", 2, function(error) {
                if (error) {
                    test.done(miss());
                } else {
                    test.done(pass());
                }
            });

    task.missable = 1;

/*
    var passfn = task.passfn();
    var missfn = task.missfn();
 */
    var passfn = task.passfn;
    var missfn = task.missfn;

    missfn();
    passfn();
    passfn();
}

function testClosureFunctionDone(test, pass, miss) {
    var task = new Task("testClosureFunctionDone", 1, function(error) {
                if (error) {
                    test.done(pass());
                } else {
                    test.done(miss());
                }
            });

    var donefn = task.donefn;

    donefn(new Error());
}

function testREADME1(test, pass, miss) {
    var task = new Task("MyTask", 2, function(error, buffer) {
            console.log(buffer.join(" ")); // "Hello Task.js"
            console.log(task.name + " " + task.state + "ed"); // "MyTask passed"
            test.done(pass());
        });
    task.buffer.push("Hello");
    task.buffer.push("Task.js");
    task.pass();
    task.pass();
}

function testREADME2(test, pass, miss) {
    var task = new Task("Junction", 2, function(error) {
        console.log("finished");
        test.done(pass());
    });
    var sub1 = new Task("SubTask1", 1, task);
    var sub2 = new Task("SubTask2", 1, task);

    sub1.pass();
    sub2.pass(); // -> "finished"
}

function testREADME3(test, pass, miss) {

    TaskMap("MyTaskMap", "a > 1000 > b + c > d", {
            arg: ["red", "green", "blue", "black"],
            a: function(task, index) {
                task.buffer.push(this.arg[0]); task.pass();
            },
            b: function(task, index) {
                task.buffer.push(this.arg[1]); task.pass();
            },
            c: function(task, index) {
                task.buffer.push(this.arg[2]); task.pass();
            },
            d: function(task, index) {
                task.buffer.push(this.arg[3]); task.pass();
            },
        }, function(error, buffer) {
            console.log(buffer.join()); // "red,green,blue,black"
            test.done(pass());
        });
}

function testUnicodeIdentify(test, pass, miss) {
    var map = {
        "麺ゆでる": function(task) { console.log("麺を茹でた"); task.pass(); },
        "盛り付け": function(task) { console.log("器に盛りつけた"); task.pass(); },
        "餃子": function(task) { console.log("餃子焼いた"); task.pass(); },
        "炒飯": function(task) { console.log("炒飯作った"); task.pass(); },
    };

    var order = new Task("🍜セットのオーダー入りました", 2, function(error) {
        // (麺ゆでる > 盛り付け) + (餃子 + 炒飯) が終わったら、お客様に出します
        console.log("😃 お待たせしました、🍜セットです");
        test.done(pass());
    });

    TaskMap("ラーメン作る",   "麺ゆでる > 盛り付け", map, order); // 麺ゆでる を実行後に 盛り付け を実行
    TaskMap("餃子と炒飯作る", "餃子 + 炒飯",         map, order); // 餃子 と 炒飯 を並列に調理}
}

function testTaskMap_allow(test, pass, miss) {
    var map = {
        "麺ゆでる": function(task) { console.log("麺を茹でた"); task.pass(); },
        "盛り付け": function(task) { console.log("器に盛りつけた"); task.pass(); },
        "餃子": function(task) { console.log("餃子焼いた"); task.pass(); },
        "炒飯": function(task) { console.log("炒飯作った"); task.pass(); },
    };

    var order = new Task("🍜セットのオーダー入りました", 2, function(error) {
        // (麺ゆでる -> 盛り付け) + (餃子 + 炒飯) が終わったら、お客様に出します
        console.log("😃 お待たせしました、🍜セットです");
        test.done(pass());
    });

    TaskMap("ラーメン作る",   "麺ゆでる -> 盛り付け", map, order); // 麺ゆでる を実行後に 盛り付け を実行
    TaskMap("餃子と炒飯作る", "餃子 + 炒飯",         map, order); // 餃子 と 炒飯 を並列に調理}
}

function testTaskMap_eachObject(test, pass, miss) {
    var source = { a: 1, b: 2, c: 3 };
    var result = {};

    TaskMap.each("testTaskMap_eachObject", source, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else if (JSON.stringify(result) === JSON.stringify(source)) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function(task, key, source) {
        result[key] = source[key];
        task.pass();
    });
}

function testTaskMap_eachArray(test, pass, miss) {
    var source = [1, 2, 3];
    var result = [];

    TaskMap.each("testTaskMap_eachArray", source, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else if (JSON.stringify(result) === JSON.stringify(source)) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function(task, key, source) {
        result[key] = source[key];
        task.pass();
    });
}

function testTaskMap_eachObject_tickThis(test, pass, miss) {
    var source = { a: 1, b: 2, c: 3 };
    var result = {};
    var options = { tickThis: { zero: 0 } };

    TaskMap.each("testTaskMap_eachObject_tickThis", source, function finishedCallback(err, buffer) {
        if (err) {
            test.done(miss());
        } else if (JSON.stringify(result) === JSON.stringify({ a: 0, b: 0, c: 0 })) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function tickCallback(task, key, source) {
        result[key] = source[key] * this.zero; // tick_this = { zero: 0 }
        task.pass();
    }, options);
}

function testTaskMap_eachArray_tickThis(test, pass, miss) {
    var source = [1, 2, 3];
    var result = [];
    var options = { tickThis: { zero: 0 } };

    TaskMap.each("testTaskMap_eachArray_tickThis", source, function finishedCallback(err, buffer) {
        if (err) {
            test.done(miss());
        } else if (JSON.stringify(result) === JSON.stringify([0,0,0])) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function tickCallback(task, key, source) {
        result[key] = source[key] * this.zero; // tick_this = { zero: 0 }
        task.pass();
    }, options);
}

function testTaskMap_eachArray_sleep_20(test, pass, miss) {
    var source    = [1, 2, 3];
    var options   = { sleep: 20 };
    var startTime = Date.now();
  //var flow      = "_ > 20 > _ > 20 > _";

    TaskMap.each("testTaskMap_eachArray_sleep_20", source, function finishedCallback(err, buffer) {
        if (err) {
            test.done(miss());
        } else if (Date.now() - startTime >= 40) { // 20ms x 2 = 40ms
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function tickCallback(task, key, source) {
        task.pass();
    }, options);
}

function testTaskMap_eachArray_fliter(test, pass, miss) {
    var source    = [1, 2, 3]; // keys: ["0", "1", "2"]
    var result    = [];
    var options   = {
        filter: function(keys) {
            return ["0", "2"]; // ignore key:1
        }
    };

    TaskMap.each("testTaskMap_eachArray_filter", source, function finishedCallback(err, buffer) {
        if (err) {
            test.done(miss());
        } else if (result.join(",") === "0,2") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }, function tickCallback(task, key, source) {
        result.push(key);
        task.pass();
    }, options);
}


return test.run();

})(GLOBAL);

