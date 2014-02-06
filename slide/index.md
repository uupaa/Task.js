% Task.js
% A very simple way to wait for asynchronius processes.
% @uupaa - 2014-02-14

<!-- ----------------------------------------------------- -->

<!-- ----------------------------------------------------- -->

# JavaScript, Async, Idiom

## JavaScript は非同期処理の塊


- XHR
- onload
- setTimeout
- postMessage
- addEventListener
- DOMContentLoaded


## 

非同期プログラミングを支援するイディオムには、  
Deferred, Promises, async, await, DOM Promise, Flow.js などがありますが…

## 

今日紹介する **[Task.js]** も、非同期プログラミングを支援するライブラリです。

<hr />
( Task.js は **[Flow.js]**[] の改良版です )

## 

**Task.js** は、Node.js, Browser, WebWorker 上で動作し、かつ軽量です。  
環境に依存するコードや複雑なトリックも使っていないため、どこでも動作します。


## 
Task.js を導入すると、非同期処理やブラウザのサポート状況に悩まさず、
ロジックのコーディングに集中できます。


<!-- ----------------------------------------------------- -->

# 非同期処理へのNeedsとWants

## 複数の非同期処理の完了を待ちたい

- ダウンロードの完了を待ちつつアニメーションしたい
- いくつかの非同期処理をグルーピングし、
  それらの終了を待ちたい事がよくある
- 同期/非同期が混在すると、場当たり的に、
  一方はループで、一方はコールバックの連鎖で制御している
- 同期/非同期を意識せずに扱いたい
- 毎回同じようなコードを書いて捨てている気がする

## シンプルな実装がほしい

- Deferred や Promises を JavaScript に詳しくない人や、  
  非プログラマーに説明するのは骨が折れる

## 運用で困らないようにしたい

- 特定の環境に依存したり、頻繁に更新される重厚なライブラリには依存したくない(できない)

## デバッグのしやすさも大事

- どの非同期処理で止まっているか、原因を素早く特定できないと困る
- コマンド一発で、実行中の同期/非同期関数を一覧したい

##

Task.js はこれら全ての  
**Needs** と **Wants** を満たしてくれます

<hr />
では、Task.js の機能を見て行きましょう


<!-- ----------------------------------------------------- -->

# Task.js の基本

```js
function callback(err) { }
function userTask1() { task.pass(); } // ユーザタスク終了で task.pass() を呼ぶ
function userTask2() { task.miss(); } // ユーザタスク失敗で task.miss() を呼ぶ

var taskCount = 2;
var task = new Task(taskCount, callback);

userTask1();                 // 同期ユーザタスク: すぐに userTask1 を呼ぶ
setTimeout(userTask1, 1000); // 非同期ユーザタスク: 1000ms待ってから userTask1 を呼ぶ
```

## 

- Task.js では、ユーザが用意する同期/非同期処理を  
  **ユーザータスク** と呼びます
- var task = new Task( **taskCount**, ... ) は、**task.pass()** が2回呼ばれるのを **待ちます**
- task.pass() が2回呼ばれると、待機を終了し **callback** を呼びます


## 

- task.pass() を2回呼ぶと **待機成功** で終了します
- task.miss() を1回でも呼ぶと **待機失敗** で終了します
- callback( **err** ) は待機成功で null,  
  待機失敗で Error オブジェクトになります

## まとめ

1. **new Task**(taskCount) で待機開始
2. ユーザタスク成功で **task.pass()** を、  
   失敗で **task.miss()** を呼ぶ
4. 待機終了で **callback** が呼ばれる

## 

Task.js の基本はこれだけです。

<hr />

では次に 応用編です。

<!-- ----------------------------------------------------- -->

# Task の応用

## 

