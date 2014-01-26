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
        testJunctionWithArguments
    ]).run().worker();

function testPassWithoutArgument(taskRunner) {
    var task = new Task(2, callback, "testPassWithoutArgument");

    task.pass();
    task.pass(); // -> done
    task.pass("ignore"); // ignore arguments

    function callback(err,    // err = null,
                      args) { // args = []

        if (err === null && args + "" === [] + "") {
            console.log("testPassWithoutArgument ok");
            taskRunner && taskRunner.pass();
        } else {
            console.error("testPassWithoutArgument ng");
            taskRunner && taskRunner.miss();
        }
    }
}

function testMissWithoutArgument(taskRunner) {
    var task = new Task(2, callback, "testMissWithoutArgument");

    task.miss();
    task.miss(); // -> done
    task.miss("ignore"); // ignore arguments

    function callback(err,    // err = null,
                      args) { // args = []

        if (err instanceof Error && args + "" === [] + "") {
            console.log("testMissWithoutArgument ok");
            taskRunner && taskRunner.pass();
        } else {
            console.error("testMissWithoutArgument ng");
            taskRunner && taskRunner.miss();
        }
    }
}

function testExitWithoutArgument(taskRunner) {
    var task = new Task(2, callback, "testExitWithoutArgument");

    task.exit(); // -> done
    task.pass("ignore"); // ignore arguments

    function callback(err,    // err = null,
                      args) { // args = []

        if (err instanceof Error && args + "" === [] + "") {
            console.log("testExitWithoutArgument ok");
            taskRunner && taskRunner.pass();
        } else {
            console.error("testExitWithoutArgument ng");
            taskRunner && taskRunner.miss();
        }
    }
}

function testPassWithObjectKey(taskRunner) {
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
            taskRunner && taskRunner.pass();
        } else {
            console.error("testPassWithObjectKey ng");
            taskRunner && taskRunner.miss();
        }
    }

    function toObject(any) { // @arg MixedArray/Object: [0,1,2]+{a:1} or {0:0,1:1,2:2,a:1}
        return Object.keys(any).reduce(function(prev, key) {
            prev[key] = any[key];
            return prev;
        }, {});
    }
}

function testExecuteSyncAndAsyncTask(taskRunner) { // task sync 4 events
    var task = new Task(4, callback, "testExecuteSyncAndAsyncTask");
    var testResult = [1, 2, 3, 4];


    // sync task
    [1,2,3].forEach(function(value) { task.pass(value); });

    // async task
    setTimeout(function() { task.pass(4); }, 100);

    function callback(err, args) { // err = null, args = [1,2,3,4]
        if (args.join() === testResult + "") {
            console.log("testExecuteSyncAndAsyncTask ok");
            taskRunner && taskRunner.pass();
        } else {
            console.error("testExecuteSyncAndAsyncTask ng");
            taskRunner && taskRunner.miss();
        }
    }
}

function testMissable(taskRunner) {
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
            taskRunner && taskRunner.miss();
        } else {
            console.log("testMissable ok");
            taskRunner && taskRunner.pass();
        }
    }
}

// args[key] access.
function testArgsKeyAccess(taskRunner) {
    var task4 = new Task(3, function(err,
                                     args) { // args -> ["value1", "value2", "value3"] + { key1: "value1", key2: "value2" }
            if (args[0] === "value1" &&
                args[1] === "value2" &&
                args[2] === "value3" &&
                args.length === 3 &&
                args.key1 === "value1" &&
                args.key2 === "value2") {

                console.log("testArgsKeyAccess ok");
                taskRunner && taskRunner.pass();
            } else {
                console.error("testArgsKeyAccess ng");
                taskRunner && taskRunner.miss();
            }
        }, "testArgsKeyAccess");

    task4.pass("value1", "key1"); // { key1: "value1" }
    task4.pass("value2", "key2"); // { key2: "value2" }
    task4.pass("value3");
}

function testFinisedAndFailureMessage(taskRunner) {
    var task = new Task(1, function(err,    // Error("fail reason")
                                    args) { // ["value"] + { key: "value" }
            if (err && err.message === "fail reason") {
                console.log("testFinisedAndFailureMessage ok");
                taskRunner && taskRunner.pass();
            } else {
                console.error("testFinisedAndFailureMessage ng");
                taskRunner && taskRunner.miss();
            }
        }, "testFinisedAndFailureMessage");

    task.message("ignore").
         message("fail reason").miss("value", "key"); // { key: "value" }
}

function testJunctionSuccess(taskRunner) {
    var junction = new Task(2, function(err, args) {
            if (!err) {
                console.log("testJunctionSuccess ok");
                taskRunner && taskRunner.pass();
            } else {
                console.error("testJunctionSuccess ng");
                taskRunner && taskRunner.miss();
            }
        }, "testJunctionSuccess");

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
}

function testJunctionFail(taskRunner) {
    var junction = new Task(2, function(err) {
            if (err) {
                console.log("testJunctionFail ok");
                taskRunner && taskRunner.pass();
            } else {
                console.error("testJunctionFail ng");
                taskRunner && taskRunner.miss();
            }
        });

    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    setTimeout(function() { task1.pass(); }, Math.random() * 1000);
    setTimeout(function() { task1.miss(); }, Math.random() * 1000);
    setTimeout(function() { task2.pass(); }, Math.random() * 1000);
    setTimeout(function() { task2.miss(); }, Math.random() * 1000);
}

function testJunctionWithArguments(taskRunner) {
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
            taskRunner && taskRunner.pass();
        } else {
            console.error("testJunctionWithArguments ng");
            taskRunner && taskRunner.miss();
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

