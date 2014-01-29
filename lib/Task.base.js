Task = (function() {
    var instance = {};
    var counter = 0;

    function Task(count, fn, pfx, tick) {
        this.fn = fn;
        this.taskName = (pfx || "anonymous") + "_" + (++counter);
        this.count = count;
        this.tick = tick;
        this.missableCount = 0;
        this.failureMessage = "";
        this.passedCount = 0;
        this.missedCount = 0;
        this.state = "";
        this.args = fn instanceof Task ? fn.args : [];
        instance[this.taskName] = this;
        update(this, "init");
    }
    Task.prototype = {
        set: function(key, value) {
            if (this.state == "") this.args[key] = value;
            return this;
        },
        push: function(value) {
            if (this.state == "") this.args.push(value);
            return this;
        },
        pass: function() {
            this.tick && this.tick(this.taskName);
            return update(this, "pass");
        },
        miss: function() {
            this.tick && this.tick(this.taskName);
            return update(this, "miss");
        },
        exit: function() {
            return update(this, "exit");
        },
        clear: function() {
            that.args = [];
            that.fn = that.tick = null;
        },
        extend: function(count) {
            this.count += count;
            return this;
        },
        message: function(failureMessage) {
            this.failureMessage = failureMessage + "";
            return this;
        },
        missable: function(count) {
            this.missableCount += count;
            return this;
        },
        isFinished: function() {
            return this.state !== "";
        }
    };
    Task.dump = function(pfx) {
        var rv = {};
        for (var taskName in instance) {
            if (!pfx) {
                rv[taskName] = instance[taskName];
            } else if (pfx == taskName.split("_")[0]) {
                rv[taskName] = instance[taskName];
            }
        }
        return JSON.parse(JSON.stringify(rv));
    }
    Task.reset = function() {
        instance = {};
        counter = 0;
    }
    Task.flatten = function(args) {
        return Array.prototype.concat.apply([], args);
    }

    function update(that, method) {
        if (that.state == "") {
            switch (method) {
            case "init": that.state = judgeState(that); break;
            case "pass": ++that.passedCount; that.state = judgeState(that); break;
            case "miss": ++that.missedCount; that.state = judgeState(that); break;
            case "exit": that.state = "exit"; break;
            }
            if (that.state) {
                if (that.fn instanceof Task) {
                    that.fn[that.state]();
                } else {
                    var err = that.state == "pass" ? null : new Error(that.failureMessage);
                    that.fn(err, that.args, that);
                }
                delete instance[that.taskName];
            }
        }
        return that;
    }

    function judgeState(that) {
        return that.missedCount > that.missableCount ? "miss"
             : that.missedCount + that.passedCount >= that.count ? "pass" : "";
    }

    return Task;
})();

