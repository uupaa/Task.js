// ['Reflection.js', 'Console.js', 'Valid.js', 'Help.js', 'Task.js', 'Test.js'].join()

// Reflection.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var IGNORE_KEYWORDS = [
        "webkitStorageInfo",
        "Infinity",
        "NaN",
        "arguments",
        "caller",
        "callee",
        "buffer",
        "byteOffset",
        "byteLength", // DataView, ArrayBuffer, Float32Array, ...
        "length",
        "String.prototype.help",
        "Function.prototype.help",
        "MediaError",
    ];
var _syntaxHighlightData = {
        matcher:  null, // /^\W(function|var|...|with)\W$/
        keywords: null  // /\\[^\n]+|.../
    };
var ES6_SYNTAX_KEYWORDS = [
        "\/\/[^\n]+",       // // comment
        "\/[^\n\/]+\/",     // /regexp/
        "\"[^\n\"]*\"",     // "string"
        "\'[^\n\']*\'"      // 'string'
    ];
var ES6_IDENTIFY_KEYWORD =
        "function|var|this|self|that|if|else|in|typeof|instanceof|null|undefined|" +
        "try|catch|throw|finally|switch|case|default|for|while|do|break|continue|" +
        "return|new|debugger|void|delete|" +
        "enum|class|super|extends|implements|interface|private|protected|package|" +
        "static|public|export|import|yield|let|const|with";

// --- class / interfaces ----------------------------------
function Reflection() {
}

Reflection["lang"] = ""; // Reference language. "", "en", "ja"

Reflection["addIgnoreKeyword"]      = Reflection_addIgnoreKeyword;      // Reflection.addIgnoreKeyword(keywords:StringArray):void

// --- path ---
Reflection["resolve"]               = Reflection_resolve;               // Reflection.resolve(target:Function|String):Object
// --- module ---
Reflection["getModuleRepository"]   = Reflection_getModuleRepository;   // Reflection.getModuleRepository(moduleName:String):String
// --- class ---
Reflection["getBaseClassName"]      = Reflection_getBaseClassName;      // Reflection.getBaseClassName(value):String
Reflection["getConstructorName"]    = Reflection_getConstructorName;    // Reflection.getConstructorName(value):String
// --- function ---
Reflection["getFunctionAttribute"]  = Reflection_getFunctionAttribute;  // Reflection.getFunctionAttribute(target:Function, name:String = "all"):Object
// --- link ---
Reflection["getSearchLink"]         = Reflection_getSearchLink;         // Reflection.getSearchLink(path:String):Object
Reflection["getReferenceLink"]      = Reflection_getReferenceLink;      // Reflection.getReferenceLink(path:String):Object
// --- syntax highlight ---
Reflection["syntaxHighlight"]       = Reflection_syntaxHighlight;       // Reflection.syntaxHighlight(code:String, highlight:String, target:String = "console", style:Object = {}):StringArray

// --- implements ------------------------------------------
function Reflection_addIgnoreKeyword(keywords) { // @arg StringArray
                                                 // @desc add ignore keywords.
    Array.prototype.push.apply(IGNORE_KEYWORDS, keywords);
}

function Reflection_resolve(target) { // @arg Function|String target function - Object.freeze or "Object.freeze"
                                      //                                        callback(detach:Boolean):void
                                      // @ret Object - { path, fn }
                                      // @return.path String - function absoulute path. eg: ["Object", "freeze"]
                                      // @return.fn Function - function. eg: Object.freeze
                                      // @desc resolve function absolute path.

//{@dev
    if (!/function|string/.test(typeof target)) {
        throw new Error("Reflection.resolve(target): target is not Function or String.");
    }
//}@dev

    switch (typeof target) {
    case "function":
        return { "path": _convertFunctionToPathString(target), "fn": target };
    case "string":
        target = _extractSharp(target);
        return { "path": target, "fn": _convertPathStringToFunction(target) };
    }
    return { "path": "", "fn": null };
}

function _convertPathStringToFunction(target) { // @arg String        - function path.  "Object.freeze"
                                                // @ret Function|null - function object. Object.freeze
    return target.split(".").reduce(function(parent, token) {
                return ( parent && (token in parent) ) ? parent[token]
                                                       : null;
            }, global);
}

function _convertFunctionToPathString(target) { // @arg Function - function object. Object.freeze
                                                // @ret String   - function path.  "Object.freeze"
    var path = "";
    var globalIdentities = _enumKeys(global).sort();

    globalIdentities.unshift("Object", "Function", "Array", "String", "Number"); // inject

    for (var i = 0, iz = globalIdentities.length; i < iz && !path; ++i) {
        var className = globalIdentities[i];

        if ( IGNORE_KEYWORDS.indexOf(className) < 0 &&
             global[className] !== null &&
             /object|function/.test(typeof global[className]) ) {

            var klass = global[className];

            if (klass === target) {
                path = className;
            } else {
                path = _findClassMember(target, className, _enumKeys(klass));

                if ( !path && ("prototype" in klass) ) {
                    path = _findPropertyMember(target, className,
                                               _enumKeys(klass["prototype"]));
                }
            }
        }
    }
    return path.replace(/^global\./i, "");
}

function _enumKeys(object) {
    return (Object["getOwnPropertyNames"] || Object["keys"])(object);
}

function _findClassMember(target, className, keys) {
    for (var i = 0, iz = keys.length; i < iz; ++i) {
        var key = keys[i];
        var path = className + "." + key;

        try {
            if (IGNORE_KEYWORDS.indexOf(path) < 0 &&
                IGNORE_KEYWORDS.indexOf(key)  < 0) {

                if (global[className][key] === target) {
                    return path; // resolved
                }
            }
        } catch (o_o) {}
    }
    return "";
}

function _findPropertyMember(target, className, keys) {
    for (var i = 0, iz = keys.length; i < iz; ++i) {
        var key = keys[i];
        var path = className + ".prototype." + key;

        try {
            if (IGNORE_KEYWORDS.indexOf(path) < 0 &&
                IGNORE_KEYWORDS.indexOf(key)  < 0) {

                if (global[className]["prototype"][key] === target) {
                    return path; // resolved
                }
            }
        } catch (o_o) {}
    }
    return "";
}

function Reflection_getFunctionAttribute(target, // @arg Function
                                         name) { // @arg String = "all"
                                                 // @ret Object - { attrName: { name, type, optional, comment }, ... }
    var result = {};
    var sourceCode = target + "";
    var head = _splitFunctionDeclaration(sourceCode)["head"]; // { head, body }

    switch (name || "all") {
    case "all":
        _getArg(head, result);
        _getRet(head, result);
        break;
    case "arg":
        _getArg(head, result);
        break;
    case "ret":
        _getRet(head, result);
        break;
    }
    return result;
}