| 用法             | API             |
|------------------|-----------------|
| バッファ         | callback(buffer), task.buffer() |
| デバッグ         | Task.dump(), Task.drop() |
| 強制終了         | task.exit(), task.message() |
| 待機数を拡張     | task.extend()   |
| 失敗を許容       | task.missable() |
| Arrayを変換      | Task.flatten(), Task.arraynize(), Task.objectize() |
| Taskを連結       | Junction, Task.run() |


<!-- ----------------------------------------------------- -->

# buffer

## task.buffer()

```js
function callback(err, buffer) {
    console.log(buffer[0]);   // -> "value1"
    console.log(buffer.key2); // -> "value2"
}

var task = new Task(1, callback);

task.push("value1");
task.set("key2", "value2");
task.pass();
```

- バッファ(buffer)と呼ばれる配列に値を設定し callback に受け渡す事ができます
- **task.push(value)** は buffer.push(value) を行います
- **task.set(key,value)** は buffer[key] = value を行います
- **task.buffer()** からもアクセスできます

## Shared Buffer

```js
function callback(err, buffer) { // sharedBuffer: ["junction", "value1", "value2"]
    console.log(buffer.length); // -> 3
}

var junction = new Task(2, callback).push("junction");
var task1    = new Task(1, junction);
var task2    = new Task(1, junction);

task1.push("value1").pass();
task2.push("value2").pass();
```

- 後述する Junction を使い、階層構造をもった Task は、  
  お互いの **buffer を共有した状態** になります
- task1.push("value1") は junction.push("value1") と **同じ結果** になり  
  task2.push("value2") も junction.push("value2") と同じ結果になります


<!-- ----------------------------------------------------- -->

# Task.dump()

## Task 一覧のダンプ

```js
Task.dump();
{
    "anonymous@165": { junction: false, taskCount: 1, missableCount: 0, missedCount: 0, passedCount: 0, state: "" }
    "anonymous@166": { junction: false, taskCount: 1, missableCount: 0, missedCount: 0, passedCount: 0, state: "" }
    "anonymous@167": { junction: false, taskCount: 1, missableCount: 0, missedCount: 0, passedCount: 0, state: "" }
}
```
<!--
<input type="button" onclick="console.log(Task.dump())" value="Task.dump()"></input>
 -->

- **Task.dump()** は Task のスナップショットを返します
- 実行中の Task の一覧と状態を確認できます

## Task 名による絞込

```js
var task = new Task(1, callback, { name: "TEST" });

Task.dump("TEST");
{
    "TEST@166": { junction: false, taskCount: 1, missableCount: 0, missedCount: 0, passedCount: 0, state: "" }
}
```

- Task の第三引数で Task 名を指定し、**Task.dump(taskName)** で絞り込めます


## 

```js
Task.drop();
```

- <span style="color:gold">Task.drop()</span> は、スナップショットを生成するための内部的な情報を全て削除します
- この情報は、Task の待機終了で自動的に削除されます
- 通常利用では Task.drop() を明示的に呼ぶ必要はありません


<!-- ----------------------------------------------------- -->

# task.exit()

```js
function callback(err) { }

var task = new Task(100, callback).missable(100);

task.exit(); // 強制終了 -> callback(new Error(...))
```

##

- **task.exit()** を使うと、
  taskCount や missable の状態に関わらず、待機失敗で強制終了します

<!-- ----------------------------------------------------- -->

# task.message()

```js
var task = new Task(1, function(err) {
    console.log(err.message); // -> "O_o"
});

function userTask(task) {
    try {
        throw new Error("O_o");
        task.pass();
    } catch (err) {
        task.message(err.message).miss();
    }
}

userTask(task);
```

## 

- 例外のハンドリングはユーザタスク側で行い、**task.miss()** を呼んでください
- **task.message()**を使うと、待機失敗時に callback に渡される Errorオブジェクトのメッセージを設定できます


<!-- ----------------------------------------------------- -->

# task.extend()

