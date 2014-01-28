new Test().add([
        testPassWithoutArgument,
        testMissWithoutArgument,
        testExitWithoutArgument,
        testPassWithObjectKey,
        testExecuteSyncAndAsyncTask,
        testMissable,
        testArgsKeyAccess,
        testFinisedAndFailureMessage,
        testJunctionSuccess,
        testJunctionFail,
        testJunctionWithArguments,
        testDump,
        testDumpAll,
        testDumpMissMatch,
    ]).run().worker();

function testPassWithoutArgument(next) {
    var task = new Task(2, callback, "testPassWithoutArgument");

    task.pass();
    task.pass(); // -> done
    task.pass("ignore"); // ignore arguments

    function callback(err,    // err = null,
                      args) { // args = []

        if (err === null && args + "" === [] + "") {
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
    task.miss("ignore"); // ignore arguments

    function callback(err,    // err = null,
                      args) { // args = []

        if (err instanceof Error && args + "" === [] + "") {
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
    task.pass("ignore"); // ignore arguments

    function callback(err,    // err = null,
                      args) { // args = []

        if (err instanceof Error && args + "" === [] + "") {
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

    task.pass(0);           // arrayValue = 0
    task.pass(1, "one");    // arrayValue = 1, objectKey = "one"
    task.pass(2, "two");    // arrayValue = 2, objectKey = "two"
    task.pass(3);           // arrayValue = 3

    function callback(err,    // err = null,
                      args) { // args = [0,1,2,3]{one:1,two:2},

        var flattenValues = Task.flatten(args);
        var args_left = JSON.stringify(toObject(args));
        var args_right = JSON.stringify({ 0: 0, 1: 1, 2: 2, 3: 3, one: 1, two: 2 });
        var values_left = flattenValues + "";
        var values_right = [0, 1, 2, 3] + "";

        if (err === null &&
            args_left === args_right &&
            values_left === values_right) {
            console.log("testPassWithObjectKey ok");
            next && next.pass();
        } else {
            console.error("testPassWithObjectKey ng");
            next && next.miss();
        }
    }

    function toObject(any) { // @arg MixedArray/Object: [0,1,2]+{a:1} or {0:0,1:1,2:2,a:1}
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
    [1,2,3].forEach(function(value) { task.pass(value); });

    // async task
    setTimeout(function() { task.pass(4); }, 100);

    function callback(err, args) { // err = null, args = [1,2,3,4]
        if (args.join() === testResult + "") {
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

    setTimeout(function() { task.pass(1); }, Math.random() * 10);
    setTimeout(function() { task.pass(2); }, Math.random() * 10);
    setTimeout(function() { task.pass(3); }, Math.random() * 10);
    setTimeout(function() { task.miss(4); }, Math.random() * 10);
    setTimeout(function() { task.miss(5); }, Math.random() * 10);
    setTimeout(function() { task.pass(6); }, Math.random() * 10);

    function callback(err, args) {
        if (err) {
            console.error("testMissable ng");
            next && next.miss();
        } else {
            console.log("testMissable ok");
            next && next.pass();
        }
    }
}

// args[key] access.
function testArgsKeyAccess(next) {
    var task4 = new Task(3, function(err,
                                     args) { // args -> ["value1", "value2", "value3"] + { key1: "value1", key2: "value2" }
            if (args[0] === "value1" &&
                args[1] === "value2" &&
                args[2] === "value3" &&
                args.length === 3 &&
                args.key1 === "value1" &&
                args.key2 === "value2") {

                console.log("testArgsKeyAccess ok");
                next && next.pass();
            } else {
                console.error("testArgsKeyAccess ng");
                next && next.miss();
            }
        }, "testArgsKeyAccess");

    task4.pass("value1", "key1"); // { key1: "value1" }
    task4.pass("value2", "key2"); // { key2: "value2" }
    task4.pass("value3");
}

function testFinisedAndFailureMessage(next) {
    var task = new Task(1, function(err,    // Error("fail reason")
                                    args) { // ["value"] + { key: "value" }
            if (err && err.message === "fail reason") {
                console.log("testFinisedAndFailureMessage ok");
                next && next.pass();
            } else {
                console.error("testFinisedAndFailureMessage ng");
                next && next.miss();
            }
        }, "testFinisedAndFailureMessage");

    task.message("ignore").
         message("fail reason").miss("value", "key"); // { key: "value" }
}

function testJunctionSuccess(next) {
    var junction = new Task(2, function(err, args) {
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
                      args) { // [task1_args, task2_args] -> [[1,2], [3,4]]
        // array.flatten(merge) and sort
        //
        //      [  [1,2],    [3,4]    ] ->  [1, 2, 3, 4]
        //         ------    -----          ------------
        //       task1_arg  task2_arg      flattenValues
        var flattenValues = Task.flatten(args).sort();

        if (flattenValues + "" === "1,2,3,4") {
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

    setTimeout(function() { task1.pass(1); }, Math.random() * 1000);
    setTimeout(function() { task1.pass(2); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(3); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(4); }, Math.random() * 1000);
}

function testDump(next) {
    function callback(err, args) {
    }
    var task1 = new Task(1, callback, "task1");
    var task2 = new Task(1, callback, "task1");
    var task3 = new Task(1, callback, "task1");

    var result = Task.dump("task1");

    if (result) {
        console.log("testDump ok");
        next && next.pass();
    } else {
        console.log("testDump ng");
        next && next.miss();
    }
}

function testDumpAll(next) {
    function callback(err, args) {
    }
    var task1 = new Task(1, callback, "task1");
    var task2 = new Task(1, callback, "task1");
    var task3 = new Task(1, callback, "task1");

    var result = Task.dump();

    if (result) {
        console.log("testDumpAll ok");
        next && next.pass();
    } else {
        console.log("testDumpAll ng");
        next && next.miss();
    }
}

function testDumpMissMatch(next) {
    function callback(err, args) {
    }
    var task1 = new Task(1, callback, "task1");
    var task2 = new Task(1, callback, "task1");
    var task3 = new Task(1, callback, "task1");

    var result = Task.dump("task2");

    if (!result) {
        console.log("testDumpMissMatch ok");
        next && next.pass();
    } else {
        console.log("testDumpMissMatch ng");
        next && next.miss();
    }
}