function _getArg(head,     // @arg StringArray - [line, ...]
                 result) { // @arg Object
                           // @ret Object - result + { "arg": [{ name, type, optional, comment }, ...] }
    // get @arg attribute.
    //
    //      function Foo_add(name,     // @arg Function|String = ""   comment
    //                       key   ) { // @arg String                 comment
    //                                 // @ret ResultType             comment
    //                       ~~~~~             ~~~~~~~~~~~~~~~   ~~   ~~~~~~~
    //                       name              type              opt  comment
    //      }

    result["arg"] = [];

    var format = /^([\w\|\/,]+)\s*(=\s*("[^"]*"|'[^']*'|\S+))?\s*([^\n]*)$/;

    head.forEach(function(line, lineNumber) {
        if (/@arg|@var_args/.test(line)) {
            if (lineNumber === 0) {
                line = _removeFunctionDeclarationString(line);
            }
            var nameType = line.split(/@arg|@var_args/);
            var name     = nameType[0].replace(/\W+/g, "").trim();
            var type     = "";
            var optional = "";
            var comment  = "";
            var token    = format.exec(nameType[1].trim());

            if (token) {
                type     = token[1];
                optional = token[3] || "";
                comment  =(token[4] || "").replace(/^[ :#\-]+/, "");
            }
            result["arg"].push({ "name": name, "type": type,
                                 "optional": optional, "comment": comment });
        }
    });
    return result;
}

function _getRet(head,     // @arg StringArray - [line, ...]
                 result) { // @arg Object
                           // @ret Object - { "ret": { types, comment }, ... }
    // get @ret attribute.
    //
    //      function Foo_add(name,     // @arg Function|String = ""   comment
    //                       key   ) { // @arg String                 comment
    //                                 // @ret ResultType             comment
    //                                         ~~~~~~~~~~~~~~~        ~~~~~~~
    //                                         type                   comment
    //      }

    result["ret"] = [];

    var format = /^([\w\|\/,]+)\s+([^\n]*)$/;

    head.forEach(function(line, lineNumber) {
        if (/@ret/.test(line)) {
            if (lineNumber === 0) {
                line = _removeFunctionDeclarationString(line);
            }
            var typeComment = line.split(/@ret/); // -> ["  //   ", " ResultType comment"]
            var type    = "";
            var comment = "";
            var token   = format.exec(typeComment[1].trim());

            if (token) {
                type    = token[1];
                comment = token[2];
            }
            result["ret"].push({ "type": type, "comment": comment });
        }
    });
    return result;
}

function _splitFunctionDeclaration(sourceCode) { // @arg String - function code
                                                 // @ret Object - { head:StringArray, body:StringArray }
    //
    //  sourceCode:
    //
    //      "function foo() { // @ret String\n
    //          return '';\n
    //      }"
    //
    //  result: {
    //      head: [
    //          "function foo() { // @ret String"
    //      ],
    //      body: [
    //          "    return '';",
    //          "}"
    //      ]
    //  }
    //
    var code = sourceCode.trim();
    var lines = code.split("\n");
    var x = lines[0].indexOf("//");
    var i = 0, iz = lines.length;

    if (x >= 10) {
        for (; i < iz; ++i) {
            if (lines[i].indexOf("//") !== x) {
                break;
            }
        }
    }
    return { "head": lines.slice(0, i), "body": lines.slice(i) };
}

function _removeFunctionDeclarationString(sourceCode) { // @arg String
                                                        // @ret String
    //
    //  sourceCode:
    //      "function xxx(...) { }"
    //
    //  result:
    //                  "(...) { }"
    //
    return sourceCode.replace(/^function\s+[^\x28]+/, "");
}

function _extractSharp(path) { // @arg String - "Array#forEach"
                               // @ret String - "Array.prototype.forEach"
    return path.trim().replace("#", ".prototype.");
}

function Reflection_getModuleRepository(moduleName) { // @arg String - path. "Reflection"
                                                      // @ret String
                                                      // @desc get WebModule repository url.
    if (moduleName in global) {
        var repository = global[moduleName]["repository"] || "";

        if (repository) {
            return repository.replace(/\/+$/, ""); // trim tail slash
        }
    }
    return ""; // global[moduleName] not found
}

function Reflection_getSearchLink(path) { // @arg String - "Object.freeze"
                                          // @ret Object - { title:String, url:URLString }
                                          // @desc get Google search link.
    //
    //  Google Search( Array.isArray ):
    //      http://www.google.com/search?lr=lang_ja&ie=UTF-8&oe=UTF-8&q=Array.isArray
    //
    return {
        "title": "Google Search( " + path + " ):",
        "url":   _createGoogleSearchURL(path)
    };
}

function _createGoogleSearchURL(keyword) { // @arg String - search keyword.
                                           // @ret String - "http://..."
    return "http://www.google.com/search?lr=lang_" +
                _getLanguage() + "&q=" +
                encodeURIComponent(keyword);
}

function Reflection_getReferenceLink(path) { // @arg String - "Object.freeze"
                                             // @ret Object - { title:String, url:URLString }
                                             // @desc get JavaScript/WebModule reference link.
    var className  = path.split(".")[0] || "";       // "Array.prototype.forEach" -> ["Array", "prototype", "forEach"] -> "Array"
    var repository = Reflection_getModuleRepository(className); // "https://github.com/uupaa/Help.js"

    //
    //  JavaScript API( Array.isArray ) Reference:
    //      http://www.google.com/search?btnI=I%27m+Feeling+Lucky&lr=lang_ja&ie=UTF-8&oe=UTF-8&q=MDN%20Array.isArray
    //
    //  WebModule Reference:
    //      https://github.com/uupaa/PageVisibilityEvent.js/wiki/PageVisibilityEvent#
    //
    if (/native code/.test(global[className] + "")) {
        return {
            "title": "JavaScript Reference( " + path + " ):",
            "url":   _createGoogleImFeelingLuckyURL(path, "MDN")
        };
    } else if (repository && /github/i.test(repository)) {
        return {
            "title": "WebModule Reference:",
            "url":   _createGitHubWikiURL(repository, className, path)
        };
    }
    return null;
}

function _createGoogleImFeelingLuckyURL(keyword,    // @arg String - search keyword.
                                        provider) { // @arg String - search providoer.
                                                    // @ret String - "http://..."
                                                    // @desc create I'm feeling lucky url
    return "http://www.google.com/search?btnI=I%27m+Feeling+Lucky&lr=lang_" +
                _getLanguage() + "&q=" + provider + "%20" +
                encodeURIComponent(keyword);
}

function _createGitHubWikiURL(baseURL,      // @arg String - "http://..."
                              wikiPageName, // @arg String - "Foo"
                              hash) {       // @arg String - "Foo#add"
    // replace characters
    //      space    -> "-"
    //      hyphen   -> "-"
    //      underbar -> "_"
    //      alphabet -> alphabet
    //      number   -> number
    //      other    -> ""
    //      unicode  -> encodeURIComponent(unicode)
    hash = hash.replace(/[\x20-\x7e]/g, function(match) {
                var result = / |-/.test(match) ? "-"
                           : /\W/.test(match)  ? ""
                           : match;

                return result;
            });

    // {baseURL}/wiki/{wikiPageName} or
    // {baseURL}/wiki/{wikiPageName}#{hash}
    var result = [];

    result.push( baseURL.replace(/\/+$/, ""), // remove tail slash
                 "/wiki/",
                 wikiPageName + "#" );

    if (wikiPageName !== hash) {
        result.push( "wiki-", encodeURIComponent(hash.toLowerCase()) );
    }
    return result.join("");
}

function _getLanguage() { // @ret String - "en", "ja" ...
    if (Reflection["lang"]) {
        return Reflection["lang"];
    }
    if (global["navigator"]) {
        return global["navigator"]["language"];
    }
    return "en";
}

function Reflection_getBaseClassName(value) { // @arg Any - instance, exclude null and undefined.
                                              // @ret String
    // Object.prototype.toString.call(new Error());     -> "[object Error]"
    // Object.prototype.toString.call(new TypeError()); -> "[object Error]"
    return Object.prototype.toString.call(value).split(" ")[1].slice(0, -1); // -> "Error"
}

function Reflection_getConstructorName(value) { // @arg Any - instance, exclude null and undefined.
                                                // @ret String
    // Reflection_getConstructorName(new (function Aaa() {})); -> "Aaa"
    return value.constructor["name"] ||
          (value.constructor + "").split(" ")[1].split("\x28")[0]; // for IE
}

function Reflection_syntaxHighlight(code,      // @arg String             - source code
                                    highlight, // @arg String             - highlight keyword
                                    target,    // @arg String = "console" - target environment.
                                    style) {   // @arg Object = {}        - { syntax, comment, literal, highlight }
                                               // @style.syntax    CSSStyleTextString = "color:#03f"
                                               // @style.comment   CSSStyleTextString = "color:#3c0"
                                               // @style.literal   CSSStyleTextString = "color:#f6c"
                                               // @style.highlight CSSStyleTextString = "background:#ff9;font-weight:bold"
                                               // @ret StringArray
    switch (target || "console") {
    case "console":
        return _syntaxHighlightForConsole(code, highlight, style || {});
    }
    return [];
}

function _syntaxHighlightForConsole(code, highlight, style) {
    var styleSyntax    = style["syntax"]    || "color:#03f";
    var styleComment   = style["comment"]   || "color:#3c0";
    var styleLiteral   = style["literal"]   || "color:#f6c";
    var styleHighlight = style["highlight"] || "background:#ff9;font-weight:bold";
    var highlightData  = _createSyntaxHighlightData();

    var styleDeclaration = [];
    var rexSource = highlight ? (highlight + "|" + highlightData.keyword.join("|"))
                              :                    highlightData.keyword.join("|");
    var rex = new RegExp("(" + rexSource + ")", "g");
    var body = ("\n" + code + "\n").replace(/%c/g, "% c").
                                    replace(rex, function(_, match) {
                if (match === highlight) {
                    styleDeclaration.push(styleHighlight, "");
                    return "%c" + highlight + "%c";
                } else if (/^\/\/[^\n]+$/.test(match)) {
                    styleDeclaration.push(styleComment, "");
                    return "%c" + match + "%c";
                } else if (/^(\/[^\n\/]+\/|\"[^\n\"]*\"|\'[^\n\']*\')$/.test(match)) {
                    styleDeclaration.push(styleLiteral, "");
                    return "%c" + match + "%c";
                } else if (highlightData.matcher.test(match)) {
                    styleDeclaration.push(styleSyntax, "");
                    return "%c" + match + "%c";
                }
                return match;
            }).trim();
    return [body].concat(styleDeclaration);
}

function _createSyntaxHighlightData() {
    if (!_syntaxHighlightData.matcher) { // cached?
        _syntaxHighlightData.matcher =
                new RegExp("^\\W(" + ES6_IDENTIFY_KEYWORD + ")\\W$");
        _syntaxHighlightData.keyword = [].concat(ES6_SYNTAX_KEYWORDS,
                ES6_IDENTIFY_KEYWORD.split("|").map(function(keyword) {
                    return "\\W" + keyword + "\\W";
                }));
    }
    return _syntaxHighlightData;
}

// --- validate / assertions -------------------------------
//{@dev
//function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
//function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Reflection;
}
global["Reflection"] = Reflection;

})((this || 0).self || global);


// Console.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
var _isNodeOrNodeWebKit = !!global.global;
var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var CONSOLE_COLORS = {
        BLACK:  "\u001b[30m",
        RED:    "\u001b[31m",
        GREEN:  "\u001b[32m",
        YELLOW: "\u001b[33m",
        BLUE:   "\u001b[34m",
        MAGENTA:"\u001b[35m",
        CYAN:   "\u001b[36m",
        WHITE:  "\u001b[37m",
        CLEAR:  "\u001b[0m"
    };

// --- class / interfaces ----------------------------------
function Console() {
}

Console["log"]    = Console_log;    // Console.log(...:Any):void
Console["warn"]   = Console_warn;   // Console.warn(...:Any):void
Console["error"]  = Console_error;  // Console.error(...:Any):void
Console["color"]  = Console_color;  // Console.color(color:ColorString, message:String):void
Console["link"]   = Console_link;   // Console.link(url:String, title:String = "", style:Object = null):void
Console["isEnabledStyle"] = Console_isEnabledStyle; // Console.isEnabledStyle():Boolean

// --- implements ------------------------------------------
function Console_log() {
    console.log.apply(console, arguments);
}

function Console_warn() {
    console.warn.apply(console, arguments);
}

function Console_error() {
    console.error.apply(console, arguments);
}

function Console_color(color,     // @arg ColorString
                       message) { // @arg String
    if ( Console_isEnabledStyle() ) {
        color = color.toUpperCase();
        if (color in CONSOLE_COLORS) {
            console.log("%c" + message, "color:" + color, "");
        }
    } else if (_runOnNode) {
        color = color.toUpperCase();
        if (color in CONSOLE_COLORS) {
            console.log(CONSOLE_COLORS[color] + message + CONSOLE_COLORS.CLEAR);
        }
    } else {
        console.log(message);
    }
}

function Console_link(url,     // @arg URLString
                      title,   // @arg String = ""
                      style) { // @arg Object - { link, mark }
                               // @style.link String = "border-bottom:2px solid #9ff"
                               // @style.mark String = "▶"
    title = title || "";
    style = style || {};

    var linkStyle = style["link"] || "border-bottom:2px solid #9ff";
    var mark      = style["mark"] || "\u25b6";

    if ( Console_isEnabledStyle() ) {
        console.log.apply( console, _stylishLink(url, title, linkStyle, mark) );
    } else {
        console.log(title + url);
    }
}

function _stylishLink(url, title, linkStyle, mark) {
    if (!/%/.test(url)) {
        var link = "";

        if (title) {
            link = mark + " " + title + "\n    %c" + url + "%c";
        } else {
            link = "%c" + url + "%c";
        }
        return [link].concat([linkStyle, ""]);
    }
    return [title, url];
}

function Console_isEnabledStyle() { // @ret Boolean
    if (global["navigator"]) {
        if ( /Chrome/.test( global["navigator"]["userAgent"] || "" ) ) {
            if (_runOnBrowser) {
                return true;
            }
        }
    }
    return false;
}

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Console;
}
global["Console"] = Console;

})((this || 0).self || global);