```js
function callback(err) { }

var task = new Task(1, callback);

task.extend(1); // taskCount += 1;
task.pass();    // ユーザタスク成功(taskCountが2なので待機する)
task.pass();    // ユーザタスク失敗(taskCountが2なので終了する) -> callback(null)
```

- 動的に taskCount を +1 するには、**task.extend(1)** とします
- 次々にユーザタスクが増えるケースで使います

![](./assets/img/task.extend.png)

<!-- ----------------------------------------------------- -->

# task.missable()

```js
function callback(err) { }

var task = new Task(3, callback);

task.missable(2);
task.miss(); // ユーザタスク失敗(missableが2なので許容する)
task.miss(); // ユーザタスク失敗(missableが2なので許容する)
task.miss(); // ユーザタスク失敗(missableが2なので待機失敗) -> callback(Error)
```

##

- ユーザタスクが3つあり、そのうち2回まで失敗を許容する場合は、new Task(3).<span style="color:gold">missable(2)</span> とします
- **task.missable(n)** で失敗を許容する回数を設定できます
- task.missable(0) の状態で **task.miss()** を一度でも呼ぶと待機失敗で終了します
- 初期状態は task.missble(0) です

<!-- ----------------------------------------------------- -->

# Array Utilities

## Task.flatten()

```js
var array = [ [1,2], [3,4] ];

Task.flatten(array); // -> [1, 2, 3, 4]
```

- **Task.flatten(array)**を使うと、ネストした2次元配列を1次元配列に展開できます。


```js
Task.flatten([ [1,2], [3,4], [ [5,6] ] ]); // -> [1, 2, 3, 4, [5, 6] ]
```

- 3次元配列は2次元配列になります

## Task.arraynize()

```js
var array = [1,2,3];
array["key"] = "value"; // Array にプロパティを追加

Task.arraynize(array); // -> [1, 2, 3] になる
```

- **Task.arraynize(array)**は、新しい配列を作り array の値をコピーします
- array のプロパティ("key", "value")は **コピーしません**

## Task.objectize()

```js
var array = [1,2,3];
array["key"] = "value"; // Array にプロパティを追加

Task.objectize(array); // -> { 0: 1, 1: 2, 2: 3, key: "value" }
```

- **Task.objectize(array)**は、新しい Object を作り array の値をコピーします
- array のプロパティ("key", "value")も **コピーします**

<!-- ----------------------------------------------------- -->

# Junction

## 

```js
function callback(err) { }

var junction = new Task(2, callback);

var task1 = new Task(1, junction);
var task2 = new Task(1, junction);
```

![](./assets/img/junction.png)

- 他の Task を集約する Task を **Junction(合流点)** と呼びます
- Junction を使うと Task の上下関係を記述できます

## 

```js
function callback(err) {
    console.log("finished");
}

lv1_junction     = new Task(1, callback);
  lv2_junction   = new Task(1, lv1_junction);
    lv3_junction = new Task(1, lv2_junction);
      lv4_task1  = new Task(1, lv3_junction);
      lv4_task2  = new Task(1, lv3_junction);

lv4_task1.pass();
lv4_task2.pass();
```

- Junction を重ねる事で、Task の階層構造(<span style="color:gold">Task Tree</span>)を作る事ができます
- Junction を設定した Task で **状態が変化** すると 上位の Junction にも **通知** されます
- さらに上位の Junction がある場合は **次々に伝播** (バブルアップ)します

## 

```js
function callback(err) {
    console.log("finished");
}

lv1_junction     = new Task(1, callback);
  lv2_junction   = new Task(1, lv1_junction);
    lv3_junction = new Task(1, lv2_junction);
      lv4_task1  = new Task(1, lv3_junction);
      lv4_task2  = new Task(1, lv3_junction);

lv4_task1.pass();
lv4_task2.pass();
```

![](./assets/img/nested.junction.png)

## 

