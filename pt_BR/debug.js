
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
try {window.FB || (function(window) {
var self = window, document = window.document;
var undefined = void 0;
var setTimeout = window.setTimeout, setInterval = window.setInterval,clearTimeout = window.clearTimeout,clearInterval = window.clearInterval;var __DEV__ = 1;
function emptyFunction() {};
var __transform_includes = {"typechecks":true};
var __annotator, __bodyWrapper;
var __w, __t;
/** Path: html/js/downstream/polyfill/GenericFunctionVisitor.js */
/**
 * @generated SignedSource<<f580637e2bb707f6e854e38847d9b69a>>
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !! This file is a check-in of a static_upstream project!      !!
 * !!                                                            !!
 * !! You should not modify this file directly. Instead:         !!
 * !! 1) Use `fjs use-upstream` to temporarily replace this with !!
 * !!    the latest version from upstream.                       !!
 * !! 2) Make your changes, test them, etc.                      !!
 * !! 3) Use `fjs push-upstream` to copy your changes back to    !!
 * !!    static_upstream.                                        !!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @provides GenericFunctionVisitor
 * @polyfill
 *
 * This file contains the functions used for the generic JS function
 * transform. Please add your functionality to these functions if you
 * want to wrap or annotate functions.
 *
 * Please see the DEX https://fburl.com/80903169 for more information.
 */

/*globals __annotator:true, __bodyWrapper:true*/
(function () {
  var funcCalls = {};
  // These are functions used by the type check to create a function signature.
  var createMeta = function(type, signature) {
    if (!type && !signature) {
      return null;
    }

    var meta = {};
    if (typeof type !== 'undefined') {
      meta.type = type;
    }

    if (typeof signature !== 'undefined') {
      meta.signature = signature;
    }

    return meta;
  };

  var getMeta = function(name, params) {
    return createMeta(
      name && /^[A-Z]/.test(name) ? name : (void 0),
      params && ((params.params && params.params.length) || params.returns)
        ? 'function('
          + (params.params ? params.params.map(function(param) {
              return (/\?/).test(param)
                ? '?' + param.replace('?', '')
                : param;
          }).join(',') : '')
          + ')'
          + (params.returns ? ':' + params.returns : '')
        : (void 0)
    );
  };

  var noopAnnotator = function(fn, funcMeta, params) {
    return fn;
  };

  var genericAnnotator = function(fn, funcMeta, params) {
    if ('sourcemeta' in __transform_includes) {
      fn.__SMmeta = funcMeta;
    }

    if ('typechecks' in __transform_includes) {
      var meta = getMeta(funcMeta ? funcMeta.name : (void 0), params);
      if (meta) {
        __w(fn, meta);
      }
    }
    return fn;
  };

  var noopBodyWrapper = function(scope, args, fn) {
    return fn.apply(scope, args);
  };

  var typecheckBodyWrapper = function(scope, args, fn, params) {
    if (params && params.params) {
      __t.apply(scope, params.params);
    }

    var result = fn.apply(scope, args);

    if (params && params.returns) {
      __t([result, params.returns]);
    }

    return result;
  };

  var codeUsageBodyWrapper = function(scope, args, fn, params, funcMeta) {
    if (funcMeta) {
      if (!funcMeta.callId) {
        funcMeta.callId = funcMeta.module+':'+funcMeta.line+':'+funcMeta.column;
      }
      var key = funcMeta.callId;
      funcCalls[key] = (funcCalls[key] || 0) + 1;
    }
    return fn.apply(scope, args);
  };

  // Export to global.
  if (typeof __transform_includes === 'undefined') {
    __annotator = noopAnnotator;
    __bodyWrapper = noopBodyWrapper;
  } else {
    __annotator = genericAnnotator;
    // CodeUsage is mutually exclusive with anything else
    if ('codeusage' in __transform_includes) {
      __annotator = noopAnnotator;
      __bodyWrapper = codeUsageBodyWrapper;
      __bodyWrapper.getCodeUsage = function()  { return funcCalls; };
      __bodyWrapper.clearCodeUsage = function()  { funcCalls = {}; };
    } else if ('typechecks' in __transform_includes) {
      __bodyWrapper = typecheckBodyWrapper;
    } else {
      __bodyWrapper = noopBodyWrapper;
    }
  }
})();

/* -lasldVrBu7 */
/** Path: html/js/downstream/polyfill/TypeChecker.js */
/**
 * @generated SignedSource<<7642ff85de313e20993b189ed4d60806>>
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !! This file is a check-in of a static_upstream project!      !!
 * !!                                                            !!
 * !! You should not modify this file directly. Instead:         !!
 * !! 1) Use `fjs use-upstream` to temporarily replace this with !!
 * !!    the latest version from upstream.                       !!
 * !! 2) Make your changes, test them, etc.                      !!
 * !! 3) Use `fjs push-upstream` to copy your changes back to    !!
 * !!    static_upstream.                                        !!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *
 * This is a very basic typechecker that does primitives as well as boxed
 * versions of the primitives.
 *
 * @provides TypeChecker
 * @nostacktrace
 * @polyfill
 */

/*globals __t:true, __w:true*/
(function() {
  var handler;
  var currentType = [];
  var toStringFunc = Object.prototype.toString;
  var paused = false; // pause when there's a type check error in current tick
  var disabled = false; // Can be disabled by individual pages

  // Metadata of current value being inspected.
  var nextType;
  var nextValue;

  /**
   * Mapping from types to interfaces that they implement.
   */
  var typeInterfaceMap = {
    'HTMLElement': {'DOMEventTarget': true, 'DOMNode': true},
    'DOMElement': {'DOMEventTarget': true, 'DOMNode': true},
    'DOMDocument': {'DOMEventTarget': true, 'DOMNode': true},
    'DocumentFragment': {
      'DOMElement': true,
      'DOMEventTarget': true,
      'DOMNode': true
    },
    'DOMWindow': {'DOMEventTarget': true},
    'DOMTextNode': {'DOMNode': true},
    'Comment': {'DOMNode': true},
    'file': {'blob': true},
    'worker': {'DOMEventTarget': true},
    // We need to support typing on both the native and polyfilled type.
    'Set': {'set': true},
    'Map': {'map': true},
    'FbtResult': {'stringish' : true},
    'string': {'stringish': true}
  };

  /**
   * Get object name from toString call.
   *   > stringType(anchor) // "HTMLAnchorElement"
   *   > stringType([1, 2]) // "Array"
   */
  function stringType(value) {
    return toStringFunc.call(value).slice(8, -1);
  }

  function getTagName(string) {
    if (string === 'A') {
      return 'Anchor';
    }
    if (string === 'IMG') {
      return 'Image';
    }
    return string.charAt(0).toUpperCase() + string.substring(1).toLowerCase();
  }

  /**
   * Check the given value is a DOM node of desired type.
   */
  function isDOMNode(type, value, nodeType) {
    if (type === 'function') {
      // Firefox returns typeof 'function' for HTMLObjectElement, but we can
      // allow this because we know the object is not callable.
      if (typeof value.call !== 'undefined') {
        return false;
      }
    } else if (type !== 'object') {
      return false;
    }

    return typeof value.nodeName === 'string' && value.nodeType === nodeType;
  }

  /**
   * Do iteration across all types we recognize and return the type data.
   */
  function getObjectType(type, value, node, checkNextNode) {
    nextValue = null;

    // Defer calling toString on the value until we need it.
    var toStringType = stringType(value);
    if (value === null) {
      type = 'null';
    } else if (toStringType === 'Function') {
      if (node === '$Class') {
        // Allow functions to match `Class`.
        type = '$Class';
        if (checkNextNode && value.__TCmeta && value.__TCmeta.type) {
          nextType = value.__TCmeta.type;
        }
      } else {
        if (value.__TCmeta) {
          // Allow functions with signatures to match `function`.
          type = node === 'function' ? 'function' : value.__TCmeta.signature;
        } else {
          // Allow functions without signatures to match any signature.
          type = node.indexOf('function') === 0 ? node : 'function';
        }
      }
    } else if (type === 'object' || type === 'function') {
      var constructor = value.constructor;
      if (constructor && constructor.__TCmeta) {
        // The value is a custom type
        // Let custom types also match 'object'
        if (node === 'object') {
          type = 'object';
        } else {
          type = constructor.__TCmeta.type;
          while (constructor && constructor.__TCmeta) {
            if (constructor.__TCmeta.type == node) {
              type = node;
              break;
            }
            constructor = constructor.__TCmeta.superClass;
          }
        }
      } else if (typeof value.nodeType === 'number'
              && typeof value.nodeName === 'string') {
        // HTMLObjectElements has a typeof function in FF, but is not callable.
        // Do not use instanceof Element etc. as e.g. MooTools shadow this
        switch (value.nodeType) {
          case 1:
            if (node === 'HTMLElement') {
              // If testing against the base type, return this
              type = 'HTMLElement';
            } else {
              type = 'HTML' + getTagName(value.nodeName) + 'Element';
              typeInterfaceMap[type] = typeInterfaceMap['HTMLElement'];
            }
            break;
          case 3: type = 'DOMTextNode'; break;
          case 8: type = 'Comment'; break;
          case 9: type = 'DOMDocument'; break;
          case 11: type = 'DocumentFragment'; break;
        }
      } else if (value == value.window && value == value.self) {
        type = 'DOMWindow';
      } else if (toStringType == 'XMLHttpRequest'
                 || 'setRequestHeader' in value) {
        // XMLHttpRequest stringType is "Object" on IE7/8 so we duck-type it
        type = 'XMLHttpRequest';
      } else {
        // else, check if it is actually an array
        switch (toStringType) {
          case 'Error':
            // let Error match inherited objects
            type = node === 'Error'
              ? 'Error'
              : value.name;
            break;
          case 'Array':
            if (checkNextNode && value.length) {
              nextValue = value[0];
            }
            type = toStringType.toLowerCase();
            break;
          case 'Object':
            if (checkNextNode) {
              for (var key in value) {
                if (value.hasOwnProperty(key)) {
                  nextValue = value[key];
                  break;
                }
              }
            }
            type = toStringType.toLowerCase();
            break;
          case 'RegExp':
          case 'Date':
          case 'Blob':
          case 'File':
          case 'FileList':
          case 'Worker':
          case 'Map':
          case 'Set':
          // typed arrays
          case 'Uint8Array':
          case 'Int8Array':
          case 'Uint16Array':
          case 'Int16Array':
          case 'Uint32Array':
          case 'Int32Array':
          case 'Float32Array':
          case 'Float64Array':
            type = toStringType.toLowerCase();
            break;
        }
      }
    }
    return type;
  }

  /**
   * A recursive descent analyzer which takes a value and a typehint, validating
   * whether or not the value matches the typehint.
   * The function will call it self as long as both the value and the typehint
   * yields a nested component. This means that we will never recurse deeper
   * than needed, and also that we automatically get support for
   *   > equals([], 'array<string>') // true
   *   > equals(['string'], 'array') // true
   */
  function equals(value, node) {
    // http://jsperf.com/charat-vs-substr-vs-substring-vs-regex-vs-indexing-for-
    // shows that using indexing is slightly faster, but unfortunately indexing
    // is not supported by IE6/7
    var nullable = node.charAt(0) === '?';

    // Short circuit `null` and `undefined` if we allow them.
    if (value == null) {
      currentType.push(typeof value === 'undefined' ? 'undefined' : 'null');
      return nullable;
    } else if (nullable) {
      node = node.substring(1);
    }

    var type = typeof value;

    switch (type) {
      case 'boolean':
      case 'number':
      case 'string':
        // Primitive types will never have subtypes, etc. so we don't need to
        // to do any extra checks.
        currentType.push(type);
        return node === type;
    }

    // Instead of doing a full check for type of value, short circuit common
    // signatures and do special case checks for them. The tests are not
    // exhaustive, but should avoid false positives.
    var simpleMatch = false;
    switch (node) {
      case 'function':
        // Don't match for HTMLObjectElement.
        simpleMatch = type === 'function' && typeof value.call === 'function';
        break;
      case 'object':
        // Don't match on Array, HTMLObjectElement, etc.
        simpleMatch = type === 'object' && stringType(value) === 'Object';
        break;
      case 'array':
        simpleMatch = type === 'object' && stringType(value) === 'Array';
        break;
      case 'promise':
        simpleMatch = type === 'object' && typeof value.then === 'function';
        break;
      case 'HTMLElement':
        simpleMatch = isDOMNode(type, value, 1);
        break;
      case 'DOMTextNode':
        simpleMatch = isDOMNode(type, value, 3);
        break;
    }

    if (simpleMatch) {
      currentType.push(node);
      return true;
    }

    // Strip subtype from end of signature.
    var indexOfFirstAngle = node.indexOf('<');
    var nextNode;
    // Do not treat function expressions as generics
    if (indexOfFirstAngle !== -1 && node.indexOf('function') !== 0) {
      nextNode = node.substring(indexOfFirstAngle + 1, node.lastIndexOf('>'));
      node = node.substring(0, indexOfFirstAngle);
    }

    // Get actual type data.
    type = getObjectType(type, value, node, !!nextNode);

    // Check whether type has an interface that is what we're looking for.
    // Use truthiness check as per http://jsperf.com/hasownproperty-vs-in-vs-undefined/35
    var interfaces;
    if (type !== node && (interfaces = typeInterfaceMap[type])) {
      if (interfaces[node]) {
        type = node;
      }
    }

    // Check whether we got the right type (and subtype).
    currentType.push(type);

    if (node !== type) {
      return false;
    }
    // If `nextNode` exists, it is the string `X` in `Foo<X>`. This is checked
    // against either `nextType` or `nextValue`, set by `getObjectType`.
    if (nextNode) {
      // If `nextType` is set, we expect `X` to equal it.
      if (nextType && nextNode !== nextType) {
        return false;
      }
      // If `nextValue` is set, we expect the type of it to equal `X`.
      if (nextValue && !equals(nextValue, nextNode)) {
        return false;
      }
    }
    return true;
  }


  /**
   * Given a value and a typehint (can be a union type), this will return
   * whether or not the passed in value matches the typehint.
   */
  function matches(value, node) {
    if (node.indexOf('|') === -1) {
      currentType.length = 0;
      return equals(value, node);
    } else {
      var nodes = node.split('|');
      for (var i = 0; i < nodes.length; i++) {
        currentType.length = 0;
        if (equals(value, nodes[i])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * This function will loop over all arguments, where each argment is expected
   * to be in the form of `[variable, 'typehint', 'variablename']`.
   * For each argument, it will check whether the type of the variable matches
   * that of the typehint.
   * If any of the variables are found not to match a TypeError is thrown, else,
   * the first variable is returned.
   */
  function check(/*check1, check2, ..*/) {
    if (!paused && !disabled) {
      var args = arguments;
      var ii = args.length;
      while (ii--) {
        var value = args[ii][0];
        var expected = args[ii][1];
        var name = args[ii][2] || 'return value';

        if (!matches(value, expected)) {
          var actual = currentType.shift();
          while (currentType.length) {
            actual += '<' + currentType.shift() + '>';
          }

          var isReturn = !!args[ii][2];
          var stackBoundary;
          try {
            stackBoundary = isReturn ? arguments.callee.caller : check;
          } catch (e) {
            // If the caller is a strict function, we might be prevented from
            // accessing the .caller property, so let's go with next best
          }

          var message =
            'Type Mismatch for ' + name + ': expected `' + expected + '`, '
            + 'actual `' + actual + '` (' + toStringFunc.call(value) + ').';

          // If we don't know what class the object has but the caller expects
          // us to (uppercase chars indicate custom class) then it's likely
          // they forgot to add @typechecks to the defining module.
          if (actual === 'object' &&
              expected.match(/^[A-Z]/) &&
              !value.__TCmeta) {
            message +=
              ' Check the constructor\'s module is marked as typechecked -' +
              ' see http://fburl.com/typechecks for more information.';
          }

          var error = new TypeError(message);

          if (Error.captureStackTrace) {
            Error.captureStackTrace(error, stackBoundary || check);
          } else {
            // Pop to the frame calling the checked function, or to the
            // checked function
            error.framesToPop = isReturn ? 2 : 1;
          }

          if (typeof handler == 'function') {
            handler(error);
            // Avoid double-reporting on transitive violations
            paused = true;
            // Reset on the next available tick
            setTimeout(function()  {return paused = false;}, 0);
          } else if (handler === 'throw') {
            throw error;
          }
        }
      }
    }

    // Always return the first value checked
    return arguments[0][0];
  }

  /**
   * Allows you to set a handler that should handle errors. If such a handler is
   * set, no errors are thrown (the handler can choose to throw).
   */
  check.setHandler = function(fn) {
    handler = fn;
  };

  check.disable = function() {
    disabled = true;
  };

  /**
   * Annotates a function with a meta object
   */
  function annotate(fn, meta) {
    meta.superClass = fn.__superConstructor__;
    fn.__TCmeta = meta;
    return fn;
  }

  // export to global
  __t = check;
  __w = annotate;
})();
/*/TC*/

/* Dt5TIRBNYNe */
/** Path: html/js/downstream/require/require-lite.js */
/**
 * @generated SignedSource<<ea19c112b290e539c1a3a062502c6e7d>>
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !! This file is a check-in of a static_upstream project!      !!
 * !!                                                            !!
 * !! You should not modify this file directly. Instead:         !!
 * !! 1) Use `fjs use-upstream` to temporarily replace this with !!
 * !!    the latest version from upstream.                       !!
 * !! 2) Make your changes, test them, etc.                      !!
 * !! 3) Use `fjs push-upstream` to copy your changes back to    !!
 * !!    static_upstream.                                        !!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 *
 * This is a lightweigh implementation of require and __d which is used by the
 * JavaScript SDK.
 * This implementation requires that all modules are defined in order by how
 * they depend on each other, so that it is guaranteed that no module will
 * require a module that has not got all of its dependencies satisfied.
 * This means that it is generally only usable in cases where all resources are
 * resolved and packaged together.
 *
 * @providesInline commonjs-require-lite
 * @typechecks
 */

var require, __d;
(function (global) {
  var map = {}, resolved = {};
  var defaultDeps =
    ['global', 'require', 'requireDynamic', 'requireLazy', 'module', 'exports'];

  require = function(/*string*/ id, /*?boolean*/ soft) {
    if (resolved.hasOwnProperty(id)) {
      return resolved[id];
    }
    if (!map.hasOwnProperty(id)) {
      if (soft) {
        return null;
      }
      throw new Error('Module ' + id + ' has not been defined');
    }
    var module = map[id],
        deps = module.deps,
        length = module.factory.length,
        dep,
        args = [];

    for (var i = 0; i < length; i++) {
      switch(deps[i]) {
        case 'module'        : dep = module; break;
        case 'exports'       : dep = module.exports; break;
        case 'global'        : dep = global; break;
        case 'require'       : dep = require; break;
        case 'requireDynamic': dep = require; break;
        case 'requireLazy'   : dep = null; break;
        default              : dep = require.call(null, deps[i]);
      }
      args.push(dep);
    }
    module.factory.apply(global, args);
    resolved[id] = module.exports;
    return module.exports;
  };

  // Stub for module compilation timing mechanism in require.js.
  // Calls are inserted by scripts/static_resources/js/transforms/module.js.
  require.__markCompiled = function() {};

  __d = function(/*string*/ id, /*array<string>*/ deps, factory,
      /*?number*/ _special) {
    if (typeof factory == 'function') {
        map[id] = {
          factory: factory,
          deps: defaultDeps.concat(deps),
          exports: {}
        };

        // 3 signifies that this should be executed immediately
        if (_special === 3) {
          require.call(null, id);
        }
    } else {
      resolved[id] = factory;
    }
  };
})(this);

/* fM6DOcyzBVt */
/** Path: html/js/sdk/ES5ArrayPrototype.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES5ArrayPrototype
 */
__d("ES5ArrayPrototype",[],__annotator(function $module_ES5ArrayPrototype(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES5ArrayPrototype = {};

/**
* http://es5.github.com/#x15.4.4.19
*/
ES5ArrayPrototype.map = __annotator(function(func, context) {
  if (typeof func != 'function') {
    throw new TypeError();
  }

  var ii;
  var len = this.length;
  var r   = new Array(len);
  for (ii = 0; ii < len; ++ii) {
    if (ii in this) {
      r[ii] = func.call(context, this[ii], ii, this);
    }
  }

  return r;
}, {"module":"ES5ArrayPrototype","line":12,"column":24});

/**
* http://es5.github.com/#x15.4.4.18
*/
ES5ArrayPrototype.forEach = __annotator(function(func, context) {
  ES5ArrayPrototype.map.call(this, func, context);
}, {"module":"ES5ArrayPrototype","line":32,"column":28});

/**
* http://es5.github.com/#x15.4.4.20
*/
ES5ArrayPrototype.filter = __annotator(function(func, context) {
  if (typeof func != 'function') {
    throw new TypeError();
  }

  var ii, val, len = this.length, r = [];
  for (ii = 0; ii < len; ++ii) {
    if (ii in this) {
      // Specified, to prevent mutations in the original array.
      val = this[ii];
      if (func.call(context, val, ii, this)) {
        r.push(val);
      }
    }
  }

  return r;
}, {"module":"ES5ArrayPrototype","line":39,"column":27});

/**
* http://es5.github.com/#x15.4.4.16
*/
ES5ArrayPrototype.every = __annotator(function(func, context) {
  if (typeof func != 'function') {
    throw new TypeError();
  }
  var t = new Object(this);
  var len = t.length;
  for (var ii = 0; ii < len; ii++) {
    if (ii in t) {
      if (!func.call(context, t[ii], ii, t)) {
        return false;
      }
    }
  }
  return true;
}, {"module":"ES5ArrayPrototype","line":61,"column":26});

/**
* http://es5.github.com/#x15.4.4.17
*/
ES5ArrayPrototype.some = __annotator(function(func, context) {
  if (typeof func != 'function') {
    throw new TypeError();
  }
  var t = new Object(this);
  var len = t.length;
  for (var ii = 0; ii < len; ii++) {
    if (ii in t) {
      if (func.call(context, t[ii], ii, t)) {
        return true;
      }
    }
  }
  return false;
}, {"module":"ES5ArrayPrototype","line":80,"column":25});

/**
* http://es5.github.com/#x15.4.4.14
*/
ES5ArrayPrototype.indexOf = __annotator(function(val, index) {
  var len = this.length;
  index |= 0;

  if (index < 0) {
    index += len;
  }

  for (; index < len; index++) {
    if (index in this && this[index] === val) {
      return index;
    }
  }
  return -1;
}, {"module":"ES5ArrayPrototype","line":99,"column":28});

module.exports = ES5ArrayPrototype;

/* RMW-eICsrwT */
}, {"module":"ES5ArrayPrototype","line":6,"column":27,"name":"$module_ES5ArrayPrototype"}),null);
/** Path: html/js/sdk/ES5FunctionPrototype.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES5FunctionPrototype
 */
__d("ES5FunctionPrototype",[],__annotator(function $module_ES5FunctionPrototype(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES5FunctionPrototype = {};

/**
 * A simulated implementation of Function.prototype.bind that is mostly ES5-
 * compliant. The [[Call]], [[Construct]], and [[HasInstance]] internal
 * properties differ, which means that the simulated implementation produces
 * different stack traces and behaves differently when used as a constructor.
 *
 * http://es5.github.com/#x15.3.4.5
 */
ES5FunctionPrototype.bind = __annotator(function(context /* args... */) {
  if (typeof this != 'function') {
    throw new TypeError('Bind must be called on a function');
  }
  var target = this;
  var appliedArguments = Array.prototype.slice.call(arguments, 1);
  function bound() {
    return target.apply(
      context,
      appliedArguments.concat(Array.prototype.slice.call(arguments)));
  }__annotator(bound, {"module":"ES5FunctionPrototype","line":23,"column":2,"name":"bound"});
  bound.displayName = 'bound:' + (target.displayName || target.name || '(?)');
  bound.toString = __annotator(function toString() {
    return 'bound: ' + target;
  }, {"module":"ES5FunctionPrototype","line":29,"column":19,"name":"toString"});
  return bound;
}, {"module":"ES5FunctionPrototype","line":17,"column":28});

module.exports = ES5FunctionPrototype;

/* 2DXueXgYBiA */
}, {"module":"ES5FunctionPrototype","line":6,"column":30,"name":"$module_ES5FunctionPrototype"}),null);
/** Path: html/js/sdk/ES5StringPrototype.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES5StringPrototype
 */
__d("ES5StringPrototype",[],__annotator(function $module_ES5StringPrototype(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES5StringPrototype = {};

/**
 * Trims white space on either side of this string.
 *
 * http://es5.github.com/#x15.5.4.20
 */
ES5StringPrototype.trim = __annotator(function() {
  if (this == null) {
    throw new TypeError('String.prototype.trim called on null or undefined');
  }
  return String.prototype.replace.call(this, /^\s+|\s+$/g, '');
}, {"module":"ES5StringPrototype","line":14,"column":26});

ES5StringPrototype.startsWith = __annotator(function(search) {
  var string = String(this);
  if (this == null) {
    throw new TypeError(
        'String.prototype.startsWith called on null or undefined');
  }
  var pos = arguments.length > 1 ? Number(arguments[1]) : 0;
  if (isNaN(pos)) {
    pos = 0;
  }
  var start = Math.min(Math.max(pos, 0), string.length);
  return string.indexOf(String(search), pos) == start;
}, {"module":"ES5StringPrototype","line":21,"column":32});

ES5StringPrototype.endsWith = __annotator(function(search) {
  var string = String(this);
  if (this == null) {
    throw new TypeError(
        'String.prototype.endsWith called on null or undefined');
  }
  var stringLength = string.length;
  var searchString = String(search);
  var pos = arguments.length > 1 ? Number(arguments[1]) : stringLength;
  if (isNaN(pos)) {
    pos = 0;
  }
  var end = Math.min(Math.max(pos, 0), stringLength);
  var start = end - searchString.length;
  if (start < 0) {
    return false;
  }
  return string.lastIndexOf(searchString, start) == start;
}, {"module":"ES5StringPrototype","line":35,"column":30});

ES5StringPrototype.contains = __annotator(function(search) {
  if (this == null) {
    throw new TypeError(
        'String.prototype.contains called on null or undefined');
  }
  var string = String(this);
  var pos = arguments.length > 1 ? Number(arguments[1]) : 0;
  if (isNaN(pos)) {
    pos = 0;
  }
  return string.indexOf(String(search), pos) != -1;
}, {"module":"ES5StringPrototype","line":55,"column":30});

ES5StringPrototype.repeat = __annotator(function(count) {
  if (this == null) {
    throw new TypeError(
        'String.prototype.repeat called on null or undefined');
  }
  var string = String(this);
  var n = count ? Number(count) : 0;
  if (isNaN(n)) {
    n = 0;
  }
  if (n < 0 || n === Infinity) {
    throw RangeError();
  }
  if (n === 1) {
    return string;
  }
  if (n === 0) {
    return '';
  }
  var result = '';
  while (n) {
    if (n & 1) {
      result += string;
    }
    if ((n >>= 1)) {
      string += string;
    }
  }
  return result;
}, {"module":"ES5StringPrototype","line":68,"column":28});

module.exports = ES5StringPrototype;

/* LnybSBK3IdP */
}, {"module":"ES5StringPrototype","line":6,"column":28,"name":"$module_ES5StringPrototype"}),null);
/** Path: html/js/sdk/ES5Array.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES5Array
 */
__d("ES5Array",[],__annotator(function $module_ES5Array(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES5Array = {};

ES5Array.isArray = __annotator(function(object) {
  return Object.prototype.toString.call(object) == '[object Array]';
}, {"module":"ES5Array","line":9,"column":19});

module.exports = ES5Array;

/* fqy5viPd9Si */
}, {"module":"ES5Array","line":6,"column":18,"name":"$module_ES5Array"}),null);
/** Path: html/js/ie8DontEnum.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ie8DontEnum
 */
__d("ie8DontEnum",[],__annotator(function $module_ie8DontEnum(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
// JScript in IE8 and below mistakenly skips over built-in properties.
// https://developer.mozilla.org/en/ECMAScript_DontEnum_attribute
var dontEnumProperties = [
  'toString',
  'toLocaleString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'prototypeIsEnumerable',
  'constructor'
];

var hasOwnProperty = ({}).hasOwnProperty;

/**
 * This function is NOP by default, and only in IE8
 * does actual fixing of {DontEnum} props.
 */
var ie8DontEnum = __annotator(function() {}, {"module":"ie8DontEnum","line":25,"column":18});

if (({toString: true}).propertyIsEnumerable('toString')) {
  ie8DontEnum = __annotator(function(object, onProp) {
    for (var i = 0; i < dontEnumProperties.length; i++) {
      var property = dontEnumProperties[i];
      if (hasOwnProperty.call(object, property)) {
        onProp(property);
      }
    }
  }, {"module":"ie8DontEnum","line":28,"column":16});
}

module.exports = ie8DontEnum;

/* AqbU7BP0XtX */
}, {"module":"ie8DontEnum","line":6,"column":21,"name":"$module_ie8DontEnum"}),null);
/** Path: html/js/sdk/ES5Object.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES5Object
 */
__d("ES5Object",["ie8DontEnum"],__annotator(function $module_ES5Object(global,require,requireDynamic,requireLazy,module,exports,ie8DontEnum) {require.__markCompiled && require.__markCompiled();
   
var hasOwnProperty = ({}).hasOwnProperty;

var ES5Object = {};

// Temporary constructor used in ES5Object.create
// to set needed prototype.
function F() {}__annotator(F, {"module":"ES5Object","line":14,"column":0,"name":"F"});

/**
 * Creates a new object with the specified prototype object.
 *
 * http://es5.github.com/#x15.2.3.5
 */
ES5Object.create = __annotator(function(proto) {
  if (__DEV__) {
    if (arguments.length > 1) {
      throw new Error(
        'Object.create implementation supports only the first parameter');
    }
  }
  var type = typeof proto;
  if (type != 'object' && type != 'function') {
    throw new TypeError('Object prototype may only be a Object or null');
  }
  F.prototype = proto;
  return new F();
}, {"module":"ES5Object","line":21,"column":19});

/**
 * Returns an array of the given object's own enumerable properties.
 *
 * http://es5.github.com/#x15.2.3.14
 */
ES5Object.keys = __annotator(function(object) {
  var type = typeof object;
  if (type != 'object' && type != 'function' || object === null) {
    throw new TypeError('Object.keys called on non-object');
  }

  var keys = [];
  for (var key in object) {
    if (hasOwnProperty.call(object, key)) {
      keys.push(key);
    }
  }

  // Fix {DontEnum} IE8 bug.
  ie8DontEnum(object, __annotator(function(prop)  {return keys.push(prop);}, {"module":"ES5Object","line":55,"column":22}));

  return keys;
}, {"module":"ES5Object","line":41,"column":17});

module.exports = ES5Object;

/* KOaon63wAcQ */
}, {"module":"ES5Object","line":6,"column":32,"name":"$module_ES5Object"}),null);
/** Path: html/js/sdk/ES5Date.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES5Date
 */
__d("ES5Date",[],__annotator(function $module_ES5Date(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES5Date = {};
ES5Date.now = __annotator(function() {
  return new Date().getTime();
}, {"module":"ES5Date","line":8,"column":14});

module.exports = ES5Date;

/* eeaxbZNTDfe */
}, {"module":"ES5Date","line":6,"column":17,"name":"$module_ES5Date"}),null);
/** Path: html/js/third_party/json3/json3.js */
/**
 * @providesModule JSON3
 * @preserve-header
 *
 *! JSON v3.2.3 | http://bestiejs.github.com/json3 | Copyright 2012, Kit Cambridge | http://kit.mit-license.org
 */__d("JSON3",[],__annotator(function $module_JSON3(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
;(__annotator(function () {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;
  var JSON3 = module.exports = {};
  // A JSON source string used to test the native `stringify` and `parse`
  // implementations.
  var serialized = '{"A":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';

  // Feature tests to determine whether the native `JSON.stringify` and `parse`
  // implementations are spec-compliant. Based on work by Ken Snyder.
  var stringifySupported, Escapes, toPaddedString, quote, serialize;
  var parseSupported, fromCharCode, Unescapes, abort, lex, get, walk, update, Index, Source;

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var value = new Date(-3509827334573292), floor, Months, getDay;

  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    value = value.getUTCFullYear() == -109252 && value.getUTCMonth() === 0 && value.getUTCDate() == 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      value.getUTCHours() == 10 && value.getUTCMinutes() == 37 && value.getUTCSeconds() == 6 && value.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // Define additional utility methods if the `Date` methods are buggy.
  if (!value) {
    floor = Math.floor;
    // A mapping between the months of the year and the number of days between
    // January 1st and the first of the respective month.
    Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    // Internal: Calculates the number of days between the Unix epoch and the
    // first day of the given month.
    getDay = __annotator(function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    }, {"module":"JSON3","line":41,"column":13});
  }

  if (typeof JSON == "object" && JSON) {
    // Delegate to the native `stringify` and `parse` implementations in
    // asynchronous module loaders and CommonJS environments.
    JSON3.stringify = JSON.stringify;
    JSON3.parse = JSON.parse;
  }

  // Test `JSON.stringify`.
  if ((stringifySupported = typeof JSON3.stringify == "function" && !getDay)) {
    // A test function object with a custom `toJSON` method.
    (value = __annotator(function () {
      return 1;
    }, {"module":"JSON3","line":56,"column":13})).toJSON = value;
    try {
      stringifySupported =
        // Firefox 3.1b1 and b2 serialize string, number, and boolean
        // primitives as object literals.
        JSON3.stringify(0) === "0" &&
        // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
        // literals.
        JSON3.stringify(new Number()) === "0" &&
        JSON3.stringify(new String()) == '""' &&
        // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
        // does not define a canonical JSON representation (this applies to
        // objects with `toJSON` properties as well, *unless* they are nested
        // within an object or array).
        JSON3.stringify(getClass) === undef &&
        // IE 8 serializes `undefined` as `"undefined"`. Safari 5.1.2 and FF
        // 3.1b3 pass this test.
        JSON3.stringify(undef) === undef &&
        // Safari 5.1.2 and FF 3.1b3 throw `Error`s and `TypeError`s,
        // respectively, if the value is omitted entirely.
        JSON3.stringify() === undef &&
        // FF 3.1b1, 2 throw an error if the given value is not a number,
        // string, array, object, Boolean, or `null` literal. This applies to
        // objects with custom `toJSON` methods as well, unless they are nested
        // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
        // methods entirely.
        JSON3.stringify(value) === "1" &&
        JSON3.stringify([value]) == "[1]" &&
        // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
        // `"[null]"`.
        JSON3.stringify([undef]) == "[null]" &&
        // YUI 3.0.0b1 fails to serialize `null` literals.
        JSON3.stringify(null) == "null" &&
        // FF 3.1b1, 2 halts serialization if an array contains a function:
        // `[1, true, getClass, 1]` serializes as "[1,true,],". These versions
        // of Firefox also allow trailing commas in JSON objects and arrays.
        // FF 3.1b3 elides non-JSON values from objects and arrays, unless they
        // define custom `toJSON` methods.
        JSON3.stringify([undef, getClass, null]) == "[null,null,null]" &&
        // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
        // where character escape codes are expected (e.g., `\b` => `\u0008`).
        JSON3.stringify({ "result": [value, true, false, null, "\0\b\n\f\r\t"] }) == serialized &&
        // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
        JSON3.stringify(null, value) === "1" &&
        JSON3.stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
        // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
        // serialize extended years.
        JSON3.stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
        // The milliseconds are optional in ES 5, but required in 5.1.
        JSON3.stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
        // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
        // four-digit years instead of six-digit years. Credits: @Yaffle.
        JSON3.stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
        // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
        // values less than 1000. Credits: @Yaffle.
        JSON3.stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
    } catch (exception) {
      stringifySupported = false;
    }
  }

  // Test `JSON.parse`.
  if (typeof JSON3.parse == "function") {
    try {
      // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
      // Conforming implementations should also coerce the initial argument to
      // a string prior to parsing.
      if (JSON3.parse("0") === 0 && !JSON3.parse(false)) {
        // Simple parsing test.
        value = JSON3.parse(serialized);
        if ((parseSupported = value.A.length == 5 && value.A[0] == 1)) {
          try {
            // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
            parseSupported = !JSON3.parse('"\t"');
          } catch (exception) {}
          if (parseSupported) {
            try {
              // FF 4.0 and 4.0.1 allow leading `+` signs, and leading and
              // trailing decimal points. FF 4.0, 4.0.1, and IE 9 also allow
              // certain octal literals.
              parseSupported = JSON3.parse("01") != 1;
            } catch (exception) {}
          }
        }
      }
    } catch (exception) {
      parseSupported = false;
    }
  }

  // Clean up the variables used for the feature tests.
  value = serialized = null;

  if (!stringifySupported || !parseSupported) {
    // Internal: Determines if a property is a direct property of the given
    // object. Delegates to the native `Object#hasOwnProperty` method.
    if (!(isProperty = {}.hasOwnProperty)) {
      isProperty = __annotator(function (property) {
        var members = {}, constructor;
        if ((members.__proto__ = null, members.__proto__ = {
          // The *proto* property cannot be set multiple times in recent
          // versions of Firefox and SeaMonkey.
          "toString": 1
        }, members).toString != getClass) {
          // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
          // supports the mutable *proto* property.
          isProperty = __annotator(function (property) {
            // Capture and break the object's prototype chain (see section 8.6.2
            // of the ES 5.1 spec). The parenthesized expression prevents an
            // unsafe transformation by the Closure Compiler.
            var original = this.__proto__, result = property in (this.__proto__ = null, this);
            // Restore the original prototype chain.
            this.__proto__ = original;
            return result;
          }, {"module":"JSON3","line":164,"column":23});
        } else {
          // Capture a reference to the top-level `Object` constructor.
          constructor = members.constructor;
          // Use the `constructor` property to simulate `Object#hasOwnProperty` in
          // other environments.
          isProperty = __annotator(function (property) {
            var parent = (this.constructor || constructor).prototype;
            return property in this && !(property in parent && this[property] === parent[property]);
          }, {"module":"JSON3","line":178,"column":23});
        }
        members = null;
        return isProperty.call(this, property);
      }, {"module":"JSON3","line":155,"column":19});
    }

    // Internal: Normalizes the `for...in` iteration algorithm across
    // environments. Each enumerated key is yielded to a `callback` function.
    forEach = __annotator(function (object, callback) {
      var size = 0, Properties, members, property, forEach;

      // Tests for bugs in the current environment's `for...in` algorithm. The
      // `valueOf` property inherits the non-enumerable flag from
      // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
      (Properties = __annotator(function () {
        this.valueOf = 0;
      }, {"module":"JSON3","line":196,"column":20})).prototype.valueOf = 0;

      // Iterate over a new instance of the `Properties` class.
      members = new Properties();
      for (property in members) {
        // Ignore all properties inherited from `Object.prototype`.
        if (isProperty.call(members, property)) {
          size++;
        }
      }
      Properties = members = null;

      // Normalize the iteration algorithm.
      if (!size) {
        // A list of non-enumerable properties inherited from `Object.prototype`.
        members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
        // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
        // properties.
        forEach = __annotator(function (object, callback) {
          var isFunction = getClass.call(object) == "[object Function]", property, length;
          for (property in object) {
            // Gecko <= 1.0 enumerates the `prototype` property of functions under
            // certain conditions; IE does not.
            if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
              callback(property);
            }
          }
          // Manually invoke the callback for each non-enumerable property.
          for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
        }, {"module":"JSON3","line":216,"column":18});
      } else if (size == 2) {
        // Safari <= 2.0.4 enumerates shadowed properties twice.
        forEach = __annotator(function (object, callback) {
          // Create a set of iterated properties.
          var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
          for (property in object) {
            // Store each property name to prevent double enumeration. The
            // `prototype` property of functions is not enumerated due to cross-
            // environment inconsistencies.
            if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
              callback(property);
            }
          }
        }, {"module":"JSON3","line":230,"column":18});
      } else {
        // No bugs detected; use the standard `for...in` algorithm.
        forEach = __annotator(function (object, callback) {
          var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
          for (property in object) {
            if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
              callback(property);
            }
          }
          // Manually invoke the callback for the `constructor` property due to
          // cross-environment inconsistencies.
          if (isConstructor || isProperty.call(object, (property = "constructor"))) {
            callback(property);
          }
        }, {"module":"JSON3","line":244,"column":18});
      }
      return forEach(object, callback);
    }, {"module":"JSON3","line":190,"column":14});

    // Public: Serializes a JavaScript `value` as a JSON string. The optional
    // `filter` argument may specify either a function that alters how object and
    // array members are serialized, or an array of strings and numbers that
    // indicates which properties should be serialized. The optional `width`
    // argument may be either a string or number that specifies the indentation
    // level of the output.
    if (!stringifySupported) {
      // Internal: A map of control characters and their escaped equivalents.
      Escapes = {
        "\\": "\\\\",
        '"': '\\"',
        "\b": "\\b",
        "\f": "\\f",
        "\n": "\\n",
        "\r": "\\r",
        "\t": "\\t"
      };

      // Internal: Converts `value` into a zero-padded string such that its
      // length is at least equal to `width`. The `width` must be <= 6.
      toPaddedString = __annotator(function (width, value) {
        // The `|| 0` expression is necessary to work around a bug in
        // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
        return ("000000" + (value || 0)).slice(-width);
      }, {"module":"JSON3","line":281,"column":23});

      // Internal: Double-quotes a string `value`, replacing all ASCII control
      // characters (characters with code unit values between 0 and 31) with
      // their escaped equivalents. This is an implementation of the
      // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
      quote = __annotator(function (value) {
        var result = '"', index = 0, symbol;
        for (; symbol = value.charAt(index); index++) {
          // Escape the reverse solidus, double quote, backspace, form feed, line
          // feed, carriage return, and tab characters.
          result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
            // If the character is a control character, append its Unicode escape
            // sequence; otherwise, append the character as-is.
            symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol;
        }
        return result + '"';
      }, {"module":"JSON3","line":291,"column":14});

      // Internal: Recursively serializes an object. Implements the
      // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
      serialize = __annotator(function (property, object, callback, properties, whitespace, indentation, stack) {
        var value = object[property], className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any;
        if (typeof value == "object" && value) {
          className = getClass.call(value);
          if (className == "[object Date]" && !isProperty.call(value, "toJSON")) {
            if (value > -1 / 0 && value < 1 / 0) {
              // Dates are serialized according to the `Date#toJSON` method
              // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
              // for the ISO 8601 date time string format.
              if (getDay) {
                // Manually compute the year, month, date, hours, minutes,
                // seconds, and milliseconds if the `getUTC*` methods are
                // buggy. Adapted from @Yaffle's `date-shim` project.
                date = floor(value / 864e5);
                for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                date = 1 + date - getDay(year, month);
                // The `time` value specifies the time within the day (see ES
                // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                // to compute `A modulo B`, as the `%` operator does not
                // correspond to the `modulo` operation for negative numbers.
                time = (value % 864e5 + 864e5) % 864e5;
                // The hours, minutes, seconds, and milliseconds are obtained by
                // decomposing the time within the day. See section 15.9.1.10.
                hours = floor(time / 36e5) % 24;
                minutes = floor(time / 6e4) % 60;
                seconds = floor(time / 1e3) % 60;
                milliseconds = time % 1e3;
              } else {
                year = value.getUTCFullYear();
                month = value.getUTCMonth();
                date = value.getUTCDate();
                hours = value.getUTCHours();
                minutes = value.getUTCMinutes();
                seconds = value.getUTCSeconds();
                milliseconds = value.getUTCMilliseconds();
              }
              // Serialize extended years correctly.
              value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                // Months, dates, hours, minutes, and seconds should have two
                // digits; milliseconds should have three.
                "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                // Milliseconds are optional in ES 5.0, but required in 5.1.
                "." + toPaddedString(3, milliseconds) + "Z";
            } else {
              value = null;
            }
          } else if (typeof value.toJSON == "function" && ((className != "[object Number]" && className != "[object String]" && className != "[object Array]") || isProperty.call(value, "toJSON"))) {
            // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
            // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
            // ignores all `toJSON` methods on these objects unless they are
            // defined directly on an instance.
            value = value.toJSON(property);
          }
        }
        if (callback) {
          // If a replacement function was provided, call it to obtain the value
          // for serialization.
          value = callback.call(object, property, value);
        }
        if (value === null) {
          return "null";
        }
        className = getClass.call(value);
        if (className == "[object Boolean]") {
          // Booleans are represented literally.
          return "" + value;
        } else if (className == "[object Number]") {
          // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
          // `"null"`.
          return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
        } else if (className == "[object String]") {
          // Strings are double-quoted and escaped.
          return quote(value);
        }
        // Recursively serialize objects and arrays.
        if (typeof value == "object") {
          // Check for cyclic structures. This is a linear search; performance
          // is inversely proportional to the number of unique nested objects.
          for (length = stack.length; length--;) {
            if (stack[length] === value) {
              // Cyclic structures cannot be serialized by `JSON.stringify`.
              throw TypeError();
            }
          }
          // Add the object to the stack of traversed objects.
          stack.push(value);
          results = [];
          // Save the current indentation level and indent one additional level.
          prefix = indentation;
          indentation += whitespace;
          if (className == "[object Array]") {
            // Recursively serialize array elements.
            for (index = 0, length = value.length; index < length; any || (any = true), index++) {
              element = serialize(index, value, callback, properties, whitespace, indentation, stack);
              results.push(element === undef ? "null" : element);
            }
            return any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
          } else {
            // Recursively serialize object members. Members are selected from
            // either a user-specified list of property names, or the object
            // itself.
            forEach(properties || value, __annotator(function (property) {
              var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
              if (element !== undef) {
                // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                // is not the empty string, let `member` {quote(property) + ":"}
                // be the concatenation of `member` and the `space` character."
                // The "`space` character" refers to the literal space
                // character, not the `space` {width} argument provided to
                // `JSON.stringify`.
                results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
              }
              any || (any = true);
            }, {"module":"JSON3","line":409,"column":41}));
            return any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
          }
          // Remove the object from the traversed object stack.
          stack.pop();
        }
      }, {"module":"JSON3","line":306,"column":18});

      // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
      JSON3.stringify = __annotator(function (source, filter, width) {
        var whitespace, callback, properties, index, length, value;
        if (typeof filter == "function" || typeof filter == "object" && filter) {
          if (getClass.call(filter) == "[object Function]") {
            callback = filter;
          } else if (getClass.call(filter) == "[object Array]") {
            // Convert the property names array into a makeshift set.
            properties = {};
            for (index = 0, length = filter.length; index < length; value = filter[index++], ((getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]") && (properties[value] = 1)));
          }
        }
        if (width) {
          if (getClass.call(width) == "[object Number]") {
            // Convert the `width` to an integer and create a string containing
            // `width` number of space characters.
            if ((width -= width % 1) > 0) {
              for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
            }
          } else if (getClass.call(width) == "[object String]") {
            whitespace = width.length <= 10 ? width : width.slice(0, 10);
          }
        }
        // Opera <= 7.54u2 discards the values associated with empty string keys
        // (`""`) only if they are used directly within an object member list
        // (e.g., `!("" in { "": 1})`).
        return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
      }, {"module":"JSON3","line":430,"column":24});
    }

    // Public: Parses a JSON source string.
    if (!parseSupported) {
      fromCharCode = String.fromCharCode;
      // Internal: A map of escaped control characters and their unescaped
      // equivalents.
      Unescapes = {
        "\\": "\\",
        '"': '"',
        "/": "/",
        "b": "\b",
        "t": "\t",
        "n": "\n",
        "f": "\f",
        "r": "\r"
      };

      // Internal: Resets the parser state and throws a `SyntaxError`.
      abort = __annotator(function() {
        Index = Source = null;
        throw SyntaxError();
      }, {"module":"JSON3","line":476,"column":14});

      // Internal: Returns the next token, or `"$"` if the parser has reached
      // the end of the source string. A token may be a string, number, `null`
      // literal, or Boolean literal.
      lex = __annotator(function () {
        var source = Source, length = source.length, symbol, value, begin, position, sign;
        while (Index < length) {
          symbol = source.charAt(Index);
          if ("\t\r\n ".indexOf(symbol) > -1) {
            // Skip whitespace tokens, including tabs, carriage returns, line
            // feeds, and space characters.
            Index++;
          } else if ("{}[]:,".indexOf(symbol) > -1) {
            // Parse a punctuator token at the current position.
            Index++;
            return symbol;
          } else if (symbol == '"') {
            // Advance to the next character and parse a JSON string at the
            // current position. String tokens are prefixed with the sentinel
            // `@` character to distinguish them from punctuators.
            for (value = "@", Index++; Index < length;) {
              symbol = source.charAt(Index);
              if (symbol < " ") {
                // Unescaped ASCII control characters are not permitted.
                abort();
              } else if (symbol == "\\") {
                // Parse escaped JSON control characters, `"`, `\`, `/`, and
                // Unicode escape sequences.
                symbol = source.charAt(++Index);
                if ('\\"/btnfr'.indexOf(symbol) > -1) {
                  // Revive escaped control characters.
                  value += Unescapes[symbol];
                  Index++;
                } else if (symbol == "u") {
                  // Advance to the first character of the escape sequence.
                  begin = ++Index;
                  // Validate the Unicode escape sequence.
                  for (position = Index + 4; Index < position; Index++) {
                    symbol = source.charAt(Index);
                    // A valid sequence comprises four hexdigits that form a
                    // single hexadecimal value.
                    if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
                      // Invalid Unicode escape sequence.
                      abort();
                    }
                  }
                  // Revive the escaped character.
                  value += fromCharCode("0x" + source.slice(begin, Index));
                } else {
                  // Invalid escape sequence.
                  abort();
                }
              } else {
                if (symbol == '"') {
                  // An unescaped double-quote character marks the end of the
                  // string.
                  break;
                }
                // Append the original character as-is.
                value += symbol;
                Index++;
              }
            }
            if (source.charAt(Index) == '"') {
              Index++;
              // Return the revived string.
              return value;
            }
            // Unterminated string.
            abort();
          } else {
            // Parse numbers and literals.
            begin = Index;
            // Advance the scanner's position past the sign, if one is
            // specified.
            if (symbol == "-") {
              sign = true;
              symbol = source.charAt(++Index);
            }
            // Parse an integer or floating-point value.
            if (symbol >= "0" && symbol <= "9") {
              // Leading zeroes are interpreted as octal literals.
              if (symbol == "0" && (symbol = source.charAt(Index + 1), symbol >= "0" && symbol <= "9")) {
                // Illegal octal literal.
                abort();
              }
              sign = false;
              // Parse the integer component.
              for (; Index < length && (symbol = source.charAt(Index), symbol >= "0" && symbol <= "9"); Index++);
              // Floats cannot contain a leading decimal point; however, this
              // case is already accounted for by the parser.
              if (source.charAt(Index) == ".") {
                position = ++Index;
                // Parse the decimal component.
                for (; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
                if (position == Index) {
                  // Illegal trailing decimal.
                  abort();
                }
                Index = position;
              }
              // Parse exponents.
              symbol = source.charAt(Index);
              if (symbol == "e" || symbol == "E") {
                // Skip past the sign following the exponent, if one is
                // specified.
                symbol = source.charAt(++Index);
                if (symbol == "+" || symbol == "-") {
                  Index++;
                }
                // Parse the exponential component.
                for (position = Index; position < length && (symbol = source.charAt(position), symbol >= "0" && symbol <= "9"); position++);
                if (position == Index) {
                  // Illegal empty exponent.
                  abort();
                }
                Index = position;
              }
              // Coerce the parsed value to a JavaScript number.
              return +source.slice(begin, Index);
            }
            // A negative sign may only precede numbers.
            if (sign) {
              abort();
            }
            // `true`, `false`, and `null` literals.
            if (source.slice(Index, Index + 4) == "true") {
              Index += 4;
              return true;
            } else if (source.slice(Index, Index + 5) == "false") {
              Index += 5;
              return false;
            } else if (source.slice(Index, Index + 4) == "null") {
              Index += 4;
              return null;
            }
            // Unrecognized token.
            abort();
          }
        }
        // Return the sentinel `$` character if the parser has reached the end
        // of the source string.
        return "$";
      }, {"module":"JSON3","line":484,"column":12});

      // Internal: Parses a JSON `value` token.
      get = __annotator(function (value) {
        var results, any, key;
        if (value == "$") {
          // Unexpected end of input.
          abort();
        }
        if (typeof value == "string") {
          if (value.charAt(0) == "@") {
            // Remove the sentinel `@` character.
            return value.slice(1);
          }
          // Parse object and array literals.
          if (value == "[") {
            // Parses a JSON array, returning a new JavaScript array.
            results = [];
            for (;; any || (any = true)) {
              value = lex();
              // A closing square bracket marks the end of the array literal.
              if (value == "]") {
                break;
              }
              // If the array literal contains elements, the current token
              // should be a comma separating the previous element from the
              // next.
              if (any) {
                if (value == ",") {
                  value = lex();
                  if (value == "]") {
                    // Unexpected trailing `,` in array literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each array element.
                  abort();
                }
              }
              // Elisions and leading commas are not permitted.
              if (value == ",") {
                abort();
              }
              results.push(get(value));
            }
            return results;
          } else if (value == "{") {
            // Parses a JSON object, returning a new JavaScript object.
            results = {};
            for (;; any || (any = true)) {
              value = lex();
              // A closing curly brace marks the end of the object literal.
              if (value == "}") {
                break;
              }
              // If the object literal contains members, the current token
              // should be a comma separator.
              if (any) {
                if (value == ",") {
                  value = lex();
                  if (value == "}") {
                    // Unexpected trailing `,` in object literal.
                    abort();
                  }
                } else {
                  // A `,` must separate each object member.
                  abort();
                }
              }
              // Leading commas are not permitted, object property names must be
              // double-quoted strings, and a `:` must separate each property
              // name and value.
              if (value == "," || typeof value != "string" || value.charAt(0) != "@" || lex() != ":") {
                abort();
              }
              results[value.slice(1)] = get(lex());
            }
            return results;
          }
          // Unexpected token encountered.
          abort();
        }
        return value;
      }, {"module":"JSON3","line":626,"column":12});

      // Internal: Updates a traversed object member.
      update = __annotator(function(source, property, callback) {
        var element = walk(source, property, callback);
        if (element === undef) {
          delete source[property];
        } else {
          source[property] = element;
        }
      }, {"module":"JSON3","line":709,"column":15});

      // Internal: Recursively traverses a parsed JSON object, invoking the
      // `callback` function for each value. This is an implementation of the
      // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
      walk = __annotator(function (source, property, callback) {
        var value = source[property], length;
        if (typeof value == "object" && value) {
          if (getClass.call(value) == "[object Array]") {
            for (length = value.length; length--;) {
              update(value, length, callback);
            }
          } else {
            // `forEach` can't be used to traverse an array in Opera <= 8.54,
            // as `Object#hasOwnProperty` returns `false` for array indices
            // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
            forEach(value, __annotator(function (property) {
              update(value, property, callback);
            }, {"module":"JSON3","line":732,"column":27}));
          }
        }
        return callback.call(source, property, value);
      }, {"module":"JSON3","line":721,"column":13});

      // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
      JSON3.parse = __annotator(function (source, callback) {
        Index = 0;
        Source = source;
        var result = get(lex());
        // If a JSON string contains multiple tokens, it is invalid.
        if (lex() != "$") {
          abort();
        }
        // Reset the parser state.
        Index = Source = null;
        return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
      }, {"module":"JSON3","line":741,"column":20});
    }
  }
}, {"module":"JSON3","line":7,"column":2})).call(this);

/* 2KL294koxM_ */
}, {"module":"JSON3","line":6,"column":18,"name":"$module_JSON3"}),null);
/** Path: html/js/sdk/ES6Object.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES6Object
 */
__d("ES6Object",["ie8DontEnum"],__annotator(function $module_ES6Object(global,require,requireDynamic,requireLazy,module,exports,ie8DontEnum) {require.__markCompiled && require.__markCompiled();
   
var hasOwnProperty = ({}).hasOwnProperty;

var ES6Object = {
  /**
   * Merges several objects in one, returns the agumented target.
   *
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign
   */
  assign:__annotator(function(target ) {for (var sources=[],$__0=1,$__1=arguments.length;$__0<$__1;$__0++) sources.push(arguments[$__0]);
    if (target == null) {
      throw new TypeError('Object.assign target cannot be null or undefined');
    }

    target = Object(target);

    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];

      if (source == null) {
        continue;
      }

      source = Object(source);

      for (var prop in source) {
        if (hasOwnProperty.call(source, prop)) {
          target[prop] = source[prop];
        }
      }

      // Fix {DontEnum} IE8 bug.
      ie8DontEnum(source, __annotator(function(prop)  {return target[prop] = source[prop];}, {"module":"ES6Object","line":39,"column":26}));
    }

    return target;
  }, {"module":"ES6Object","line":16,"column":9})
};

module.exports = ES6Object;

/* DAgBbK5bQDP */
}, {"module":"ES6Object","line":6,"column":32,"name":"$module_ES6Object"}),null);
/** Path: html/js/sdk/ES6ArrayPrototype.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES6ArrayPrototype
 */
__d("ES6ArrayPrototype",[],__annotator(function $module_ES6ArrayPrototype(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES6ArrayPrototype = {
  /**
   * https://developer.mozilla.org
   *  /en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
   */
  find:__annotator(function(/*function*/ predicate, thisArg) {
    if (this == null) {
      throw new TypeError('Array.prototype.find called on null or undefined');
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }

    var index = ES6ArrayPrototype.findIndex.call(this, predicate, thisArg);
    return index === -1 ? void 0 : this[index];
  }, {"module":"ES6ArrayPrototype","line":12,"column":7}),

  /**
   * https://developer.mozilla.org
   *  /en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
   */
  findIndex:__annotator(function(/*function*/ predicate, thisArg) {
    if (this == null) {
      throw new TypeError(
        'Array.prototype.findIndex called on null or undefined'
      );
    }
    if (typeof predicate !== 'function') {
      throw new TypeError('predicate must be a function');
    }
    var list = Object(this);
    var length = list.length >>> 0;
    for (var i = 0; i < length; i++) {
      if (predicate.call(thisArg, list[i], i, list)) {
        return i;
      }
    }
    return -1;
  }, {"module":"ES6ArrayPrototype","line":28,"column":12})

}

module.exports = ES6ArrayPrototype;

/* ftK07A9mJN8 */
}, {"module":"ES6ArrayPrototype","line":6,"column":27,"name":"$module_ES6ArrayPrototype"}),null);
/** Path: html/js/sdk/ES6DatePrototype.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES6DatePrototype
 */
__d("ES6DatePrototype",[],__annotator(function $module_ES6DatePrototype(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
function pad(number) {
 return (number < 10 ? '0' : '') + number;
}__annotator(pad, {"module":"ES6DatePrototype","line":7,"column":0,"name":"pad"});

var ES6DatePrototype = {
  /**
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString#Polyfill
   */
  toISOString:__annotator(function() {
    if (!isFinite(this)) {
      throw new Error('Invalid time value');
    }
    var year = this.getUTCFullYear();
    year = (year < 0 ? '-' : (year > 9999 ? '+' : '')) +
      ('00000' + Math.abs(year)).slice(0 <= year && year <= 9999 ? -4 : -6);
    return year +
      '-' + pad(this.getUTCMonth() + 1) +
      '-' + pad(this.getUTCDate()) +
      'T' + pad(this.getUTCHours()) +
      ':' + pad(this.getUTCMinutes()) +
      ':' + pad(this.getUTCSeconds()) +
      '.' + (this.getUTCMilliseconds() / 1000).toFixed(3).slice(2, 5) +
      'Z';
  }, {"module":"ES6DatePrototype","line":15,"column":14})
};

module.exports = ES6DatePrototype;

/* Ef3upjPNuVS */
}, {"module":"ES6DatePrototype","line":6,"column":26,"name":"$module_ES6DatePrototype"}),null);
/** Path: html/js/sdk/ES6Number.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES6Number
 */
__d("ES6Number",[],__annotator(function $module_ES6Number(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var ES6Number = {
  isFinite:__annotator(function(value) {
    return (typeof value == 'number') && isFinite(value);
  }, {"module":"ES6Number","line":8,"column":11}),

  isNaN:__annotator(function(value) {
    return (typeof value == 'number') && isNaN(value);
  }, {"module":"ES6Number","line":12,"column":8})
};

module.exports = ES6Number;

/* QLLqANSCDwC */
}, {"module":"ES6Number","line":6,"column":19,"name":"$module_ES6Number"}),null);
/** Path: html/js/sdk/ES.js */
/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ES
 *
 * scripts/jssdk/default.spatch converts ES5/ES6 code into using this module in
 * ES3 style.
 */
__d("ES",["ES5ArrayPrototype","ES5FunctionPrototype","ES5StringPrototype","ES5Array","ES5Object","ES5Date","JSON3","ES6Object","ES6ArrayPrototype","ES6DatePrototype","ES6Number"],__annotator(function $module_ES(global,require,requireDynamic,requireLazy,module,exports,ES5ArrayPrototype,ES5FunctionPrototype,ES5StringPrototype,ES5Array,ES5Object,ES5Date,JSON3,ES6Object,ES6ArrayPrototype,ES6DatePrototype,ES6Number) {require.__markCompiled && require.__markCompiled();
   
   
   
  
   
   
   
   
   
   
   

var toString = ({}).toString;

var methodCache = {
  // Always use the polyfill for JSON to work around Prototype 1.6.x issues.
  // JSON3 will use the native versions if possible.
  'JSON.stringify': JSON3.stringify,
  'JSON.parse': JSON3.parse
};

var es5Polyfills = {
  'Array.prototype': ES5ArrayPrototype,
  'Function.prototype': ES5FunctionPrototype,
  'String.prototype': ES5StringPrototype,
  'Object': ES5Object,
  'Array': ES5Array,
  'Date': ES5Date
};

var es6Polyfills = {
  'Object': ES6Object,
  'Array.prototype': ES6ArrayPrototype,
  'Date.prototype': ES6DatePrototype,
  'Number': ES6Number
};

function setupMethodsCache(polyfills) {
  // Iterate over the polyfills, and add either a valid native implementation or
  // a polyfill to the methodCache
  for (var pName in polyfills) {
    if (!polyfills.hasOwnProperty(pName)) { continue; }
    var polyfillObject =  polyfills[pName];

    // Resolve which native object holds the function we are looking for
    var accessor = pName.split('.');
    var nativeObject = accessor.length == 2
      ? window[accessor[0]][accessor[1]]
      : window[pName];

    // Iterate over the shimmed methods, testing the native implementation
    for (var fName in polyfillObject) {
      if (!polyfillObject.hasOwnProperty(fName)) { continue; }

      var nativeFunction = nativeObject[fName];
      // If the native function exist, and tests as a native function, then
      // we save it for later
      methodCache[pName + '.' + fName] =
        nativeFunction && /\{\s+\[native code\]\s\}/.test(nativeFunction)
          ? nativeFunction
          : polyfillObject[fName];
    }
  }
}__annotator(setupMethodsCache, {"module":"ES","line":47,"column":0,"name":"setupMethodsCache"});

// Setup ES5, and ES6 polyfills
setupMethodsCache(es5Polyfills);
setupMethodsCache(es6Polyfills);

function ES(lhs, rhs, proto ) {for (var args=[],$__0=3,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
  // Normalize the type information
  var type = proto
    ? toString.call(lhs).slice(8, -1) + '.prototype'
    : lhs;

  // Locate the method to use
  var method = methodCache[type + '.' + rhs] || lhs[rhs];

  // Invoke or throw
  if (typeof method === 'function') {
    return method.apply(lhs, args);
  }

  if (__DEV__) {
    throw new Error('Polyfill ' + type + ' does not have a method ' + rhs);
  }
}__annotator(ES, {"module":"ES","line":79,"column":0,"name":"ES"});

module.exports = ES;

/* 8t3naSxRM6- */
}, {"module":"ES","line":9,"column":179,"name":"$module_ES"}),null);
var ES = require('ES');
__d("JSSDKRuntimeConfig",[],{"locale":"pt_BR","rtl":false,"revision":"1782496"});__d("JSSDKConfig",[],{"bustCache":true,"tagCountLogRate":0.01,"errorHandling":{"rate":4},"usePluginPipe":true,"features":{"allow_non_canvas_app_events":false,"event_subscriptions_log":{"rate":0.01,"value":10000},"should_force_single_dialog_instance":true,"kill_fragment":true,"xfbml_profile_pic_server":true,"error_handling":{"rate":4},"e2e_ping_tracking":{"rate":1.0e-6},"xd_timeout":{"rate":4,"value":30000},"use_bundle":true,"launch_payment_dialog_via_pac":{"rate":100},"plugin_tags_blacklist":["recommendations_bar"],"should_log_response_error":true},"api":{"mode":"warn","whitelist":["AppEvents","AppEvents.EventNames","AppEvents.ParameterNames","AppEvents.activateApp","AppEvents.logEvent","AppEvents.logPurchase","Canvas","Canvas.Prefetcher","Canvas.Prefetcher.addStaticResource","Canvas.Prefetcher.setCollectionMode","Canvas.getPageInfo","Canvas.hideFlashElement","Canvas.scrollTo","Canvas.setAutoGrow","Canvas.setDoneLoading","Canvas.setSize","Canvas.setUrlHandler","Canvas.showFlashElement","Canvas.startTimer","Canvas.stopTimer","Event","Event.subscribe","Event.unsubscribe","Music.flashCallback","Music.init","Music.send","Payment","Payment.cancelFlow","Payment.continueFlow","Payment.init","Payment.lockForProcessing","Payment.parse","Payment.setSize","Payment.unlockForProcessing","ThirdPartyProvider","ThirdPartyProvider.init","ThirdPartyProvider.sendData","UA","UA.nativeApp","XFBML","XFBML.RecommendationsBar","XFBML.RecommendationsBar.markRead","XFBML.parse","addFriend","api","getAccessToken","getAuthResponse","getLoginStatus","getUserID","init","login","logout","publish","share","ui"]},"initSitevars":{"enableMobileComments":1,"iframePermissions":{"read_stream":false,"manage_mailbox":false,"manage_friendlists":false,"read_mailbox":false,"publish_checkins":true,"status_update":true,"photo_upload":true,"video_upload":true,"sms":false,"create_event":true,"rsvp_event":true,"offline_access":true,"email":true,"xmpp_login":false,"create_note":true,"share_item":true,"export_stream":false,"publish_stream":true,"publish_likes":true,"ads_management":false,"contact_email":true,"access_private_data":false,"read_insights":false,"read_requests":false,"read_friendlists":true,"manage_pages":false,"physical_login":false,"manage_groups":false,"read_deals":false}}});__d("UrlMapConfig",[],{"www":"www.facebook.com","m":"m.facebook.com","connect":"connect.facebook.net","business":"business.facebook.com","api_https":"api.facebook.com","api_read_https":"api-read.facebook.com","graph_https":"graph.facebook.com","fbcdn_http":"fbstatic-a.akamaihd.net","fbcdn_https":"fbstatic-a.akamaihd.net","cdn_http":"static.ak.facebook.com","cdn_https":"s-static.ak.facebook.com"});__d("FlashVersionFix",[],{"enable":false});__d("JSSDKXDConfig",[],{"XdUrl":"\/connect\/xd_arbiter.php?version=41","XdBundleUrl":"\/connect\/xd_arbiter\/vcEqM62YZhf.js?version=41","Flash":{"path":"https:\/\/connect.facebook.net\/rsrc.php\/v1\/yW\/r\/yOZN1vHw3Z_.swf"},"useCdn":true});__d("JSSDKCssConfig",[],{"rules":".fb_hidden{position:absolute;top:-10000px;z-index:10001}.fb_invisible{display:none}.fb_reset{background:none;border:0;border-spacing:0;color:#000;cursor:auto;direction:ltr;font-family:\"lucida grande\", tahoma, verdana, arial, sans-serif;font-size:11px;font-style:normal;font-variant:normal;font-weight:normal;letter-spacing:normal;line-height:1;margin:0;overflow:visible;padding:0;text-align:left;text-decoration:none;text-indent:0;text-shadow:none;text-transform:none;visibility:visible;white-space:normal;word-spacing:normal}.fb_reset>div{overflow:hidden}.fb_link img{border:none}\n.fb_dialog{background:rgba(82, 82, 82, .7);position:absolute;top:-10000px;z-index:10001}.fb_reset .fb_dialog_legacy{overflow:visible}.fb_dialog_advanced{padding:10px;-moz-border-radius:8px;-webkit-border-radius:8px;border-radius:8px}.fb_dialog_content{background:#fff;color:#333}.fb_dialog_close_icon{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 0 transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif);cursor:pointer;display:block;height:15px;position:absolute;right:18px;top:17px;width:15px}.fb_dialog_mobile .fb_dialog_close_icon{top:5px;left:5px;right:auto}.fb_dialog_padding{background-color:transparent;position:absolute;width:1px;z-index:-1}.fb_dialog_close_icon:hover{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 -15px transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif)}.fb_dialog_close_icon:active{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 -30px transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif)}.fb_dialog_loader{background-color:#f6f7f8;border:1px solid #606060;font-size:24px;padding:20px}.fb_dialog_top_left,.fb_dialog_top_right,.fb_dialog_bottom_left,.fb_dialog_bottom_right{height:10px;width:10px;overflow:hidden;position:absolute}.fb_dialog_top_left{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 0;left:-10px;top:-10px}.fb_dialog_top_right{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -10px;right:-10px;top:-10px}.fb_dialog_bottom_left{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -20px;bottom:-10px;left:-10px}.fb_dialog_bottom_right{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -30px;right:-10px;bottom:-10px}.fb_dialog_vert_left,.fb_dialog_vert_right,.fb_dialog_horiz_top,.fb_dialog_horiz_bottom{position:absolute;background:#525252;filter:alpha(opacity=70);opacity:.7}.fb_dialog_vert_left,.fb_dialog_vert_right{width:10px;height:100\u0025}.fb_dialog_vert_left{margin-left:-10px}.fb_dialog_vert_right{right:0;margin-right:-10px}.fb_dialog_horiz_top,.fb_dialog_horiz_bottom{width:100\u0025;height:10px}.fb_dialog_horiz_top{margin-top:-10px}.fb_dialog_horiz_bottom{bottom:0;margin-bottom:-10px}.fb_dialog_iframe{line-height:0}.fb_dialog_content .dialog_title{background:#6d84b4;border:1px solid #3a5795;color:#fff;font-size:14px;font-weight:bold;margin:0}.fb_dialog_content .dialog_title>span{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yd\/r\/Cou7n-nqK52.gif) no-repeat 5px 50\u0025;float:left;padding:5px 0 7px 26px}body.fb_hidden{-webkit-transform:none;height:100\u0025;margin:0;overflow:visible;position:absolute;top:-10000px;left:0;width:100\u0025}.fb_dialog.fb_dialog_mobile.loading{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ya\/r\/3rhSv5V8j3o.gif) white no-repeat 50\u0025 50\u0025;min-height:100\u0025;min-width:100\u0025;overflow:hidden;position:absolute;top:0;z-index:10001}.fb_dialog.fb_dialog_mobile.loading.centered{max-height:590px;min-height:590px;max-width:500px;min-width:500px}#fb-root #fb_dialog_ipad_overlay{background:rgba(0, 0, 0, .45);position:absolute;left:0;top:0;width:100\u0025;min-height:100\u0025;z-index:10000}#fb-root #fb_dialog_ipad_overlay.hidden{display:none}.fb_dialog.fb_dialog_mobile.loading iframe{visibility:hidden}.fb_dialog_content .dialog_header{-webkit-box-shadow:white 0 1px 1px -1px inset;background:-webkit-gradient(linear, 0\u0025 0\u0025, 0\u0025 100\u0025, from(#738ABA), to(#2C4987));border-bottom:1px solid;border-color:#1d4088;color:#fff;font:14px Helvetica, sans-serif;font-weight:bold;text-overflow:ellipsis;text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0;vertical-align:middle;white-space:nowrap}.fb_dialog_content .dialog_header table{-webkit-font-smoothing:subpixel-antialiased;height:43px;width:100\u0025}.fb_dialog_content .dialog_header td.header_left{font-size:12px;padding-left:5px;vertical-align:middle;width:60px}.fb_dialog_content .dialog_header td.header_right{font-size:12px;padding-right:5px;vertical-align:middle;width:60px}.fb_dialog_content .touchable_button{background:-webkit-gradient(linear, 0\u0025 0\u0025, 0\u0025 100\u0025, from(#4966A6), color-stop(.5, #355492), to(#2A4887));border:1px solid #2f477a;-webkit-background-clip:padding-box;-webkit-border-radius:3px;-webkit-box-shadow:rgba(0, 0, 0, .117188) 0 1px 1px inset, rgba(255, 255, 255, .167969) 0 1px 0;display:inline-block;margin-top:3px;max-width:85px;line-height:18px;padding:4px 12px;position:relative}.fb_dialog_content .dialog_header .touchable_button input{border:none;background:none;color:#fff;font:12px Helvetica, sans-serif;font-weight:bold;margin:2px -12px;padding:2px 6px 3px 6px;text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0}.fb_dialog_content .dialog_header .header_center{color:#fff;font-size:16px;font-weight:bold;line-height:18px;text-align:center;vertical-align:middle}.fb_dialog_content .dialog_content{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/y9\/r\/jKEcVPZFk-2.gif) no-repeat 50\u0025 50\u0025;border:1px solid #555;border-bottom:0;border-top:0;height:150px}.fb_dialog_content .dialog_footer{background:#f6f7f8;border:1px solid #555;border-top-color:#ccc;height:40px}#fb_dialog_loader_close{float:left}.fb_dialog.fb_dialog_mobile .fb_dialog_close_button{text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0}.fb_dialog.fb_dialog_mobile .fb_dialog_close_icon{visibility:hidden}\n.fb_iframe_widget{display:inline-block;position:relative}.fb_iframe_widget span{display:inline-block;position:relative;text-align:justify}.fb_iframe_widget iframe{position:absolute}.fb_iframe_widget_fluid_desktop,.fb_iframe_widget_fluid_desktop span,.fb_iframe_widget_fluid_desktop iframe{max-width:100\u0025}.fb_iframe_widget_fluid_desktop iframe{min-width:220px;position:relative}.fb_iframe_widget_lift{z-index:1}.fb_hide_iframes iframe{position:relative;left:-10000px}.fb_iframe_widget_loader{position:relative;display:inline-block}.fb_iframe_widget_fluid{display:inline}.fb_iframe_widget_fluid span{width:100\u0025}.fb_iframe_widget_loader iframe{min-height:32px;z-index:2;zoom:1}.fb_iframe_widget_loader .FB_Loader{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/y9\/r\/jKEcVPZFk-2.gif) no-repeat;height:32px;width:32px;margin-left:-16px;position:absolute;left:50\u0025;z-index:4}","components":["css:fb.css.base","css:fb.css.dialog","css:fb.css.iframewidget"]});__d("ApiClientConfig",[],{"FlashRequest":{"swfUrl":"https:\/\/connect.facebook.net\/rsrc.php\/v1\/yd\/r\/mxzow1Sdmxr.swf"}});__d("JSSDKCanvasPrefetcherConfig",[],{"blacklist":[144959615576466],"sampleRate":500});__d("JSSDKPluginPipeConfig",[],{"threshold":0,"enabledApps":{"209753825810663":1,"187288694643718":1}});


__d("QueryString",[],__annotator(function $module_QueryString(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();


function encode(/*object*/ bag) /*string*/ {return __bodyWrapper(this, arguments, function() {
  var pairs = [];
  ES(ES('Object', 'keys', false,bag).sort(), 'forEach', true,__annotator(function(key) {
    var value = bag[key];
    
    if (typeof value === 'undefined') {
      return;
    }
    
    if (value === null) {
      pairs.push(key);
      return;
    }
    
    pairs.push(encodeURIComponent(key) +
               '=' +
               encodeURIComponent(value));
  }, {"module":"QueryString","line":30,"column":34}));
  return pairs.join('&');
}, {"params":[[bag, 'object', 'bag']],"returns":'string'});}__annotator(encode, {"module":"QueryString","line":28,"column":0,"name":"encode"}, {"params":["object"],"returns":"string"});


function decode(/*string*/ str, /*?boolean*/ strict) /*object*/ {return __bodyWrapper(this, arguments, function() {
  var data = {};
  if (str === '') {
    return data;
  }

  var pairs = str.split('&');
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i].split('=', 2);
    var key = decodeURIComponent(pair[0]);
    if (strict && data.hasOwnProperty(key)) {
      throw new URIError('Duplicate key: ' + key);
    }
    data[key] = pair.length === 2
      ? decodeURIComponent(pair[1])
      : null;
  }
  return data;
}, {"params":[[str, 'string', 'str'], [strict, '?boolean', 'strict']],"returns":'object'});}__annotator(decode, {"module":"QueryString","line":52,"column":0,"name":"decode"}, {"params":["string","?boolean"],"returns":"object"});


function appendToUrl(/*string*/ url, params) /*string*/ {return __bodyWrapper(this, arguments, function() {
  return url +
    (~ES(url, 'indexOf', true,'?') ? '&' : '?') +
    (typeof params === 'string'
      ? params
      : QueryString.encode(params));
}, {"params":[[url, 'string', 'url']],"returns":'string'});}__annotator(appendToUrl, {"module":"QueryString","line":77,"column":0,"name":"appendToUrl"}, {"params":["string"],"returns":"string"});

var QueryString = {
  encode: encode,
  decode: decode,
  appendToUrl: appendToUrl
};

module.exports = QueryString;


}, {"module":"QueryString","line":23,"column":21,"name":"$module_QueryString"}),null);


__d("ManagedError",[],__annotator(function $module_ManagedError(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
function ManagedError(message, innerError) {
  Error.prototype.constructor.call(this, message);
  this.message = message;
  this.innerError = innerError;
}__annotator(ManagedError, {"module":"ManagedError","line":30,"column":0,"name":"ManagedError"});
ManagedError.prototype = new Error();
ManagedError.prototype.constructor = ManagedError;

module.exports = ManagedError;


}, {"module":"ManagedError","line":29,"column":22,"name":"$module_ManagedError"}),null);


__d("AssertionError",["ManagedError"],__annotator(function $module_AssertionError(global,require,requireDynamic,requireLazy,module,exports,ManagedError) {require.__markCompiled && require.__markCompiled();
   

function AssertionError(message) {
  ManagedError.prototype.constructor.apply(this, arguments);
}__annotator(AssertionError, {"module":"AssertionError","line":12,"column":0,"name":"AssertionError"});
AssertionError.prototype = new ManagedError();
AssertionError.prototype.constructor = AssertionError;

module.exports = AssertionError;



}, {"module":"AssertionError","line":9,"column":38,"name":"$module_AssertionError"}),null);


__d("sprintf",[],__annotator(function $module_sprintf(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();

function sprintf(format ) {return __bodyWrapper(this, arguments, function() {for (var args=[],$__0=1,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
  var index = 0;
  return format.replace(/%s/g, __annotator(function(match)  {return args[index++];}, {"module":"sprintf","line":32,"column":31}));
}, {"params":[[format, 'string', 'format']],"returns":'string'});}__annotator(sprintf, {"module":"sprintf","line":30,"column":0,"name":"sprintf"}, {"params":["string"],"returns":"string"});

module.exports = sprintf;


}, {"module":"sprintf","line":20,"column":17,"name":"$module_sprintf"}),null);


__d("Assert",["AssertionError","sprintf"],__annotator(function $module_Assert(global,require,requireDynamic,requireLazy,module,exports,AssertionError,sprintf) {require.__markCompiled && require.__markCompiled();
   

   


function assert(/*boolean*/ expression, /*?string*/ message) /*boolean*/ {return __bodyWrapper(this, arguments, function() {
  if (typeof expression !== 'boolean' || !expression) {
    throw new AssertionError(message);
  }
  return expression;
}, {"params":[[expression, 'boolean', 'expression'], [message, '?string', 'message']],"returns":'boolean'});}__annotator(assert, {"module":"Assert","line":23,"column":0,"name":"assert"}, {"params":["boolean","?string"],"returns":"boolean"});


function assertType(/*string*/ type, expression, /*?string*/ message) {return __bodyWrapper(this, arguments, function() {
  var actualType;

  if (expression === (void 0)) {
    actualType = 'undefined';
  } else if (expression === null) {
    actualType = 'null';
  } else {
    var className = Object.prototype.toString.call(expression);
    actualType = /\s(\w*)/.exec(className)[1].toLowerCase();
  }

  assert(
    ES(type, 'indexOf', true,actualType) !== -1,
    message || sprintf('Expression is of type %s, not %s', actualType, type)
  );
  return expression;
}, {"params":[[type, 'string', 'type'], [message, '?string', 'message']]});}__annotator(assertType, {"module":"Assert","line":39,"column":0,"name":"assertType"}, {"params":["string","?string"]});


function assertInstanceOf(/*function*/ type, expression, /*?string*/ message) {return __bodyWrapper(this, arguments, function() {
  assert(
    expression instanceof type,
    message || 'Expression not instance of type'
  );
  return expression;
}, {"params":[[type, 'function', 'type'], [message, '?string', 'message']]});}__annotator(assertInstanceOf, {"module":"Assert","line":67,"column":0,"name":"assertInstanceOf"}, {"params":["function","?string"]});

function define(/*string*/ type, /*function*/ test) {return __bodyWrapper(this, arguments, function() {
  Assert['is' + type] = test;
  Assert['maybe' + type] = __annotator(function(expression, message) {
    
    if (expression != null) {
      test(expression, message);
    }
  }, {"module":"Assert","line":77,"column":27});
}, {"params":[[type, 'string', 'type'], [test, 'function', 'test']]});}__annotator(define, {"module":"Assert","line":75,"column":0,"name":"define"}, {"params":["string","function"]});

var Assert = {
  isInstanceOf: assertInstanceOf,
  isTrue      : assert,
  isTruthy    : __annotator(function(expression, /*?string*/ message) /*boolean*/ {return __bodyWrapper(this, arguments, function() {
    return assert(!!expression, message);
  }, {"params":[[message, '?string', 'message']],"returns":'boolean'});}, {"module":"Assert","line":88,"column":16}, {"params":["?string"],"returns":"boolean"}),
  type        : assertType,
  define      : __annotator(function(/*string*/ type, /*function*/ fn) {return __bodyWrapper(this, arguments, function() {
    type = type.substring(0, 1).toUpperCase() +
      type.substring(1).toLowerCase();

    define(type, __annotator(function(expression, message) {
      assert(fn(expression), message);
    }, {"module":"Assert","line":96,"column":17}));
  }, {"params":[[type, 'string', 'type'], [fn, 'function', 'fn']]});}, {"module":"Assert","line":92,"column":16}, {"params":["string","function"]})
};


ES(['Array',
 'Boolean',
 'Date',
 'Function',
 'Null',
 'Number',
 'Object',
 'Regexp',
 'String',
 'Undefined'], 'forEach', true,__annotator(function(/*string*/ type) {return __bodyWrapper(this, arguments, function() {
   define(type, ES(assertType, 'bind', true,null, type.toLowerCase()));
 }, {"params":[[type, 'string', 'type']]});}, {"module":"Assert","line":112,"column":22}, {"params":["string"]}));

module.exports = Assert;


}, {"module":"Assert","line":10,"column":42,"name":"$module_Assert"}),null);

__d("Type",["Assert"],__annotator(function $module_Type(global,require,requireDynamic,requireLazy,module,exports,Assert) {require.__markCompiled && require.__markCompiled();
   


function Type() {
  var mixins = this.__mixins;
  if (mixins) {
    for (var i = 0; i < mixins.length; i++) {
      mixins[i].apply(this, arguments);
    }
  }
}__annotator(Type, {"module":"Type","line":75,"column":0,"name":"Type"});


function instanceOf(/*function*/ constructor, which) /*boolean*/ {return __bodyWrapper(this, arguments, function() {

  
  if (which instanceof constructor) {
    return true;
  }

  
  if (which instanceof Type) {
    for (var i = 0; i < which.__mixins.length; i++) {
      if (which.__mixins[i] == constructor) {
        return true;
      }
    }
  }

  return false;
}, {"params":[[constructor, 'function', 'constructor']],"returns":'boolean'});}__annotator(instanceOf, {"module":"Type","line":94,"column":0,"name":"instanceOf"}, {"params":["function"],"returns":"boolean"});


function mixin(/*function*/ to, from) {return __bodyWrapper(this, arguments, function() {
  var prototype = to.prototype;

  if (!ES('Array', 'isArray', false,from)) {
    from = [from];
  }

  for (var i = 0; i < from.length; i++) {
    var mixinFrom = from[i];
    
    if(typeof mixinFrom == 'function') {
      prototype.__mixins.push(mixinFrom);
      mixinFrom = mixinFrom.prototype;
    }
    
    ES(ES('Object', 'keys', false,mixinFrom), 'forEach', true,__annotator(function(key) {
      prototype[key] = mixinFrom[key];
    }, {"module":"Type","line":136,"column":35}));
  }
}, {"params":[[to, 'function', 'to']]});}__annotator(mixin, {"module":"Type","line":121,"column":0,"name":"mixin"}, {"params":["function"]});


function extend(/*?function*/ from, /*?object*/ prototype, mixins)
    /*function*/ {return __bodyWrapper(this, arguments, function() {
  var constructor = prototype && prototype.hasOwnProperty('constructor')
    ? prototype.constructor
    : __annotator(function() {this.parent.apply(this, arguments);}, {"module":"Type","line":160,"column":6});

  Assert.isFunction(constructor);

  
  if (from && from.prototype instanceof Type === false) {
    throw new Error('parent type does not inherit from Type');
  }
  from = from || Type;

  
  function F() {}__annotator(F, {"module":"Type","line":171,"column":2,"name":"F"});
  F.prototype = from.prototype;
  constructor.prototype = new F();

  if (prototype) {
    ES('Object', 'assign', false,constructor.prototype, prototype);
  }

  
  constructor.prototype.constructor = constructor;
  
  constructor.parent = from;

  
  
  constructor.prototype.__mixins = from.prototype.__mixins
    ? Array.prototype.slice.call(from.prototype.__mixins)
    : [];

  
  if (mixins) {
    mixin(constructor, mixins);
  }

  
  constructor.prototype.parent = __annotator(function() {
    this.parent = from.prototype.parent;
    from.apply(this, arguments);
  }, {"module":"Type","line":196,"column":33});

  // Allow the new type to call this.parentCall('method'/*, args*/);
  constructor.prototype.parentCall = __annotator(function(/*string*/ method) {return __bodyWrapper(this, arguments, function() {
    return from.prototype[method].apply(this,
      Array.prototype.slice.call(arguments, 1));
  }, {"params":[[method, 'string', 'method']]});}, {"module":"Type","line":202,"column":37}, {"params":["string"]});

  constructor.extend = __annotator(function(/*?object*/ prototype, mixins) {return __bodyWrapper(this, arguments, function() {
    return extend(this, prototype, mixins);
  }, {"params":[[prototype, '?object', 'prototype']]});}, {"module":"Type","line":207,"column":23}, {"params":["?object"]});
  return constructor;
}, {"params":[[from, '?function', 'from'], [prototype, '?object', 'prototype']],"returns":'function'});}__annotator(extend, {"module":"Type","line":156,"column":0,"name":"extend"}, {"params":["?function","?object"],"returns":"function"});

ES('Object', 'assign', false,Type.prototype, {
  instanceOf: __annotator(function(/*function*/ type) /*boolean*/ {return __bodyWrapper(this, arguments, function() {
    return instanceOf(type, this);
  }, {"params":[[type, 'function', 'type']],"returns":'boolean'});}, {"module":"Type","line":214,"column":14}, {"params":["function"],"returns":"boolean"})
});

ES('Object', 'assign', false,Type, {
  extend: __annotator(function(prototype, mixins) /*function*/ {return __bodyWrapper(this, arguments, function() {
    return typeof prototype === 'function'
      ? extend.apply(null, arguments)
      : extend(null, prototype, mixins);
  }, {"returns":'function'});}, {"module":"Type","line":220,"column":10}, {"returns":"function"}),
  instanceOf: instanceOf
});

module.exports = Type;


}, {"module":"Type","line":68,"column":25,"name":"$module_Type"}),null);


__d("ObservableMixin",[],__annotator(function $module_ObservableMixin(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
function ObservableMixin() {
  this.__observableEvents = {};
}__annotator(ObservableMixin, {"module":"ObservableMixin","line":22,"column":0,"name":"ObservableMixin"});

ObservableMixin.prototype = {

  
  inform: __annotator(function(/*string*/ what ) {return __bodyWrapper(this, arguments, function() {

    var args = Array.prototype.slice.call(arguments, 1);
    var list = Array.prototype.slice.call(this.getSubscribers(what));
    for (var i = 0; i < list.length; i++) {
      if (list[i] === null) continue;
      if (__DEV__) {
        list[i].apply(this, args);
      } else {
        try {
          list[i].apply(this, args);
        } catch(e) {
          // we want the loop to continue, but we don't want to swallow the
          
          setTimeout(__annotator(function() { throw e; }, {"module":"ObservableMixin","line":51,"column":21}), 0);
        }
      }
    }
    return this;
  }, {"params":[[what, 'string', 'what']]});}, {"module":"ObservableMixin","line":37,"column":10}, {"params":["string"]}),

  
  getSubscribers: __annotator(function(/*string*/ toWhat) /*array*/ {return __bodyWrapper(this, arguments, function() {

    return this.__observableEvents[toWhat] ||
      (this.__observableEvents[toWhat] = []);
  }, {"params":[[toWhat, 'string', 'toWhat']],"returns":'array'});}, {"module":"ObservableMixin","line":64,"column":18}, {"params":["string"],"returns":"array"}),

  
  clearSubscribers: __annotator(function(/*string*/ toWhat) {return __bodyWrapper(this, arguments, function() {

    if (toWhat) {
      this.__observableEvents[toWhat] = [];
    }
    return this;
  }, {"params":[[toWhat, 'string', 'toWhat']]});}, {"module":"ObservableMixin","line":75,"column":20}, {"params":["string"]}),

  
  clearAllSubscribers: __annotator(function() {
    this.__observableEvents = {};
    return this;
  }, {"module":"ObservableMixin","line":87,"column":23}),

  
  subscribe: __annotator(function(/*string*/ toWhat, /*function*/ withWhat) {return __bodyWrapper(this, arguments, function() {

    var list = this.getSubscribers(toWhat);
    list.push(withWhat);
    return this;
  }, {"params":[[toWhat, 'string', 'toWhat'], [withWhat, 'function', 'withWhat']]});}, {"module":"ObservableMixin","line":99,"column":13}, {"params":["string","function"]}),

  
  unsubscribe: __annotator(function(/*string*/ toWhat, /*function*/ withWhat) {return __bodyWrapper(this, arguments, function() {

    var list = this.getSubscribers(toWhat);
    for (var i = 0; i < list.length; i++) {
      if (list[i] === withWhat) {
        list.splice(i, 1);
        break;
      }
    }
    return this;
  }, {"params":[[toWhat, 'string', 'toWhat'], [withWhat, 'function', 'withWhat']]});}, {"module":"ObservableMixin","line":113,"column":15}, {"params":["string","function"]}),

  
  monitor: __annotator(function(/*string*/ toWhat, /*function*/ withWhat) {return __bodyWrapper(this, arguments, function() {
    if (!withWhat()) {
      var monitor = ES(__annotator(function(value) {
        if (withWhat.apply(withWhat, arguments)) {
          this.unsubscribe(toWhat, monitor);
        }
      }, {"module":"ObservableMixin","line":135,"column":20}), 'bind', true,this);
      this.subscribe(toWhat, monitor);
    }
    return this;
  }, {"params":[[toWhat, 'string', 'toWhat'], [withWhat, 'function', 'withWhat']]});}, {"module":"ObservableMixin","line":133,"column":11}, {"params":["string","function"]})

};


module.exports = ObservableMixin;


}, {"module":"ObservableMixin","line":21,"column":25,"name":"$module_ObservableMixin"}),null);


__d("sdk.Model",["Type","ObservableMixin"],__annotator(function $module_sdk_Model(global,require,requireDynamic,requireLazy,module,exports,Type,ObservableMixin) {require.__markCompiled && require.__markCompiled();
   
   

var Model = Type.extend({
  constructor: __annotator(function(/*object*/ properties) {return __bodyWrapper(this, arguments, function() {
    this.parent();

    
    var propContainer = {};
    var model = this;

    ES(ES('Object', 'keys', false,properties), 'forEach', true,__annotator(function(/*string*/ name) {return __bodyWrapper(this, arguments, function() {
      
      propContainer[name] = properties[name];

      
      model['set' + name] = __annotator(function(value) {
        if (value === propContainer[name]) {
          return this;
        }
        propContainer[name] = value;
        model.inform(name + '.change', value);
        return model;
      }, {"module":"sdk.Model","line":48,"column":28});

      
      model['get' + name] = __annotator(function() {
        return propContainer[name];
      }, {"module":"sdk.Model","line":58,"column":28});
    }, {"params":[[name, 'string', 'name']]});}, {"module":"sdk.Model","line":43,"column":36}, {"params":["string"]}));
  }, {"params":[[properties, 'object', 'properties']]});}, {"module":"sdk.Model","line":36,"column":15}, {"params":["object"]})
}, ObservableMixin);

module.exports = Model;


}, {"module":"sdk.Model","line":31,"column":43,"name":"$module_sdk_Model"}),null);


__d("sdk.Runtime",["sdk.Model","JSSDKRuntimeConfig"],__annotator(function $module_sdk_Runtime(global,require,requireDynamic,requireLazy,module,exports,Model,RuntimeConfig) {require.__markCompiled && require.__markCompiled();
   
   


var ENVIRONMENTS = {
  UNKNOWN: 0,
  PAGETAB: 1,
  CANVAS: 2,
  PLATFORM: 4
};

var Runtime = new Model({
  AccessToken: '',
  ClientID: '',
  CookieUserID: '',
  Environment: ENVIRONMENTS.UNKNOWN,
  Initialized: false,
  IsVersioned: false,
  KidDirectedSite: (void 0),
  Locale: RuntimeConfig.locale,
  LoginStatus: (void 0),
  Revision: RuntimeConfig.revision,
  Rtl: RuntimeConfig.rtl,
  Scope: (void 0),
  Secure: (void 0),
  UseCookie: false,
  UserID: '',
  Version: (void 0)
});

ES('Object', 'assign', false,Runtime, {

  ENVIRONMENTS: ENVIRONMENTS,

  isEnvironment: __annotator(function(/*number*/ target) /*boolean*/ {return __bodyWrapper(this, arguments, function() {
    var environment = this.getEnvironment();
    return (target | environment) === environment;
  }, {"params":[[target, 'number', 'target']],"returns":'boolean'});}, {"module":"sdk.Runtime","line":45,"column":17}, {"params":["number"],"returns":"boolean"}),

  isCanvasEnvironment: __annotator(function() /*boolean*/ {return __bodyWrapper(this, arguments, function() {
    return this.isEnvironment(ENVIRONMENTS.CANVAS) ||
      this.isEnvironment(ENVIRONMENTS.PAGETAB);
  }, {"returns":'boolean'});}, {"module":"sdk.Runtime","line":50,"column":23}, {"returns":"boolean"})
});

(__annotator(function() {
  var environment = /app_runner/.test(window.name)
    ? ENVIRONMENTS.PAGETAB
    : /iframe_canvas/.test(window.name)
      ? ENVIRONMENTS.CANVAS
      : ENVIRONMENTS.UNKNOWN;

  
  if ((environment | ENVIRONMENTS.PAGETAB) === environment) {
    environment = environment | ENVIRONMENTS.CANVAS;
  }
  Runtime.setEnvironment(environment);
}, {"module":"sdk.Runtime","line":56,"column":1}))();

module.exports = Runtime;


}, {"module":"sdk.Runtime","line":10,"column":53,"name":"$module_sdk_Runtime"}),null);


__d("sdk.Cookie",["QueryString","sdk.Runtime"],__annotator(function $module_sdk_Cookie(global,require,requireDynamic,requireLazy,module,exports,QueryString,Runtime) {require.__markCompiled && require.__markCompiled();
   
   



var domain = null;


function setRaw(/*string*/ prefix, /*string*/ val, /*number*/ ts) {return __bodyWrapper(this, arguments, function() {
  prefix = prefix + Runtime.getClientID();

  var useDomain = domain && domain !== '.';
  
  if (useDomain) {
    
    document.cookie = prefix + '=; expires=Wed, 04 Feb 2004 08:00:00 GMT;';
    
    document.cookie = prefix  + '=; expires=Wed, 04 Feb 2004 08:00:00 GMT;' +
      'domain=' + location.hostname + ';';
  }

  var expires = new Date(ts).toGMTString();
  document.cookie = prefix +  '=' + val +
    (val && ts === 0 ? '' : '; expires=' + expires) +
    '; path=/' +
    (useDomain ? '; domain=' + domain : '');
}, {"params":[[prefix, 'string', 'prefix'], [val, 'string', 'val'], [ts, 'number', 'ts']]});}__annotator(setRaw, {"module":"sdk.Cookie","line":28,"column":0,"name":"setRaw"}, {"params":["string","string","number"]});

function getRaw(/*string*/ prefix) /*?string*/ {return __bodyWrapper(this, arguments, function() {
  prefix = prefix + Runtime.getClientID();
  var regExp = new RegExp('\\b' + prefix + '=([^;]*)\\b');
  return regExp.test(document.cookie)
    ? RegExp.$1
    : null;
}, {"params":[[prefix, 'string', 'prefix']],"returns":'?string'});}__annotator(getRaw, {"module":"sdk.Cookie","line":48,"column":0,"name":"getRaw"}, {"params":["string"],"returns":"?string"});

var Cookie = {
  setDomain: __annotator(function(/*?string*/ val) {return __bodyWrapper(this, arguments, function() {
    domain = val;
    
    var meta  = QueryString.encode({
      base_domain: domain && domain !== '.' ? domain : ''
    });
    var expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 1);
    setRaw('fbm_', meta, expiration.getTime());
  }, {"params":[[val, '?string', 'val']]});}, {"module":"sdk.Cookie","line":57,"column":13}, {"params":["?string"]}),

  getDomain: __annotator(function() /*?string*/ {return __bodyWrapper(this, arguments, function() {
    return domain;
  }, {"returns":'?string'});}, {"module":"sdk.Cookie","line":68,"column":13}, {"returns":"?string"}),

  
  loadMeta: __annotator(function() /*?object*/ {return __bodyWrapper(this, arguments, function() {
    var cookie = getRaw('fbm_');
    if (cookie) {
      // url encoded session stored as "sub-cookies"
      var meta = QueryString.decode(cookie);
      if (!domain) {
        
        domain = meta.base_domain;
      }
      return meta;
    }
  }, {"returns":'?object'});}, {"module":"sdk.Cookie","line":77,"column":12}, {"returns":"?object"}),

  
  loadSignedRequest: __annotator(function() /*?string*/ {return __bodyWrapper(this, arguments, function() {
    return getRaw('fbsr_');
  }, {"returns":'?string'});}, {"module":"sdk.Cookie","line":95,"column":21}, {"returns":"?string"}),

  
  setSignedRequestCookie: __annotator(function(/*string*/ signedRequest,
      /*number*/ expiration) {return __bodyWrapper(this, arguments, function() {
    if (!signedRequest) {
      throw new Error('Value passed to Cookie.setSignedRequestCookie ' +
                      'was empty.');
    }
    setRaw('fbsr_', signedRequest, expiration);
  }, {"params":[[signedRequest, 'string', 'signedRequest'], [expiration, 'number', 'expiration']]});}, {"module":"sdk.Cookie","line":108,"column":26}, {"params":["string","number"]}),

  
  clearSignedRequestCookie: __annotator(function() {
    setRaw('fbsr_', '', 0);
  }, {"module":"sdk.Cookie","line":121,"column":28}),

  setRaw: setRaw
};

module.exports = Cookie;


}, {"module":"sdk.Cookie","line":13,"column":47,"name":"$module_sdk_Cookie"}),null);


__d("wrapFunction",[],__annotator(function $module_wrapFunction(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var wrappers = {};
function wrapFunction(/*function*/ fn, /*?string*/ type, /*?string*/ source)
    /*function*/ {return __bodyWrapper(this, arguments, function() {
  type = type || 'default';

  return __annotator(function() {
    var callee = type in wrappers
      ? wrappers[type](fn, source)
      : fn;

    return callee.apply(this, arguments);
  }, {"module":"wrapFunction","line":34,"column":9});
}, {"params":[[fn, 'function', 'fn'], [type, '?string', 'type'], [source, '?string', 'source']],"returns":'function'});}__annotator(wrapFunction, {"module":"wrapFunction","line":30,"column":0,"name":"wrapFunction"}, {"params":["function","?string","?string"],"returns":"function"});

wrapFunction.setWrapper = __annotator(function(/*function*/ fn, /*?string*/ type) {return __bodyWrapper(this, arguments, function() {
  type = type || 'default';
  wrappers[type] = fn;
}, {"params":[[fn, 'function', 'fn'], [type, '?string', 'type']]});}, {"module":"wrapFunction","line":43,"column":26}, {"params":["function","?string"]});

module.exports = wrapFunction;


}, {"module":"wrapFunction","line":28,"column":22,"name":"$module_wrapFunction"}),null);


__d("DOMEventListener",["wrapFunction"],__annotator(function $module_DOMEventListener(global,require,requireDynamic,requireLazy,module,exports,wrapFunction) {require.__markCompiled && require.__markCompiled();
   

var add, remove;

if (window.addEventListener) {

  
  add = __annotator(function(target, /*string*/ name, /*function*/ listener) {return __bodyWrapper(this, arguments, function() {
    listener.wrapper =
      wrapFunction(listener, 'entry', 'DOMEventListener.add ' + name);
    target.addEventListener(name, listener.wrapper, false);
  }, {"params":[[name, 'string', 'name'], [listener, 'function', 'listener']]});}, {"module":"DOMEventListener","line":23,"column":8}, {"params":["string","function"]});
  remove = __annotator(function(target, /*string*/ name, /*function*/ listener) {return __bodyWrapper(this, arguments, function() {
    target.removeEventListener(name, listener.wrapper, false);
  }, {"params":[[name, 'string', 'name'], [listener, 'function', 'listener']]});}, {"module":"DOMEventListener","line":28,"column":11}, {"params":["string","function"]});

} else if (window.attachEvent) {

  
  add = __annotator(function(target, /*string*/ name, /*function*/ listener) {return __bodyWrapper(this, arguments, function() {
    listener.wrapper =
      wrapFunction(listener, 'entry', 'DOMEventListener.add ' + name);
    target.attachEvent('on' + name, listener.wrapper);
  }, {"params":[[name, 'string', 'name'], [listener, 'function', 'listener']]});}, {"module":"DOMEventListener","line":35,"column":8}, {"params":["string","function"]});
  remove = __annotator(function(target, /*string*/ name, /*function*/ listener) {return __bodyWrapper(this, arguments, function() {
    target.detachEvent('on' + name, listener.wrapper);
  }, {"params":[[name, 'string', 'name'], [listener, 'function', 'listener']]});}, {"module":"DOMEventListener","line":40,"column":11}, {"params":["string","function"]});

} else {
  remove = add = __annotator(function()  {}, {"module":"DOMEventListener","line":45,"column":17});
}

var DOMEventListener = {

  
  add: __annotator(function(target, /*string*/ name, /*function*/ listener) {return __bodyWrapper(this, arguments, function() {
    
    
    add(target, name, listener);
    return {
      
      
      // someone is hanging on to this 'event' object.
      remove: __annotator(function() {
        remove(target, name, listener);
        target = null;
      }, {"module":"DOMEventListener","line":68,"column":14})
    };
  }, {"params":[[name, 'string', 'name'], [listener, 'function', 'listener']]});}, {"module":"DOMEventListener","line":60,"column":7}, {"params":["string","function"]}),

  
  remove: remove

};
module.exports = DOMEventListener;


}, {"module":"DOMEventListener","line":15,"column":40,"name":"$module_DOMEventListener"}),null);


__d("sdk.UA",[],__annotator(function $module_sdk_UA(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var uas = navigator.userAgent;


var devices = {
  iphone: /\b(iPhone|iP[ao]d)/.test(uas),
  ipad: /\b(iP[ao]d)/.test(uas),
  android: /Android/i.test(uas),
  nativeApp: /FBAN\/\w+;/i.test(uas)
};
var mobile = /Mobile/i.test(uas);


var versions = {
  ie: '',
  firefox: '',
  chrome: '',
  webkit: '',
  osx: ''
};
var agent =
  /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))|(?:Trident\/\d+\.\d+.*rv:(\d+\.\d+))/
    .exec(uas);
if (agent) {
  versions.ie = agent[1]
    ? parseFloat(agent[1])
    : agent[4]
      ? parseFloat(agent[4])
      : '';

  versions.firefox = agent[2] || '';
  versions.webkit  = agent[3] || '';
  if (agent[3]) {
    
    // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
    
    var chromeAgent = /(?:Chrome\/(\d+\.\d+))/.exec(uas);
    versions.chrome = chromeAgent ? chromeAgent[1] : '';
  }
}


var mac = /(?:Mac OS X (\d+(?:[._]\d+)?))/.exec(uas);
if (mac) {
  versions.osx = mac[1];
}

function getVersionParts(/*string*/ version) /*array*/ {return __bodyWrapper(this, arguments, function() {
  return ES(version.split('.'), 'map', true,__annotator(function(v)  {return parseFloat(v);}, {"module":"sdk.UA","line":92,"column":32}));
}, {"params":[[version, 'string', 'version']],"returns":'array'});}__annotator(getVersionParts, {"module":"sdk.UA","line":91,"column":0,"name":"getVersionParts"}, {"params":["string"],"returns":"array"});

var UA = {};

ES(ES('Object', 'keys', false,versions), 'map', true,__annotator(function(key)  {
  
  UA[key] = __annotator(function()  {return __bodyWrapper(this, arguments, function() {return parseFloat(versions[key]);}, {"returns":'number'});}, {"module":"sdk.UA","line":101,"column":12}, {"returns":"number"});
  
  UA[key].getVersionParts = __annotator(function()  {return __bodyWrapper(this, arguments, function() {return getVersionParts(versions[key]);}, {"returns":'array'});}, {"module":"sdk.UA","line":105,"column":28}, {"returns":"array"});
}, {"module":"sdk.UA","line":97,"column":26}));

ES(ES('Object', 'keys', false,devices), 'map', true,__annotator(function(key)  {
  
  UA[key] = __annotator(function()  {return __bodyWrapper(this, arguments, function() {return devices[key];}, {"returns":'boolean'});}, {"module":"sdk.UA","line":112,"column":12}, {"returns":"boolean"});
}, {"module":"sdk.UA","line":108,"column":25}));


UA.mobile = __annotator(function()  {return __bodyWrapper(this, arguments, function() {return devices.iphone || devices.ipad || devices.android || mobile;}, {"returns":'boolean'});}, {"module":"sdk.UA","line":118,"column":12}, {"returns":"boolean"});


module.exports = UA;


}, {"module":"sdk.UA","line":44,"column":16,"name":"$module_sdk_UA"}),null);


__d("getBlankIframeSrc",["sdk.UA"],__annotator(function $module_getBlankIframeSrc(global,require,requireDynamic,requireLazy,module,exports,UA) {require.__markCompiled && require.__markCompiled();
   

function getBlankIframeSrc()   /*string*/       {
  return UA.ie() < 10 ? 'javascript:false' : 'about:blank';
}__annotator(getBlankIframeSrc, {"module":"getBlankIframeSrc","line":16,"column":0,"name":"getBlankIframeSrc"});

module.exports = getBlankIframeSrc;


}, {"module":"getBlankIframeSrc","line":13,"column":35,"name":"$module_getBlankIframeSrc"}),null);


__d("guid",[],__annotator(function $module_guid(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
/*jshint bitwise: false*/

function guid() {
  return 'f' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
}__annotator(guid, {"module":"guid","line":27,"column":0,"name":"guid"});

module.exports = guid;


}, {"module":"guid","line":24,"column":14,"name":"$module_guid"}),null);


__d("UserAgent_DEPRECATED",[],__annotator(function $module_UserAgent_DEPRECATED(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();


var _populated = false;


var _ie, _firefox, _opera, _webkit, _chrome;


var _ie_real_version;


var _osx, _windows, _linux, _android;


var _win64;


var _iphone, _ipad, _native;

var _mobile;

function _populate() {
  if (_populated) {
    return;
  }

  _populated = true;

  // To work around buggy JS libraries that can't handle multi-digit
  // version numbers, Opera 10's user agent string claims it's Opera
  
  
  
  var uas = navigator.userAgent;
  var agent = /(?:MSIE.(\d+\.\d+))|(?:(?:Firefox|GranParadiso|Iceweasel).(\d+\.\d+))|(?:Opera(?:.+Version.|.)(\d+\.\d+))|(?:AppleWebKit.(\d+(?:\.\d+)?))|(?:Trident\/\d+\.\d+.*rv:(\d+\.\d+))/.exec(uas);
  var os    = /(Mac OS X)|(Windows)|(Linux)/.exec(uas);

  _iphone = /\b(iPhone|iP[ao]d)/.exec(uas);
  _ipad = /\b(iP[ao]d)/.exec(uas);
  _android = /Android/i.exec(uas);
  _native = /FBAN\/\w+;/i.exec(uas);
  _mobile = /Mobile/i.exec(uas);

  
  // for 'Win64; x64'.  But MSDN then reveals that you can actually be coming
  
  // as in indicator of whether you're in 64-bit IE.  32-bit IE on 64-bit
  // Windows will send 'WOW64' instead.
  _win64 = !!(/Win64/.exec(uas));

  if (agent) {
    _ie = agent[1] ? parseFloat(agent[1]) : (
          agent[5] ? parseFloat(agent[5]) : NaN);
    
    if (_ie && document && document.documentMode) {
      _ie = document.documentMode;
    }
    // grab the "true" ie version from the trident token if available
    var trident = /(?:Trident\/(\d+.\d+))/.exec(uas);
    _ie_real_version = trident ? parseFloat(trident[1]) + 4 : _ie;

    _firefox = agent[2] ? parseFloat(agent[2]) : NaN;
    _opera   = agent[3] ? parseFloat(agent[3]) : NaN;
    _webkit  = agent[4] ? parseFloat(agent[4]) : NaN;
    if (_webkit) {
      
      // match 'safari' only since 'AppleWebKit' appears before 'Chrome' in
      
      agent = /(?:Chrome\/(\d+\.\d+))/.exec(uas);
      _chrome = agent && agent[1] ? parseFloat(agent[1]) : NaN;
    } else {
      _chrome = NaN;
    }
  } else {
    _ie = _firefox = _opera = _chrome = _webkit = NaN;
  }

  if (os) {
    if (os[1]) {
      
      
      
      
      
      var ver = /(?:Mac OS X (\d+(?:[._]\d+)?))/.exec(uas);

      _osx = ver ? parseFloat(ver[1].replace('_', '.')) : true;
    } else {
      _osx = false;
    }
    _windows = !!os[2];
    _linux   = !!os[3];
  } else {
    _osx = _windows = _linux = false;
  }
}__annotator(_populate, {"module":"UserAgent_DEPRECATED","line":79,"column":0,"name":"_populate"});

var UserAgent_DEPRECATED = {

  
  ie: __annotator(function() {
    return _populate() || _ie;
  }, {"module":"UserAgent_DEPRECATED","line":163,"column":6}),

  
  ieCompatibilityMode: __annotator(function() {
    return _populate() || (_ie_real_version > _ie);
  }, {"module":"UserAgent_DEPRECATED","line":173,"column":23}),


  
  ie64: __annotator(function() {
    return UserAgent_DEPRECATED.ie() && _win64;
  }, {"module":"UserAgent_DEPRECATED","line":183,"column":8}),

  
  firefox: __annotator(function() {
    return _populate() || _firefox;
  }, {"module":"UserAgent_DEPRECATED","line":193,"column":11}),


  
  opera: __annotator(function() {
    return _populate() || _opera;
  }, {"module":"UserAgent_DEPRECATED","line":204,"column":9}),


  
  webkit: __annotator(function() {
    return _populate() || _webkit;
  }, {"module":"UserAgent_DEPRECATED","line":215,"column":10}),

  
  safari: __annotator(function() {
    return UserAgent_DEPRECATED.webkit();
  }, {"module":"UserAgent_DEPRECATED","line":223,"column":10}),

  
  chrome : __annotator(function() {
    return _populate() || _chrome;
  }, {"module":"UserAgent_DEPRECATED","line":233,"column":11}),


  
  windows: __annotator(function() {
    return _populate() || _windows;
  }, {"module":"UserAgent_DEPRECATED","line":243,"column":11}),


  
  osx: __annotator(function() {
    return _populate() || _osx;
  }, {"module":"UserAgent_DEPRECATED","line":254,"column":7}),

  
  linux: __annotator(function() {
    return _populate() || _linux;
  }, {"module":"UserAgent_DEPRECATED","line":263,"column":9}),

  
  iphone: __annotator(function() {
    return _populate() || _iphone;
  }, {"module":"UserAgent_DEPRECATED","line":273,"column":10}),

  mobile: __annotator(function() {
    return _populate() || (_iphone || _ipad || _android || _mobile);
  }, {"module":"UserAgent_DEPRECATED","line":277,"column":10}),

  nativeApp: __annotator(function() {
    
    return _populate() || _native;
  }, {"module":"UserAgent_DEPRECATED","line":281,"column":13}),

  android: __annotator(function() {
    return _populate() || _android;
  }, {"module":"UserAgent_DEPRECATED","line":286,"column":11}),

  ipad: __annotator(function() {
    return _populate() || _ipad;
  }, {"module":"UserAgent_DEPRECATED","line":290,"column":8})
};

module.exports = UserAgent_DEPRECATED;


}, {"module":"UserAgent_DEPRECATED","line":19,"column":30,"name":"$module_UserAgent_DEPRECATED"}),null);


__d("hasNamePropertyBug",["guid","UserAgent_DEPRECATED"],__annotator(function $module_hasNamePropertyBug(global,require,requireDynamic,requireLazy,module,exports,guid,UserAgent_DEPRECATED) {require.__markCompiled && require.__markCompiled();
   
   

var hasBug = UserAgent_DEPRECATED.ie() ? (void 0) : false;




function test() /*boolean*/ {return __bodyWrapper(this, arguments, function() {
    var form = document.createElement("form"),
        input = form.appendChild(document.createElement("input"));
    input.name = guid();
    hasBug = input !== form.elements[input.name];
    form = input = null;
    return hasBug;
}, {"returns":'boolean'});}__annotator(test, {"module":"hasNamePropertyBug","line":16,"column":0,"name":"test"}, {"returns":"boolean"});

function hasNamePropertyBug() /*boolean*/ {return __bodyWrapper(this, arguments, function() {
  return typeof hasBug === 'undefined'
    ? test()
    : hasBug;
}, {"returns":'boolean'});}__annotator(hasNamePropertyBug, {"module":"hasNamePropertyBug","line":25,"column":0,"name":"hasNamePropertyBug"}, {"returns":"boolean"});

module.exports = hasNamePropertyBug;


}, {"module":"hasNamePropertyBug","line":7,"column":57,"name":"$module_hasNamePropertyBug"}),null);


__d("sdk.createIframe",["DOMEventListener","getBlankIframeSrc","guid","hasNamePropertyBug"],__annotator(function $module_sdk_createIframe(global,require,requireDynamic,requireLazy,module,exports,DOMEventListener,getBlankIframeSrc,guid,hasNamePropertyBug) {require.__markCompiled && require.__markCompiled();
   

   
   
   

function createIframe(/*object*/ opts) /*DOMElement*/ {return __bodyWrapper(this, arguments, function() {
  opts = ES('Object', 'assign', false,{}, opts);
  var frame;
  var name = opts.name || guid();
  var root = opts.root;
  var style = opts.style ||  { border: 'none' };
  var src = opts.url;
  var onLoad = opts.onload;
  var onError = opts.onerror;

  if (hasNamePropertyBug()) {
    frame = document.createElement('<iframe name="' + name + '"/>');
  } else {
    frame = document.createElement("iframe");
    frame.name = name;
  }

  // delete attributes that we're setting directly
  delete opts.style;
  delete opts.name;
  delete opts.url;
  delete opts.root;
  delete opts.onload;
  delete opts.onerror;

  var attributes =  ES('Object', 'assign', false,{
    frameBorder: 0,
    allowTransparency: true,
    allowFullscreen: true,
    scrolling: 'no'
  }, opts);


  if (attributes.width) {
    frame.width = attributes.width + 'px';
  }
  if (attributes.height) {
    frame.height = attributes.height + 'px';
  }

  delete attributes.height;
  delete attributes.width;

  for (var key in attributes) {
    if (attributes.hasOwnProperty(key)) {
      frame.setAttribute(key, attributes[key]);
    }
  }

  ES('Object', 'assign', false,frame.style, style);

  
  
  frame.src = getBlankIframeSrc();
  root.appendChild(frame);
  if (onLoad) {
    var onLoadListener = DOMEventListener.add(frame, 'load', __annotator(function()  {
      onLoadListener.remove();
      onLoad();
    }, {"module":"sdk.createIframe","line":72,"column":61}));
  }

  if (onError) {
    var onErrorListener = DOMEventListener.add(frame, 'error', __annotator(function()  {
      onErrorListener.remove();
      onError();
    }, {"module":"sdk.createIframe","line":79,"column":63}));
  }

  
  // "javascript:false" to work around the IE issue mentioned above)
  frame.src = src;
  return frame;
}, {"params":[[opts, 'object', 'opts']],"returns":'HTMLElement'});}__annotator(createIframe, {"module":"sdk.createIframe","line":16,"column":0,"name":"createIframe"}, {"params":["object"],"returns":"DOMElement"});

module.exports = createIframe;


}, {"module":"sdk.createIframe","line":9,"column":92,"name":"$module_sdk_createIframe"}),null);

__d("DOMWrapper",[],__annotator(function $module_DOMWrapper(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
/*global self:true*/
var rootElement,
    windowRef;


// `obj || default` pattern to account for 'resetting'.
var DOMWrapper = {
  setRoot: __annotator(function(/*?DOMElement*/ root) {return __bodyWrapper(this, arguments, function() {
    rootElement = root;
  }, {"params":[[root, '?HTMLElement', 'root']]});}, {"module":"DOMWrapper","line":20,"column":11}, {"params":["?DOMElement"]}),
  getRoot: __annotator(function() /*DOMElement*/ {return __bodyWrapper(this, arguments, function() {
    return rootElement || document.body;
  }, {"returns":'HTMLElement'});}, {"module":"DOMWrapper","line":23,"column":11}, {"returns":"DOMElement"}),
  setWindow: __annotator(function(win) {
    windowRef = win;
  }, {"module":"DOMWrapper","line":26,"column":13}),
  getWindow: __annotator(function() {
    return windowRef || self;
  }, {"module":"DOMWrapper","line":29,"column":13})
};

module.exports = DOMWrapper;


}, {"module":"DOMWrapper","line":12,"column":23,"name":"$module_DOMWrapper"}),null);


__d("eprintf",[],__annotator(function $module_eprintf(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();


var eprintf = __annotator(function(errorMessage) {
  var args = ES(Array.prototype.slice.call(arguments), 'map', true,__annotator(function(arg) {
    return String(arg);
  }, {"module":"eprintf","line":33,"column":55}));
  var expectedLength = errorMessage.split('%s').length - 1;

  if (expectedLength !== args.length - 1) {
    
    return eprintf('eprintf args number mismatch: %s', ES('JSON', 'stringify', false,args));
  }

  var index = 1;
  return errorMessage.replace(/%s/g, __annotator(function(whole) {
    return String(args[index++]);
  }, {"module":"eprintf","line":44,"column":37}));
}, {"module":"eprintf","line":32,"column":14});

module.exports = eprintf;


}, {"module":"eprintf","line":21,"column":17,"name":"$module_eprintf"}),null);


__d("ex",["eprintf"],__annotator(function $module_ex(global,require,requireDynamic,requireLazy,module,exports,eprintf) {require.__markCompiled && require.__markCompiled();
   



var ex = __annotator(function() {for (var args=[],$__0=0,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
  args = ES(args, 'map', true,__annotator(function(arg)  {return String(arg);}, {"module":"ex","line":39,"column":18}));
  if (args[0].split('%s').length !== args.length) {
    
    return ex('ex args number mismatch: %s', ES('JSON', 'stringify', false,args));
  }

  if (__DEV__) {
    return eprintf.apply(null, args);
  } else {
    return ex._prefix + ES('JSON', 'stringify', false,args) + ex._suffix;
  }
}, {"module":"ex","line":38,"column":9});


ex._prefix = '<![EX[';
ex._suffix = ']]>';

module.exports = ex;


}, {"module":"ex","line":21,"column":21,"name":"$module_ex"}),null);


__d("invariant",["ex","sprintf"],__annotator(function $module_invariant(global,require,requireDynamic,requireLazy,module,exports,ex,sprintf) {require.__markCompiled && require.__markCompiled();
'use strict';

   
   

var printingFunction = ex;
if (__DEV__) {
  printingFunction = sprintf; 
}



var invariant = __annotator(function(condition, format) {
  if (__DEV__) {
    if (format === (void 0)) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === (void 0)) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var messageWithParams = ['Invariant Violation: ' + format];
      for (var i = 2, l = arguments.length; i < l; i++) {
        messageWithParams.push(arguments[i]);
      }
      error = new Error(printingFunction.apply(null, messageWithParams));
      error.messageWithParams = messageWithParams;
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
}, {"module":"invariant","line":53,"column":16});

module.exports = invariant;


}, {"module":"invariant","line":31,"column":33,"name":"$module_invariant"}),null);


__d("sdk.feature",["JSSDKConfig","invariant"],__annotator(function $module_sdk_feature(global,require,requireDynamic,requireLazy,module,exports,SDKConfig,invariant) {require.__markCompiled && require.__markCompiled();
   

   


function feature(/*string*/ name        , defaultValue       )        {return __bodyWrapper(this, arguments, function() {
  invariant(
    arguments.length >= 2,
    'Default value is required'
  );
  if (SDKConfig.features && name in SDKConfig.features) {
    var value = SDKConfig.features[name];
    if (typeof value === 'object' && typeof value.rate === 'number') {
      if (value.rate && Math.random() * 100 <= value.rate) {
        return value.value || true;
      } else {
        return value.value ? null : false;
      }
    } else {
      return value;
    }
  }
  return defaultValue;
}, {"params":[[name, 'string', 'name']]});}__annotator(feature, {"module":"sdk.feature","line":20,"column":0,"name":"feature"}, {"params":["string"]});

module.exports = feature;


}, {"module":"sdk.feature","line":8,"column":46,"name":"$module_sdk_feature"}),null);


__d("sdk.getContextType",["sdk.Runtime","sdk.UA"],__annotator(function $module_sdk_getContextType(global,require,requireDynamic,requireLazy,module,exports,Runtime,UA) {require.__markCompiled && require.__markCompiled();
   
   

function getContextType() /*number*/ {return __bodyWrapper(this, arguments, function() {
  
  
  
  
  
  
  if (UA.nativeApp()) {
    return 3;
  }
  if (UA.mobile()) {
    return 2;
  }
  if (Runtime.isEnvironment(Runtime.ENVIRONMENTS.CANVAS)) {
    return 5;
  }
  return 1;
}, {"returns":'number'});}__annotator(getContextType, {"module":"sdk.getContextType","line":11,"column":0,"name":"getContextType"}, {"returns":"number"});

module.exports = getContextType;


}, {"module":"sdk.getContextType","line":7,"column":50,"name":"$module_sdk_getContextType"}),null);


__d("Log",["sprintf"],__annotator(function $module_Log(global,require,requireDynamic,requireLazy,module,exports,sprintf) {require.__markCompiled && require.__markCompiled();
   

var Level = {
  DEBUG    : 3,
  INFO     : 2,
  WARNING  : 1,
  ERROR    : 0
};

function log(/*string*/ name, /*number*/ level ) {return __bodyWrapper(this, arguments, function() {
  var args = Array.prototype.slice.call(arguments, 2);
  var msg = sprintf.apply(null, args);
  var console = window.console;
  if (console && Log.level >= level) {
    console[name in console ? name : 'log'](msg);
  }
}, {"params":[[name, 'string', 'name'], [level, 'number', 'level']]});}__annotator(log, {"module":"Log","line":38,"column":0,"name":"log"}, {"params":["string","number"]});

var Log = {
  
  level: __DEV__ ? 3 : -1,

  
  Level: Level,

  
  debug : ES(log, 'bind', true,null, 'debug', Level.DEBUG),
  info  : ES(log, 'bind', true,null, 'info',  Level.INFO),
  warn  : ES(log, 'bind', true,null, 'warn',  Level.WARNING),
  error : ES(log, 'bind', true,null, 'error', Level.ERROR)
};
module.exports = Log;



}, {"module":"Log","line":28,"column":22,"name":"$module_Log"}),null);

__d("sdk.domReady",[],__annotator(function $module_sdk_domReady(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var queue;
var domIsReady = "readyState" in document
  ? /loaded|complete/.test(document.readyState)
  
  
  
  
  
  : !!document.body;

function flush() {
  if (!queue) {
    return;
  }

  var fn;
  while (fn = queue.shift()) {
    fn();
  }
  queue = null;
}__annotator(flush, {"module":"sdk.domReady","line":18,"column":0,"name":"flush"});

function domReady(/*function*/ fn) {return __bodyWrapper(this, arguments, function() {
  if (queue) {
    queue.push(fn);
    return;
  } else {
    fn();
  }
}, {"params":[[fn, 'function', 'fn']]});}__annotator(domReady, {"module":"sdk.domReady","line":30,"column":0,"name":"domReady"}, {"params":["function"]});

if(!domIsReady) {
  queue = [];
  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', flush, false);
    window.addEventListener('load', flush, false);
  } else if (document.attachEvent) {
    document.attachEvent('onreadystatechange', flush);
    window.attachEvent('onload', flush);
  }

  
  
  if (document.documentElement.doScroll && window == window.top) {
    var test = __annotator(function() {
      try {
        
        
        document.documentElement.doScroll('left');
      } catch(error) {
        setTimeout(test, 0);
        return;
      }
      flush();
    }, {"module":"sdk.domReady","line":52,"column":15});
    test();
  }
}

module.exports = domReady;


}, {"module":"sdk.domReady","line":7,"column":25,"name":"$module_sdk_domReady"}),3);


__d("sdk.Content",["Log","sdk.UA","sdk.domReady"],__annotator(function $module_sdk_Content(global,require,requireDynamic,requireLazy,module,exports,Log,UA,domReady) {require.__markCompiled && require.__markCompiled();
   
   

   

var visibleRoot;
var hiddenRoot;

var Content = {

  
  append: __annotator(function(/*DOMElement|string*/ content, /*?DOMElement*/ root)
      /*DOMElement*/ {return __bodyWrapper(this, arguments, function() {

    
    if (!root) {
      if (!visibleRoot) {
        visibleRoot = root = document.getElementById('fb-root');
        if (!root) {
          Log.warn('The "fb-root" div has not been created, auto-creating');
          
          visibleRoot = root = document.createElement('div');
          root.id = 'fb-root';
          
          // that the body has loaded to avoid potential "operation aborted"
          
          
          
          
          if (UA.ie() || !document.body) {
            domReady(__annotator(function() {
              document.body.appendChild(root);
            }, {"module":"sdk.Content","line":44,"column":21}));
          } else {
            document.body.appendChild(root);
          }
        }
        root.className += ' fb_reset';
      } else {
        root = visibleRoot;
      }
    }

    if (typeof content == 'string') {
      var div = document.createElement('div');
      root.appendChild(div).innerHTML = content;
      return div;
    } else {
      return root.appendChild(content);
    }
  }, {"params":[[content, 'HTMLElement|string', 'content'], [root, '?HTMLElement', 'root']],"returns":'HTMLElement'});}, {"module":"sdk.Content","line":25,"column":10}, {"params":["DOMElement|string","?DOMElement"],"returns":"DOMElement"}),

  
  appendHidden: __annotator(function(/*DOMElement|string*/ content) /*DOMElement*/ {return __bodyWrapper(this, arguments, function() {
    if (!hiddenRoot) {
      var
        hiddenRoot = document.createElement('div'),
        style      = hiddenRoot.style;
      style.position = 'absolute';
      style.top      = '-10000px';
      style.width    = style.height = 0;
      hiddenRoot = Content.append(hiddenRoot);
    }

    return Content.append(content, hiddenRoot);
  }, {"params":[[content, 'HTMLElement|string', 'content']],"returns":'HTMLElement'});}, {"module":"sdk.Content","line":72,"column":16}, {"params":["DOMElement|string"],"returns":"DOMElement"}),

  
  submitToTarget: __annotator(function(/*object*/ opts, /*?boolean*/ get) {return __bodyWrapper(this, arguments, function() {
    var form = document.createElement('form');
    form.action = opts.url;
    form.target = opts.target;
    form.method = (get) ? 'GET' : 'POST';
    Content.appendHidden(form);

    for (var key in opts.params) {
      if (opts.params.hasOwnProperty(key)) {
        var val = opts.params[key];
        if (val !== null && val !== (void 0)) {
          var input = document.createElement('input');
          input.name = key;
          input.value = val;
          form.appendChild(input);
        }
      }
    }

    form.submit();
    form.parentNode.removeChild(form);
  }, {"params":[[opts, 'object', 'opts'], [get, '?boolean', 'get']]});}, {"module":"sdk.Content","line":98,"column":18}, {"params":["object","?boolean"]})
};

module.exports = Content;


}, {"module":"sdk.Content","line":7,"column":50,"name":"$module_sdk_Content"}),null);


__d("Miny",[],__annotator(function $module_Miny(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var MAGIC = 'Miny1';


var _indexMap = {encode: [], decode: {}};
var LO = 'wxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_'.split('');
function getIndexMap(length) {
  for (var i = _indexMap.encode.length; i < length; i++) {
    
    var s = i.toString(32).split('');
    s[s.length - 1] = LO[parseInt(s[s.length - 1], 32)];
    s = s.join('');

    _indexMap.encode[i] = s;
    _indexMap.decode[s] = i;
  }

  return _indexMap;
}__annotator(getIndexMap, {"module":"Miny","line":16,"column":0,"name":"getIndexMap"});


function encode(s) {
  if (/^$|[~\\]|__proto__/.test(s)) return s;

  
  var parts = s.match(/\w+|\W+/g);

  // Create dictionary we'll use to encode, but initialize it to part counts
  
  var dict = {};
  for (var i = 0; i < parts.length; i++) {
    dict[parts[i]] = (dict[parts[i]] || 0) + 1;
  }

  // Create array of part strings we'll use to decode, sort by frequency so
  
  var byCount = ES('Object', 'keys', false,dict);
  byCount.sort(__annotator(function(a,b) {
    return dict[a] < dict[b] ? 1 : (dict[b] < dict[a] ? -1 : 0);
  }, {"module":"Miny","line":47,"column":15}));

  
  var encodeMap = getIndexMap(byCount.length).encode;
  for (i = 0; i < byCount.length; i++) {
    dict[byCount[i]] = encodeMap[i];
  }

  
  var codes = [];
  for (i = 0; i < parts.length; i++) {
    codes[i] = dict[parts[i]];
  }

  return [MAGIC, byCount.length].
         concat(byCount).
         concat(codes.join('')).
         join('~');
}__annotator(encode, {"module":"Miny","line":31,"column":0,"name":"encode"});


function decode(s) {
  var fields = s.split('~');

  if (fields.shift() != MAGIC) {
    
    return s;
  }
  var nKeys = parseInt(fields.shift(), 10);
  var codes = fields.pop();
  codes = codes.match(/[0-9a-v]*[\-w-zA-Z_]/g);

  var dict = fields;

  var decodeMap = getIndexMap(nKeys).decode;
  var parts = [];
  for (var i = 0; i < codes.length; i++) {
    parts[i] = dict[decodeMap[codes[i]]];
  }

  return parts.join('');
}__annotator(decode, {"module":"Miny","line":70,"column":0,"name":"decode"});

var Miny = {
  encode: encode,
  decode: decode
};

module.exports = Miny;


}, {"module":"Miny","line":10,"column":14,"name":"$module_Miny"}),null);


__d("UrlMap",["UrlMapConfig"],__annotator(function $module_UrlMap(global,require,requireDynamic,requireLazy,module,exports,UrlMapConfig) {require.__markCompiled && require.__markCompiled();
   

var UrlMap = {
  
  resolve: __annotator(function(/*string*/ key, /*?boolean*/ https) /*string*/ {return __bodyWrapper(this, arguments, function() {
    var protocol = typeof https == 'undefined'
      ? location.protocol.replace(':', '')
      : https ? 'https' : 'http';

    
    if (key in UrlMapConfig) {
      return protocol + '://' + UrlMapConfig[key];
    }

    
    if (typeof https == 'undefined' && key + '_' + protocol in UrlMapConfig) {
      return protocol + '://' + UrlMapConfig[key + '_' + protocol];
    }

    
    if (https !== true && key + '_http' in UrlMapConfig) {
      return 'http://' + UrlMapConfig[key + '_http'];
    }

    
    if (https !== false && key + '_https' in UrlMapConfig) {
      return 'https://' + UrlMapConfig[key + '_https'];
    }
  }, {"params":[[key, 'string', 'key'], [https, '?boolean', 'https']],"returns":'string'});}, {"module":"UrlMap","line":28,"column":11}, {"params":["string","?boolean"],"returns":"string"})
};

module.exports = UrlMap;


}, {"module":"UrlMap","line":16,"column":30,"name":"$module_UrlMap"}),null);


__d("dotAccess",[],__annotator(function $module_dotAccess(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
function dotAccess(head, path, create) {
  var stack = path.split('.');
  do {
    var key = stack.shift();
    head = head[key] || create && (head[key] = {});
  } while(stack.length && head);
  return head;
}__annotator(dotAccess, {"module":"dotAccess","line":33,"column":0,"name":"dotAccess"});

module.exports = dotAccess;


}, {"module":"dotAccess","line":32,"column":19,"name":"$module_dotAccess"}),null);


__d("GlobalCallback",["DOMWrapper","dotAccess","guid","wrapFunction"],__annotator(function $module_GlobalCallback(global,require,requireDynamic,requireLazy,module,exports,DOMWrapper,dotAccess,guid,wrapFunction) {require.__markCompiled && require.__markCompiled();
   
   
   
   

// window is the same as the 'global' object in the browser, but the variable
// 'global' might be shadowed.
var rootObject;
var callbackPrefix;

var GlobalCallback = {

  setPrefix: __annotator(function(/*string*/ prefix) {return __bodyWrapper(this, arguments, function() {
    rootObject = dotAccess(DOMWrapper.getWindow(), prefix, true);
    callbackPrefix = prefix;
  }, {"params":[[prefix, 'string', 'prefix']]});}, {"module":"GlobalCallback","line":37,"column":13}, {"params":["string"]}),

  create: __annotator(function(/*function*/ fn, /*?string*/ description) /*string*/ {return __bodyWrapper(this, arguments, function() {
    if (!rootObject) {
      
      
      this.setPrefix('__globalCallbacks');
    }
    var id = guid();
    rootObject[id] = wrapFunction(fn, 'entry', description || 'GlobalCallback');

    return callbackPrefix + '.' + id;
  }, {"params":[[fn, 'function', 'fn'], [description, '?string', 'description']],"returns":'string'});}, {"module":"GlobalCallback","line":42,"column":10}, {"params":["function","?string"],"returns":"string"}),

  remove: __annotator(function(/*string*/ name) {return __bodyWrapper(this, arguments, function() {
    var id = name.substring(callbackPrefix.length + 1);
    delete rootObject[id];
  }, {"params":[[name, 'string', 'name']]});}, {"module":"GlobalCallback","line":54,"column":10}, {"params":["string"]})

};

module.exports = GlobalCallback;


}, {"module":"GlobalCallback","line":24,"column":70,"name":"$module_GlobalCallback"}),null);


__d("insertIframe",["GlobalCallback","getBlankIframeSrc","guid"],__annotator(function $module_insertIframe(global,require,requireDynamic,requireLazy,module,exports,GlobalCallback,getBlankIframeSrc,guid) {require.__markCompiled && require.__markCompiled();
   

   
   

function insertIframe(/*object*/ opts) {return __bodyWrapper(this, arguments, function() {

  
  
  


  opts.id = opts.id || guid();
  opts.name = opts.name || guid();

  
  // browsers (e.g. Webkit) appear to try to do the "right thing" and will fire
  
  
  
  var srcSet = false;
  var onloadDone = false;
  var callback = __annotator(function() {
    if (srcSet && !onloadDone) {
      onloadDone = true;
      opts.onload && opts.onload(opts.root.firstChild);
    }
  }, {"module":"insertIframe","line":45,"column":17});
  var globalCallback = GlobalCallback.create(callback);


  
  
  // Dear Webkit, you're okay. Works either way.

  if (document.attachEvent) {
    
    
    var html = (
      '<iframe' +
        ' id="' + opts.id + '"' +
        ' name="' + opts.name + '"' +
        (opts.title ? ' title="' + opts.title + '"' : '') +
        (opts.className ? ' class="' + opts.className + '"' : '') +
        ' style="border:none;' +
        (opts.width ? 'width:' + opts.width + 'px;' : '') +
        (opts.height ? 'height:' + opts.height + 'px;' : '') +
        '"' +
        ' src="' + getBlankIframeSrc() + '"' +
        ' frameborder="0"' +
        ' scrolling="no"' +
        ' allowtransparency="true"' +
        ' onload="' + globalCallback + '()"' +
        '></iframe>'
    );

    
    
    // actually sets the content to the HTML we created above, and because it's
    
    
    
    // the string 'false', we set the iframe height to 1px so that it gets
    
    opts.root.innerHTML = (
      '<iframe src="' + getBlankIframeSrc() + '"' +
        ' frameborder="0"' +
        ' scrolling="no"' +
        ' style="height:1px"></iframe>'
    );

    // Now we'll be setting the real src.
    srcSet = true;

    
    
    
    
    
    setTimeout(__annotator(function() {
      opts.root.innerHTML = html;
      opts.root.firstChild.src = opts.url;
      opts.onInsert && opts.onInsert(opts.root.firstChild);
    }, {"module":"insertIframe","line":102,"column":15}), 0);

  } else {
    // This block works for all non-IE browsers, but it's specifically designed
    
    
    var node = document.createElement('iframe');
    node.id = opts.id;
    node.name = opts.name;
    node.onload = callback;
    node.scrolling = 'no';
    node.style.border = 'none';
    node.style.overflow = 'hidden';
    if (opts.title) {
      node.title = opts.title;
    }
    if (opts.className) {
      node.className = opts.className;
    }
    if (opts.height !== (void 0)) {
      node.style.height = opts.height + 'px';
    }
    if (opts.width !== (void 0)) {
      if (opts.width == '100%') {
        node.style.width = opts.width;
      } else {
        node.style.width = opts.width + 'px';
      }
    }
    opts.root.appendChild(node);

    // Now we'll be setting the real src.
    srcSet = true;

    node.src = opts.url;
    opts.onInsert && opts.onInsert(node);
  }
}, {"params":[[opts, 'object', 'opts']]});}__annotator(insertIframe, {"module":"insertIframe","line":28,"column":0,"name":"insertIframe"}, {"params":["object"]});

module.exports = insertIframe;


}, {"module":"insertIframe","line":22,"column":65,"name":"$module_insertIframe"}),null);


__d("sdk.Impressions",["sdk.Content","Miny","QueryString","sdk.Runtime","UrlMap","getBlankIframeSrc","guid","insertIframe"],__annotator(function $module_sdk_Impressions(global,require,requireDynamic,requireLazy,module,exports,Content,Miny,QueryString,Runtime,UrlMap,getBlankIframeSrc,guid,insertIframe) {require.__markCompiled && require.__markCompiled();
   
   
   
   
   

   
   
   

function request(/*object*/ params) {return __bodyWrapper(this, arguments, function() {
  var clientID = Runtime.getClientID();

  if (!params.api_key && clientID) {
    params.api_key = clientID;
  }

  params.kid_directed_site = Runtime.getKidDirectedSite();

  var url = UrlMap.resolve('www', /*force ssl*/true) +
    '/impression.php/' + guid() + '/';
  var fullUrlPath = QueryString.appendToUrl(url, params);
  if (fullUrlPath.length > 2000) {
    
    
    if (params.payload && typeof params.payload === 'string') {
      var minyPayload = Miny.encode(params.payload);
      if (minyPayload && minyPayload.length < params.payload.length) {
        params.payload = minyPayload;
        fullUrlPath = QueryString.appendToUrl(url, params);
      }
    }
  }

  if (fullUrlPath.length <= 2000) {
    var image = new Image();
    image.src = fullUrlPath;
  } else {
    
    var name = guid();
    var root = Content.appendHidden('');
    insertIframe({
      url: getBlankIframeSrc(),
      root: root,
      name: name,
      className: 'fb_hidden fb_invisible',
      onload: __annotator(function() {
        root.parentNode.removeChild(root);
      }, {"module":"sdk.Impressions","line":54,"column":14})
    });

    Content.submitToTarget({
      url: url,
      target: name,
      params: params
    });
  }
}, {"params":[[params, 'object', 'params']]});}__annotator(request, {"module":"sdk.Impressions","line":18,"column":0,"name":"request"}, {"params":["object"]});

var Impressions = {
  log: __annotator(function(/*number*/ lid, /*object*/ payload) {return __bodyWrapper(this, arguments, function() {
    if (!payload.source) {
      payload.source = 'jssdk';
    }

    request({
      lid: lid, 
      payload: ES('JSON', 'stringify', false,payload)
    });
  }, {"params":[[lid, 'number', 'lid'], [payload, 'object', 'payload']]});}, {"module":"sdk.Impressions","line":68,"column":7}, {"params":["number","object"]}),

  impression: request
};

module.exports = Impressions;


}, {"module":"sdk.Impressions","line":7,"column":124,"name":"$module_sdk_Impressions"}),null);


__d("Base64",[],__annotator(function $module_Base64(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();



var en =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function en3(c) {
  c = (c.charCodeAt(0) << 16) | (c.charCodeAt(1) << 8) | c.charCodeAt(2);
  return String.fromCharCode(
    en.charCodeAt(c >>> 18), en.charCodeAt((c >>> 12) & 63),
    en.charCodeAt((c >>> 6) & 63), en.charCodeAt(c & 63));
}__annotator(en3, {"module":"Base64","line":34,"column":0,"name":"en3"});


// Position 0 corresponds to '+' (ASCII 43), and underscores are padding.
// The octal sequence \13 is used because IE doesn't recognize \v
var de =
  '>___?456789:;<=_______' +
  '\0\1\2\3\4\5\6\7\b\t\n\13\f\r\16\17\20\21\22\23\24\25\26\27\30\31' +
  '______\32\33\34\35\36\37 !"#$%&\'()*+,-./0123';
function de4(c) {
  c = (de.charCodeAt(c.charCodeAt(0) - 43) << 18) |
      (de.charCodeAt(c.charCodeAt(1) - 43) << 12) |
      (de.charCodeAt(c.charCodeAt(2) - 43) <<  6) |
       de.charCodeAt(c.charCodeAt(3) - 43);
  return String.fromCharCode(c >>> 16, (c >>> 8) & 255, c & 255);
}__annotator(de4, {"module":"Base64","line":48,"column":0,"name":"de4"});

var Base64 = {
  encode: __annotator(function(s) {
    
    s = unescape(encodeURI(s));
    var i = (s.length + 2) % 3;
    s = (s + '\0\0'.slice(i)).replace(/[\s\S]{3}/g, en3);
    return s.slice(0, s.length + i - 2) + '=='.slice(i);
  }, {"module":"Base64","line":57,"column":10}),
  decode: __annotator(function(s) {
    
    s = s.replace(/[^A-Za-z0-9+\/]/g, '');
    var i = (s.length + 3) & 3;
    s = (s + 'AAA'.slice(i)).replace(/..../g, de4);
    s = s.slice(0, s.length + i - 3);
    
    try { return decodeURIComponent(escape(s)); }
    catch (_) { throw new Error('Not valid UTF-8'); }
  }, {"module":"Base64","line":64,"column":10}),
  encodeObject: __annotator(function(obj) {
    return Base64.encode(ES('JSON', 'stringify', false,obj));
  }, {"module":"Base64","line":74,"column":16}),
  decodeObject: __annotator(function(b64) {
    return ES('JSON', 'parse', false,Base64.decode(b64));
  }, {"module":"Base64","line":77,"column":16}),
  
  encodeNums: __annotator(function(l) {
    return String.fromCharCode.apply(String, ES(l, 'map', true,__annotator(function(val) {
      return en.charCodeAt((val | -(val > 63)) & -(val > 0) & 63);
    }, {"module":"Base64","line":82,"column":51})));
  }, {"module":"Base64","line":81,"column":14})
};

module.exports = Base64;


}, {"module":"Base64","line":19,"column":16,"name":"$module_Base64"}),null);


__d("sdk.SignedRequest",["Base64"],__annotator(function $module_sdk_SignedRequest(global,require,requireDynamic,requireLazy,module,exports,Base64) {require.__markCompiled && require.__markCompiled();
   

function parse(/*?string*/ signed_request) /*?object*/ {return __bodyWrapper(this, arguments, function() {
  if (!signed_request) {
    return null;
  }

  
  var payload = signed_request.split('.', 2)[1]
    .replace(/\-/g, '+').replace(/\_/g, '/');
  return Base64.decodeObject(payload);
}, {"params":[[signed_request, '?string', 'signed_request']],"returns":'?object'});}__annotator(parse, {"module":"sdk.SignedRequest","line":17,"column":0,"name":"parse"}, {"params":["?string"],"returns":"?object"});


var SignedRequest = {
  parse: parse
};

module.exports = SignedRequest;


}, {"module":"sdk.SignedRequest","line":14,"column":35,"name":"$module_sdk_SignedRequest"}),null);


__d("URIRFC3986",[],__annotator(function $module_URIRFC3986(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var PARSE_PATTERN = new RegExp(
  '^'+
  '([^:/?#]+:)?'+                
  '(//'+                         
    '([^\\\\/?#@]*@)?'+          
    '('+                         
      '\\[[A-Fa-f0-9:.]+\\]|'+   
      '[^\\/?#:]*'+              
    ')'+                         
    '(:[0-9]*)?'+                
  ')?'+                          
  '([^?#]*)'+                    
  '(\\?[^#]*)?'+                 
  '(#.*)?'                       
);


var URIRFC3986 = {

  
  parse: __annotator(function(uriString) {return __bodyWrapper(this, arguments, function() {
    if (ES(uriString,'trim', true) === '') {
      return null;
    }
    var captures = uriString.match(PARSE_PATTERN);
    var uri = {};
    
    // other browsers return undefined. This means there's no way to
    
    
    uri.uri = captures[0] ? captures[0] : null;
    uri.scheme = captures[1] ?
      captures[1].substr(0, captures[1].length - 1) :
      null;
    uri.authority = captures[2] ? captures[2].substr(2) : null;
    uri.userinfo = captures[3] ?
      captures[3].substr(0, captures[3].length - 1) :
      null;
    uri.host = captures[2] ? captures[4] : null;
    uri.port = captures[5] ?
      (captures[5].substr(1) ? parseInt(captures[5].substr(1), 10) : null) :
      null;
    uri.path = captures[6] ? captures[6] : null;
    uri.query = captures[7] ? captures[7].substr(1) : null;
    uri.fragment = captures[8] ? captures[8].substr(1) : null;
    uri.isGenericURI = uri.authority === null && !!uri.scheme;
    return uri;
  }, {"params":[[uriString, 'string', 'uriString']],"returns":'?object'});}, {"module":"URIRFC3986","line":52,"column":9}, {"params":["string"],"returns":"?object"})
};

module.exports = URIRFC3986;


}, {"module":"URIRFC3986","line":20,"column":20,"name":"$module_URIRFC3986"}),null);


__d("createObjectFrom",[],__annotator(function $module_createObjectFrom(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();

function createObjectFrom(keys, values ) {
  if (__DEV__) {
    if (!ES('Array', 'isArray', false,keys)) {
      throw new TypeError('Must pass an array of keys.');
    }
  }

  var object = {};
  var isArray = ES('Array', 'isArray', false,values);
  if (typeof values == 'undefined') {
    values = true;
  }

  for (var ii = keys.length; ii--;) {
    object[keys[ii]] = isArray ? values[ii] : values;
  }
  return object;
}__annotator(createObjectFrom, {"module":"createObjectFrom","line":43,"column":0,"name":"createObjectFrom"});

module.exports = createObjectFrom;


}, {"module":"createObjectFrom","line":19,"column":26,"name":"$module_createObjectFrom"}),null);


__d("URISchemes",["createObjectFrom"],__annotator(function $module_URISchemes(global,require,requireDynamic,requireLazy,module,exports,createObjectFrom) {require.__markCompiled && require.__markCompiled();
   

var defaultSchemes = createObjectFrom([
  'fb',        
  'fb-ama',    
  'fb-messenger', 
  'fbcf',
  'fbconnect', 
  'fbmobilehome', 
  'fbrpc',
  'file',
  'ftp',
  'http',
  'https',
  'mailto',
  'ms-app',    
  'itms',      
  'itms-apps', 
  'itms-services', 
  'market',    
  'svn+ssh',   
  'fbstaging', 
  'tel',       
  'sms',       
  'pebblejs',  
  'sftp'      
]);

var URISchemes = {

  
  isAllowed: __annotator(function(schema) {return __bodyWrapper(this, arguments, function() {
    if (!schema) {
      return true;
    }
    return defaultSchemes.hasOwnProperty(schema.toLowerCase());
  }, {"params":[[schema, '?string', 'schema']],"returns":'boolean'});}, {"module":"URISchemes","line":55,"column":13}, {"params":["?string"],"returns":"boolean"})
};

module.exports = URISchemes;


}, {"module":"URISchemes","line":20,"column":38,"name":"$module_URISchemes"}),null);


__d("copyProperties",[],__annotator(function $module_copyProperties(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();

function copyProperties(obj, a, b, c, d, e, f) {
  obj = obj || {};

  if (__DEV__) {
    if (f) {
      throw new Error('Too many arguments passed to copyProperties');
    }
  }

  var args = [a, b, c, d, e];
  var ii = 0, v;
  while (args[ii]) {
    v = args[ii++];
    for (var k in v) {
      obj[k] = v[k];
    }

    
    
    if (v.hasOwnProperty && v.hasOwnProperty('toString') &&
        (typeof v.toString != 'undefined') && (obj.toString !== v.toString)) {
      obj.toString = v.toString;
    }
  }

  return obj;
}__annotator(copyProperties, {"module":"copyProperties","line":27,"column":0,"name":"copyProperties"});

module.exports = copyProperties;


}, {"module":"copyProperties","line":19,"column":24,"name":"$module_copyProperties"}),null);


__d("URIBase",["URIRFC3986","URISchemes","copyProperties","ex","invariant"],__annotator(function $module_URIBase(global,require,requireDynamic,requireLazy,module,exports,URIRFC3986,URISchemes,copyProperties,ex,invariant) {require.__markCompiled && require.__markCompiled();
   
   
   
   
   


var UNSAFE_DOMAIN_PATTERN = new RegExp(
  
  
  '[\\x00-\\x2c\\x2f\\x3b-\\x40\\x5c\\x5e\\x60\\x7b-\\x7f' +
    
    '\\uFDD0-\\uFDEF\\uFFF0-\\uFFFF' +
    
    '\\u2047\\u2048\\uFE56\\uFE5F\\uFF03\\uFF0F\\uFF1F]');


var SECURITY_PATTERN = new RegExp(
  // URI has a ":" before the first "/"
  '^(?:[^/]*:|' +
  
  '[\\x00-\\x1f]*/[\\x00-\\x1f]*/)');


function parse(uri, uriToParse, shouldThrow, serializer) {
  if (!uriToParse) {
    return true;
  }

  
  if (uriToParse instanceof URIBase) {
    uri.setProtocol(uriToParse.getProtocol());
    uri.setDomain(uriToParse.getDomain());
    uri.setPort(uriToParse.getPort());
    uri.setPath(uriToParse.getPath());
    uri.setQueryData(
      serializer.deserialize(
        serializer.serialize(uriToParse.getQueryData())
      )
    );
    uri.setFragment(uriToParse.getFragment());
    uri.setForceFragmentSeparator(uriToParse.getForceFragmentSeparator());
    return true;
  }

  uriToParse = ES(uriToParse.toString(),'trim', true);
  var components = URIRFC3986.parse(uriToParse) || {};
  if (!shouldThrow && !URISchemes.isAllowed(components.scheme)) {
    return false;
  }
  uri.setProtocol(components.scheme || '');
  if (!shouldThrow && UNSAFE_DOMAIN_PATTERN.test(components.host)) {
    return false;
  }
  uri.setDomain(components.host || '');
  uri.setPort(components.port || '');
  uri.setPath(components.path || '');
  if (shouldThrow) {
    uri.setQueryData(serializer.deserialize(components.query) || {});
  } else {
    try {
      uri.setQueryData(serializer.deserialize(components.query) || {});
    } catch (err) {
      return false;
    }
  }
  uri.setFragment(components.fragment || '');
  
  
  if (components.fragment === '') {
    uri.setForceFragmentSeparator(true);
  }

  if (components.userinfo !== null) {
    if (shouldThrow) {
        throw new Error(ex(
          'URI.parse: invalid URI (userinfo is not allowed in a URI): %s',
          uri.toString()
        ));
    } else {
      return false;
    }
  }

  
  
  if (!uri.getDomain() && ES(uri.getPath(), 'indexOf', true,'\\') !== -1) {
    if (shouldThrow) {
      throw new Error(ex(
        'URI.parse: invalid URI (no domain but multiple back-slashes): %s',
        uri.toString()
      ));
    } else {
      return false;
    }
  }

  
  
  if (!uri.getProtocol() && SECURITY_PATTERN.test(uriToParse)) {
    if (shouldThrow) {
      throw new Error(ex(
        'URI.parse: invalid URI (unsafe protocol-relative URLs): %s',
        uri.toString()
      ));
    } else {
      return false;
    }
  }
  return true;
}__annotator(parse, {"module":"URIBase","line":56,"column":0,"name":"parse"});


var uriFilters = [];




  
  function URIBase(uri, serializer) {"use strict";
    invariant(serializer, 'no serializer set');
    this.$URIBase_serializer = serializer;

    this.$URIBase_protocol = '';
    this.$URIBase_domain = '';
    this.$URIBase_port = '';
    this.$URIBase_path = '';
    this.$URIBase_fragment = '';
    this.$URIBase_queryData = {};
    this.$URIBase_forceFragmentSeparator = false;
    parse(this, uri, true, serializer);
  }__annotator(URIBase, {"module":"URIBase","line":180,"column":2,"name":"URIBase"});

  
  URIBase.prototype.setProtocol=__annotator(function(protocol) {"use strict";
    invariant(
      URISchemes.isAllowed(protocol),
      '"%s" is not a valid protocol for a URI.', protocol
    );
    this.$URIBase_protocol = protocol;
    return this;
  }, {"module":"URIBase","line":200,"column":32});

  
  URIBase.prototype.getProtocol=__annotator(function(protocol) {"use strict";
    return this.$URIBase_protocol;
  }, {"module":"URIBase","line":214,"column":32});

  
  URIBase.prototype.setSecure=__annotator(function(secure) {"use strict";
    return this.setProtocol(secure ? 'https' : 'http');
  }, {"module":"URIBase","line":224,"column":30});

  
  URIBase.prototype.isSecure=__annotator(function() {"use strict";
    return this.getProtocol() === 'https';
  }, {"module":"URIBase","line":233,"column":29});

  
  URIBase.prototype.setDomain=__annotator(function(domain) {"use strict";
    
    if (UNSAFE_DOMAIN_PATTERN.test(domain)) {
      throw new Error(ex(
        'URI.setDomain: unsafe domain specified: %s for url %s',
        domain,
        this.toString()
      ));
    }

    this.$URIBase_domain = domain;
    return this;
  }, {"module":"URIBase","line":243,"column":30});

  
  URIBase.prototype.getDomain=__annotator(function() {"use strict";
    return this.$URIBase_domain;
  }, {"module":"URIBase","line":265,"column":30});

  
  URIBase.prototype.setPort=__annotator(function(port) {"use strict";
    this.$URIBase_port = port;
    return this;
  }, {"module":"URIBase","line":275,"column":28});

  
  URIBase.prototype.getPort=__annotator(function() {"use strict";
    return this.$URIBase_port;
  }, {"module":"URIBase","line":285,"column":28});

  
  URIBase.prototype.setPath=__annotator(function(path) {"use strict";
    if (__DEV__) {
      if (path && path.charAt(0) !== '/') {
        console.warn('Path does not begin with a "/" which means this URI ' +
          'will likely be malformed. Ensure any string passed to .setPath() ' +
          'leads with "/"');
      }
    }
    this.$URIBase_path = path;
    return this;
  }, {"module":"URIBase","line":295,"column":28});

  
  URIBase.prototype.getPath=__annotator(function() {"use strict";
    return this.$URIBase_path;
  }, {"module":"URIBase","line":312,"column":28});

  
  URIBase.prototype.addQueryData=__annotator(function(mapOrKey, value) {"use strict";
    // Don't use instanceof, as it doesn't work across windows
    if (Object.prototype.toString.call(mapOrKey) === '[object Object]') {
      copyProperties(this.$URIBase_queryData, mapOrKey);
    } else {
      this.$URIBase_queryData[mapOrKey] = value;
    }
    return this;
  }, {"module":"URIBase","line":323,"column":33});

  
  URIBase.prototype.setQueryData=__annotator(function(map) {"use strict";
    this.$URIBase_queryData = map;
    return this;
  }, {"module":"URIBase","line":340,"column":33});

  
  URIBase.prototype.getQueryData=__annotator(function() {"use strict";
    return this.$URIBase_queryData;
  }, {"module":"URIBase","line":350,"column":33});

  
  URIBase.prototype.removeQueryData=__annotator(function(keys) {"use strict";
    if (!ES('Array', 'isArray', false,keys)) {
      keys = [keys];
    }
    for (var i = 0, length = keys.length; i < length; ++i) {
      delete this.$URIBase_queryData[keys[i]];
    }
    return this;
  }, {"module":"URIBase","line":360,"column":36});

  
  URIBase.prototype.setFragment=__annotator(function(fragment) {"use strict";
    this.$URIBase_fragment = fragment;
    // fragment was updated - we don't care about forcing separator
    this.setForceFragmentSeparator(false);
    return this;
  }, {"module":"URIBase","line":376,"column":32});

  
  URIBase.prototype.getFragment=__annotator(function() {"use strict";
    return this.$URIBase_fragment;
  }, {"module":"URIBase","line":388,"column":32});


  
  URIBase.prototype.setForceFragmentSeparator=__annotator(function(shouldForce) {"use strict";
    this.$URIBase_forceFragmentSeparator = shouldForce;
    return this;
  }, {"module":"URIBase","line":407,"column":46});

  
  URIBase.prototype.getForceFragmentSeparator=__annotator(function() {"use strict";
    return this.$URIBase_forceFragmentSeparator;
  }, {"module":"URIBase","line":418,"column":46});

  
  URIBase.prototype.isEmpty=__annotator(function() {"use strict";
    return !(
      this.getPath() ||
      this.getProtocol() ||
      this.getDomain() ||
      this.getPort() ||
      ES('Object', 'keys', false,this.getQueryData()).length > 0 ||
      this.getFragment()
    );
  }, {"module":"URIBase","line":427,"column":28});

 
  URIBase.prototype.toString=__annotator(function() {"use strict";
    var uri = this;
    for (var i = 0; i < uriFilters.length; i++) {
      uri = uriFilters[i](uri);
    }
    return uri.$URIBase_toStringImpl();
  }, {"module":"URIBase","line":443,"column":29});

  
  URIBase.prototype.$URIBase_toStringImpl=__annotator(function() {"use strict";
    var str = '';
    var protocol = this.getProtocol();
    if (protocol) {
      str += protocol + '://';
    }
    var domain = this.getDomain();
    if (domain) {
      str += domain;
    }
    var port = this.getPort();
    if (port) {
      str += ':' + port;
    }
    // If there is a protocol, domain or port, we need to provide '/' for the
    // path. If we don't have either and also don't have a path, we can omit
    
    // with "?", "#", or is empty.
    var path = this.getPath();
    if (path) {
      str += path;
    } else if (str) {
      str += '/';
    }
    var queryStr = this.$URIBase_serializer.serialize(this.getQueryData());
    if (queryStr) {
      str += '?' + queryStr;
    }
    var fragment = this.getFragment();
    if (fragment) {
      str += '#' + fragment;
    } else if (this.getForceFragmentSeparator()) {
      str += '#';
    }
    return str;
  }, {"module":"URIBase","line":457,"column":42});

  
  URIBase.registerFilter=__annotator(function(filter) {"use strict";
    uriFilters.push(filter);
  }, {"module":"URIBase","line":501,"column":25});

  
  URIBase.prototype.getOrigin=__annotator(function() {"use strict";
    var port = this.getPort();
    return this.getProtocol()
      + '://'
      + this.getDomain()
      + (port ? ':' + port : '');
  }, {"module":"URIBase","line":509,"column":30});



URIBase.isValidURI = __annotator(function(uri, serializer) {
  return parse(new URIBase(null, serializer), uri, false, serializer);
}, {"module":"URIBase","line":528,"column":21});

module.exports = URIBase;


}, {"module":"URIBase","line":19,"column":76,"name":"$module_URIBase"}),null);


__d("sdk.URI",["Assert","QueryString","URIBase"],__annotator(function $module_sdk_URI(global,require,requireDynamic,requireLazy,module,exports,Assert,QueryString,URIBase) {require.__markCompiled && require.__markCompiled();
   
   
   

var facebookRe = /\.facebook\.com$/;

var serializer = {
  serialize: __annotator(function(map) {
    return map
      ? QueryString.encode(map)
      : '';
  }, {"module":"sdk.URI","line":27,"column":13}),
  deserialize: __annotator(function(text) {
    return text
      ? QueryString.decode(text)
      : {};
  }, {"module":"sdk.URI","line":32,"column":15})
};

for(var URIBase____Key in URIBase){if(URIBase.hasOwnProperty(URIBase____Key)){URI[URIBase____Key]=URIBase[URIBase____Key];}}var ____SuperProtoOfURIBase=URIBase===null?null:URIBase.prototype;URI.prototype=ES('Object', 'create', false,____SuperProtoOfURIBase);URI.prototype.constructor=URI;URI.__superConstructor__=URIBase;
  function URI(uri) {"use strict";
    Assert.isString(uri, 'The passed argument was of invalid type.');

    if (!(this instanceof URI)) {
      return new URI(uri);
    }

    URIBase.call(this,uri, serializer);
  }__annotator(URI, {"module":"sdk.URI","line":40,"column":2,"name":"URI"});

  URI.prototype.isFacebookURI=__annotator(function() /*boolean*/ {return __bodyWrapper(this, arguments, function() {"use strict";
    return facebookRe.test(this.getDomain());
  }, {"returns":'boolean'});}, {"module":"sdk.URI","line":50,"column":30}, {"returns":"boolean"});

  URI.prototype.valueOf=__annotator(function() /*string*/ {return __bodyWrapper(this, arguments, function() {"use strict";
    return this.toString();
  }, {"returns":'string'});}, {"module":"sdk.URI","line":54,"column":24}, {"returns":"string"});


module.exports = URI;


}, {"module":"sdk.URI","line":19,"column":49,"name":"$module_sdk_URI"}),null);


__d("sdk.Event",[],__annotator(function $module_sdk_Event(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var Event = {

  SUBSCRIBE: 'event.subscribe',
  UNSUBSCRIBE: 'event.unsubscribe',

  
  subscribers: __annotator(function() /*object*/ {return __bodyWrapper(this, arguments, function() {
    
    
    
    
    if (!this._subscribersMap) {
      this._subscribersMap = {};
    }
    return this._subscribersMap;
  }, {"returns":'object'});}, {"module":"sdk.Event","line":19,"column":15}, {"returns":"object"}),

  
  subscribe: __annotator(function(/*string*/ name, /*function*/ cb) {return __bodyWrapper(this, arguments, function() {
    var subs = this.subscribers();

    if (!subs[name]) {
      subs[name] = [cb];
    } else {
      if (ES(subs[name], 'indexOf', true,cb) == -1){
        subs[name].push(cb);
      }
    }
    if (name != this.SUBSCRIBE && name != this.UNSUBSCRIBE) {
      this.fire(this.SUBSCRIBE, name, subs[name]);
    }
  }, {"params":[[name, 'string', 'name'], [cb, 'function', 'cb']]});}, {"module":"sdk.Event","line":64,"column":13}, {"params":["string","function"]}),

  
  unsubscribe: __annotator(function(/*string*/ name, /*function*/ cb) {return __bodyWrapper(this, arguments, function() {
    var subs = this.subscribers()[name];
    if (subs) {
      ES(subs, 'forEach', true,__annotator(function(value, key) {
        if (value == cb) {
          subs.splice(key, 1);
        }
      }, {"module":"sdk.Event","line":101,"column":19}));
    }
    if (name != this.SUBSCRIBE && name != this.UNSUBSCRIBE) {
      this.fire(this.UNSUBSCRIBE, name, subs);
    }
  }, {"params":[[name, 'string', 'name'], [cb, 'function', 'cb']]});}, {"module":"sdk.Event","line":98,"column":15}, {"params":["string","function"]}),

  
  monitor: __annotator(function(/*string*/ name, /*function*/ callback) {return __bodyWrapper(this, arguments, function() {
    if (!callback()) {
      var
        ctx = this,
        fn = __annotator(function() {
          if (callback.apply(callback, arguments)) {
            ctx.unsubscribe(name, fn);
          }
        }, {"module":"sdk.Event","line":126,"column":13});

      this.subscribe(name, fn);
    }
  }, {"params":[[name, 'string', 'name'], [callback, 'function', 'callback']]});}, {"module":"sdk.Event","line":122,"column":11}, {"params":["string","function"]}),

  
  clear: __annotator(function(/*string*/ name) {return __bodyWrapper(this, arguments, function() {
    delete this.subscribers()[name];
  }, {"params":[[name, 'string', 'name']]});}, {"module":"sdk.Event","line":145,"column":9}, {"params":["string"]}),

  
  fire: __annotator(function(/*string*/ name) {return __bodyWrapper(this, arguments, function() {
    var
      args = Array.prototype.slice.call(arguments, 1),
      subs = this.subscribers()[name];

    if (subs) {
      ES(subs, 'forEach', true,__annotator(function(sub) {
        
        
        if (sub) {
          sub.apply(this, args);
        }
      }, {"module":"sdk.Event","line":161,"column":19}));
    }
  }, {"params":[[name, 'string', 'name']]});}, {"module":"sdk.Event","line":155,"column":8}, {"params":["string"]})
};

module.exports = Event;


}, {"module":"sdk.Event","line":7,"column":19,"name":"$module_sdk_Event"}),null);


__d("Queue",["copyProperties"],__annotator(function $module_Queue(global,require,requireDynamic,requireLazy,module,exports,copyProperties) {require.__markCompiled && require.__markCompiled();
   


var registry = {};


  
  function Queue(opts) {"use strict";
    
    this._opts = copyProperties({
      interval: 0,
      processor: null
    }, opts);

    
    this._queue = [];
    this._stopped = true;
  }__annotator(Queue, {"module":"Queue","line":46,"column":2,"name":"Queue"});

  
  Queue.prototype._dispatch=__annotator(function(force) {"use strict";
    if (this._stopped || this._queue.length === 0) {
      return;
    }
    if (!this._opts.processor) {
      this._stopped = true;
      throw new Error('No processor available');
    }

    if (this._opts.interval) {
      this._opts.processor.call(this, this._queue.shift());
      this._timeout = setTimeout(
        ES(this._dispatch, 'bind', true,this),
        this._opts.interval
      );
    } else {
      while(this._queue.length) {
        this._opts.processor.call(this, this._queue.shift());
      }
    }
  }, {"module":"Queue","line":65,"column":28});

  
  Queue.prototype.enqueue=__annotator(function(message) {"use strict";
    if (this._opts.processor && !this._stopped) {
      this._opts.processor.call(this, message);
    } else {
      this._queue.push(message);
    }
    return this;
  }, {"module":"Queue","line":95,"column":26});

  
  Queue.prototype.start=__annotator(function(processor) {"use strict";
    if (processor) {
      this._opts.processor = processor;
    }
    this._stopped = false;
    this._dispatch();
    return this;
  }, {"module":"Queue","line":111,"column":24});

  Queue.prototype.isStarted=__annotator(function() /*boolean*/ {"use strict";
    return !this._stopped;
  }, {"module":"Queue","line":120,"column":28});

  
  Queue.prototype.dispatch=__annotator(function() {"use strict";
    this._dispatch(true);
  }, {"module":"Queue","line":128,"column":27});

  
  Queue.prototype.stop=__annotator(function(scheduled) {"use strict";
    this._stopped = true;
    if (scheduled) {
      clearTimeout(this._timeout);
    }
    return this;
  }, {"module":"Queue","line":138,"column":23});

  
  Queue.prototype.merge=__annotator(function(queue, prepend) {"use strict";
    this._queue[prepend ? 'unshift' : 'push']
      .apply(this._queue, queue._queue);
    queue._queue = [];
    this._dispatch();
    return this;
  }, {"module":"Queue","line":154,"column":24});

  
  Queue.prototype.getLength=__annotator(function() {"use strict";
    return this._queue.length;
  }, {"module":"Queue","line":165,"column":28});

  
  Queue.get=__annotator(function(name, opts) {"use strict";
   var queue;
   if (name in registry) {
     queue = registry[name];
   } else {
    queue = registry[name] = new Queue(opts);
   }
   return queue;
  }, {"module":"Queue","line":177,"column":12});

  
  Queue.exists=__annotator(function(name) {"use strict";
    return name in registry;
  }, {"module":"Queue","line":193,"column":15});

  
  Queue.remove=__annotator(function(name) {"use strict";
    return delete registry[name];
  }, {"module":"Queue","line":204,"column":15});



module.exports = Queue;


}, {"module":"Queue","line":32,"column":31,"name":"$module_Queue"}),null);


__d("JSONRPC",["Log"],__annotator(function $module_JSONRPC(global,require,requireDynamic,requireLazy,module,exports,Log) {require.__markCompiled && require.__markCompiled();
   



  function JSONRPC(write) {"use strict";
    this.$JSONRPC_counter = 0;
    this.$JSONRPC_callbacks = {};

    this.remote = ES(__annotator(function(context)  {
      this.$JSONRPC_context = context;
      return this.remote;
    }, {"module":"JSONRPC","line":86,"column":18}), 'bind', true,this);

    this.local = {};

    this.$JSONRPC_write = write;
  }__annotator(JSONRPC, {"module":"JSONRPC","line":82,"column":2,"name":"JSONRPC"});

  
  JSONRPC.prototype.stub=__annotator(function(stub) {"use strict";
    this.remote[stub] = ES(__annotator(function()  {for (var args=[],$__0=0,$__1=arguments.length;$__0<$__1;$__0++) args.push(arguments[$__0]);
      var message = {
        jsonrpc: '2.0',
        method: stub
      };

      if (typeof args[args.length - 1] == 'function') {
        message.id = ++this.$JSONRPC_counter;
        this.$JSONRPC_callbacks[message.id] = args.pop();
      }

      message.params = args;

      this.$JSONRPC_write(ES('JSON', 'stringify', false,message), this.$JSONRPC_context || {method: stub });
    }, {"module":"JSONRPC","line":106,"column":24}), 'bind', true,this);
  }, {"module":"JSONRPC","line":105,"column":25});

  
  JSONRPC.prototype.read=__annotator(function(message, context) {"use strict";
    var rpc = ES('JSON', 'parse', false,message), id = rpc.id;

    if (!rpc.method) {
      
      if (!this.$JSONRPC_callbacks[id]) {
        Log.warn('Could not find callback %s', id);
        return;
      }
      var callback = this.$JSONRPC_callbacks[id];
      delete this.$JSONRPC_callbacks[id];

      delete rpc.id;
      delete rpc.jsonrpc;

      callback(rpc);
      return;
    }

    
    var instance = this, method = this.local[rpc.method], send;
    if (id) {
      
      send = __annotator(function(/*string*/ type, value) {return __bodyWrapper(this, arguments, function() {
        var response = {
          jsonrpc: '2.0',
          id: id
        };
        response[type] = value;

        
        
        setTimeout(__annotator(function() {
          instance.$JSONRPC_write(ES('JSON', 'stringify', false,response), context);
        }, {"module":"JSONRPC","line":165,"column":19}), 0);
      }, {"params":[[type, 'string', 'type']]});}, {"module":"JSONRPC","line":156,"column":13}, {"params":["string"]});
    } else {
      
      send = __annotator(function() {}, {"module":"JSONRPC","line":171,"column":13});
    }

    if (!method) {
      Log.error('Method "%s" has not been defined', rpc.method);

      send('error', {
        code: -32601,
        message: 'Method not found',
        data: rpc.method
      });
      return;
    }

    
    rpc.params.push(ES(send, 'bind', true,null, 'result'));
    rpc.params.push(ES(send, 'bind', true,null, 'error'));

    
    try {
      var returnValue = method.apply(context || null, rpc.params);
      
      if (typeof returnValue !== 'undefined') {
        send('result', returnValue);
      }
    } catch(rpcEx) {
      Log.error('Invokation of RPC method %s resulted in the error: %s',
        rpc.method, rpcEx.message);

      send('error', {
        code: -32603,
        message: 'Internal error',
        data: rpcEx.message
      });
    }
  }, {"module":"JSONRPC","line":133,"column":25});


module.exports = JSONRPC;


}, {"module":"JSONRPC","line":77,"column":22,"name":"$module_JSONRPC"}),null);


__d("sdk.RPC",["Assert","JSONRPC","Queue"],__annotator(function $module_sdk_RPC(global,require,requireDynamic,requireLazy,module,exports,Assert,JSONRPC,Queue) {require.__markCompiled && require.__markCompiled();
   
   
   

var outQueue = new Queue();
var jsonrpc = new JSONRPC(__annotator(function(/*string*/ message) {return __bodyWrapper(this, arguments, function() {
  outQueue.enqueue(message);
}, {"params":[[message, 'string', 'message']]});}, {"module":"sdk.RPC","line":13,"column":26}, {"params":["string"]}));

var RPC = {
  local: jsonrpc.local,
  remote: jsonrpc.remote,
  stub: ES(jsonrpc.stub, 'bind', true,jsonrpc),
  setInQueue: __annotator(function(/*object*/ queue) {return __bodyWrapper(this, arguments, function() {
    Assert.isInstanceOf(Queue, queue);

    queue.start(__annotator(function(/*string*/ message) {return __bodyWrapper(this, arguments, function() {
      jsonrpc.read(message);
    }, {"params":[[message, 'string', 'message']]});}, {"module":"sdk.RPC","line":24,"column":16}, {"params":["string"]}));
  }, {"params":[[queue, 'object', 'queue']]});}, {"module":"sdk.RPC","line":21,"column":14}, {"params":["object"]}),
  getOutQueue: __annotator(function() /*object*/ {return __bodyWrapper(this, arguments, function() {
    return outQueue;
  }, {"returns":'object'});}, {"module":"sdk.RPC","line":28,"column":15}, {"returns":"object"})
};

module.exports = RPC;


}, {"module":"sdk.RPC","line":7,"column":43,"name":"$module_sdk_RPC"}),null);

__d("sdk.Scribe",["QueryString","sdk.Runtime","UrlMap"],__annotator(function $module_sdk_Scribe(global,require,requireDynamic,requireLazy,module,exports,QueryString,Runtime,UrlMap) {require.__markCompiled && require.__markCompiled();
   
   
   

function log(/*string*/ category, /*object*/ data) {return __bodyWrapper(this, arguments, function() {
  if (typeof data.extra == 'object') {
    data.extra.revision = Runtime.getRevision();
  }
  (new Image()).src = QueryString.appendToUrl(
    UrlMap.resolve('www', /*force ssl*/true) + '/common/scribe_endpoint.php',
    {
      c: category,
      m: ES('JSON', 'stringify', false,data)
    }
  );
}, {"params":[[category, 'string', 'category'], [data, 'object', 'data']]});}__annotator(log, {"module":"sdk.Scribe","line":11,"column":0,"name":"log"}, {"params":["string","object"]});

var Scribe = {
  log: log
};

module.exports = Scribe;


}, {"module":"sdk.Scribe","line":6,"column":59,"name":"$module_sdk_Scribe"}),null);


__d("emptyFunction",[],__annotator(function $module_emptyFunction(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
function makeEmptyFunction(arg) {
  return __annotator(function() {
    return arg;
  }, {"module":"emptyFunction","line":21,"column":9});
}__annotator(makeEmptyFunction, {"module":"emptyFunction","line":20,"column":0,"name":"makeEmptyFunction"});


function emptyFunction() {}__annotator(emptyFunction, {"module":"emptyFunction","line":31,"column":0,"name":"emptyFunction"});

emptyFunction.thatReturns = makeEmptyFunction;
emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
emptyFunction.thatReturnsNull = makeEmptyFunction(null);
emptyFunction.thatReturnsThis = __annotator(function() { return this; }, {"module":"emptyFunction","line":37,"column":32});
emptyFunction.thatReturnsArgument = __annotator(function(arg) { return arg; }, {"module":"emptyFunction","line":38,"column":36});

module.exports = emptyFunction;


}, {"module":"emptyFunction","line":19,"column":23,"name":"$module_emptyFunction"}),null);

__d("htmlSpecialChars",[],__annotator(function $module_htmlSpecialChars(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();


var r_amp = /&/g;
var r_lt = /</g;
var r_gt = />/g;
var r_quot = /"/g;
var r_squo = /'/g;

function htmlSpecialChars(text) {
  if (typeof text == 'undefined' || text === null || !text.toString) {
    return '';
  }

  if (text === false) {
    return '0';
  } else if (text === true) {
    return '1';
  }

  return text
    .toString()
    .replace(r_amp, '&amp;')
    .replace(r_quot, '&quot;')
    .replace(r_squo, '&#039;')
    .replace(r_lt, '&lt;')
    .replace(r_gt, '&gt;');
}__annotator(htmlSpecialChars, {"module":"htmlSpecialChars","line":33,"column":0,"name":"htmlSpecialChars"});

module.exports = htmlSpecialChars;


}, {"module":"htmlSpecialChars","line":18,"column":29,"name":"$module_htmlSpecialChars"}),null);


__d("Flash",["DOMEventListener","DOMWrapper","FlashVersionFix","QueryString","UserAgent_DEPRECATED","copyProperties","guid","htmlSpecialChars"],__annotator(function $module_Flash(global,require,requireDynamic,requireLazy,module,exports,DOMEventListener,DOMWrapper,FlashVersionFix,QueryString,UserAgent_DEPRECATED,copyProperties,guid,htmlSpecialChars) {require.__markCompiled && require.__markCompiled();
/*globals ActiveXObject */

   
   
   
   
   

   
   
   

var registry = {};
var unloadHandlerAttached;
var document = DOMWrapper.getWindow().document;

function remove(id) {
  var swf = document.getElementById(id);
  if (swf) {
    swf.parentNode.removeChild(swf);
  }
  delete registry[id];
}__annotator(remove, {"module":"Flash","line":31,"column":0,"name":"remove"});

function unloadRegisteredSWFs() {
  for (var id in registry) {
    if (registry.hasOwnProperty(id)) {
        remove(id);
    }
  }
}__annotator(unloadRegisteredSWFs, {"module":"Flash","line":39,"column":0,"name":"unloadRegisteredSWFs"});


function normalize(s) {
  return s.replace(
    /\d+/g,
    __annotator(function (m) { return '000'.substring(m.length) + m; }, {"module":"Flash","line":53,"column":4})
  );
}__annotator(normalize, {"module":"Flash","line":50,"column":0,"name":"normalize"});

function register(id) {
  if (!unloadHandlerAttached) {
    
    
    if (UserAgent_DEPRECATED.ie() >= 9) {
      DOMEventListener.add(window, 'unload', unloadRegisteredSWFs);
    }
    unloadHandlerAttached = true;
  }
  registry[id] = id;
}__annotator(register, {"module":"Flash","line":57,"column":0,"name":"register"});


var Flash = {

  
  embed: __annotator(function(src, container, params, flashvars) {
    // Always give SWFs unique id's in order to kill instance caching.
    var id = guid();
    
    // This is still safe because there isn't an & sequence that can
    
    src = htmlSpecialChars(src).replace(/&amp;/g, '&');

    
    params = copyProperties({
        allowscriptaccess: 'always',
        flashvars: flashvars,
        movie: src
      },
      params || {});

    
    if (typeof params.flashvars == 'object') {
      params.flashvars = QueryString.encode(params.flashvars);
    }

    
    var pElements = [];
    for (var key in params) {
      if (params.hasOwnProperty(key) && params[key]) {
        pElements.push('<param name="' + htmlSpecialChars(key) + '" value="' +
          htmlSpecialChars(params[key]) + '">');
      }
    }

    var span = container.appendChild(document.createElement('span'));
    var html =
      '<object ' + (UserAgent_DEPRECATED.ie()
         ? 'classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" '
         : 'type="application/x-shockwave-flash"') +
        'data="' + src + '" ' +
        (params.height ? 'height="' + params.height + '" ' : '') +
        (params.width ? 'width="' + params.width + '" ' : '') +
        'id="' + id + '">' + pElements.join('') + '</object>';
    span.innerHTML = html;
    var swf = span.firstChild;

    register(id);
    return swf;
  }, {"module":"Flash","line":83,"column":9}),

  
  remove: remove,

  
  getVersion: __annotator(function() {
    var name = 'Shockwave Flash';
    var mimeType = 'application/x-shockwave-flash';
    var activexType = 'ShockwaveFlash.ShockwaveFlash';
    var flashVersion;

    if (navigator.plugins && typeof navigator.plugins[name] == 'object') {
        
        var description = navigator.plugins[name].description;
        if (description && navigator.mimeTypes &&
              navigator.mimeTypes[mimeType] &&
              navigator.mimeTypes[mimeType].enabledPlugin) {
            flashVersion = description.match(/\d+/g);
        }
    }
    if (!flashVersion) {
        try {
            flashVersion = (new ActiveXObject(activexType))
              .GetVariable('$version')
              .match(/(\d+),(\d+),(\d+),(\d+)/);
            flashVersion = Array.prototype.slice.call(flashVersion, 1);
        }
        catch (notSupportedException) {
        }
    }
    return flashVersion;
  }, {"module":"Flash","line":141,"column":14}),

  
  getVersionString: __annotator(function() {
    var version = Flash.getVersion();
    if (FlashVersionFix.enable) {
      return version ? version.join('.') : '';
    }

    
    return version.join('.');
  }, {"module":"Flash","line":173,"column":20}),

  
  checkMinVersion: __annotator(function(minVersion) {
    var version = Flash.getVersion();
    if (!version) {
      return false;
    }
    return normalize(version.join('.')) >= normalize(minVersion);
  }, {"module":"Flash","line":190,"column":19}),

  
  isAvailable : __annotator(function() {
    return !!Flash.getVersion();
  }, {"module":"Flash","line":203,"column":16})

};

module.exports = Flash;


}, {"module":"Flash","line":14,"column":144,"name":"$module_Flash"}),null);


__d("XDM",["DOMEventListener","DOMWrapper","emptyFunction","Flash","GlobalCallback","guid","Log","UserAgent_DEPRECATED","wrapFunction"],__annotator(function $module_XDM(global,require,requireDynamic,requireLazy,module,exports,DOMEventListener,DOMWrapper,emptyFunction,Flash,GlobalCallback,guid,Log,UserAgent_DEPRECATED,wrapFunction) {require.__markCompiled && require.__markCompiled();
   
   
   
   
   
   
   
   
   

var transports = {};
var configuration = {
  transports : []
};
var window = DOMWrapper.getWindow();

function findTransport(blacklist) {
  var blacklistMap = {},
      i = blacklist.length,
      list = configuration.transports;

  while (i--) { blacklistMap[blacklist[i]] = 1; }

  i = list.length;
  while (i--) {
    var name = list[i],
        transport = transports[name];
    if (!blacklistMap[name] && transport.isAvailable()) {
      return name;
    }
  }
}__annotator(findTransport, {"module":"XDM","line":65,"column":0,"name":"findTransport"});

var XDM = {

  
  register: __annotator(function(name, provider) {
    Log.debug('Registering %s as XDM provider', name);
    configuration.transports.push(name);
    transports[name] = provider;
  }, {"module":"XDM","line":88,"column":12}),

  
  create: __annotator(function(config) {
    if (!config.whenReady && !config.onMessage) {
      Log.error('An instance without whenReady or onMessage makes no sense');
      throw new Error('An instance without whenReady or ' +
                      'onMessage makes no sense');
    }
    if (!config.channel) {
      Log.warn('Missing channel name, selecting at random');
      config.channel = guid();
    }

    if (!config.whenReady) {
      config.whenReady = emptyFunction;
    }
    if (!config.onMessage) {
      config.onMessage = emptyFunction;
    }

    var name = config.transport || findTransport(config.blacklist || []),
        transport = transports[name];
    if (transport && transport.isAvailable()) {
      Log.debug('%s is available', name);
      transport.init(config);
      return name;
    }
  }, {"module":"XDM","line":118,"column":10})

};


XDM.register('flash', (__annotator(function() {
  var inited = false;
  var swf;
  var doLog = false;
  var timeout = 15000;
  var timer;

  if (__DEV__) {
    doLog = true;
  }

  return {
    isAvailable: __annotator(function() {
      
      
      return Flash.checkMinVersion('8.0.24');
    }, {"module":"XDM","line":163,"column":17}),
    init: __annotator(function(config) {
      Log.debug('init flash: ' + config.channel);
      var xdm = {
        send: __annotator(function(message, origin, windowRef, channel) {
          Log.debug('sending to: %s (%s)', origin, channel);
          swf.postMessage(message, origin, channel);
        }, {"module":"XDM","line":171,"column":14})
      };
      if (inited) {
        config.whenReady(xdm);
        return;
      }
      var div = config.root.appendChild(window.document.createElement('div'));

      var callback = GlobalCallback.create(__annotator(function() {
        GlobalCallback.remove(callback);
        clearTimeout(timer);
        Log.info('xdm.swf called the callback');
        var messageCallback = GlobalCallback.create(__annotator(function(msg, origin) {
          msg = decodeURIComponent(msg);
          origin = decodeURIComponent(origin);
          Log.debug('received message %s from %s', msg, origin);
          config.onMessage(msg, origin);
        }, {"module":"XDM","line":186,"column":52}), 'xdm.swf:onMessage');
        swf.init(config.channel, messageCallback);
        config.whenReady(xdm);
      }, {"module":"XDM","line":182,"column":43}), 'xdm.swf:load');

      swf = Flash.embed(config.flashUrl, div, null, {
        protocol: location.protocol.replace(':', ''),
        host: location.host,
        callback: callback,
        log: doLog
      });

      timer = setTimeout(__annotator(function() {
        Log.warn('The Flash component did not load within %s ms - ' +
          'verify that the container is not set to hidden or invisible ' +
          'using CSS as this will cause some browsers to not load ' +
          'the components', timeout);
      }, {"module":"XDM","line":203,"column":25}), timeout);
      inited = true;
    }, {"module":"XDM","line":168,"column":10})
  };
}, {"module":"XDM","line":151,"column":23}))());


XDM.register('postmessage', (__annotator(function() {
  var inited = false;

  return {
    isAvailable : __annotator(function() {
      return !!window.postMessage;
    }, {"module":"XDM","line":227,"column":18}),
    init: __annotator(function(config) {
      Log.debug('init postMessage: ' + config.channel);
      var prefix = '_FB_' + config.channel;
      var xdm = {
        send: __annotator(function(message, origin, windowRef, channel) {
          if (window === windowRef) {
            Log.error('Invalid windowref, equal to window (self)');
            throw new Error();
          }
          Log.debug('sending to: %s (%s)', origin, channel);
          var send = __annotator(function() {
            
            windowRef.postMessage('_FB_' + channel + message, origin);
          }, {"module":"XDM","line":240,"column":21});
          // IE8's postMessage is syncronous, meaning that if you have a
          
          
          
          
          
          
          
          if (UserAgent_DEPRECATED.ie() == 8 || UserAgent_DEPRECATED.ieCompatibilityMode()) {
            setTimeout(send, 0);
          } else{
            send();
          }
        }, {"module":"XDM","line":234,"column":14})
      };
      if (inited) {
        config.whenReady(xdm);
        return;
      }

      DOMEventListener.add(window, 'message', wrapFunction(__annotator(function(event) {
        var message = event.data;
        
        
        var origin = event.origin || 'native';
        if (!/^(https?:\/\/|native$)/.test(origin)) {
          Log.debug('Received message from invalid origin type: %s', origin);
          return;
        }

        if (typeof message != 'string') {
          Log.warn('Received message of type %s from %s, expected a string',
            typeof message, origin);
          return;
        }

        Log.debug('received message %s from %s', message, origin);
        
        if (message.substring(0, prefix.length) == prefix) {
          message = message.substring(prefix.length);
        }
        config.onMessage(message, origin);
      }, {"module":"XDM","line":264,"column":59}), 'entry', 'onMessage'));
      config.whenReady(xdm);
      inited = true;
    }, {"module":"XDM","line":230,"column":10})
  };
}, {"module":"XDM","line":223,"column":29}))());

module.exports = XDM;


}, {"module":"XDM","line":48,"column":136,"name":"$module_XDM"}),null);


__d("isFacebookURI",[],__annotator(function $module_isFacebookURI(global,require,requireDynamic,requireLazy,module,exports) {require.__markCompiled && require.__markCompiled();
var facebookURIRegex = null;

var FB_PROTOCOLS = ['http', 'https'];


function isFacebookURI(uri) {return __bodyWrapper(this, arguments, function() {
  if (!facebookURIRegex) {
    
    facebookURIRegex = new RegExp('(^|\\.)facebook\\.com$', 'i');
  }

  if (uri.isEmpty() && uri.toString() !== '#') {
    return false;
  }

  if (!uri.getDomain() && !uri.getProtocol()) {
    return true;
  }

  return (ES(FB_PROTOCOLS, 'indexOf', true,uri.getProtocol()) !== -1 &&
          facebookURIRegex.test(uri.getDomain()));
}, {"params":[[uri, 'URI', 'uri']],"returns":'boolean'});}__annotator(isFacebookURI, {"module":"isFacebookURI","line":32,"column":0,"name":"isFacebookURI"}, {"params":["URI"],"returns":"boolean"});

isFacebookURI.setRegex = __annotator(function(regex) {
  facebookURIRegex = regex;
}, {"module":"isFacebookURI","line":50,"column":25});

module.exports = isFacebookURI;


}, {"module":"isFacebookURI","line":20,"column":23,"name":"$module_isFacebookURI"}),null);


__d("sdk.XD",["sdk.Content","sdk.Event","Log","QueryString","Queue","sdk.RPC","sdk.Runtime","sdk.Scribe","sdk.URI","UrlMap","JSSDKXDConfig","XDM","isFacebookURI","sdk.createIframe","sdk.feature","guid"],__annotator(function $module_sdk_XD(global,require,requireDynamic,requireLazy,module,exports,Content,Event,Log,QueryString,Queue,RPC,Runtime,Scribe,URI,UrlMap,XDConfig,XDM,isFacebookURI,createIframe,feature,guid) {require.__markCompiled && require.__markCompiled();
   
   
   
   
   
   
   
   
   
   
   
   

   
   
   
   

var facebookQueue = new Queue();
var httpProxyQueue = new Queue();
var httpsProxyQueue = new Queue();
var httpProxyFrame;
var httpsProxyFrame;
var proxySecret = guid();

var xdArbiterTier = XDConfig.useCdn ? 'cdn' : 'www';
var xdArbiterPathAndQuery = feature('use_bundle', false)
  ? XDConfig.XdBundleUrl
  : XDConfig.XdUrl;
var xdArbiterHttpUrl
  = UrlMap.resolve(xdArbiterTier, false) + xdArbiterPathAndQuery;
var xdArbiterHttpsUrl
  = UrlMap.resolve(xdArbiterTier, true) + xdArbiterPathAndQuery;

var channel = guid();
var origin = location.protocol + '//' + location.host;
var xdm;
var inited = false;
var IFRAME_TITLE = 'Facebook Cross Domain Communication Frame';

var pluginRegistry = {};
var rpcQueue = new Queue();
RPC.setInQueue(rpcQueue);

function onRegister(/*string*/ registeredAs) {return __bodyWrapper(this, arguments, function() {
  Log.info('Remote XD can talk to facebook.com (%s)', registeredAs);
  Runtime.setEnvironment(
    registeredAs === 'canvas'
      ? Runtime.ENVIRONMENTS.CANVAS
      : Runtime.ENVIRONMENTS.PAGETAB);
}, {"params":[[registeredAs, 'string', 'registeredAs']]});}__annotator(onRegister, {"module":"sdk.XD","line":52,"column":0,"name":"onRegister"}, {"params":["string"]});

function handleAction(/*object*/ message, /*string*/ senderOrigin) {return __bodyWrapper(this, arguments, function() {
  if (!senderOrigin) {
    Log.error('No senderOrigin');
    throw new Error();
  }

  var protocol = /^https?/.exec(senderOrigin)[0];

  switch(message.xd_action) {
    case 'proxy_ready':
      var proxyQueue;
      var targetProxyFrame;

      if (protocol == 'https') {
        proxyQueue = httpsProxyQueue;
        targetProxyFrame = httpsProxyFrame;
      } else {
        proxyQueue = httpProxyQueue;
        targetProxyFrame = httpProxyFrame;
      }

      if (message.registered) {
        onRegister(message.registered);
        facebookQueue = proxyQueue.merge(facebookQueue);
      }

      Log.info('Proxy ready, starting queue %s containing %s messages',
        protocol + 'ProxyQueue', proxyQueue.getLength());

      proxyQueue.start(__annotator(function(/*string|object*/ message) {return __bodyWrapper(this, arguments, function() {
        xdm.send(
          typeof message === 'string' ? message : QueryString.encode(message),
          senderOrigin,
          targetProxyFrame.contentWindow,
          channel + '_' + protocol
        );
      }, {"params":[[message, 'string|object', 'message']]});}, {"module":"sdk.XD","line":89,"column":23}, {"params":["string|object"]}));
      break;

    case 'plugin_ready':
      Log.info('Plugin %s ready, protocol: %s', message.name, protocol);
      pluginRegistry[message.name] = { protocol: protocol };
      if (Queue.exists(message.name)) {
        var queue = Queue.get(message.name);
        Log.debug('Enqueuing %s messages for %s in %s', queue.getLength(),
          message.name, protocol + 'ProxyQueue');

        (protocol == 'https' ? httpsProxyQueue : httpProxyQueue).merge(queue);
      }
      break;
  }

  
  if (message.data) {
    onMessage(message.data, senderOrigin);
  }
}, {"params":[[message, 'object', 'message'], [senderOrigin, 'string', 'senderOrigin']]});}__annotator(handleAction, {"module":"sdk.XD","line":60,"column":0,"name":"handleAction"}, {"params":["object","string"]});




function onMessage(/*string|object*/ message, /*?string*/ senderOrigin) {return __bodyWrapper(this, arguments, function() {
  if (senderOrigin && senderOrigin !== 'native' &&
      !isFacebookURI(new URI(senderOrigin))) {
    return;
  }
  if (typeof message == 'string') {
    if (/^FB_RPC:/.test(message)) {
      rpcQueue.enqueue(message.substring(7));
      return;
    }
    
    if (message.substring(0, 1) == '{') {
      try {
        message = ES('JSON', 'parse', false,message);
      } catch (decodeException) {
        Log.warn('Failed to decode %s as JSON', message);
        return;
      }
    } else {
      message = QueryString.decode(message);
    }
  }
  

  if (!senderOrigin) {
    
    if (message.xd_sig == proxySecret) {
      senderOrigin = message.xd_origin;
    }
  }

  if (message.xd_action) {
    handleAction(message, senderOrigin);
    return;
  }

  
  
  if (message.access_token) {
    Runtime.setSecure(/^https/.test(origin));
  }

  
  if (message.cb) {
    var cb = XD._callbacks[message.cb];
    if (!XD._forever[message.cb]) {
      delete XD._callbacks[message.cb];
    }
    if (cb) {
      cb(message);
    }
  }
}, {"params":[[message, 'string|object', 'message'], [senderOrigin, '?string', 'senderOrigin']]});}__annotator(onMessage, {"module":"sdk.XD","line":121,"column":0,"name":"onMessage"}, {"params":["string|object","?string"]});

function sendToFacebook(/*string*/ recipient, /*object|string*/ message) {return __bodyWrapper(this, arguments, function() {
  if (recipient == 'facebook') {
    message.relation = 'parent.parent';
    facebookQueue.enqueue(message);
  } else {
    message.relation = 'parent.frames["' + recipient + '"]';
    var regInfo = pluginRegistry[recipient];
    if (regInfo) {
      Log.debug('Enqueuing message for plugin %s in %s',
        recipient, regInfo.protocol + 'ProxyQueue');

      (regInfo.protocol == 'https' ? httpsProxyQueue : httpProxyQueue)
        .enqueue(message);
    } else {
      Log.debug('Buffering message for plugin %s', recipient);
      Queue.get(recipient).enqueue(message);
    }
  }
}, {"params":[[recipient, 'string', 'recipient'], [message, 'object|string', 'message']]});}__annotator(sendToFacebook, {"module":"sdk.XD","line":175,"column":0,"name":"sendToFacebook"}, {"params":["string","object|string"]});


RPC.getOutQueue().start(__annotator(function(/*string*/ message) {return __bodyWrapper(this, arguments, function() {
  sendToFacebook('facebook', 'FB_RPC:' + message);
}, {"params":[[message, 'string', 'message']]});}, {"module":"sdk.XD","line":196,"column":24}, {"params":["string"]}));

function init(/*?string*/ xdProxyName) {return __bodyWrapper(this, arguments, function() {
  if (inited) {
    return;
  }

  
  var container = Content.appendHidden(document.createElement('div'));

  
  var transport = XDM.create({
    blacklist: null,
    root: container,
    channel: channel,
    flashUrl: XDConfig.Flash.path,
    whenReady: __annotator(function(/*object*/ instance) {return __bodyWrapper(this, arguments, function() {
      xdm = instance;
      
      var proxyData = {
        channel: channel, 
        origin: location.protocol + '//' + location.host, 
        transport: transport, 
        xd_name: xdProxyName 
      };

      var xdArbiterFragment = '#' + QueryString.encode(proxyData);

      
      

      
      
      if (Runtime.getSecure() !== true) {
        
        
        httpProxyFrame = createIframe({
          url: xdArbiterHttpUrl + xdArbiterFragment,
          name: 'fb_xdm_frame_http',
          id: 'fb_xdm_frame_http',
          root: container,
          'aria-hidden':true,
          title: IFRAME_TITLE,
          tabindex: -1
        });
      }

      
      
      httpsProxyFrame = createIframe({
        url: xdArbiterHttpsUrl + xdArbiterFragment,
        name: 'fb_xdm_frame_https',
        id: 'fb_xdm_frame_https',
        root: container,
        'aria-hidden':true,
        title: IFRAME_TITLE,
        tabindex: -1
      });
    }, {"params":[[instance, 'object', 'instance']]});}, {"module":"sdk.XD","line":214,"column":15}, {"params":["object"]}),
    onMessage: onMessage
  });
  if (!transport) {
    Scribe.log('jssdk_error', {
      appId: Runtime.getClientID(),
      error: 'XD_TRANSPORT',
      extra: {
        message: 'Failed to create a valid transport'
      }
    });
  }
  inited = true;
}, {"params":[[xdProxyName, '?string', 'xdProxyName']]});}__annotator(init, {"module":"sdk.XD","line":200,"column":0,"name":"init"}, {"params":["?string"]});


var XD = {
  // needs to be exposed in a more controlled way once we're more
  // into 'CJS land'.
  rpc: RPC,

  _callbacks: {},
  _forever: {},
  _channel: channel,
  _origin: origin,

  onMessage: onMessage,
  recv: onMessage,

  
  init: init,

  
  sendToFacebook: sendToFacebook,

  
  inform: __annotator(function(/*string*/ method, /*?object*/ params, /*?string*/ relation,
      /*?string*/ behavior) {return __bodyWrapper(this, arguments, function() {
    sendToFacebook('facebook', {
      method: method,
      params: ES('JSON', 'stringify', false,params || {}),
      behavior: behavior || 'p',
      relation: relation
    });
  }, {"params":[[method, 'string', 'method'], [params, '?object', 'params'], [relation, '?string', 'relation'], [behavior, '?string', 'behavior']]});}, {"module":"sdk.XD","line":312,"column":10}, {"params":["string","?object","?string","?string"]}),

  
  handler: __annotator(function(/*function*/ cb, /*?string*/ relation, /*?boolean*/ forever,
      /*?string*/ id) /*string*/ {return __bodyWrapper(this, arguments, function() {
    var xdArbiterFragment = '#' + QueryString.encode({
      cb        : this.registerCallback(cb, forever, id),
      origin    : origin + '/' + channel,
      domain    : location.hostname,
      relation  : relation || 'opener'
    });
    return (location.protocol == 'https:'
      ? xdArbiterHttpsUrl
      : xdArbiterHttpUrl
    ) + xdArbiterFragment;
  }, {"params":[[cb, 'function', 'cb'], [relation, '?string', 'relation'], [forever, '?boolean', 'forever'], [id, '?string', 'id']],"returns":'string'});}, {"module":"sdk.XD","line":336,"column":11}, {"params":["function","?string","?boolean","?string"],"returns":"string"}),

  registerCallback: __annotator(function(/*function*/ cb, /*?boolean*/ persistent,
      /*?string*/ id) /*string*/ {return __bodyWrapper(this, arguments, function() {
    id = id || guid();
    if (persistent) {
      XD._forever[id] = true;
    }
    XD._callbacks[id] = cb;
    return id;
  }, {"params":[[cb, 'function', 'cb'], [persistent, '?boolean', 'persistent'], [id, '?string', 'id']],"returns":'string'});}, {"module":"sdk.XD","line":350,"column":20}, {"params":["function","?boolean","?string"],"returns":"string"})
};





Event.subscribe('init:post', __annotator(function(/*object*/ options) {return __bodyWrapper(this, arguments, function() {
  init(options.xdProxyName);
  var timeout = feature('xd_timeout', false);
  if (timeout) {
    setTimeout(__annotator(function() {
      var initialized =
        httpsProxyFrame
        && (!!httpProxyFrame == httpProxyQueue.isStarted()
            && !!httpsProxyFrame == httpsProxyQueue.isStarted());

      if (!initialized) {
        Scribe.log('jssdk_error', {
          appId: Runtime.getClientID(),
          error: 'XD_INITIALIZATION',
          extra: {
            message: 'Failed to initialize in ' + timeout + 'ms'
          }
        });
      }
    }, {"module":"sdk.XD","line":369,"column":15}), timeout);
  }
}, {"params":[[options, 'object', 'options']]});}, {"module":"sdk.XD","line":365,"column":29}, {"params":["object"]}));


module.exports = XD;


}, {"module":"sdk.XD","line":7,"column":203,"name":"$module_sdk_XD"}),null);


__d("sdk.Auth",["sdk.Cookie","sdk.createIframe","DOMWrapper","sdk.feature","sdk.getContextType","guid","sdk.Impressions","Log","ObservableMixin","sdk.Runtime","sdk.SignedRequest","UrlMap","sdk.URI","sdk.XD"],__annotator(function $module_sdk_Auth(global,require,requireDynamic,requireLazy,module,exports,Cookie,createIframe,DOMWrapper,feature,getContextType,guid,Impressions,Log,ObservableMixin,Runtime,SignedRequest,UrlMap,URI,XD) {require.__markCompiled && require.__markCompiled();
   
   
   
   
   
   
   
   
   
   
   
   
   
   

var currentAuthResponse;

var timer;

var Auth = new ObservableMixin();

function setAuthResponse(/*?object*/ authResponse, /*string*/ status) {return __bodyWrapper(this, arguments, function() {
  var currentUserID = Runtime.getUserID();
  var userID = '';
  if (authResponse) {
    // if there's an auth record, then there are a few ways we might
    
    // then go with that.  If there's no explicit user ID, but there's a valid
    
    if (authResponse.userID) {
      userID = authResponse.userID;
    } else if (authResponse.signedRequest) {
      var parsedSignedRequest =
        SignedRequest.parse(authResponse.signedRequest);
      if (parsedSignedRequest && parsedSignedRequest.user_id) {
        userID = parsedSignedRequest.user_id;
      }
    }
  }

  var
    currentStatus = Runtime.getLoginStatus(),
    login = (currentStatus === 'unknown' && authResponse)
            || (Runtime.getUseCookie() && Runtime.getCookieUserID() !== userID),
    logout = currentUserID && !authResponse,
    both = authResponse && currentUserID && currentUserID != userID,
    authResponseChange = authResponse != currentAuthResponse,
    statusChange = status != (currentStatus || 'unknown');

  
  
  Runtime.setLoginStatus(status);
  Runtime.setAccessToken(authResponse && authResponse.accessToken || null);
  Runtime.setUserID(userID);

  currentAuthResponse = authResponse;

  var response = {
    authResponse : authResponse,
    status : status
  };

  if (logout || both) {
    Auth.inform('logout', response);
  }
  if (login || both) {
    Auth.inform('login', response);
  }
  if (authResponseChange) {
    Auth.inform('authresponse.change', response);
  }
  if (statusChange) {
    Auth.inform('status.change', response);
  }
  return response;
}, {"params":[[authResponse, '?object', 'authResponse'], [status, 'string', 'status']]});}__annotator(setAuthResponse, {"module":"sdk.Auth","line":29,"column":0,"name":"setAuthResponse"}, {"params":["?object","string"]});

function getAuthResponse() /*?object*/ {return __bodyWrapper(this, arguments, function() {
  return currentAuthResponse;
}, {"returns":'?object'});}__annotator(getAuthResponse, {"module":"sdk.Auth","line":85,"column":0,"name":"getAuthResponse"}, {"returns":"?object"});

function xdResponseWrapper(/*function*/ cb, /*?object*/ authResponse,
    /*?string*/ method) /*function*/ {return __bodyWrapper(this, arguments, function() {
  return __annotator(function (/*?object*/ params) /*?object*/ {return __bodyWrapper(this, arguments, function() {
    var status;

    if (params && params.access_token) {
      
      var parsedSignedRequest = SignedRequest.parse(params.signed_request);
      authResponse = {
        accessToken: params.access_token,
        userID: parsedSignedRequest.user_id,
        expiresIn: parseInt(params.expires_in, 10),
        signedRequest: params.signed_request
      };

      if (params.granted_scopes) {
        authResponse.grantedScopes = params.granted_scopes;
      }

      if (Runtime.getUseCookie()) {
        var expirationTime = authResponse.expiresIn === 0
          ? 0 // make this a session cookie if it's for offline access
          : ES('Date', 'now', false) + authResponse.expiresIn * 1000;
        var baseDomain = Cookie.getDomain();
        if (!baseDomain && params.base_domain) {
          
          
          
          
          Cookie.setDomain('.' + params.base_domain);
        }
        Cookie.setSignedRequestCookie(params.signed_request,
                                         expirationTime);
      }
      status = 'connected';
      setAuthResponse(authResponse, status);
    } else if (method === 'logout' || method === 'login_status'