// Valid.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var TYPED_ARRAYS = [
        "Int8Array", "Uint8Array", "Uint8ClampedArray",
        "Int16Array", "Uint16Array",
        "Int32Array", "Uint32Array",
        "Float32Array", "Float64Array"
    ];
var SPLITTER = /,|\x7c|\x2f/; // Value.keys(value, "a,b|c/d")
var TYPE_SYNONYMS = {
        //informal  formal
        "omit":     "Omit",
        "null":     "Null",
        "void":     "Undefined",
        "Void":     "Undefined",
        "undefined":"Undefined",
        "INTEGER":  "Integer",
        "INT32":    "Int32",
        "INT16":    "Int16",
        "INT8":     "Int8",
        "UINT32":   "Uint32",
        "UINT16":   "Uint16",
        "UINT8":    "Uint8",
        "percent":  "Percent",
    };
var _hook = {}; // { type: callback, ... }

// --- class / interfaces ----------------------------------
function Valid(value,       // @arg Boolean
               api,         // @arg Function
               highlihgt) { // @arg String = ""
    if (!value) {
        if (global["Help"]) {
            global["Help"](api, highlihgt || "");
        }
        throw new Error("Validation Error: " + api["name"] + "(" + highlihgt + ") is invalid value.");
    }
}

//{@dev
Valid["repository"] = "https://github.com/uupaa/Valid.js";
//}@dev

Valid["args"]  = Valid_args;  // Valid.args(api:Function, args:Array|ArrayLike):void
Valid["type"]  = Valid_type;  // Valid.type(value:Any, types:String):Boolean
Valid["some"]  = Valid_some;  // Valid.some(value:String|null|undefined, candidate:String|Object, ignoreCase:Boolean = false):Boolean
Valid["keys"]  = Valid_keys;  // Valid.keys(value:Object|null|undefined, keys:String):Boolean
Valid["json"]  = Valid_json;  // Valid.json(json:Object, scheme:Object):Boolean
Valid["stack"] = Valid_stack; // Valid.stack(message:String = "", depth:Integer = 3):String

// --- extension ---
Valid["register"]     = Valid_register;     // Valid.register(type:HookTypeString, callback:Function):void
Valid["unregister"]   = Valid_unregister;   // Valid.unregister(type:HookTypeString):void
Valid["isRegistered"] = Valid_isRegistered; // Valid.isRegistered(type:HookTypeString):Boolean

// --- implements ------------------------------------------
function Valid_args(api,    // @arg Function
                    args) { // @arg Array|ArrayLike
    if (global["Reflection"]) {
        global["Reflection"]["getFunctionAttribute"](api, "arg")["arg"].forEach(function(item, index) {
            var type = item["type"];

            if (item["optional"]) {
                type += "|omit";
            }
            if ( !Valid_type(args[index], type) ) {
                if (global["Help"]) {
                    global["Help"](api, item["name"]);
                }
                throw new Error(api["name"] + "(" + item["name"] + ") is invalid type.");
            }
        });
    }
}

