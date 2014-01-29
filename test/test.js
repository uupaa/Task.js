new Test().add([
        testPassWithoutArgument,
        testMissWithoutArgument,
        testExitWithoutArgument,
        testPassWithObjectKey,
        testExecuteSyncAndAsyncTask,
        testMissable,
        testPayloadKeyAccess,
        testFinisedAndFailureMessage,
        testJunctionSuccess,
        testJunctionFail,
        testJunctionWithArguments,
        testJunctionSharePayload,
        testJunctionSharePayloadAndClear,
        testCallback3rdArgIsTaskInstance,
        testDump,
        testDumpAll,
        testDumpMissMatch,
        testZeroTaskCount,
    ]).run()
/*
      .worker(function(err, test) {
        if (!err && typeof Task_ !== "undefined") {
            Task = Task_;
            new Test(test).run().worker();
        }
    });
 */

function testPassWithoutArgument(next) {
    var task = new Task(2, callback, "testPassWithoutArgument");

    task.pass();
    task.pass(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err,    // err = null,
                      payload) { // payload = []

        if (err === null && payload.join() === "") {
            console.log("testPassWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testPassWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testMissWithoutArgument(next) {
    var task = new Task(2, callback, "testMissWithoutArgument");

    task.miss();
    task.miss(); // -> done
    task.push("ignore").miss(); // ignore arguments

    function callback(err,    // err = null,
                      payload) { // payload = []

        if (err instanceof Error && payload.join() === "") {
            console.log("testMissWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testMissWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testExitWithoutArgument(next) {
    var task = new Task(2, callback, "testExitWithoutArgument");

    task.exit(); // -> done
    task.push("ignore").pass(); // ignore arguments

    function callback(err,    // err = null,
                      payload) { // payload = []

        if (err instanceof Error && payload.join() === "") {
            console.log("testExitWithoutArgument ok");
            next && next.pass();
        } else {
            console.error("testExitWithoutArgument ng");
            next && next.miss();
        }
    }
}

function testPassWithObjectKey(next) {
    var task = new Task(4, callback, "testPassWithObjectKey");

    task.push(0).pass();
    task.set("one", 1).pass();
    task.set("two", 2).pass();
    task.push(3).pass();

    function callback(err,    // err = null,
                      payload) { // payload = [0, 3] + { one: 1, two: 2 },

        var flattenValues = Task.flatten(payload); // [0, 3]
        var payload_left = JSON.stringify(ObjectizedAnyArrayToObject(payload)); // { "0": 0, "1": 3, "one": 1, "two": 2 }

        if (err === null &&
            flattenValues.join() === [0, 3].join() &&
            payload_left === JSON.stringify({ "0": 0, "1": 3, "one": 1, "two": 2 })) {

            console.log("testPassWithObjectKey ok");
            next && next.pass();
        } else {
            console.error("testPassWithObjectKey ng");
            next && next.miss();
        }
    }

    function ObjectizedAnyArrayToObject(any) { // @arg ObjectizedAnyArray|Object: [0, 1, 2] + { a: 1 } or { 0: 0, 1: 1, 2: 2, a: 1 }
        return Object.keys(any).reduce(function(prev, key) {
            prev[key] = any[key];
            return prev;
        }, {});
    }
}

function testExecuteSyncAndAsyncTask(next) { // task sync 4 events
    var task = new Task(4, callback, "testExecuteSyncAndAsyncTask");
    var testResult = [1, 2, 3, 4];


    // sync task
    [1,2,3].forEach(function(value) { task.push(value).pass(); });

    // async task
    setTimeout(function() { task.push(4).pass(); }, 100);

    function callback(err, payload) { // err = null, payload = [1,2,3,4]
        if ( payload.join() === testResult.join() ) {
            console.log("testExecuteSyncAndAsyncTask ok");
            next && next.pass();
        } else {
            console.error("testExecuteSyncAndAsyncTask ng");
            next && next.miss();
        }
    }
}

function testMissable(next) {
    var task = new Task(4, callback, "testMissable").missable(2);

    setTimeout(function() { task.push(1).pass(); }, Math.random() * 10);
    setTimeout(function() { task.push(2).pass(); }, Math.random() * 10);
    setTimeout(function() { task.push(3).pass(); }, Math.random() * 10);
    setTimeout(function() { task.push(4).miss(); }, Math.random() * 10);
    setTimeout(function() { task.push(5).miss(); }, Math.random() * 10);
    setTimeout(function() { task.push(6).pass(); }, Math.random() * 10);

    function callback(err, payload) {
        if (err) {
            console.error("testMissable ng");
            next && next.miss();
        } else {
            console.log("testMissable ok");
            next && next.pass();
        }
    }
}

// payload[key] access.
function testPayloadKeyAccess(next) {
    var task4 = new Task(3, function(err,
                                     payload) { // ["value0"] + { key1: "value1", key2: "value2" }
            if (payload[0] === "value0" &&
                payload.length === 1 &&
                payload.key1 === "value1" &&
                payload.key2 === "value2") {

                console.log("testPayloadKeyAccess ok");
                next && next.pass();
            } else {
                console.error("testPayloadKeyAccess ng");
                next && next.miss();
            }
        }, "testPayloadKeyAccess");

    task4.set("key1", "value1").pass(); // { key1: "value1" }
    task4.set("key2", "value2").pass(); // { key2: "value2" }
    task4.push("value0").pass();
}

function testFinisedAndFailureMessage(next) {
    var task = new Task(1, function(err,    // Error("fail reason")
                                    payload) { // ["value"] + { key: "value" }
            if (err && err.message === "fail reason") {
                console.log("testFinisedAndFailureMessage ok");
                next && next.pass();
            } else {
                console.error("testFinisedAndFailureMessage ng");
                next && next.miss();
            }
        }, "testFinisedAndFailureMessage");

    task.message("ignore").
         message("fail reason").set("key", "value").miss(); // { key: "value" }
}

function testJunctionSuccess(next) {
    var junction = new Task(2, function(err, payload) {
            if (!err) {
                console.log("testJunctionSuccess ok");
                next && next.pass();
            } else {
                console.error("testJunctionSuccess ng");
                next && next.miss();
            }
        }, "testJunctionSuccess");

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

function testJunctionWithArguments(next) {
    function callback(err,    // null
                      payload) { // [task1_payload, task2_payload] -> [[1,2], [3,4]]
        // array.flatten(merge) and sort
        //
        //      [  [1,2],    [3,4]    ] ->  [1, 2, 3, 4]
        //         ------    -----          ------------
        //       task1_arg  task2_arg      flattenValues
        var flattenValues = Task.flatten(payload).sort();

        if (flattenValues.join() === "1,2,3,4") {
            console.log("testJunctionWithArguments ok");
            next && next.pass();
        } else {
            console.error("testJunctionWithArguments ng");
            next && next.miss();
        }
    }

    var junction = new Task(2, callback);
    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    setTimeout(function() { task1.push(1).pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.push(2).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(3).pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.push(4).pass(); }, Math.random() * 1000);
}

function testJunctionSharePayload(next) {
    function callback(err,     // null
                      payload, // [ "SHARE PAYLOAD", 1.1, 2.2, 3.3, 4.4 ] + { a: 1, b: 2, c: 3, d: 4 }
                      task) {  // junction

        if (payload.join() === "SHARE PAYLOAD,1.1,2.2,3.3,4.4" &&
            task === junction) {
            console.log("testJunctionSharePayload ok");
            next && next.pass();
        } else {
            console.error("testJunctionSharePayload ng");
            next && next.miss();
        }
    }

    var junction = new Task(2, callback);
    junction.push("SHARE PAYLOAD");

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    task1.push(1.1).set("a", 1).pass();
    task1.push(2.2).set("b", 2).pass();
    task2.push(3.3).set("c", 3).pass();
    task2.push(4.4).set("d", 4).pass();
}

function testJunctionSharePayloadAndClear(next) {
    function callback(err,     // null
                      payload, // [ 4.4 ] + { d: 4 }
                      task) {  // junction

debugger;
        if (task === junction &&
            payload.join() === "4.4" &&
            payload.d === 4) {
            console.log("testJunctionSharePayloadAndClear ok");
            next && next.pass();
        } else {
            console.error("testJunctionSharePayloadAndClear ng");
            next && next.miss();
        }
    }

debugger;
    var junction = new Task(2, callback);
    junction.push("SHARE PAYLOAD");

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    junction.payload();
    task1.payload();
    task2.payload();

    task1.push(1.1).set("a", 1).pass();
    task1.push(2.2).set("b", 2).pass();
    task2.push(3.3).set("c", 3).pass();
    task2.clear();
    task2.push(4.4).set("d", 4).pass();
}

function testCallback3rdArgIsTaskInstance(next) {
    function callback(err, payload, task) {

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
    function callback(err, payload) {
    }
    var task1 = new Task(1, callback, "task1");
    var task2 = new Task(1, callback, "task1");
    var task3 = new Task(1, callback, "task1");

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
    function callback(err, payload) {
    }
    var task1 = new Task(1, callback, "task1");
    var task2 = new Task(1, callback, "task1");
    var task3 = new Task(1, callback, "task1");

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
    function callback(err, payload) {
    }
    var task1 = new Task(1, callback, "task1");
    var task2 = new Task(1, callback, "task1");
    var task3 = new Task(1, callback, "task1");

    var result = Task.dump("task2");

    if (!Object.keys(result).length) {
        console.log("testDumpMissMatch ok");
        next && next.pass();
    } else {
        console.error("testDumpMissMatch ng");
        next && next.miss();
    }
}

function testZeroTaskCount(next) {
    function callback(err, payload) {
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

