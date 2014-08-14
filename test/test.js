var ModuleTestTask = (function(global) {

var test = new Test("Task", {
        disable:    false,
        browser:    true,
        worker:     true,
        node:       true,
        button:     true,
        both:       true,
    }).add([
        // --- Task ---
        testPassWithoutArgument,
        testMissWithoutArgument,
        testExitWithoutArgument,
        testPassWithObjectKey,
        testExecuteSyncAndAsyncTask,
        testMissable,
        testMessageFromString,
        testMessageFromError,
        testBufferKeyAccess,
        testFinisedAndFailureMessage,
        testJunctionSuccess,
        testJunctionFail,
        testJunctionWithSelfSharedBuffer,
        testJunctionWithSharedBuffer,
        testJunctionWithSharedBuffer2,
//      testCallback3rdArgIsTaskInstance,
        testDump,
        testDumpAll,
        testDumpMissMatch,
        testDrop,
        testZeroTaskCount,
        // --- Task.run ---
        testSharedBuffer,
        testNoTask,
        testTaskCancel,
        testBasicFunction,
        testParallelExecution,
        testDelay,
        testZeroDelay,
        testArrayTask,
        testArrayWithRoute,
        testMapWithoutRoute,
        testArg,
        testThrowTask,
        testLoopObject,
        testLoopArray,
        // --- mix ---
        testOmitCallback,
        // --- TaskPassFunction, TaskMissFunction ---
        testClosureFunction,
    ]);

    if (this["XMLHttpRequest"]) {
        test.add([ testMissableRecover ]);
    }
    if (this["Promise"]) {
        test.add([ test500PromiseBench ]);
    }
    test.add([ test500TaskBench ]);

return test.run().clone();

/*
function testPassWithoutArgument(test, pass, miss) {
    var task = new Task(2, callback, { name: "testPassWithoutArgument" });

    task.pass();
    task.pass(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err === null && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}
 */
function testPassWithoutArgument(test, pass, miss) {
    var task = new Task(2, callback, { name: "testPassWithoutArgument" });

    task.pass();
    task.pass(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []
        if (err === null && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testMissWithoutArgument(test, pass, miss) {
    var task = new Task(2, callback, { name: "testMissWithoutArgument" });

    task.miss();
    task.miss(); // -> done
    task.push("ignore").miss(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err instanceof Error && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testExitWithoutArgument(test, pass, miss) {
    var task = new Task(2, callback, { name: "testExitWithoutArgument" });

    task.exit(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err instanceof Error && buffer.join() === "") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testPassWithObjectKey(test, pass, miss) {
    var task = new Task(4, callback, { name: "testPassWithObjectKey" });

    task.push(0).pass();
    task.set("one", 1).pass();
    task.set("two", 2).pass();
    task.push(3).pass();

    function callback(err, buffer) { // buffer = [0, 3] + { one: 1, two: 2 },

        var flattenValues = Task.arraynize(buffer); // [0, 3]
        var buffer_left = JSON.stringify(Task.objectize(buffer)); // { "0": 0, "1": 3, "one": 1, "two": 2 }

        if (err === null &&
            flattenValues.join() === [0, 3].join() &&
            buffer_left === JSON.stringify({ "0": 0, "1": 3, "one": 1, "two": 2 })) {

            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testExecuteSyncAndAsyncTask(test, pass, miss) { // task sync 4 events
    var task = new Task(4, callback, { name: "testExecuteSyncAndAsyncTask" });
    var testResult = [1, 2, 3, 4];

    // sync task
    [1,2,3].forEach(function(value) {
        //console.log("testExecuteSyncAndAsyncTask: " + value);
        task.push(value).pass();
    });

    // async task
    setTimeout(function() {
        //console.log("testExecuteSyncAndAsyncTask: " + 4);
        task.push(4).pass();
    }, 100);

    setTimeout(function() {
        if (!task.isFinished()) {
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
    var task = new Task(4, callback, { name: "testMissable" }).missable(2);

    var time1 = Math.random() * 10;
    var time2 = Math.random() * 10;
    var time3 = Math.random() * 10;
    var time4 = Math.random() * 10;
    var time5 = Math.random() * 10;
    var time6 = Math.random() * 10;


    setTimeout(function() { task.push(1).pass(); }, time1);
    setTimeout(function() { task.push(2).pass(); }, time2);
    setTimeout(function() { task.push(3).pass(); }, time3);
    setTimeout(function() { task.push(4).miss(); }, time4);
    setTimeout(function() { task.push(5).miss(); }, time5);
    setTimeout(function() { task.push(6).pass(); }, time6);

    // watch dog timer
    setTimeout(function() { task.exit(); }, 1000 * 10); // 10sec

    function callback(err, buffer) {
        if (err) {
            console.log("testMissable times: ", time1, time2, time3, time4, time5, time6);
            console.log( JSON.stringify(Task.dump("testMissable"), null, 2) );
            test.done(miss());
        } else {
            test.done(pass());
        }
    }
}

function testMissableRecover(test, pass, miss) {
    var task = new Task(1, callback, { name: "testMissableRecover" }).missable(2);

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
            if ( !task.isFinished() ) {
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
    var task = new Task(1, callback);
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
    var task = new Task(1, callback);
    var error = new TypeError("O_o");

    task.message(error);
    task.miss();

    function callback(err, buffer) {
        if (err) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
}

function testBufferKeyAccess(test, pass, miss) {
    var task4 = new Task(3, function(err, buffer) { // ["value0"] + { key1: "value1", key2: "value2" }
            var buf = buffer;

            if (buf[0] === "value0" &&
                buf.length === 1 &&
                buf.key1 === "value1" &&
                buf.key2 === "value2") {

                test.done(pass());
            } else {
                test.done(miss());
            }
        }, { name: "testBufferKeyAccess" });

    task4.set("key1", "value1").pass(); // { key1: "value1" }
    task4.set("key2", "value2").pass(); // { key2: "value2" }
    task4.push("value0").pass();
}

function testFinisedAndFailureMessage(test, pass, miss) {
    var task = new Task(1, function(err,    // Error("fail reason")
                                    buffer) { // ["value"] + { key: "value" }
            if (err && err.message === "fail reason") {
                test.done(pass());
            } else {
                test.done(miss());
            }
        }, { name: "testFinisedAndFailureMessage" });


    task.message("ignore").
         message("fail reason").set("key", "value").miss(); // { key: "value" }
}

function testJunctionSuccess(test, pass, miss) {
    var junction = new Task(2, function(err, buffer) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        }, { name: "testJunctionSuccess" });

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
}

function testJunctionFail(test, pass, miss) {
    var junction = new Task(2, function(err) {
            if (err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

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

    var junction = new Task(2, callback, { buffer: taskBuffer });
    var task1    = new Task(2, junction, { buffer: taskBuffer });
    var task2    = new Task(2, junction, { buffer: taskBuffer });

    setTimeout(function() { task1.push(1).pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.push(2).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(3).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(4).pass(); }, Math.random() * 1000);
}

function testJunctionWithSharedBuffer(test, pass, miss) {
    function callback(err, buffer) { // [1,2,3,4]

        if (buffer.sort().join() === "1,2,3,4") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }

    var junction = new Task(2, callback);
    var task1    = new Task(2, junction);
    var task2    = new Task(2, junction);

    setTimeout(function() { task1.push(1).pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.push(2).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(3).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(4).pass(); }, Math.random() * 1000);
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
    var junction = new Task(2, callback);

    junction.push("SHARE PAYLOAD");

  //var task1 = new Task(2, junction, { buffer: taskBuffer });
  //var task2 = new Task(2, junction, { buffer: taskBuffer });
    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    task1.push(1.1).set("a", 1).pass();
    task1.push(2.2).set("b", 2).pass();
    task2.push(3.3).set("c", 3).pass();
    task2.push(4.4).set("d", 4).pass();
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

    Task.drop();

    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    var result = Task.dump("task1");

    if (Object.keys(result).length === 3) {
        var r = result[Object.keys(result)[0]];

        if ("junction" in r &&
            "taskCount" in r &&
            "missableCount" in r &&
            "passedCount" in r &&
            "missedCount" in r &&
            "state" in r) {

            test.done(pass());
            return
        }
    }
    test.done(miss());
}

function testDumpAll(test, pass, miss) {
    function callback(err, buffer) {
    }

    Task.drop();
    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    var result = Task.dump();

    if (Object.keys(result).length === 3) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testDumpMissMatch(test, pass, miss) {
    function callback(err, buffer) {
    }
    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    var result = Task.dump("task2");

    if (!Object.keys(result).length) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testDrop(test, pass, miss) {
    function callback(err, buffer) {
    }
    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    Task.drop();
    var result = Task.dump("task2");

    if (!Object.keys(result).length) {
        test.done(pass());
    } else {
        test.done(miss());
    }
}

function testZeroTaskCount(test, pass, miss) {
    function callback(err, buffer) {
        if (!err) {
            test.done(pass());
        } else {
            test.done(miss());
        }
    }
    var task1 = new Task(0, callback);
}

function testSharedBuffer(test, pass, miss) {
    var taskMap = {
            task1: function(task) { task.set("key1", "value"); task.pass(); },
            task2: function(task) { task.push("value2");       task.pass(); },
        };

    var junction = new Task(2, function(err, buffer, junction) {
            if (Task.flatten(buffer).join() === "value2,value2") {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    Task.run("task1 > 1000 > task2", taskMap, junction);
    Task.run("task1 > task2 > 1000", taskMap, junction);
}

function testNoTask(test, pass, miss) {
    try {
        Task.run(" > ", {

        }, function() {
        });

        test.done(pass());
    } catch(o_o) {
        test.done(miss());
    }
}

function testTaskCancel(test, pass, miss) {

    var task = Task.run("1000 > 1000 > 1000", {

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
        task.message("exit task").exit();
    }, 1000);
}

function testBasicFunction(test, pass, miss) {

    var route = "";

    Task.run("task_a > task_b > task_c", {
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

    Task.run("task_a > task_b + task_c + task_d > task_e", {
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

    Task.run("task_a > 1000 > task_b", {
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

    Task.run("0 > 0 > 0", {

    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });
}

function testArrayTask(test, pass, miss) {

    var route = "";

    Task.run("", [
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

function testArrayWithRoute(test, pass, miss) {

    var route = "";

    Task.run("0 > 2 > 1", [
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


function testMapWithoutRoute(test, pass, miss) {

    var route = "";

    Task.run("task_a > task_c > task_b", {
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

    var arg = { a: 1, b: 2, c: 3 };
    var route = "";

    Task.run("task_a > task_c > task_b", {
        task_a: function(task, arg) { route += arg.a; task.pass(); },
        task_b: function(task, arg) { route += arg.b; route === "132" ? task.pass()
                                                                        : task.miss(); },
        task_c: function(task, arg) { route += arg.c; route === "13" ? task.pass()
                                                                       : task.miss(); },
    }, function(err, buffer) {
        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    }, { arg: arg });
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

    Task.run("task_a > task_b", {
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
    var taskMap = [];
    for (var i = 0; i < tasks; ++i) {
        taskMap["task" + i] = function(task) { task.pass(); };
    }

    var time = Date.now();

    Task.run("", taskMap, callback);
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

function testLoopObject(test, pass, miss) {

    var source = { a: 1, b: 2, c: 3 };
    var keys = "";
    var values = "";

    Task.loop(source, _tick, function(err, buffer) {
        if (err || keys !== "abc" || values !== "123") {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });

    function _tick(task, key, source) {
        keys   += key;
        values += source[key];

        task.pass();
    }
}

function testLoopArray(test, pass, miss) {

    var source = ["e1", "e2", "e3"];
    var keys = "";
    var values = "";

    Task.loop(source, _tick, function(err, buffer) {
        if (err || keys !== "012" || values !== "e1e2e3") {
            test.done(miss());
        } else {
            test.done(pass());
        }
    });

    function _tick(task, key, source) {
        keys   += key;
        values += source[key];

        task.pass();
    }
}

function testOmitCallback(test, pass, miss) {

    try {
        var task1 = new Task(1);
        var task2 = Task.run("", {});
        var task3 = Task.loop({}, function(){});

        test.done(pass());
    } catch (o_O) {
        test.done(miss());
    }
}

function testClosureFunction(test, pass, miss) {
    var task = new Task(2, function(error) {
                if (error) {
                    test.done(miss());
                } else {
                    test.done(pass());
                }
            }).missable(1);

    var passfn = task.passfn();
    var missfn = task.missfn();

    missfn();
    passfn();
    passfn();
}

})((this || 0).self || global);