function Valid_type(value,   // @arg Any
                    types) { // @arg TypeNameString - "Type1", "Type1|Type2|omit"
                             //        NativeTypeNameString:  Array, Number, null ...
                             //        SpecialTypeNameString: Integer, TypedArray, omit ...
                             //        ComplexTypeNameString: URLString, FunctionArray ...
                             // @ret Boolean
    if (arguments.length >= 3) {
        throw new Error("The maximum length of Valid.type arguments are 2.");
    }
    return types.split(SPLITTER).some(_some);

    function _some(type) { // @arg NativeTypeNameString|SpecialTypeNameString|ComplexTypeNameString
                           // @ret Boolean
        type = TYPE_SYNONYMS[type] || type;

        // --- special keywords ---
        switch (type) {
        case "Any":         return true;
        case "this":        return value instanceof global[_getBaseClassName(value)];
        case "Omit":        return value === null || value === undefined;
        case "TypedArray":  return _isTypedArray(value);
        case "Null":        return value === null;
        case "Undefined":   return value === undefined;
        case "Array":       return Array.isArray(value);
        case "Object":      return (value || 0).constructor === ({}).constructor;
        case "FunctionArray":
                            return Array.isArray(value) && _isFunctionArray(value);
        case "Percent":     return typeof value === "number" && value >= 0.0 && value <= 1.0;
        // --- integer ---
        case "Integer":     return _isInt(value);
        case "Int32":       return _isInt(value)  && value <= 0x7fffffff && value >= -0x80000000;
        case "Int16":       return _isInt(value)  && value <= 0x7fff     && value >= -0x8000;
        case "Int8":        return _isInt(value)  && value <= 0x7f       && value >= -0x80;
        case "Uint32":      return _isUint(value) && value <= 0xffffffff;
        case "Uint16":      return _isUint(value) && value <= 0xffff;
        case "Uint8":       return _isUint(value) && value <= 0xff;
        // --- color ---
        case "AARRGGBB":
        case "RRGGBBAA":    return _isUint(value) && value <= 0xffffffff; // Uint32
        case "RRGGBB":      return _isUint(value) && value <= 0xffffff;   // Uint24
        // --- postMessage ---
        case "TransferableObject":
                            return _isArrayBuffer(value) ||
                                   _isCanvasProxy(value) ||
                                   _isMessagePort(value);
        case "TransferableObjects":
        case "TransferableObjectArray":
                            return _isTransferableObjects(value);
        }
        if (value === null || value === undefined) {
            return false;
        }

        var constructorName = _getConstructorName(value);
        var baseClassName   = _getBaseClassName(value);

        if (constructorName === type || baseClassName === type) {
            return true;
        }
        if (type in global) { // Is this global Class?
            return baseClassName === type;
        }

        // Valid.register(type) matching
        if (type in _hook) {
            return _hook[type](type, value);
        }

        // greedy complex type matching
        //
        //      "FooIntegerIDString" in global -> false
        //         "IntegerIDString" in global -> false
        //                "IDString" in global -> false
        //                  "String" in global -> true
        //
        var token = _splitComplexTypeName(type);

        if (token.length > 1) {
            for (var i = 0, iz = token.length; i < iz; ++i) {
                var compositeTypes = token.slice(i).join("");

                if (compositeTypes in global) {
                    return _some(compositeTypes);
                }
            }
        }
        return false;
    }

    function _isInt(value) {
        return typeof value === "number" && Math.ceil(value) === value;
    }
    function _isUint(value) {
        return typeof value === "number" && Math.ceil(value) === value && value >= 0;
    }
}

function _splitComplexTypeName(type) { // @arg PascalCaseString - "FooIntegerIDString"
                                       // @ret StringArray      - ["Foo", "Integer", "ID", "String"]
    var token = [];

    type.replace(/([A-Z]+)[a-z0-9]+/g, function(_, a) {
        if (a.length === 1) {
            // "String" -> { _: "String", a: "S" }
            token.push(_);
        } else {
            // "IDString" -> { _: "IDString", a: "IDS" }
            token.push( _.slice(0, a.length - 1) ); // "ID"
            token.push( _.slice(a.length - 1) );    // "String"
        }
    });
    return token;
}

function _getBaseClassName(value) { // @arg Any
                                    // @ret String
    // Object.prototype.toString.call(new Error());     -> "[object Error]"
    // Object.prototype.toString.call(new TypeError()); -> "[object Error]"
    return Object.prototype.toString.call(value).split(" ")[1].slice(0, -1); // -> "Error"
}

function _getConstructorName(value) { // @arg Any - instance, exclude null and undefined.
                                      // @ret String
    // _getConstructorName(new (function Aaa() {})); -> "Aaa"
    return value.constructor["name"] ||
          (value.constructor + "").split(" ")[1].split("\x28")[0]; // for IE
}

function _isTypedArray(value) { // @arg Any
                                // @ret Boolean
    var className = _getBaseClassName(value).toLowerCase();

    return TYPED_ARRAYS.some(function(typeName) {
                return className === typeName.toLowerCase();
            });
}

function _isTransferableObjects(value) { // @arg Any
    if (Array.isArray(value)) {
        return value.some(function(v) {
            return _isArrayBuffer(v) || _isCanvasProxy(v) || _isMessagePort(v);
        });
    }
    return false;
}
function _isArrayBuffer(value) {
    if (global["ArrayBuffer"]) {
        return value instanceof global["ArrayBuffer"];
    }
    return false;
}
function _isCanvasProxy(value) {
    if (global["CanvasProxy"]) {
        return value instanceof global["CanvasProxy"];
    }
    return false;
}
function _isMessagePort(value) {
    if (global["MessagePort"]) {
        return value instanceof global["MessagePort"];
    }
    return false;
}
function _isFunctionArray(value) {
    return value.every(function(fn) {
        return typeof fn === "function";
    });
}

function Valid_some(value,        // @arg String|null|undefined - "a"
                    candidate,    // @arg Object|String - "a|b|c"
                    ignoreCase) { // @arg Boolean = false
                                  // @ret Boolean - true -> has, false -> has not
    ignoreCase = ignoreCase || false;

    if (value === null || value === undefined) {
        return true; // [!]
    }
    var keys = typeof candidate === "string"              ? candidate.split(SPLITTER)
             : candidate.constructor === ({}).constructor ? Object.keys(candidate)
             : [];

    if (ignoreCase) {
        value = value.toLowerCase();
    }
    return keys.some(function(token) {
        if (ignoreCase) {
            return value === token.toLowerCase();
        }
        return value === token;
    });
}

function Valid_keys(value,  // @arg Object|null|undefined - { key1, key2 }
                    keys) { // @arg String - valid choices. "a,b" or "a|b" or "a/b"
                            // @ret Boolean - false is invalid value.
    if (value === null || value === undefined) {
        return true; // [!]
    }
    if (value.constructor === ({}).constructor) {
        var items = keys.replace(/ /g, "").split(SPLITTER);

        return Object.keys(value).every(function(key) {
            return items.indexOf(key) >= 0;
        });
    }
    return false;
}

function Valid_json(json,     // @arg JSONObject
                    scheme) { // @arg JSONObject
                              // @ret Boolean - false is invalid.
    var rv = _json(json, scheme, "");

    if (rv) {
        return true;
    }
    console.log("json: " + JSON.stringify(json, null, 2));
    console.log("scheme: " + JSON.stringify(scheme, null, 2));
    return false;
}

function _json(json, scheme, path) {
    path = path || "";
    return Object.keys(scheme).every(function(schemeKey) {
        var schemeType = Object.prototype.toString.call(scheme[schemeKey]).slice(8, -1);

        if (schemeKey in json) {
            if ( !Valid_type(json[schemeKey], schemeType) ) {
                console.error("Valid.json type missmatch: " + path + schemeKey + " is not " + schemeType);
                return false;
            } else if (schemeType === "Object" || schemeType === "Array") {
                return _json(json[schemeKey], scheme[schemeKey], path + schemeKey + ".");
            }
            return true;
        }
        console.error("Valid.json unknown property: " + path + schemeKey);
        return false;
    });
}