```js
function callback(err) {
    console.log("finished");
}

var junction = new Task(2, callback);

var task1 = new Task(1, junction);
var task2 = new Task(1, junction);

task1.pass(); // task1 の待機終了 → 状態変化が junction に通知される
task2.pass(); // task2 の待機終了 → 状態変化が junction にも通知され junction も待機終了
```

- task1.pass() で task1 と junction の状態が変化します
- task2.pass() で task2 と junction の状態が変化します
- task2.pass() のタイミングで junction の待機も終了し、callback が呼ばれます

<!-- ----------------------------------------------------- -->

# Task.run


## Task.run と Junction

```js
var taskMap = {
    a: function(task) { task.pass(); },
    b: function(task) { task.pass(); },
    c: function(task) { task.pass(); },
    d: function(task) { task.pass(); },
};

var junction = new Task(2, callback); // (a > b) + (c + d) が終わったら callback

Task.run("a > b", taskMap, junction); // a を実行後に b を実行
Task.run("c + d", taskMap, junction); // c と d を並列実行
```

- **Task.run** は ユーザタスクの前後関係を定義する機能です
- Task の上下関係を定義する **Junction** と Task.run は組み合わせて利用できます

## 

```js
function callback(err, buffer) {
}

Task.run("task_a > task_b + task_c > task_d", {
    task_a: function(task) { ... },
    task_b: function(task) { ... },
    task_c: function(task) { ... },
    task_d: function(task) { ... }
}, callback);
```

- **Task.run** を使うと、ユーザタスクの直列/並列動作をシンプルな記法で定義できます
- ユーザタスク名を **`>`** と **`+`** でつなぐ事で、ユーザタスクの前後間の流れを定義していきます


## 並列ユーザタスク

```js

Task.run("task_a + task_b", {
    task_a: function(task) { task.pass(); },
    task_b: function(task) { task.pass(); },
}, callback);
```

- 並列に実行するユーザタスク を **`+`** でつなぐと、それらは同時に実行されます


## 直列ユーザタスク

```js
Task.run("task_a > task_b", {
    task_a: function(task) { task.pass(); },
    task_b: function(task) { task.pass(); },
}, callback);
```

- 直列に実行するユーザタスクを **`>`** でつなぐと、それらは順番に実行されます

## 遅延ユーザタスク

```js
Task.run("task_a > 1000 > task_b", {
    task_a: function(task) { task.pass(); },
    task_b: function(task) { task.pass(); },
}, callback);
```

- 数字を埋め込むと、指定した時間分だけ待機する **何もしない** タスクを動的に生成し実行します
- 上記の例では、task_a 実行後に **1000ms** 待機し、その後に task_b を実行します


## 直列ユーザタスクの省略記法

```js
function task_a(task) { task.pass(); }
function task_b(task) { task.pass(); }
function task_c(task) { task.pass(); }

// このような直列ユーザタスクは
Task.run("task_a > task_b > task_c", {
    task_a: task_a,
    task_b: task_b,
    task_c: task_c,
}, callback);

// 配列を使って短く書くことができます
Task.run("", [task_a, task_b, task_c], callback);
```

- ユーザタスクの配列を指定すると、順番に実行します


## 直列/並列/遅延ユーザタスクを組み合わせる

```js
Task.run("a > b + c > 1000 > d", {
    a: function(task) { task.pass(); },
    b: function(task) { task.pass(); },
    c: function(task) { task.pass(); },
    d: function(task) { task.pass(); }
}, callback);
```

- **`a > b + c + 1000 > d`** は、ユーザタスク a 〜 d を以下の順番で実行します
    1. a を実行します
    2. a の正常終了で、b と c を同時に実行します
    3. b と c が正常終了すると 1000ms 待機します
    4. 1000ms 待機後に d を実行します
    5. d が正常終了すると、callback を呼び出します



## ユーザタスクに引数を渡す

