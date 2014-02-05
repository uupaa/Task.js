new Test().add([
        // --- Task ---
        testPassWithoutArgument,
        testMissWithoutArgument,
        testExitWithoutArgument,
        testPassWithObjectKey,
        testExecuteSyncAndAsyncTask,
        testMissable,
        testBufferKeyAccess,
        testFinisedAndFailureMessage,
        testJunctionSuccess,
        testJunctionFail,
        testJunctionWithSelfSharedBuffer,
        testJunctionWithSharedBuffer,
        testJunctionWithSharedBuffer2,
        testCallback3rdArgIsTaskInstance,
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
        testArgs,
        testThrowTask,
    ]).run()
      .worker(function(err, test) {
        if (!err) {
            var undo = Test.swap(Task, Task_);

            new Test(test).run(function(err, test) {
                undo = Test.undo(undo);
            });
        }
    });

function testPassWithoutArgument(next) {
    var task = new Task(2, callback, { name: "testPassWithoutArgument" });

    task.pass();
    task.pass(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err === null && buffer.join() === "") {
            console.log("testPassWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testPassWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testMissWithoutArgument(next) {
    var task = new Task(2, callback, { name: "testMissWithoutArgument" });

    task.miss();
    task.miss(); // -> done
    task.push("ignore").miss(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err instanceof Error && buffer.join() === "") {
            console.log("testMissWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testMissWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testExitWithoutArgument(next) {
    var task = new Task(2, callback, { name: "testExitWithoutArgument" });

    task.exit(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err, buffer) { // buffer = []

        if (err instanceof Error && buffer.join() === "") {
            console.log("testExitWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testExitWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testPassWithObjectKey(next) {
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

            console.log("testPassWithObjectKey ok");
            next && next.pass();
        } else {
            console.error("testPassWithObjectKey ng");
            next && next.miss();
        }
    }
}

function testExecuteSyncAndAsyncTask(next) { // task sync 4 events
    var task = new Task(4, callback, { name: "testExecuteSyncAndAsyncTask" });
    var testResult = [1, 2, 3, 4];

    // sync task
    [1,2,3].forEach(function(value) { task.push(value).pass(); });

    // async task
    setTimeout(function() { task.push(4).pass(); }, 100);

    function callback(err, buffer) { // err = null, buffer = [1,2,3,4]
        if ( buffer.join() === testResult.join() ) {
            console.log("testExecuteSyncAndAsyncTask ok");
            next && next.pass();
        } else {
            console.error("testExecuteSyncAndAsyncTask ng");
            next && next.miss();
        }
    }
}

function testMissable(next) {
    var task = new Task(4, callback, { name: "testMissable" }).missable(2);

    setTimeout(function() { task.push(1).pass(); }, Math.random() * 10);
    setTimeout(function() { task.push(2).pass(); }, Math.random() * 10);
    setTimeout(function() { task.push(3).pass(); }, Math.random() * 10);
    setTimeout(function() { task.push(4).miss(); }, Math.random() * 10);
    setTimeout(function() { task.push(5).miss(); }, Math.random() * 10);
    setTimeout(function() { task.push(6).pass(); }, Math.random() * 10);

    function callback(err, buffer) {
        if (err) {
            console.error("testMissable ng");
            next && next.miss();
        } else {
            console.log("testMissable ok");
            next && next.pass();
        }
    }
}

function testBufferKeyAccess(next) {
    var task4 = new Task(3, function(err, buffer) { // ["value0"] + { key1: "value1", key2: "value2" }
            var buf = buffer;

            if (buf[0] === "value0" &&
                buf.length === 1 &&
                buf.key1 === "value1" &&
                buf.key2 === "value2") {

                console.log("testBufferKeyAccess ok");
                next && next.pass();
            } else {
                console.error("testBufferKeyAccess ng");
                next && next.miss();
            }
        }, { name: "testBufferKeyAccess" });

    task4.set("key1", "value1").pass(); // { key1: "value1" }
    task4.set("key2", "value2").pass(); // { key2: "value2" }
    task4.push("value0").pass();
}

function testFinisedAndFailureMessage(next) {
    var task = new Task(1, function(err,    // Error("fail reason")
                                    buffer) { // ["value"] + { key: "value" }
            if (err && err.message === "fail reason") {
                console.log("testFinisedAndFailureMessage ok");
                next && next.pass();
            } else {
                console.error("testFinisedAndFailureMessage ng");
                next && next.miss();
            }
        }, { name: "testFinisedAndFailureMessage" });


    task.message("ignore").
         message("fail reason").set("key", "value").miss(); // { key: "value" }
}

function testJunctionSuccess(next) {
    var junction = new Task(2, function(err, buffer) {
            if (!err) {
                console.log("testJunctionSuccess ok");
                next && next.pass();
            } else {
                console.error("testJunctionSuccess ng");
                next && next.miss();
            }
        }, { name: "testJunctionSuccess" });

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
}

function testJunctionFail(next) {
    var junction = new Task(2, function(err) {
            if (err) {
                console.log("testJunctionFail ok");
                next && next.pass();
            } else {
                console.error("testJunctionFail ng");
                next && next.miss();
            }
        });

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.miss(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.miss(); }, Math.random() * 1000);
}

function testJunctionWithSelfSharedBuffer(next) {
    function callback(err, buffer) { // [1,2,3,4]

        if (buffer.sort().join() === "1,2,3,4") {
            console.log("testJunctionWithSelfSharedBuffer ok");
            next && next.pass();
        } else {
            console.error("testJunctionWithSelfSharedBuffer ng");
            next && next.miss();
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

function testJunctionWithSharedBuffer(next) {
    function callback(err, buffer) { // [1,2,3,4]

        if (buffer.sort().join() === "1,2,3,4") {
            console.log("testJunctionWithSharedBuffer ok");
            next && next.pass();
        } else {
            console.error("testJunctionWithSharedBuffer ng");
            next && next.miss();
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

function testJunctionWithSharedBuffer2(next) {
    function callback(err,    // null
                      buffer, // [ "SHARE PAYLOAD", 1.1, 2.2, 3.3, 4.4 ] + { a: 1, b: 2, c: 3, d: 4 }
                      task) { // junction

        if (buffer.join() === "SHARE PAYLOAD,1.1,2.2,3.3,4.4" &&
            task === junction) {
            console.log("testJunctionWithSharedBuffer2 ok");
            next && next.pass();
        } else {
            console.error("testJunctionWithSharedBuffer2 ng");
            next && next.miss();
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

function testCallback3rdArgIsTaskInstance(next) {
    function callback(err, buffer, task) {

        if (task === junction) {
            console.log("testCallback3rdArgIsTaskInstance ok");
            next && next.pass();
        } else {
            console.error("testCallback3rdArgIsTaskInstance ng");
            next && next.miss();
        }
    }
    var junction = new Task(2, callback);
    var task1 = new Task(1, junction);
    var task2 = new Task(1, junction);

    task1.pass();
    task2.pass();
}

function testDump(next) {
    function callback(err, buffer) {
    }
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

            console.log("testDump ok");
            next && next.pass();
            return
        }
    }
    console.error("testDump ng");
    next && next.miss();
}

function testDumpAll(next) {
    function callback(err, buffer) {
    }

    Task.drop();
    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    var result = Task.dump();

    if (Object.keys(result).length === 3) {
        console.log("testDumpAll ok");
        next && next.pass();
    } else {
        console.error("testDumpAll ng");
        next && next.miss();
    }
}

function testDumpMissMatch(next) {
    function callback(err, buffer) {
    }
    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    var result = Task.dump("task2");

    if (!Object.keys(result).length) {
        console.log("testDumpMissMatch ok");
        next && next.pass();
    } else {
        console.error("testDumpMissMatch ng");
        next && next.miss();
    }
}

function testDrop(next) {
    function callback(err, buffer) {
    }
    var task1 = new Task(1, callback, { name: "task1" });
    var task2 = new Task(1, callback, { name: "task1" });
    var task3 = new Task(1, callback, { name: "task1" });

    Task.drop();
    var result = Task.dump("task2");

    if (!Object.keys(result).length) {
        console.log("testDrop ok");
        next && next.pass();
    } else {
        console.error("testDrop ng");
        next && next.miss();
    }
}

function testZeroTaskCount(next) {
    function callback(err, buffer) {
        if (!err) {
            console.log("testZeroTaskCount ok");
            next && next.pass();
        } else {
            console.error("testZeroTaskCount ng");
            next && next.miss();
        }
    }
    var task1 = new Task(0, callback);
}

function testSharedBuffer(next) {
    var taskMap = {
            task1: function(task) { task.set("key1", "value"); task.pass(); },
            task2: function(task) { task.push("value2");       task.pass(); },
        };

    var junction = new Task(2, function(err, buffer, junction) {
            if (Task.flatten(buffer).join() === "value2,value2") {
                console.log("testSharedBuffer ok");
                next && next.pass();
            } else {
                console.log("testSharedBuffer ng");
                next && next.miss();
            }
        });

    Task.run("task1 > 1000 > task2", taskMap, junction);
    Task.run("task1 > task2 > 1000", taskMap, junction);
}

function testNoTask(next) {
    try {
        Task.run(" > ", {

        }, function() {
        });

        console.log("testNoTask ok");
        next && next.pass();
    } catch(o_o) {
        console.log("testNoTask ng");
        next && next.miss();
    }
}

function testTaskCancel(next) {

    var task = Task.run("1000 > 1000 > 1000", {

    }, function(err, buffer, task) {
        if (err && err.message === "exit task") { // exit task
            console.log("testTaskCancel ok");
            next && next.pass();
        } else {
            console.log("testTaskCancel ng");
            next && next.miss();
        }
    });
    // task cancel(error exit)
    setTimeout(function() {
        console.log("1000ms after...");
        task.message("exit task").exit();
    }, 1000);
}

function testBasicFunction(next) {

    var route = "";

    Task.run("task_a > task_b > task_c", {
        task_a: function(task) { route += "a"; task.pass(); },
        task_b: function(task) { route += "b"; route === "ab" ? task.pass()
                                                              : task.miss(); },
        task_c: function(task) { route += "c"; route === "abc" ? task.pass()
                                                               : task.miss(); },
    }, function(err, buffer, task) {
        if (err) {
            console.log("testBasicFunction ng");
            next && next.miss();
        } else {
            console.log("testBasicFunction ok");
            next && next.pass();
        }
    });
}

function testParallelExecution(next) {

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
    }, function(err, buffer, task) {
        if (err) {
            console.log("testParallelExecution ng");
            next && next.miss();
        } else {
            console.log("testParallelExecution ok");
            next && next.pass();
        }
    });
}

function testDelay(next) {

    var route = "";
    var last = 0;

    Task.run("task_a > 1000 > task_b", {
        task_a: function(task) { last = Date.now(); task.pass(); },
        task_b: function(task) { Date.now() - last ? task.pass() : task.miss() },
    }, function(err, buffer, task) {
        if (err) {
            console.log("testDelay ng");
            next && next.miss();
        } else {
            console.log("testDelay ok");
            next && next.pass();
        }
    });
}

function testZeroDelay(next) {

    Task.run("0 > 0 > 0", {

    }, function(err, buffer, task) {
        if (err) {
            console.log("testZeroDelay ng");
            next && next.miss();
        } else {
            console.log("testZeroDelay ok");
            next && next.pass();
        }
    });
}

function testArrayTask(next) {

    var route = "";

    Task.run("", [
        function(task) { route += "a"; task.pass(); },
        function(task) { route += "b"; route === "ab" ? task.pass()
                                                      : task.miss(); },
        function(task) { route += "c"; route === "abc" ? task.pass()
                                                       : task.miss(); },
    ], function(err, buffer, task) {
        if (err) {
            console.log("testArrayTask ng");
            next && next.miss();
        } else {
            console.log("testArrayTask ok");
            next && next.pass();
        }
    });
}

function testArrayWithRoute(next) {

    var route = "";

    Task.run("0 > 2 > 1", [
        function(task) { route += "a"; task.pass(); },
        function(task) { route += "b"; route === "acb" ? task.pass()
                                                       : task.miss(); },
        function(task) { route += "c"; route === "ac" ? task.pass()
                                                      : task.miss(); },
    ], function(err, buffer, task) {
        if (err) {
            console.log("testArrayWithRoute ng");
            next && next.miss();
        } else {
            console.log("testArrayWithRoute ok");
            next && next.pass();
        }
    });
}


function testMapWithoutRoute(next) {

    var route = "";
    var last = 0;

    Task.run("task_a > task_c > task_b", {
        task_a: function(task) { route += "a"; task.pass(); },
        task_b: function(task) { route += "b"; route === "acb" ? task.pass()
                                                               : task.miss(); },
        task_c: function(task) { route += "c"; route === "ac" ? task.pass()
                                                              : task.miss(); },
    }, function(err, buffer, task) {
        if (err) {
            console.log("testMapWithoutRoute ng");
            next && next.miss();
        } else {
            console.log("testMapWithoutRoute ok");
            next && next.pass();
        }
    });
}


function testArgs(next) {

    var args = { a: 1, b: 2, c: 3 };
    var route = "";
    var last = 0;

    Task.run("task_a > task_c > task_b", {
        task_a: function(task, args) { route += args.a; task.pass(); },
        task_b: function(task, args) { route += args.b; route === "132" ? task.pass()
                                                                        : task.miss(); },
        task_c: function(task, args) { route += args.c; route === "13" ? task.pass()
                                                                       : task.miss(); },
    }, function(err, buffer, task) {
        if (err) {
            console.log("testArgs ng");
            next && next.miss();
        } else {
            console.log("testArgs ok");
            next && next.pass();
        }
    }, { args: args });
}

function testThrowTask(next) {
    var errorMessage = "throw! throw!";

    function callback(err, buffer) {
        if (err && err.message === errorMessage) {
            console.log("testThrowTask ok");
            next && next.pass();
        } else {
            console.error("testThrowTask ng");
            next && next.miss();
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