function Valid_stack(message, // @arg String = ""
                     depth) { // @arg Integer = 3
    depth = depth || 3;
    var rv = "";

    try {
        throw new Error();
    } catch (o_o) {
        rv = (message || "") + "\n" +
             o_o.stack.split("\n").slice(depth).join("\n");
    }
    return rv;
}

function Valid_register(type,       // @arg HookTypeString
                        callback) { // @arg Function - callback(type, value):Boolean
    _hook[type] = callback;
}

function Valid_unregister(type) { // @arg HookTypeString
    delete _hook[type];
}

function Valid_isRegistered(type) { // @arg HookTypeString
                                    // @ret Boolean
    return type in _hook;
}

// --- validate / assertions -------------------------------
//{@dev
//function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
//function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Valid;
}
global["Valid"] = Valid;

})((this || 0).self || global);


// Help.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var Reflection = global["Reflection"];
var Console    = global["Console"];

// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

// --- class / interfaces ----------------------------------
function Help(target,      // @arg Function|String - function or function-path or search keyword.
              highlight,   // @arg String = "" - code highlight.
              options) {   // @arg Object = {} - { nolink }
                           // @options.nolink Boolean = false
                           // @desc quick online help.
//{@dev
    _if(!/string|function/.test(typeof target),     Help, "target");
    _if(!/string|undefined/.test(typeof highlight), Help, "highlight");
//}@dev
    options = options || {};

    var resolved  = Reflection["resolve"](target);
    var search    = Reflection["getSearchLink"](resolved["path"]);
    var reference = Reflection["getReferenceLink"](resolved["path"]);

    _syntaxHighlight(resolved["fn"] + "", highlight);
    if (!options.noLink) {
        Console["link"](search["url"], search["title"]);
        if (reference) {
            Console["link"](reference["url"], reference["title"]);
        }
    }
}

//{@dev
Help["repository"] = "https://github.com/uupaa/Help.js";
//}@dev

_defineGetter();

// --- implements ------------------------------------------
function _syntaxHighlight(code,   // @arg String
                          hint) { // @arg String = ""
    if ( Console["isEnabledStyle"]() ) {
        console.log.apply(console, Reflection["syntaxHighlight"](code, hint));
    } else {
        console.log(code);
    }
}

function _defineGetter() {
    Object.defineProperty(Function["prototype"], "help", {
        get: function() { Help(this); },
        configurable: true
    });
    Object.defineProperty(String["prototype"], "help", {
        get: function() { Help(this); },
        configurable: true
    });
}

/*
function _deleteGetter() {
    delete Function.prototype.help;
    delete String.prototype.help;
}
 */

// --- validate / assertions -------------------------------
//{@dev
function _if(value, fn, hint) {
    if (value) {
        throw new Error(fn.name + " " + hint);
    }
}
//}@dev

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Help;
}
global["Help"] = Help;

})((this || 0).self || global);



// Task.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _isNodeOrNodeWebKit = !!global.global;
//var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
//var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
//var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
//var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var _taskInstances = {}; // instances. { "taskName@counter": TaskInstance, ... }
var _taskNumber = 0;

function NOP() {}

// --- class / interfaces ----------------------------------
function Task(taskCount, // @arg Integer              - user task count, value from 1.
              callback,  // @arg Function|Task = null - callback(err:Error, buffer:Array)
              options) { // @arg Object = {}          - { tick, name, buffer }
                         // @options.tick Function = null      - tick(taskName) callback.
                         // @options.name String = "anonymous" - task name.
                         // @options.buffer Array = []         - buffer.
                         // @desc Counter based task executor.

    options  = options  || {};
    callback = callback || NOP;

    var junction = callback instanceof Task;
    var tick     = options["tick"]   || null;
    var name     = options["name"]   || "anonymous";
    var buffer   = options["buffer"] || (junction ? callback["buffer"]() : []); // Junction -> Buffer share

    this["name"] = name + "@" + (++_taskNumber); // String: "task@1"
    this._ = {
        tick:           tick,       // Function:
        buffer:         buffer,     // Array:
        callback:       callback,   // Function|Task: finished callback.
        junction:       junction,   // Boolean: callback is Junction.
        taskCount:      taskCount,  // Number:  user task count.
        missableCount:  0,          // Integer: number of missable count.
        passedCount:    0,          // Integer: Task#pass() called count.
        missedCount:    0,          // Integer: Task#miss() called count.
        message:        "",         // String: new Error(message)
        state:          ""          // String: current state. ""(progress), "pass", "miss", "exit"
    };
    _taskInstances[this["name"]] = this; // register task instance.
    if (!taskCount) {
        _update(this, "init"); // user task count is zero -> finished.
    }
}

Task["prototype"] = {
    "constructor":  Task,           // new Task(tackCount:Integer, callback:Function|Task = null, options:Object = {})
    // --- buffer accessor ---
    "pop":          Task_pop,       // Task#pop():Any|undefined
    "push":         Task_push,      // Task#push(value:Any):this
    "shift":        Task_shift,     // Task#shift():Any|undefined
    "unshift":      Task_unshift,   // Task#unshift(value:Any):this
    "set":          Task_set,       // Task#set(key:String, value:Any):this
    // --- flow state ---
    "done":         Task_done,      // Task#done(err:Error|null):this
    "pass":         Task_pass,      // Task#pass():this
    "miss":         Task_miss,      // Task#miss():this
    "exit":         Task_exit,      // Task#exit():this
    // --- closure function ---
    "passfn":       Task_passfn,    // Task#passfn():TaskPassClosureFunction
    "missfn":       Task_missfn,    // Task#missfn():TaskMissClosureFunction
    // --- utility ---
    "state":        Task_state,     // Task#state():String
    "buffer":       Task_buffer,    // Task#buffer():Array|null
    "extend":       Task_extend,    // Task#extend(count:Integer):this
    "message":      Task_message,   // Task#message(message:Error|String):this
    "missable":     Task_missable,  // Task#missable(count:Integer):this
    "isFinished":   Task_isFinished // Task#isFinished():Boolean
};
Task["dump"]      = Task_dump;      // Task.dump(filter:String = ""):Object
Task["clear"]     = Task_clear;     // Task.clear():void
Task["drop"]      = Task_clear;     // [DEPRECATED] Task.drop():void
Task["flatten"]   = Task_flatten;   // Task.flatten(source:Array):Array
Task["arraynize"] = Task_arraynize; // Task.arraynize(source:Array):Array
Task["objectize"] = Task_objectize; // Task.objectize(source:Array):Object

// --- task runner ---
Task["run"]       = Task_run;       // Task.run(taskPlan:String,
                                    //          taskMap:TaskMapObject|TaskMapArray,
                                    //          callback:Function|Task = null,
                                    //          options:Object = {}):Task
Task["loop"]      = Task_loop;      // Task.loop(source:Object|Array,
                                    //           tick:Function,
                                    //           callback:Function|Task = null,
                                    //           options:Object = {}):Task
// --- implements ------------------------------------------
function Task_pop() { // @ret Any|undefined
    if (this._.buffer) {
        return this._.buffer.pop();
    }
    return this;
}
function Task_push(value) { // @arg Any
                            // @ret this
    if (this._.buffer) {
        this._.buffer.push(value);
    }
    return this;
}
function Task_shift() { // @ret Any|undefined
    if (this._.buffer) {
        return this._.buffer.shift();
    }
    return this;
}
function Task_unshift(value) { // @arg Any
                               // @ret this
    if (this._.buffer) {
        this._.buffer.unshift(value);
    }
    return this;
}

function Task_set(key,     // @arg String
                  value) { // @arg Any
                           // @ret this
    if (this._.buffer) {
        this._.buffer[key] = value;
    }
    return this;
}

function Task_done(err) { // @arg Error|null
                          // @ret this
                          // @desc err is call Task#message(err.message).miss()
                          //       !err is call Task#pass()
    var miss = err instanceof Error;

    if (miss) {
        this["message"](err["message"]);
    }
    return miss ? this["miss"]()
                : this["pass"]();
}

function Task_pass() { // @ret this
                       // @desc pass a user task.
    if (this._.tick) {
        this._.tick(this["name"]); // tick callback(taskName)
    }
    return _update(this, "pass");
}