```js
var args = { a: 1, b: 2, c : 3, d: 4 };
var junction = Task.run("task_a > task_b + task_c > task_d", {
        task_a: function(task, args) { console.log(args.a); task.pass(); },
                               ////                //////
        task_b: function(task, args) { console.log(args.b); task.pass(); },
        task_c: function(task, args) { console.log(args.c); task.pass(); },
        task_d: function(task, args) { console.log(args.d); task.pass(); },
    }, function(err, buffer) {
        if (err) {
            console.log("ng");
        } else {
            console.log("ok");
        }
    }, { args: args });
       //////////////
```

- Task.run から起動されるユーザタスク(task_a 〜 task_d)に引数を渡すには、Task.run の第四引数に <span style="color:gold">options.args</span> を設定します


## 直列ユーザタスクの途中で失敗すると

```js
Task.run("task_a > task_b", {
    task_a: function(task) { task.miss(); },
    task_b: function(task) { task.pass(); }, // task_b は実行されません
}, callback);
```

- 直列ユーザタスクの途中で失敗すると後続のユーザタスクは実行されません
- task_a が失敗した場合は、後続の task_b は実行しません


## 並列ユーザタスクの一部が失敗すると

```js
Task.run("task_c + task_d + task_e", {
    task_c: function(task) {
        setTimeout(function() { task.miss() }, 1000); // 1000ms 後に失敗
    },
    task_d: function(task) { task.pass(); }, // task_c が中断しても task_d は中断しません
    task_e: function(task) { task.pass(); }, // task_c が中断しても task_e は中断しません
}, callback);
```

- 並列ユーザタスクの一部が失敗しても、同じグループに属する並列実行ユーザタスクは中断しません
- task_c が途中で失敗した場合でも、task_d と task_e は中断しません


<!-- ----------------------------------------------------- -->

# JavaScript vs Promise vs Task.js

## 

「非同期のユーザタスク A, B, C, D を、  
A,B のグループと C,D のグループに分け、  
2つのグループの完了を待つ」処理を、  
それぞれの方法で実装してみます

- JavaScript
- jQuery.Deferred
- DOM Promise
- Junction
- Junction + Task.run






## JavaScript Version

```js
function waitForAsyncProcesses(finishedCallback) {
    var taskCount1 = [A, B].length;
    var taskCount2 = [C, D].length;
    var taskCount3 = 2; // Junction

    function A() { setTimeout(function() { done_group1(); }, 10);  }
    function B() { setTimeout(function() { done_group1(); }, 100); }
    function C() { setTimeout(function() { done_group2(); }, 20);  }
    function D() { setTimeout(function() { done_group2(); }, 200); }

    function done_group1() {
        if (--taskCount1 <= 0) { junction(); }
    }
    function done_group2() {
        if (--taskCount2 <= 0) { junction(); }
    }
    function junction() {
        if (--taskCount3 <= 0) { finishedCallback(); }
    }
    A(); B(); C(); D();
}
waitForAsyncProcesses(function(err) { console.log("finished"); });
```

## jQuery.Deferred Version

```js
function waitForAsyncProcesses(finishedCallback) {
    var promises1 = [A(), B()];
    var promises2 = [C(), D()];

    function A() {
        var dfd = jQuery.Deferred();
        setTimeout(function() { dfd.resolve(); }, 10);
        return dfd.promise();
    }
    function B() {
        var dfd = jQuery.Deferred();
        setTimeout(function() { dfd.resolve(); }, 100);
        return dfd.promise();
    }
    function C() {
        var dfd = jQuery.Deferred();
        setTimeout(function() { dfd.resolve(); }, 20);
        return dfd.promise();
    }
    function D() {
        var dfd = jQuery.Deferred();
        setTimeout(function() { dfd.resolve(); }, 200);
        return dfd.promise();
    }

    jQuery.when(
        jQuery.when.apply(null, promises1),
        jQuery.when.apply(null, promises2)
    ).done(function() {
        finishedCallback()
    });
}
waitForAsyncProcesses(function(err) { console.log("finished"); });
```

## DOM Promise Version

