new Test().add([
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
        testJunctionWithSharedBuffer,
        testJunctionWithSharedBuffer2,
        testJunctionShareBufferAndClear,
        testCallback3rdArgIsTaskInstance,
        testDump,
        testDumpAll,
        testDumpMissMatch,
        testDrop,
        testZeroTaskCount,
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
    var task = new Task(2, callback, { prefix: "testPassWithoutArgument" });

    task.pass();
    task.pass(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err,      // err = null,
                      buffer) { // buffer = []

        if (err === null && buffer.get().join() === "") {
            console.log("testPassWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testPassWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testMissWithoutArgument(next) {
    var task = new Task(2, callback, { prefix: "testMissWithoutArgument" });

    task.miss();
    task.miss(); // -> done
    task.push("ignore").miss(); // ignore arguments

    function callback(err,      // err = null,
                      buffer) { // buffer = []

        if (err instanceof Error && buffer.get().join() === "") {
            console.log("testMissWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testMissWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testExitWithoutArgument(next) {
    var task = new Task(2, callback, { prefix: "testExitWithoutArgument" });

    task.exit(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err,      // err = null,
                      buffer) { // buffer = []

        if (err instanceof Error && buffer.get().join() === "") {
            console.log("testExitWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testExitWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testPassWithObjectKey(next) {
    var task = new Task(4, callback, { prefix: "testPassWithObjectKey" });

    task.push(0).pass();
    task.set("one", 1).pass();
    task.set("two", 2).pass();
    task.push(3).pass();

    function callback(err,      // err = null,
                      buffer) { // buffer = [0, 3] + { one: 1, two: 2 },

        var flattenValues = buffer.arraynize(); // [0, 3]
        var buffer_left = JSON.stringify(buffer.objectize()); // { "0": 0, "1": 3, "one": 1, "two": 2 }

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
    var task = new Task(4, callback, { prefix: "testExecuteSyncAndAsyncTask" });
    var testResult = [1, 2, 3, 4];

    // sync task
    [1,2,3].forEach(function(value) { task.push(value).pass(); });

    // async task
    setTimeout(function() { task.push(4).pass(); }, 100);

    function callback(err, buffer) { // err = null, buffer = [1,2,3,4]
        if ( buffer.get().join() === testResult.join() ) {
            console.log("testExecuteSyncAndAsyncTask ok");
            next && next.pass();
        } else {
            console.error("testExecuteSyncAndAsyncTask ng");
            next && next.miss();
        }
    }
}

function testMissable(next) {
    var task = new Task(4, callback, { prefix: "testMissable" }).missable(2);

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
    var task4 = new Task(3, function(err,
                                     buffer) { // ["value0"] + { key1: "value1", key2: "value2" }
            var buf = buffer.get();

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
        }, { prefix: "testBufferKeyAccess" });

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
        }, { prefix: "testFinisedAndFailureMessage" });


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
        }, { prefix: "testJunctionSuccess" });

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

function testJunctionWithSharedBuffer(next) {
    function callback(err,      // null
                      buffer) { // [1,2,3,4]

        if (buffer.get().sort().join() === "1,2,3,4") {
            console.log("testJunctionWithSharedBuffer ok");
            next && next.pass();
        } else {
            console.error("testJunctionWithSharedBuffer ng");
            next && next.miss();
        }
    }

    var buffer = new MappedArray();

    var junction = new Task(2, callback, { buffer: buffer });
    var task1    = new Task(2, junction, { buffer: buffer });
    var task2    = new Task(2, junction, { buffer: buffer });

    setTimeout(function() { task1.push(1).pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.push(2).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(3).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(4).pass(); }, Math.random() * 1000);
}

function testJunctionWithSharedBuffer2(next) {
    function callback(err,    // null
                      buffer, // [ "SHARE PAYLOAD", 1.1, 2.2, 3.3, 4.4 ] + { a: 1, b: 2, c: 3, d: 4 }
                      task) { // junction

        if (buffer.get().join() === "SHARE PAYLOAD,1.1,2.2,3.3,4.4" &&
            task === junction) {
            console.log("testJunctionWithSharedBuffer2 ok");
            next && next.pass();
        } else {
            console.error("testJunctionWithSharedBuffer2 ng");
            next && next.miss();
        }
    }

    var buffer = new MappedArray();

    var junction = new Task(2, callback, { buffer: buffer });

    junction.push("SHARE PAYLOAD");

    var task1 = new Task(2, junction, { buffer: buffer });
    var task2 = new Task(2, junction, { buffer: buffer });

    task1.push(1.1).set("a", 1).pass();
    task1.push(2.2).set("b", 2).pass();
    task2.push(3.3).set("c", 3).pass();
    task2.push(4.4).set("d", 4).pass();
}

function testJunctionShareBufferAndClear(next) {
    function callback(err,     // null
                      buffer,  // [ 4.4 ] + { d: 4 }
                      task) {  // junction

        if (task === junction &&
            buffer.get().join() === "4.4" &&
            buffer.get().d === 4) {
            console.log("testJunctionShareBufferAndClear ok");
            next && next.pass();
        } else {
            console.error("testJunctionShareBufferAndClear ng");
            next && next.miss();
        }
    }

    var buffer = new MappedArray();

    var junction = new Task(2, callback, { buffer: buffer });

    junction.push("SHARE PAYLOAD");

    var task1 = new Task(2, junction, { buffer: buffer });
    var task2 = new Task(2, junction, { buffer: buffer });

    task1.push(1.1).set("a", 1).pass();
    task1.push(2.2).set("b", 2).pass();
    task2.push(3.3).set("c", 3).pass();
    task2.buffer().clear();
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
    var task1 = new Task(1, callback, { prefix: "task1" });
    var task2 = new Task(1, callback, { prefix: "task1" });
    var task3 = new Task(1, callback, { prefix: "task1" });

    var result = Task.dump("task1");

    if (result) {
        console.log("testDump ok");
        next && next.pass();
    } else {
        console.error("testDump ng");
        next && next.miss();
    }
}

function testDumpAll(next) {
    function callback(err, buffer) {
    }
    var task1 = new Task(1, callback, { prefix: "task1" });
    var task2 = new Task(1, callback, { prefix: "task1" });
    var task3 = new Task(1, callback, { prefix: "task1" });

    var result = Task.dump();

    if (result) {
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
    var task1 = new Task(1, callback, { prefix: "task1" });
    var task2 = new Task(1, callback, { prefix: "task1" });
    var task3 = new Task(1, callback, { prefix: "task1" });

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
    var task1 = new Task(1, callback, { prefix: "task1" });
    var task2 = new Task(1, callback, { prefix: "task1" });
    var task3 = new Task(1, callback, { prefix: "task1" });

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