function Task_miss() { // @ret this
                       // @desc miss a user task.
    if (this._.tick) {
        this._.tick(this["name"]); // tick callback(taskName)
    }
    return _update(this, "miss");
}

function Task_exit() { // @ret this
                       // @desc exit the Task.
    return _update(this, "exit");
}

function _update(that, method) { // @ret this
    var _ = that._;

    if (_.state === "") { // task in progress.
        // --- update current state ---
        switch (method) {
        case "init":                  _.state = _judgeState(_); break;
        case "pass": ++_.passedCount; _.state = _judgeState(_); break;
        case "miss": ++_.missedCount; _.state = _judgeState(_); break;
        case "exit":                  _.state = "exit";
        }
        // --- finishing ---
        if (_.state) { // task was finished. state = "pass" or "miss" or "exit"
            if (_.junction) {
                // bubble up message and state.
                _.callback["message"](_.message); // call Junction#message(...)
                _.callback[_.state]();            // call Junction#pass() or #miss() or #exit()
            } else {
                _.callback(_createError(that), _.buffer);
            }
            delete _taskInstances[that["name"]]; // [!] GC
            _.tick = null;                       // [!] GC
            _.buffer = null;                     // [!] GC
            _.callback = null;                   // [!] GC
        }
    }
    return that;
}

function _judgeState(_) { // @ret String - "miss" or "pass" or ""(progress)
    return _.missedCount >  _.missableCount ? "miss"
         : _.passedCount >= _.taskCount     ? "pass"
                                            : "";
}

function _createError(that) { // @ret Error|null
    if (that._.state === "pass") {
        return null;
    }
    return new Error(that._.message || ("Error: " + that["name"]));
}

function Task_passfn() { // @ret TaskPassClosureFunction
                         // @desc pass a user task.
    var that = this;

    return function() { that["pass"](); };
}

function Task_missfn() { // @ret TaskMissClosureFunction
                         // @desc miss a user task.
    var that = this;

    return function() { that["miss"](); };
}

function Task_state() { // @ret String - task state "" / "pass" / "miss" / "exit"
                        // @desc get state
    return this._.state;
}

function Task_buffer() { // @ret Array|null - task finished is null.
    return this._.buffer;
}

function Task_extend(count) { // @arg Integer - task count
                              // @ret this
                              // @desc extend task count.
    this._.taskCount += count;
    return this;
}

function Task_message(message) { // @arg Error|String - message.
                                 // @ret this
                                 // @desc set message
    this._.message = message["message"] || message;
    return this;
}

function Task_missable(count) { // @arg Integer - missable count
                                // @ret this
                                // @desc extend missable count.
    this._.missableCount += count;
    return this;
}

function Task_isFinished() { // @ret Boolean - true is finished
    return this._.state !== "";
}

function Task_dump(filter) { // @arg String = "" - task name filter.
                             // @ret Object      - task info snap shot.
                             // @desc dump snapshot.
    var rv = {};

    for (var taskName in _taskInstances) {
        if ( !filter || filter === taskName.split("@")[0] ) {
            var _ = _taskInstances[taskName]._;

            rv[taskName] = {
                "junction":     _.junction,
                "taskCount":    _.taskCount,
                "missableCount":_.missableCount,
                "passedCount":  _.passedCount,
                "missedCount":  _.missedCount,
                "state":        _.state
            };
        }
    }
    return JSON.parse( JSON.stringify(rv) ); // dead copy
}

function Task_clear() { // @desc clear snapshot.
    _taskInstances = {}; // [!] GC
    _taskNumber = 0;     // [!] reset
}

function Task_flatten(source) { // @arg Array
                                // @ret Array
    return Array.prototype.concat.apply([], source);
}

function Task_arraynize(source) { // @arg Array
                                  // @ret Array
    return Array.prototype.slice.call(source);
}

function Task_objectize(source) { // @arg Array
                                  // @ret Object
    return Object.keys(source).reduce(function(result, key) {
        result[key] = source[key];
        return result;
    }, {});
}

function Task_run(taskPlan,  // @arg String - plan. "a > b + c > d"
                  taskMap,   // @arg TaskMapObject|TaskMapArray - { a:fn, b:fn, c:fn, d:fn }, [fn, ...]
                             //             fn(task:Task, arg:Any, groupIndex:Integer):void
                  callback,  // @arg Function|Task = null - finished callback. callback(err:Error, buffer:Array)
                  options) { // @arg Object = {}   { arg, name, buffer }
                             // @options.arg Any = null           - task argument.
                             // @options.name String = "Task.run" - junction task name.
                             // @options.buffer Array = []        - shared buffer.
                             // @ret Task (as Junction)
    options  = options  || {};
    callback = callback || NOP;

    var arg    = options["arg"]    || null;
    var name   = options["name"]   || "Task.run";
    var buffer = options["buffer"] || (callback instanceof Task ? callback["buffer"]() : []); // Junction -> Buffer share

    var line = null;

    // parse("a > b + c > d") -> [  ["a"],   ["b", "c"],    ["d"]   ]
    //                               ~~~      ~~~  ~~~       ~~~      <--- 4 user tasks
    //                              ~~~~~    ~~~~~~~~~~     ~~~~~     <--- 3 user task groups
    //                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ <--- line (serialized task group)
    if (taskPlan) {
        line = JSON.parse("[[" +  taskPlan.replace(/\+/g, ",").               // "a > b , c > d"
                                           replace(/>/g, "],[").              // "a ],[ b , c ],[ d"
                                           replace(/(\w+)/g, '"$1"') + "]]"); // '"a" ],[ "b" , "c" ],[ "d"'
    } else {
        line = JSON.parse('[["' + Object.keys(taskMap).join('"],["') + '"]]');
    }

    var junction = new Task(line.length, callback, { "name": name, "buffer": buffer });
    var param = { junction: junction, line: line, groupIndex: 0, taskMap: taskMap, arg: arg };

    _nextGroup(param);
    return junction;
}

function _nextGroup(param) {
    if (!param.junction["isFinished"]()) {
        // --- create task group ---
        var taskGroup = param.line[param.groupIndex++]; // ["a"] or ["b", "c"] or ["d"]

        var groupJunction = new Task(taskGroup.length, function(err) {
                                param.junction["done"](err);
                                if (!err) {
                                    _nextGroup(param); // recursive call
                                }
                            }, { "buffer": param.junction["buffer"]() });

        for (var i = 0, iz = taskGroup.length; i < iz; ++i) {
            _callUserTask(param, taskGroup[i], groupJunction);
        }
    }

    function _callUserTask(param, taskName, groupJunction) {
        var task = new Task(1, groupJunction, { "name": taskName });

        if (taskName in param.taskMap) {
            try {
                param.taskMap[taskName](task, param.arg, param.groupIndex - 1); // call userTask(task, arg, groupIndex) { ... }
            } catch (err) {
                task["done"](err);
            }
        } else if ( isFinite(taskName) ) { // isFinite("1000") -> sleep(1000) task
            setTimeout(function() {
                task["pass"]();
            }, parseInt(taskName, 10) | 0);
        }
    }
}

function Task_loop(source,    // @arg Object|Array         - for loop and for-in loop data. [1, 2, 3], { a: 1, b: 2, c: 3 }
                   tick,      // @arg Function             - tick callback function. tick(task:Task, key:String, source:Object/Array):void
                   callback,  // @arg Function|Task = null - finished callback(err:Error, buffer:Array)
                   options) { // @arg Object = {}          - { arg, name, buffer }
                              // @options.arg Any = null            - task argument.
                              // @options.name String = "Task.loop" - junction task name.
                              // @options.buffer Array = []         - shared buffer.
                              // @ret Task Junction

    var keys = Object.keys(source);
    var taskPlan = new Array(keys.length + 1).join("_").split("").join(">"); // "_>_>_ ..."
    var taskMap = {
            "_": function(task, arg, groupIndex) {
                tick(task, keys[groupIndex], source);
            }
        };

    options = options || {};
    options["name"] = options["name"] || "Task.loop";

    return Task_run(taskPlan, taskMap, callback, options);
}

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Task;
}
global["_TestTask_"] = Task;

})((this || 0).self || global);