```js
function waitForAsyncProcesses(finishedCallback) {
    function A() {
        return new Promise(function(resolve, reject) { setTimeout(resolve, 10);  });
    }
    function B() {
        return new Promise(function(resolve, reject) { setTimeout(resolve, 100); });
    }
    function C() {
        return new Promise(function(resolve, reject) { setTimeout(resolve, 20);  });
    }
    function D() {
        return new Promise(function(resolve, reject) { setTimeout(resolve, 200); });
    }
    Promise.all([
        Promise.all([A(), B()]),
        Promise.all([C(), D()])
    ]).then(function() {
        finishedCallback(null);
    }).catch(function(err) {
        finishedCallback(err);
    });
}
waitForAsyncProcesses(function(err) { console.log("finished"); })
```

## Task( Junction ) Version

```js
function waitForAsyncProcesses(finishedCallback) {
    var taskMap = {
            A: function(task) { setTimeout(function() { task.pass(); }, 10);  },
            B: function(task) { setTimeout(function() { task.pass(); }, 100); },
            C: function(task) { setTimeout(function() { task.pass(); }, 20);  },
            D: function(task) { setTimeout(function() { task.pass(); }, 200); },
        };
    var junction = new Task(2, finishedCallback);
    var task1 = new Task(2, junction);
    var task2 = new Task(2, junction);

    taskMap.A(task1);
    taskMap.B(task1);
    taskMap.C(task2);
    taskMap.D(task2);
}

waitForAsyncProcesses(function(err) { console.log("finished"); });
```

## Task( Junction ) + Task.run Version

```js
function waitForAsyncProcesses(finishedCallback) {
    var taskMap = {
            A: function(task) { setTimeout(function() { task.pass(); }, 10);  },
            B: function(task) { setTimeout(function() { task.pass(); }, 100); },
            C: function(task) { setTimeout(function() { task.pass(); }, 20);  },
            D: function(task) { setTimeout(function() { task.pass(); }, 200); },
        };
    var junction = new Task(2, finishedCallback);

    Task.run("A > B", taskMap, junction);
    Task.run("C > D", taskMap, junction);
}

waitForAsyncProcesses(function(err) { console.log("finished"); });
```

<!-- ----------------------------------------------------- -->
# install and import script

## github

```sh
https://github.com/uupaa/Task.js
```

## npm install
```sh
$ npm install uupaa.task.js
```

- モジュール名が **uupaa.** で始まっている理由について
    - npm モジュール名は先願制で、一般名詞や動詞は既に枯渇しています
    - npm モジュール名には、大文字を利用できません
    - このような理由により、致し方なく…
    - uupaa がお供するとお考え下さい

(ε・◇・)з o O ( お伴するよ〜

## in Node.js
```js
var Task = require("uupaa.task.js");

var task = new Task(1, function(err) {
        console.log(err ? err.message : "ok");
    });

task.pass();
```

## in Browser

```js
<script src="uupaa.task.js"></script>

<script>
var task = new Task(1, function(err) {
        console.log(err ? err.message : "ok");
    });

task.pass();
</script>
```

## in WebWorkers

```js
importScripts("uupaa.task.js");

var task = new Task(1, function(err) {
        console.log(err ? err.message : "ok");
    });

task.pass();
```

<!-- ----------------------------------------------------- -->

# まとめ

## 


Task.js は以下の特徴を備えています

- **様々な環境で動作** します
- 構造が **シンプル** で応用が効きます
- 既存の構造やユーザタスクを **大きく改変しなくても導入可能** です
- Junction で **上下関係を定義** し、Task.run で **前後関係を定義** できます
- Junction と Task.run を組み合わせて **スッキリ** としたコードが書けます

## 

(ε・◇・)з o O ( Task.js マジ オススメ

[Task.js]: https://github.com/uupaa/Task.js
[Flow.js]: http://www.slideshare.net/uupaa/flowjs