// Test.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var Task = global["_TestTask_"];

// --- define / local variables ----------------------------
var _isNodeOrNodeWebKit = !!global.global;
var _runOnNodeWebKit =  _isNodeOrNodeWebKit &&  /native/.test(setTimeout);
var _runOnNode       =  _isNodeOrNodeWebKit && !/native/.test(setTimeout);
var _runOnWorker     = !_isNodeOrNodeWebKit && "WorkerLocation" in global;
var _runOnBrowser    = !_isNodeOrNodeWebKit && "document" in global;

var _stylish = _isConsoleStyleReady();

var ERR  = "\u001b[31m";
var WARN = "\u001b[33m";
var INFO = "\u001b[32m";
var CLR  = "\u001b[0m";

// --- class / interfaces ----------------------------------
function Test(moduleName, // @arg String|StringArray - target modules.
              param) {    // @arg Object = {} - { disable, browser, worker, node, nw, button, both, ignoreError }
                          // @param.disable Boolean = false - Disable all tests.
                          // @param.browser Boolean = false - Enable the browser test.
                          // @param.worker  Boolean = false - Enable the webWorker test.
                          // @param.node    Boolean = false - Enable the node.js test.
                          // @param.nw      Boolean = false - Enable the node-webkit test.
                          // @param.button  Boolean = false - Show test buttons.
                          // @param.both    Boolean = false - Test the primary and secondary module.
                          // @param.ignoreError Boolean = false - ignore error
    param = param || {};

    this._items   = []; // test items.
    this._swaped  = false;
    this._module  = Array.isArray(moduleName) ? moduleName : [moduleName];

    this._browser = param["browser"] || false;
    this._worker  = param["worker"]  || false;
    this._node    = param["node"]    || false;
    this._nw      = param["nw"]      || false;
    this._button  = param["button"]  || false;
    this._both    = param["both"]    || false;
    this._ignoreError = param["ignoreError"] || false;

    if (param["disable"]) {
        this._browser = false;
        this._worker  = false;
        this._node    = false;
        this._nw      = false;
        this._button  = false;
        this._both    = false;
    }
}

Test["prototype"]["add"]   = Test_add;   // Test#add(items:TestItemFunctionArray):this
Test["prototype"]["run"]   = Test_run;   // Test#run(callback:Function = null):this
Test["prototype"]["clone"] = Test_clone; // Test#clone():TestItemFunctionArray

Test["toHex"]      = Test_toHex;         // Test#toHex(a:TypedArray|Array, fixedDigits:Integer = 0):NumberStringArray
Test["likeArray"]  = Test_likeArray;     // Test#likeArray(a:TypedArray|Array, b:TypedArray|Array, fixedDigits:Integer = 0):Boolean
Test["likeObject"] = Test_likeObject;    // Test#likeObject(a:Object, b:Object):Boolean

// --- implements ------------------------------------------
function Test_add(items) { // @arg TestItemFunctionArray - test items. [fn, ...]
                           // @desc add test item(s).
    this._items = this._items.concat(items);
    return this;
}

function Test_run(callback) { // @arg Function = null - callback(err:Error)
                              // @ret this
    var that = this;
    var plan = "node_1st > browser_1st > worker_1st > nw_1st";

    if (that._both) {
        if (_runOnWorker) {
            plan += " > 1000 > swap > node_2nd > browser_2nd"; // remove worker_2nd
        } else {
            plan += " > 1000 > swap > node_2nd > browser_2nd > worker_2nd";
        }
    }

    Task.run(plan, {
        node_1st: function(task) {      // Node(primary)
            _nodeTestRunner(that, task);
        },
        browser_1st: function(task) {   // Browser(primary)
            _browserTestRunner(that, task);
        },
        worker_1st: function(task) {    // Worker(primary)
            _workerTestRunner(that, task);
        },
        nw_1st: function(task) {        // node-webkit(primary)
            _nwTestRunner(that, task);
        },
        swap: function(task) {
            _swap(that);
            task.pass();
        },
        node_2nd: function(task) {      // Node(secondary)
            _nodeTestRunner(that, task);
        },
        browser_2nd: function(task) {   // Browser(secondary)
            _browserTestRunner(that, task);
        },
        worker_2nd: function(task) {    // Worker(secondary)
            _workerTestRunner(that, task);
        },
//      nw_2st: function(task) {        // node-webkit(secondary)
//          _nwTestRunner(that, task);
//      },
    }, function(err) {
        _undo(that);
        if (callback) {
            callback(err);
        } else if (err) {
            throw err;
        }
    });
    return this;
}

function Test_clone() { // @ret TestItemFunctionArray
    return this._items.slice();
}

function _browserTestRunner(that, task) {
    if (that._browser) {
        if (_runOnBrowser) {
            if (document["readyState"] === "complete") { // already document loaded
                _onload();
            } else {
                global.addEventListener("load", _onload);
            }
            return;
        }
    }
    task.pass();

    function _onload() {
        _testRunner(that, function(err) {
            _finishedLog(that, err);
            document.body["style"]["backgroundColor"] = err ? "red" : "lime";
            if (that._button) {
                _addTestButtons(that, that._items);
            }
            task.done(err);
        });
    }
}

function _workerTestRunner(that, task) {
    if (that._worker) {
        if (_runOnWorker) {
            var isSecondaryModule = false;

            if (global["TEST_DATA"]) {
                isSecondaryModule = global["TEST_DATA"]["SECONDARY"] || false; // from WebWorker
                if (isSecondaryModule) {
                    _swap(that);
                }
            }
            _testRunner(that, function(err) {
                if ("console" in global) { // WebWorkerConsole
                    _finishedLog(that, err);
                }
                if (err) {
                    global["TEST_ERROR_MESSAGE"] = err.message; // [!] set WorkerGlobal.TEST_ERROR_MESSAGE
                }
                if (isSecondaryModule) {
                    _undo(that);
                }
                task.done(err);
            });
            return;
        } else if (_runOnBrowser) {
            _createWorker(that, task);
            return;
        }
    }
    task.pass();
}

function _nodeTestRunner(that, task) {
    if (that._node) {
        if (_runOnNode) {
            _testRunner(that, function(err) {
                _finishedLog(that, err);
                task.done(err);
                if (err) {
                    process.exit(1); // failure ( need Travis-CI )
                }
            });
            return;
        }
    }
    task.pass();
}

function _nwTestRunner(that, task) {
    if (that._nw) {
        if (_runOnNodeWebKit) {
            if (document["readyState"] === "complete") { // already document loaded
                _onload();
            } else {
                global.addEventListener("load", _onload);
            }
            return;
        }
    }
    task.pass();

    function _onload() {
        _testRunner(that, function(err) {
            _finishedLog(that, err);
            document.body["style"]["backgroundColor"] = err ? "red" : "lime";
            if (that._button) {
                _addTestButtons(that, that._items);
            }
            task.done(err);
        });
    }
}

function _testRunner(that,               // @arg this
                     finishedCallback) { // @arg Function = null
    var items = that._items.slice(); // clone
    var task  = new Task(items.length, _callback, { "tick": _next });

    _next();

    function _next() {
        var fn = items.shift();

        if (fn) {
            var testFunctionName = fn["name"] || (fn + "").split(" ")[1].split("\x28")[0];
            var testFunctionArgumentLength = fn.length;

            if (testFunctionArgumentLength === 0) {
                if ("Help" in global) {
                    global["Help"](fn, testFunctionName);
                }
                throw new Error("Function " + testFunctionName + " has no argument.");
            }
            var flow = _getFlowFunctions(that, testFunctionName + " pass", testFunctionName + " miss");

                if (_runOnNode) {
                    if (!that._ignoreError) {
                        fn(task, flow.pass, flow.miss);
                    } else {
                        try {

                            //  textXxx(test, pass, miss) {
                            //      if (true) {
                            //          test.done(pass());
                            //      } else {
                            //          test.done(miss());
                            //      }
                            //  }

                            fn(task, flow.pass, flow.miss);
                        } catch (o_O) { // [!] catch uncaught exception
                            flow.miss();
                            console.log(ERR + fn + CLR);
                            task.message(ERR + o_O.message + CLR + " in " + testFunctionName + " function").miss();
    //                      throw o_O;
                        }
                    }
                } else if (_runOnBrowser || _runOnNodeWebKit) {
                    if (!that._ignoreError) {
                        fn(task, flow.pass, flow.miss);
                    } else {
                        try {
                            fn(task, flow.pass, flow.miss);
                        } catch (o_O) {
                            flow.miss();
                            global["Help"](fn, testFunctionName);
                            task.message(o_O.message + " in " + testFunctionName + " function").miss();
                        }
                    }
                } else {
                    if (!that._ignoreError) {
                        fn(task, flow.pass, flow.miss);
                    } else {
                        fn(task, flow.pass, flow.miss);
                    }
                }
        }
    }
    function _callback(err) {
        if (finishedCallback) {
            finishedCallback(err);
        }
    }
}

function _createWorker(that, task) {
  //var src = _createObjectURL("#worker"); // "blob:null/...."
    var src = "worker.js";

    if (src) {
        var worker = new Worker(src);

        worker.onmessage = function(event) {
//          if ( /^blob:/.test(src) ) { // src is objectURL?
//              (global["URL"] || global["webkitURL"]).revokeObjectURL(src); // [!] GC
//          }
            var testErrorMessage = event.data.TEST_ERROR_MESSAGE;

            if (testErrorMessage) {
                document.body.style.backgroundColor = "red"; // [!] RED screen
                console.error("worker.onmessage: " + testErrorMessage);
                debugger;
            }
            task.done(testErrorMessage ? new Error(testErrorMessage) : null);
        };

        var baseDir = location.href.split("/").slice(0, -1).join("/") + "/";

        // self.TEST_DATA = event.data;
        worker.postMessage({
            "SECONDARY":    that._swaped,
            "BASE_DIR":     baseDir
        });
    } else {
        task.pass();
    }
}

/*
function _createObjectURL(nodeSelector) {
    var node = document.querySelector(nodeSelector);

    if (node && "Blob" in global) {
        // create Worker from inline <script id="worker" type="javascript/worker"> content
        var blob = new Blob([ node.textContent ], { type: "application/javascript" });

        return (global["URL"] || global["webkitURL"]).createObjectURL(blob);
    }
    return "";
}
 */

function _swap(that) {
    if (that._both) {
        if (!that._swaped) {
            that._swaped = true;
            that._module.forEach(function(moduleName) {
                global["$$$" + moduleName + "$$$"] = global[moduleName];
                global[moduleName] = global[moduleName + "_"]; // swap primary <-> secondary module
            });
        }
    }
}

function _undo(that) {
    if (that._both) {
        if (that._swaped) {
            that._swaped = false;
            that._module.forEach(function(moduleName) {
                global[moduleName] = global["$$$" + moduleName + "$$$"];
                delete global["$$$" + moduleName + "$$$"];
            });
        }
    }
}

function _isConsoleStyleReady() {
    if (global["navigator"]) {
        if ( /Chrome/.test( global["navigator"]["userAgent"] || "" ) ) {
            return true;
        }
    }
    return false;
}

function _getFlowFunctions(that,
                           passMessage,   // @arg String
                           missMessage) { // @arg String
    var order = that._swaped ? "secondary"
                             : "primary";
    var style = "";

    if (global["console"]) {
        style = _runOnNode   ? "node"
              : _runOnWorker ? "worker"
              : _runOnNodeWebKit ? "nw"
              : _stylish     ? "color"
                             : "browser";
    }

    // function testXxx(test, pass, miss) { ... }
    var pass = null;
    var miss = null;

    switch (style) {
    case "node":    pass = console.log.bind(console, INFO + "Node(" + order + "): " + CLR + passMessage); break;
    case "worker":  pass = console.log.bind(console,      "Worker(" + order + "): " + passMessage); break;
    case "color":   pass = console.log.bind(console,   "%cBrowser(" + order + "): " + passMessage + "%c ", "color:#0c0", ""); break;
    case "browser": pass = console.log.bind(console,     "Browser(" + order + "): " + passMessage); break;
    case "nw":      pass = console.log.bind(console, "node-webkit(" + order + "): " + passMessage);
    }
    switch (style) {
    case "node":    miss = function() { console.error(ERR +"Node(" + order + "): " + CLR + missMessage);                     return new Error(); }; break;
    case "worker":  miss = function() { console.error(   "Worker(" + order + "): " + missMessage);                           return new Error(); }; break;
    case "color":   miss = function() { console.error("%cBrowser(" + order + "): " + missMessage + "%c ", "color:#red", ""); return new Error(); }; break;
    case "browser": miss = function() { console.error(  "Browser(" + order + "): " + missMessage);                           return new Error(); }; break;
    case "nw":      miss = function() { console.error("node-webkit("+order + "): " + missMessage);                           return new Error(); };
    }
    return { pass: pass, miss: miss };
}

function _finishedLog(that, err) {
    var flow = _getFlowFunctions(that, "ALL PASSED.", "SOME MISSED.");

    if (err) {
        flow.miss();
    } else {
        flow.pass();
    }
}

function _addTestButtons(that, items) { // @arg TestItemFunctionArray
    // add <input type="button" onclick="test()" value="test()" /> buttons
    items.forEach(function(fn, index) {
        var itemName = fn["name"] || (fn + "").split(" ")[1].split("\x28")[0];
        var safeName = itemName.replace(/\$/, "_"); // "concat$" -> "concat_"

        if (!document.querySelector("#" + safeName)) {
            var inputNode = document.createElement("input");
            var next = "{pass:function(){},miss:function(){},done:function(){}}";
            var pass = "function(){console.log('"   + itemName + " pass')}";
            var miss = "function(){console.error('" + itemName + " miss')}";

            inputNode.setAttribute("id", safeName);
            inputNode.setAttribute("type", "button");
            inputNode.setAttribute("value", itemName + "()");
            inputNode.setAttribute("onclick", "ModuleTest" + that._module[0] +
                    "[" + index + "](" + next + ", " + pass + ", " + miss + ")");

            document.body.appendChild(inputNode);
        }
    });
}

function Test_toHex(a,             // @arg TypedArray|Array
                    fixedDigits) { // @arg Integer = 0 - floatingNumber.toFixed(fixedDigits)
                                   // @arg NumberStringArray - ["00", "01"]                  (Uint8Array)
                                   //                          ["0000", "0001", ...]         (Uint16Array)
                                   //                          ["00000000", "00000001", ...] (Uint32Array)
                                   //                          ["12.3", "0.1", ...]          (Float64Array)
    var fix    = fixedDigits || 0;
    var type   = Array.isArray(a) ? "Array" : Object.prototype.toString.call(a);
    var result = [], i = 0, iz = a.length;
    var bytes  = /8/.test(type) ? 2 : /32/.test(type) ? 8 : 4;

    if (/float/.test(type)) {
        for (; i < iz; ++i) {
            result.push( (0x100000000 + a[i]).toString(16).slice(-bytes) );
        }
    } else {
        for (; i < iz; ++i) {
            result.push( fix ? a[i].toFixed(fix) : a[i] );
        }
    }
    return result;
}

function Test_likeArray(a,             // @arg TypedArray|Array
                        b,             // @arg TypedArray|Array
                        fixedDigits) { // @arg Integer = 0 - floatingNumber.toFixed(fixedDigits)
                                       // @ret Boolean
    fixedDigits = fixedDigits || 0;
    if (a.length !== b.length) {
        return false;
    }
    for (var i = 0, iz = a.length; i < iz; ++i) {
        if (fixedDigits) {
            if ( a[i].toFixed(fixedDigits) !== b[i].toFixed(fixedDigits) ) {
                return false;
            }
        } else {
            if ( a[i] !== b[i] ) {
                return false;
            }
        }
    }
    return true;
}

function Test_likeObject(a,   // @arg Object
                         b) { // @arg Object
    return JSON.stringify(a) === JSON.stringify(b);
}

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Test;
}
global["Test"] = Test;

})((this || 0).self || global);

