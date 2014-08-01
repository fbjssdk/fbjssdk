
/**
 * Copyright Facebook Inc.
 *
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
try {window.FB || (function(window) {
var self = window, document = window.document;
var setTimeout = window.setTimeout, setInterval = window.setInterval,clearTimeout = window.clearTimeout,clearInterval = window.clearInterval;var __DEV__ = 1;
function emptyFunction() {};
var __w, __t;
/** Path: html/js/downstream/polyfill/TypeChecker.js */
/**
 * @generated SignedSource<<f05ceab49bd445d883e5a164a021bcff>>
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
  var subType;
  var nextValue;

  /**
   * Mapping from types to interfaces that they implement.
   */
  var typeInterfaces = {
    'DOMElement': ['DOMEventTarget', 'DOMNode'],
    'DOMDocument': ['DOMEventTarget', 'DOMNode'],
    'DOMWindow': ['DOMEventTarget'],
    'DOMTextNode': ['DOMNode'],
    'Comment': ['DOMNode'],
    'file': ['blob'],
    'worker': ['DOMEventTarget']
  };

  /**
   * Get object name from toString call.
   *   > stringType(anchor) // "HTMLAnchorElement"
   *   > stringType([1, 2]) // "Array"
   */
  function stringType(value) {
    return toStringFunc.call(value).slice(8, -1);
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
  function getObjectType(type, value, node) {
    subType = null;
    nextValue = null;

    // Defer calling toString on the value until we need it.
    var toStringType = stringType(value);
    if (value === null) {
      type = 'null';
    } else if (toStringType === 'Function') {
      // Not all functions have type of "function" (e.g. built-ins and bound)
      // Let functions with signatures also match 'function'
      type = value.__TCmeta && node !== 'function'
        ? value.__TCmeta.signature
        : 'function';
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
          case 1: type = 'DOMElement';
            subType = value.nodeName.toUpperCase();
            break;
          case 3: type = 'DOMTextNode'; break;
          case 8: type = 'Comment'; break;
          case 9: type = 'DOMDocument'; break;
          case 11: type = 'DOMElement';
            subType = 'FRAGMENT';
            break;
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
            if (value.length) {
              nextValue = value[0];
            }
            type = toStringType.toLowerCase();
            break;
          case 'Object':
            for (var key in value) {
              if (value.hasOwnProperty(key)) {
                nextValue = value[key];
                break;
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
      case 'DOMElement':
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
    type = getObjectType(type, value, node);

    // Check whether type has an interface that is what we're looking for.
    // Use truthiness check as per http://jsperf.com/hasownproperty-vs-in-vs-undefined/35
    if (type !== node && typeInterfaces[type]) {
      var interfaces = typeInterfaces[type], i = interfaces.length;
      while (i--) {
        if (interfaces[i] === node) {
          type = node;
          break;
        }
      }
    }

    // Check whether we got the right type (and subtype).
    currentType.push(type);
    return nextValue && nextNode
      ? node === type && equals(nextValue, nextNode)
      : subType && nextNode
        ? node === type && subType === nextNode
        : node === type;
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

/* SoyZ8sKHK_x */
/** Path: html/js/downstream/require/require-lite.js */
/**
 * @generated SignedSource<<7618ccf975187cb96282853804aca921>>
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

  require = __w(function(/*string*/ id, /*?boolean*/ soft) {__t([id, 'string', 'id'], [soft, '?boolean', 'soft']);
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
  }, {"signature":"function(string,?boolean)"});

  __d = __w(function(/*string*/ id, /*array<string>*/ deps, factory,
      /*?number*/ _special) {__t([id, 'string', 'id'], [deps, 'array<string>', 'deps'], [_special, '?number', '_special']);
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
  }, {"signature":"function(string,array<string>,?number)"});
})(this);

/* u6b3MVzyeK6 */
/** Path: html/js/sdk/ES5ArrayPrototype.js */
/**
 * @providesModule ES5ArrayPrototype
 */
__d("ES5ArrayPrototype",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var ES5ArrayPrototype = {};

/**
* http://es5.github.com/#x15.4.4.19
*/
ES5ArrayPrototype.map = function(func, context) {
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
};

/**
* http://es5.github.com/#x15.4.4.18
*/
ES5ArrayPrototype.forEach = function(func, context) {
  ES5ArrayPrototype.map.call(this, func, context);
};

/**
* http://es5.github.com/#x15.4.4.20
*/
ES5ArrayPrototype.filter = function(func, context) {
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
};

/**
* http://es5.github.com/#x15.4.4.16
*/
ES5ArrayPrototype.every = function(func, context) {
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
};

/**
* http://es5.github.com/#x15.4.4.17
*/
ES5ArrayPrototype.some = function(func, context) {
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
};

/**
* http://es5.github.com/#x15.4.4.14
*/
ES5ArrayPrototype.indexOf = function(val, index) {
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
};

module.exports = ES5ArrayPrototype;

/* TfZtt8IJr02 */
},null);
/** Path: html/js/sdk/ES5FunctionPrototype.js */
/**
 * @providesModule ES5FunctionPrototype
 */
__d("ES5FunctionPrototype",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var ES5FunctionPrototype = {};

/**
 * A simulated implementation of Function.prototype.bind that is mostly ES5-
 * compliant. The [[Call]], [[Construct]], and [[HasInstance]] internal
 * properties differ, which means that the simulated implementation produces
 * different stack traces and behaves differently when used as a constructor.
 *
 * http://es5.github.com/#x15.3.4.5
 */
ES5FunctionPrototype.bind = function(context /*, args... */) {
  if (typeof this != 'function') {
    throw new TypeError('Bind must be called on a function');
  }
  var target = this;
  var appliedArguments = Array.prototype.slice.call(arguments, 1);
  function bound() {
    return target.apply(
      context,
      appliedArguments.concat(Array.prototype.slice.call(arguments)));
  }
  bound.displayName = 'bound:' + (target.displayName || target.name || '(?)');
  bound.toString = function toString() {
    return 'bound: ' + target;
  };
  return bound;
};

module.exports = ES5FunctionPrototype;

/* gA0hPn9APq5 */
},null);
/** Path: html/js/sdk/ES5StringPrototype.js */
/**
 * @providesModule ES5StringPrototype
 */
__d("ES5StringPrototype",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var ES5StringPrototype = {};

/**
 * Trims white space on either side of this string.
 *
 * http://es5.github.com/#x15.5.4.20
 */
ES5StringPrototype.trim = function() {
  if (this == null) {
    throw new TypeError('String.prototype.trim called on null or undefined');
  }
  return String.prototype.replace.call(this, /^\s+|\s+$/g, '');
};

ES5StringPrototype.startsWith = function(search) {
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
};

ES5StringPrototype.endsWith = function(search) {
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
};

ES5StringPrototype.contains = function(search) {
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
};

ES5StringPrototype.repeat = function(count) {
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
};

module.exports = ES5StringPrototype;

/* LU1JJeuqBGZ */
},null);
/** Path: html/js/sdk/ES5Array.js */
/**
 * @providesModule ES5Array
 */
__d("ES5Array",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var ES5Array = {};

ES5Array.isArray = function(object) {
  return Object.prototype.toString.call(object) == '[object Array]';
};

module.exports = ES5Array;

/* MSYhZmKvHdG */
},null);
/** Path: html/js/ie8DontEnum.js */
/**
 * @providesModule ie8DontEnum
 */
__d("ie8DontEnum",[],function(global,require,requireDynamic,requireLazy,module,exports) {
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
var ie8DontEnum = function() {};

if (({toString: true}).propertyIsEnumerable('toString')) {
  ie8DontEnum = function(object, onProp) {
    for (var i = 0; i < dontEnumProperties.length; i++) {
      var property = dontEnumProperties[i];
      if (hasOwnProperty.call(object, property)) {
        onProp(property);
      }
    }
  };
}

module.exports = ie8DontEnum;

/* GU28Zd-Jzdb */
},null);
/** Path: html/js/sdk/ES5Object.js */
/**
 * @providesModule ES5Object
 */
__d("ES5Object",["ie8DontEnum"],function(global,require,requireDynamic,requireLazy,module,exports,ie8DontEnum) {
   
var hasOwnProperty = ({}).hasOwnProperty;

var ES5Object = {};

// Temporary constructor used in ES5Object.create
// to set needed prototype.
function F() {}

/**
 * Creates a new object with the specified prototype object.
 *
 * http://es5.github.com/#x15.2.3.5
 */
ES5Object.create = function(proto) {
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
};

/**
 * Returns an array of the given object's own enumerable properties.
 *
 * http://es5.github.com/#x15.2.3.14
 */
ES5Object.keys = function(object) {
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
  ie8DontEnum(object, function(prop)  {return keys.push(prop);});

  return keys;
};

module.exports = ES5Object;

/* DFdG4QOyOcq */
},null);
/** Path: html/js/sdk/ES5Date.js */
/**
 * @providesModule ES5Date
 */
__d("ES5Date",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var ES5Date = {};
ES5Date.now = function() {
  return new Date().getTime();
};

module.exports = ES5Date;

/* Nh0WBu8zYRI */
},null);
/** Path: html/js/third_party/json3/json3.js */
/**
 * @providesModule JSON3
 * @preserve-header
 *
 *! JSON v3.2.3 | http://bestiejs.github.com/json3 | Copyright 2012, Kit Cambridge | http://kit.mit-license.org
 */__d("JSON3",[],function(global,require,requireDynamic,requireLazy,module,exports) {
;(function () {
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
    getDay = function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    };
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
    (value = function () {
      return 1;
    }).toJSON = value;
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
      isProperty = function (property) {
        var members = {}, constructor;
        if ((members.__proto__ = null, members.__proto__ = {
          // The *proto* property cannot be set multiple times in recent
          // versions of Firefox and SeaMonkey.
          "toString": 1
        }, members).toString != getClass) {
          // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
          // supports the mutable *proto* property.
          isProperty = function (property) {
            // Capture and break the object's prototype chain (see section 8.6.2
            // of the ES 5.1 spec). The parenthesized expression prevents an
            // unsafe transformation by the Closure Compiler.
            var original = this.__proto__, result = property in (this.__proto__ = null, this);
            // Restore the original prototype chain.
            this.__proto__ = original;
            return result;
          };
        } else {
          // Capture a reference to the top-level `Object` constructor.
          constructor = members.constructor;
          // Use the `constructor` property to simulate `Object#hasOwnProperty` in
          // other environments.
          isProperty = function (property) {
            var parent = (this.constructor || constructor).prototype;
            return property in this && !(property in parent && this[property] === parent[property]);
          };
        }
        members = null;
        return isProperty.call(this, property);
      };
    }

    // Internal: Normalizes the `for...in` iteration algorithm across
    // environments. Each enumerated key is yielded to a `callback` function.
    forEach = function (object, callback) {
      var size = 0, Properties, members, property, forEach;

      // Tests for bugs in the current environment's `for...in` algorithm. The
      // `valueOf` property inherits the non-enumerable flag from
      // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
      (Properties = function () {
        this.valueOf = 0;
      }).prototype.valueOf = 0;

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
        forEach = function (object, callback) {
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
        };
      } else if (size == 2) {
        // Safari <= 2.0.4 enumerates shadowed properties twice.
        forEach = function (object, callback) {
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
        };
      } else {
        // No bugs detected; use the standard `for...in` algorithm.
        forEach = function (object, callback) {
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
        };
      }
      return forEach(object, callback);
    };

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
      toPaddedString = function (width, value) {
        // The `|| 0` expression is necessary to work around a bug in
        // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
        return ("000000" + (value || 0)).slice(-width);
      };

      // Internal: Double-quotes a string `value`, replacing all ASCII control
      // characters (characters with code unit values between 0 and 31) with
      // their escaped equivalents. This is an implementation of the
      // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
      quote = function (value) {
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
      };

      // Internal: Recursively serializes an object. Implements the
      // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
      serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
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
            forEach(properties || value, function (property) {
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
            });
            return any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
          }
          // Remove the object from the traversed object stack.
          stack.pop();
        }
      };

      // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
      JSON3.stringify = function (source, filter, width) {
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
      };
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
      abort = function() {
        Index = Source = null;
        throw SyntaxError();
      };

      // Internal: Returns the next token, or `"$"` if the parser has reached
      // the end of the source string. A token may be a string, number, `null`
      // literal, or Boolean literal.
      lex = function () {
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
      };

      // Internal: Parses a JSON `value` token.
      get = function (value) {
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
      };

      // Internal: Updates a traversed object member.
      update = function(source, property, callback) {
        var element = walk(source, property, callback);
        if (element === undef) {
          delete source[property];
        } else {
          source[property] = element;
        }
      };

      // Internal: Recursively traverses a parsed JSON object, invoking the
      // `callback` function for each value. This is an implementation of the
      // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
      walk = function (source, property, callback) {
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
            forEach(value, function (property) {
              update(value, property, callback);
            });
          }
        }
        return callback.call(source, property, value);
      };

      // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
      JSON3.parse = function (source, callback) {
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
      };
    }
  }
}).call(this);

/* 2KL294koxM_ */
},null);
/** Path: html/js/sdk/ES6Object.js */
/**
 * @providesModule ES6Object
 */
__d("ES6Object",["ie8DontEnum"],function(global,require,requireDynamic,requireLazy,module,exports,ie8DontEnum) {
   
var hasOwnProperty = ({}).hasOwnProperty;

var ES6Object = {
  /**
   * Merges several objects in one, returns the agumented target.
   *
   * http://people.mozilla.org/~jorendorff/es6-draft.html#sec-object.assign
   */
  assign:function(target ) {var sources=Array.prototype.slice.call(arguments,1);
    if (target == null) {
      throw new TypeError('Object.assign target cannot be null or undefined');
    }

    target = Object(target);

    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];

      if (source == null) {
        throw new TypeError('Object.assign source cannot be null or undefined');
      }

      source = Object(source);

      for (var prop in source) {
        if (hasOwnProperty.call(source, prop)) {
          target[prop] = source[prop];
        }
      }

      // Fix {DontEnum} IE8 bug.
      ie8DontEnum(source, function(prop)  {return target[prop] = source[prop];});
    }

    return target;
  }
};

module.exports = ES6Object;

/* 76DsDGXX9vb */
},null);
/** Path: html/js/sdk/ES.js */
/**
 * @providesModule ES
 *
 * scripts/jssdk/default.spatch converts ES5/ES6 code into using this module in
 * ES3 style.
 */
__d("ES",["ES5ArrayPrototype","ES5FunctionPrototype","ES5StringPrototype","ES5Array","ES5Object","ES5Date","JSON3","ES6Object"],function(global,require,requireDynamic,requireLazy,module,exports,ES5ArrayPrototype,ES5FunctionPrototype,ES5StringPrototype,ES5Array,ES5Object,ES5Date,JSON3,ES6Object) {
   
   
   
  
   
   
   
   

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
  'Object': ES6Object
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
}

// Setup ES5, and ES6 polyfills
setupMethodsCache(es5Polyfills);
setupMethodsCache(es6Polyfills);

function ES(lhs, rhs, proto ) {var args=Array.prototype.slice.call(arguments,3);
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
}

module.exports = ES;

/* HddqKc1MRYB */
},null);
var ES = require('ES');
__d("JSSDKRuntimeConfig",[],{"locale":"fo_FO","rtl":false,"revision":"1352406"});__d("JSSDKConfig",[],{"bustCache":true,"tagCountLogRate":0.01,"errorHandling":{"rate":4},"usePluginPipe":true,"features":{"kill_fragment":true,"xfbml_profile_pic_server":true,"error_handling":{"rate":4},"e2e_ping_tracking":{"rate":1.0e-6},"xd_timeout":{"rate":4,"value":30000},"use_bundle":true},"api":{"mode":"warn","whitelist":["Canvas","Canvas.Prefetcher","Canvas.Prefetcher.addStaticResource","Canvas.Prefetcher.setCollectionMode","Canvas.getPageInfo","Canvas.hideFlashElement","Canvas.scrollTo","Canvas.setAutoGrow","Canvas.setDoneLoading","Canvas.setSize","Canvas.setUrlHandler","Canvas.showFlashElement","Canvas.startTimer","Canvas.stopTimer","Data","Data.process","Data.query","Data.query:wait","Data.waitOn","Data.waitOn:wait","Event","Event.subscribe","Event.unsubscribe","Music.flashCallback","Music.init","Music.send","Payment","Payment.cancelFlow","Payment.continueFlow","Payment.init","Payment.lockForProcessing","Payment.unlockForProcessing","Payment.parse","Payment.setSize","ThirdPartyProvider","ThirdPartyProvider.init","ThirdPartyProvider.sendData","UA","UA.nativeApp","XFBML","XFBML.RecommendationsBar","XFBML.RecommendationsBar.markRead","XFBML.parse","addFriend","api","getAccessToken","getAuthResponse","getLoginStatus","getUserID","init","login","logout","publish","share","ui","ui:subscribe"]},"initSitevars":{"enableMobileComments":1,"iframePermissions":{"read_stream":false,"manage_mailbox":false,"manage_friendlists":false,"read_mailbox":false,"publish_checkins":true,"status_update":true,"photo_upload":true,"video_upload":true,"sms":false,"create_event":true,"rsvp_event":true,"offline_access":true,"email":true,"xmpp_login":false,"create_note":true,"share_item":true,"export_stream":false,"publish_stream":true,"publish_likes":true,"ads_management":false,"contact_email":true,"access_private_data":false,"read_insights":false,"read_requests":false,"read_friendlists":true,"manage_pages":false,"physical_login":false,"manage_groups":false,"read_deals":false}}});__d("UrlMapConfig",[],{"www":"www.facebook.com","m":"m.facebook.com","connect":"connect.facebook.net","business":"business.facebook.com","api_https":"api.facebook.com","api_read_https":"api-read.facebook.com","graph_https":"graph.facebook.com","fbcdn_http":"fbstatic-a.akamaihd.net","fbcdn_https":"fbstatic-a.akamaihd.net","cdn_http":"static.ak.facebook.com","cdn_https":"s-static.ak.facebook.com"});__d("JSSDKXDConfig",[],{"XdUrl":"\/connect\/xd_arbiter.php?version=41","XdBundleUrl":"\/connect\/xd_arbiter\/sT9WD2idZGy.js?version=41","Flash":{"path":"https:\/\/connect.facebook.net\/rsrc.php\/v1\/yR\/r\/ks_9ZXiQ0GL.swf"},"useCdn":true});__d("JSSDKCssConfig",[],{"rules":".fb_hidden{position:absolute;top:-10000px;z-index:10001}.fb_invisible{display:none}.fb_reset{background:none;border:0;border-spacing:0;color:#000;cursor:auto;direction:ltr;font-family:\"lucida grande\", tahoma, verdana, arial, sans-serif;font-size:11px;font-style:normal;font-variant:normal;font-weight:normal;letter-spacing:normal;line-height:1;margin:0;overflow:visible;padding:0;text-align:left;text-decoration:none;text-indent:0;text-shadow:none;text-transform:none;visibility:visible;white-space:normal;word-spacing:normal}.fb_reset>div{overflow:hidden}.fb_link img{border:none}\n.fb_dialog{background:rgba(82, 82, 82, .7);position:absolute;top:-10000px;z-index:10001}.fb_reset .fb_dialog_legacy{overflow:visible}.fb_dialog_advanced{padding:10px;-moz-border-radius:8px;-webkit-border-radius:8px;border-radius:8px}.fb_dialog_content{background:#fff;color:#333}.fb_dialog_close_icon{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 0 transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif);cursor:pointer;display:block;height:15px;position:absolute;right:18px;top:17px;width:15px}.fb_dialog_mobile .fb_dialog_close_icon{top:5px;left:5px;right:auto}.fb_dialog_padding{background-color:transparent;position:absolute;width:1px;z-index:-1}.fb_dialog_close_icon:hover{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 -15px transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif)}.fb_dialog_close_icon:active{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 -30px transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif)}.fb_dialog_loader{background-color:#f2f2f2;border:1px solid #606060;font-size:24px;padding:20px}.fb_dialog_top_left,.fb_dialog_top_right,.fb_dialog_bottom_left,.fb_dialog_bottom_right{height:10px;width:10px;overflow:hidden;position:absolute}.fb_dialog_top_left{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 0;left:-10px;top:-10px}.fb_dialog_top_right{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -10px;right:-10px;top:-10px}.fb_dialog_bottom_left{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -20px;bottom:-10px;left:-10px}.fb_dialog_bottom_right{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -30px;right:-10px;bottom:-10px}.fb_dialog_vert_left,.fb_dialog_vert_right,.fb_dialog_horiz_top,.fb_dialog_horiz_bottom{position:absolute;background:#525252;filter:alpha(opacity=70);opacity:.7}.fb_dialog_vert_left,.fb_dialog_vert_right{width:10px;height:100\u0025}.fb_dialog_vert_left{margin-left:-10px}.fb_dialog_vert_right{right:0;margin-right:-10px}.fb_dialog_horiz_top,.fb_dialog_horiz_bottom{width:100\u0025;height:10px}.fb_dialog_horiz_top{margin-top:-10px}.fb_dialog_horiz_bottom{bottom:0;margin-bottom:-10px}.fb_dialog_iframe{line-height:0}.fb_dialog_content .dialog_title{background:#6d84b4;border:1px solid #3b5998;color:#fff;font-size:14px;font-weight:bold;margin:0}.fb_dialog_content .dialog_title>span{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yd\/r\/Cou7n-nqK52.gif) no-repeat 5px 50\u0025;float:left;padding:5px 0 7px 26px}body.fb_hidden{-webkit-transform:none;height:100\u0025;margin:0;overflow:visible;position:absolute;top:-10000px;left:0;width:100\u0025}.fb_dialog.fb_dialog_mobile.loading{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ya\/r\/3rhSv5V8j3o.gif) white no-repeat 50\u0025 50\u0025;min-height:100\u0025;min-width:100\u0025;overflow:hidden;position:absolute;top:0;z-index:10001}.fb_dialog.fb_dialog_mobile.loading.centered{max-height:590px;min-height:590px;max-width:500px;min-width:500px}#fb-root #fb_dialog_ipad_overlay{background:rgba(0, 0, 0, .45);position:absolute;left:0;top:0;width:100\u0025;min-height:100\u0025;z-index:10000}#fb-root #fb_dialog_ipad_overlay.hidden{display:none}.fb_dialog.fb_dialog_mobile.loading iframe{visibility:hidden}.fb_dialog_content .dialog_header{-webkit-box-shadow:white 0 1px 1px -1px inset;background:-webkit-gradient(linear, 0\u0025 0\u0025, 0\u0025 100\u0025, from(#738ABA), to(#2C4987));border-bottom:1px solid;border-color:#1d4088;color:#fff;font:14px Helvetica, sans-serif;font-weight:bold;text-overflow:ellipsis;text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0;vertical-align:middle;white-space:nowrap}.fb_dialog_content .dialog_header table{-webkit-font-smoothing:subpixel-antialiased;height:43px;width:100\u0025}.fb_dialog_content .dialog_header td.header_left{font-size:12px;padding-left:5px;vertical-align:middle;width:60px}.fb_dialog_content .dialog_header td.header_right{font-size:12px;padding-right:5px;vertical-align:middle;width:60px}.fb_dialog_content .touchable_button{background:-webkit-gradient(linear, 0\u0025 0\u0025, 0\u0025 100\u0025, from(#4966A6), color-stop(.5, #355492), to(#2A4887));border:1px solid #29447e;-webkit-background-clip:padding-box;-webkit-border-radius:3px;-webkit-box-shadow:rgba(0, 0, 0, .117188) 0 1px 1px inset, rgba(255, 255, 255, .167969) 0 1px 0;display:inline-block;margin-top:3px;max-width:85px;line-height:18px;padding:4px 12px;position:relative}.fb_dialog_content .dialog_header .touchable_button input{border:none;background:none;color:#fff;font:12px Helvetica, sans-serif;font-weight:bold;margin:2px -12px;padding:2px 6px 3px 6px;text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0}.fb_dialog_content .dialog_header .header_center{color:#fff;font-size:16px;font-weight:bold;line-height:18px;text-align:center;vertical-align:middle}.fb_dialog_content .dialog_content{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/y9\/r\/jKEcVPZFk-2.gif) no-repeat 50\u0025 50\u0025;border:1px solid #555;border-bottom:0;border-top:0;height:150px}.fb_dialog_content .dialog_footer{background:#f2f2f2;border:1px solid #555;border-top-color:#ccc;height:40px}#fb_dialog_loader_close{float:left}.fb_dialog.fb_dialog_mobile .fb_dialog_close_button{text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0}.fb_dialog.fb_dialog_mobile .fb_dialog_close_icon{visibility:hidden}\n.fb_iframe_widget{display:inline-block;position:relative}.fb_iframe_widget span{display:inline-block;position:relative;text-align:justify}.fb_iframe_widget iframe{position:absolute}.fb_iframe_widget_lift{z-index:1}.fb_hide_iframes iframe{position:relative;left:-10000px}.fb_iframe_widget_loader{position:relative;display:inline-block}.fb_iframe_widget_fluid{display:inline}.fb_iframe_widget_fluid span{width:100\u0025}.fb_iframe_widget_loader iframe{min-height:32px;z-index:2;zoom:1}.fb_iframe_widget_loader .FB_Loader{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/y9\/r\/jKEcVPZFk-2.gif) no-repeat;height:32px;width:32px;margin-left:-16px;position:absolute;left:50\u0025;z-index:4}\n.fb_connect_bar_container div,.fb_connect_bar_container span,.fb_connect_bar_container a,.fb_connect_bar_container img,.fb_connect_bar_container strong{background:none;border-spacing:0;border:0;direction:ltr;font-style:normal;font-variant:normal;letter-spacing:normal;line-height:1;margin:0;overflow:visible;padding:0;text-align:left;text-decoration:none;text-indent:0;text-shadow:none;text-transform:none;visibility:visible;white-space:normal;word-spacing:normal;vertical-align:baseline}.fb_connect_bar_container{position:fixed;left:0 !important;right:0 !important;height:42px !important;padding:0 25px !important;margin:0 !important;vertical-align:middle !important;border-bottom:1px solid #333 !important;background:#3b5998 !important;z-index:99999999 !important;overflow:hidden !important}.fb_connect_bar_container_ie6{position:absolute;top:expression(document.compatMode==\"CSS1Compat\"? document.documentElement.scrollTop+\"px\":body.scrollTop+\"px\")}.fb_connect_bar{position:relative;margin:auto;height:100\u0025;width:100\u0025;padding:6px 0 0 0 !important;background:none;color:#fff !important;font-family:\"lucida grande\", tahoma, verdana, arial, sans-serif !important;font-size:13px !important;font-style:normal !important;font-variant:normal !important;font-weight:normal !important;letter-spacing:normal !important;line-height:1 !important;text-decoration:none !important;text-indent:0 !important;text-shadow:none !important;text-transform:none !important;white-space:normal !important;word-spacing:normal !important}.fb_connect_bar a:hover{color:#fff}.fb_connect_bar .fb_profile img{height:30px;width:30px;vertical-align:middle;margin:0 6px 5px 0}.fb_connect_bar div a,.fb_connect_bar span,.fb_connect_bar span a{color:#bac6da;font-size:11px;text-decoration:none}.fb_connect_bar .fb_buttons{float:right;margin-top:7px}\n.fbpluginrecommendationsbarleft,.fbpluginrecommendationsbarright{position:fixed !important;bottom:0;z-index:999}.fbpluginrecommendationsbarleft{left:10px}.fbpluginrecommendationsbarright{right:10px}","components":["css:fb.css.base","css:fb.css.dialog","css:fb.css.iframewidget","css:fb.css.connectbarwidget","css:fb.css.plugin.recommendationsbar"]});__d("ApiClientConfig",[],{"FlashRequest":{"swfUrl":"https:\/\/connect.facebook.net\/rsrc.php\/v1\/yW\/r\/PvklbuW2Ycn.swf"}});__d("JSSDKCanvasPrefetcherConfig",[],{"blacklist":[144959615576466],"sampleRate":500});__d("JSSDKPluginPipeConfig",[],{"threshold":0,"enabledApps":{"209753825810663":1,"187288694643718":1}});__d("JSSDKConnectBarConfig",[],{"imgs":{"buttonUrl":"rsrc.php\/v2\/yY\/r\/h_Y6u1wrZPW.png","missingProfileUrl":"rsrc.php\/v2\/yo\/r\/UlIqmHJn-SK.gif"}});


__d("QueryString",[],function(global,require,requireDynamic,requireLazy,module,exports) {


function encode(/*object*/ bag) /*string*/ {__t([bag, 'object', 'bag']);return __t([function() {
  var pairs = [];
  ES(ES('Object', 'keys', false,bag).sort(), 'forEach', true,function(key) {
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
  });
  return pairs.join('&');
}.apply(this, arguments), 'string']);}__w(encode, {"signature":"function(object):string"}); 


function decode(/*string*/ str, /*?boolean*/ strict) /*object*/ {__t([str, 'string', 'str'], [strict, '?boolean', 'strict']);return __t([function() {
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
}.apply(this, arguments), 'object']);}__w(decode, {"signature":"function(string,?boolean):object"}); 


function appendToUrl(/*string*/ url, params) /*string*/ {__t([url, 'string', 'url']);return __t([function() {
  return url +
    (~ES(url, 'indexOf', true,'?') ? '&' : '?') +
    (typeof params === 'string'
      ? params
      : QueryString.encode(params));
}.apply(this, arguments), 'string']);}__w(appendToUrl, {"signature":"function(string):string"}); 

var QueryString = {
  encode: encode,
  decode: decode,
  appendToUrl: appendToUrl
};

module.exports = QueryString;


},null);


__d("ManagedError",[],function(global,require,requireDynamic,requireLazy,module,exports) {
function ManagedError(message, innerError) {
  Error.prototype.constructor.call(this, message);
  this.message = message;
  this.innerError = innerError;
}__w(ManagedError, {"type":"ManagedError"}); 
ManagedError.prototype = new Error();
ManagedError.prototype.constructor = ManagedError;

module.exports = ManagedError;


},null);


__d("AssertionError",["ManagedError"],function(global,require,requireDynamic,requireLazy,module,exports,ManagedError) {
   

function AssertionError(message) {
  ManagedError.prototype.constructor.apply(this, arguments);
}
AssertionError.prototype = new ManagedError();
AssertionError.prototype.constructor = AssertionError;

module.exports = AssertionError;



},null);


__d("sprintf",[],function(global,require,requireDynamic,requireLazy,module,exports) {

function sprintf(format ) {__t([format, 'string', 'format']);var args=Array.prototype.slice.call(arguments,1);
  var index = 0;
  return format.replace(/%s/g, function(match)  {return args[index++];});
}__w(sprintf, {"signature":"function(string)"}); 

module.exports = sprintf;


},null);


__d("Assert",["AssertionError","sprintf"],function(global,require,requireDynamic,requireLazy,module,exports,AssertionError,sprintf) {
   

   


function assert(/*boolean*/ expression, /*?string*/ message) /*boolean*/ {__t([expression, 'boolean', 'expression'], [message, '?string', 'message']);return __t([function() {
  if (typeof expression !== 'boolean' || !expression) {
    throw new AssertionError(message);
  }
  return expression;
}.apply(this, arguments), 'boolean']);}__w(assert, {"signature":"function(boolean,?string):boolean"}); 


function assertType(/*string*/ type, expression, /*?string*/ message) {__t([type, 'string', 'type'], [message, '?string', 'message']);
  var actualType;

  if (expression === undefined) {
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
}__w(assertType, {"signature":"function(string,?string)"}); 


function assertInstanceOf(/*function*/ type, expression, /*?string*/ message) {__t([type, 'function', 'type'], [message, '?string', 'message']);
  assert(
    expression instanceof type,
    message || 'Expression not instance of type'
  );
  return expression;
}__w(assertInstanceOf, {"signature":"function(function,?string)"}); 

function define(/*string*/ type, /*function*/ test) {__t([type, 'string', 'type'], [test, 'function', 'test']);
  Assert['is' + type] = test;
  Assert['maybe' + type] = function(expression, message) {
    
    if (expression != null) {
      test(expression, message);
    }
  };
}__w(define, {"signature":"function(string,function)"}); 

var Assert = {
  isInstanceOf: assertInstanceOf,
  isTrue      : assert,
  isTruthy    : __w(function(expression, /*?string*/ message) /*boolean*/ {__t([message, '?string', 'message']);return __t([function() {
    return assert(!!expression, message);
  }.apply(this, arguments), 'boolean']);}, {"signature":"function(?string):boolean"}),
  type        : assertType,
  define      : __w(function(/*string*/ type, /*function*/ fn) {__t([type, 'string', 'type'], [fn, 'function', 'fn']);
    type = type.substring(0, 1).toUpperCase() +
      type.substring(1).toLowerCase();

    define(type, function(expression, message) {
      assert(fn(expression), message);
    });
  }, {"signature":"function(string,function)"})
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
 'Undefined'], 'forEach', true,__w(function(/*string*/ type) {__t([type, 'string', 'type']);
   define(type, ES(assertType, 'bind', true,null, type.toLowerCase()));
 }, {"signature":"function(string)"}));

module.exports = Assert;


},null);

__d("Type",["Assert"],function(global,require,requireDynamic,requireLazy,module,exports,Assert) {
   


function Type() {
  var mixins = this.__mixins;
  if (mixins) {
    for (var i = 0; i < mixins.length; i++) {
      mixins[i].apply(this, arguments);
    }
  }
}__w(Type, {"type":"Type"}); 


function instanceOf(/*function*/ constructor, which) /*boolean*/ {__t([constructor, 'function', 'constructor']);return __t([function() {

  
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
}.apply(this, arguments), 'boolean']);}__w(instanceOf, {"signature":"function(function):boolean"}); 


function mixin(/*function*/ to, from) {__t([to, 'function', 'to']);
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
    
    ES(ES('Object', 'keys', false,mixinFrom), 'forEach', true,function(key) {
      prototype[key] = mixinFrom[key];
    });
  }
}__w(mixin, {"signature":"function(function)"}); 


function extend(/*?function*/ from, /*?object*/ prototype, mixins)
    /*function*/ {__t([from, '?function', 'from'], [prototype, '?object', 'prototype']);return __t([function() {
  var constructor = prototype && prototype.hasOwnProperty('constructor')
    ? prototype.constructor
    : function() {this.parent.apply(this, arguments);};

  Assert.isFunction(constructor);

  
  if (from && from.prototype instanceof Type === false) {
    throw new Error('parent type does not inherit from Type');
  }
  from = from || Type;

  
  var F = new Function();
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

  
  constructor.prototype.parent = function() {
    this.parent = from.prototype.parent;
    from.apply(this, arguments);
  };

  // Allow the new type to call this.parentCall('method'/*, args*/);
  constructor.prototype.parentCall = __w(function(/*string*/ method) {__t([method, 'string', 'method']);
    return from.prototype[method].apply(this,
      Array.prototype.slice.call(arguments, 1));
  }, {"signature":"function(string)"});

  constructor.extend = __w(function(/*?object*/ prototype, mixins) {__t([prototype, '?object', 'prototype']);
    return extend(this, prototype, mixins);
  }, {"signature":"function(?object)"});
  return constructor;
}.apply(this, arguments), 'function']);}__w(extend, {"signature":"function(?function,?object):function"}); 

ES('Object', 'assign', false,Type.prototype, {
  instanceOf: __w(function(/*function*/ type) /*boolean*/ {__t([type, 'function', 'type']);return __t([function() {
    return instanceOf(type, this);
  }.apply(this, arguments), 'boolean']);}, {"signature":"function(function):boolean"})
});

ES('Object', 'assign', false,Type, {
  extend: __w(function(prototype, mixins) /*function*/ {return __t([function() {
    return typeof prototype === 'function'
      ? extend.apply(null, arguments)
      : extend(null, prototype, mixins);
  }.apply(this, arguments), 'function']);}, {"signature":"function():function"}),
  instanceOf: instanceOf
});

module.exports = Type;


},null);


__d("ObservableMixin",[],function(global,require,requireDynamic,requireLazy,module,exports) {
function ObservableMixin() {
  this.__observableEvents = {};
}__w(ObservableMixin, {"type":"ObservableMixin"}); 

ObservableMixin.prototype = {

  
  inform: __w(function(/*string*/ what /*, args*/) {__t([what, 'string', 'what']);

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
          
          setTimeout(function() { throw e; }, 0);
        }
      }
    }
    return this;
  }, {"signature":"function(string)"}),

  
  getSubscribers: __w(function(/*string*/ toWhat) /*array*/ {__t([toWhat, 'string', 'toWhat']);return __t([function() {

    return this.__observableEvents[toWhat] ||
      (this.__observableEvents[toWhat] = []);
  }.apply(this, arguments), 'array']);}, {"signature":"function(string):array"}),

  
  clearSubscribers: __w(function(/*string*/ toWhat) {__t([toWhat, 'string', 'toWhat']);

    if (toWhat) {
      this.__observableEvents[toWhat] = [];
    }
    return this;
  }, {"signature":"function(string)"}),

  
  clearAllSubscribers: function() {
    this.__observableEvents = {};
    return this;
  },

  
  subscribe: __w(function(/*string*/ toWhat, /*function*/ withWhat) {__t([toWhat, 'string', 'toWhat'], [withWhat, 'function', 'withWhat']);

    var list = this.getSubscribers(toWhat);
    list.push(withWhat);
    return this;
  }, {"signature":"function(string,function)"}),

  
  unsubscribe: __w(function(/*string*/ toWhat, /*function*/ withWhat) {__t([toWhat, 'string', 'toWhat'], [withWhat, 'function', 'withWhat']);

    var list = this.getSubscribers(toWhat);
    for (var i = 0; i < list.length; i++) {
      if (list[i] === withWhat) {
        list.splice(i, 1);
        break;
      }
    }
    return this;
  }, {"signature":"function(string,function)"}),

  
  monitor: __w(function(/*string*/ toWhat, /*function*/ withWhat) {__t([toWhat, 'string', 'toWhat'], [withWhat, 'function', 'withWhat']);
    if (!withWhat()) {
      var monitor = ES(function(value) {
        if (withWhat.apply(withWhat, arguments)) {
          this.unsubscribe(toWhat, monitor);
        }
      }, 'bind', true,this);
      this.subscribe(toWhat, monitor);
    }
    return this;
  }, {"signature":"function(string,function)"})

};


module.exports = ObservableMixin;


},null);


__d("sdk.Model",["Type","ObservableMixin"],function(global,require,requireDynamic,requireLazy,module,exports,Type,ObservableMixin) {
   
   

var Model = Type.extend({
  constructor: __w(function(/*object*/ properties) {__t([properties, 'object', 'properties']);
    this.parent();

    
    var propContainer = {};
    var model = this;

    ES(ES('Object', 'keys', false,properties), 'forEach', true,__w(function(/*string*/ name) {__t([name, 'string', 'name']);
      
      propContainer[name] = properties[name];

      
      model['set' + name] = function(value) {
        if (value === propContainer[name]) {
          return this;
        }
        propContainer[name] = value;
        model.inform(name + '.change', value);
        return model;
      };

      
      model['get' + name] = function() {
        return propContainer[name];
      };
    }, {"signature":"function(string)"}));
  }, {"signature":"function(object)"})
}, ObservableMixin);

module.exports = Model;


},null);


__d("sdk.Runtime",["sdk.Model","JSSDKRuntimeConfig"],function(global,require,requireDynamic,requireLazy,module,exports,Model,RuntimeConfig) {
   
   


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
  KidDirectedSite: undefined,
  Locale: RuntimeConfig.locale,
  LoginStatus: undefined,
  Revision: RuntimeConfig.revision,
  Rtl: RuntimeConfig.rtl,
  Scope: undefined,
  Secure: undefined,
  UseCookie: false,
  UserID: '',
  Version: undefined
});

ES('Object', 'assign', false,Runtime, {

  ENVIRONMENTS: ENVIRONMENTS,

  isEnvironment: __w(function(/*number*/ target) /*boolean*/ {__t([target, 'number', 'target']);return __t([function() {
    var environment = this.getEnvironment();
    return (target | environment) === environment;
  }.apply(this, arguments), 'boolean']);}, {"signature":"function(number):boolean"})
});

(function() {
  var environment = /app_runner/.test(window.name)
    ? ENVIRONMENTS.PAGETAB
    : /iframe_canvas/.test(window.name)
      ? ENVIRONMENTS.CANVAS
      : ENVIRONMENTS.UNKNOWN;

  
  if ((environment | ENVIRONMENTS.PAGETAB) === environment) {
    environment = environment | ENVIRONMENTS.CANVAS;
  }
  Runtime.setEnvironment(environment);
})();

module.exports = Runtime;


},null);


__d("sdk.Cookie",["QueryString","sdk.Runtime"],function(global,require,requireDynamic,requireLazy,module,exports,QueryString,Runtime) {
   
   



var domain = null;


function setRaw(/*string*/ prefix, /*string*/ val, /*number*/ ts) {__t([prefix, 'string', 'prefix'], [val, 'string', 'val'], [ts, 'number', 'ts']);
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
}__w(setRaw, {"signature":"function(string,string,number)"}); 

function getRaw(/*string*/ prefix) /*?string*/ {__t([prefix, 'string', 'prefix']);return __t([function() {
  prefix = prefix + Runtime.getClientID();
  var regExp = new RegExp('\\b' + prefix + '=([^;]*)\\b');
  return regExp.test(document.cookie)
    ? RegExp.$1
    : null;
}.apply(this, arguments), '?string']);}__w(getRaw, {"signature":"function(string):?string"}); 

var Cookie = {
  setDomain: __w(function(/*?string*/ val) {__t([val, '?string', 'val']);
    domain = val;
    
    var meta  = QueryString.encode({
      base_domain: domain && domain !== '.' ? domain : ''
    });
    var expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 1);
    setRaw('fbm_', meta, expiration.getTime());
  }, {"signature":"function(?string)"}),

  getDomain: __w(function() /*?string*/ {return __t([function() {
    return domain;
  }.apply(this, arguments), '?string']);}, {"signature":"function():?string"}),

  
  loadMeta: __w(function() /*?object*/ {return __t([function() {
    var cookie = getRaw('fbm_');
    if (cookie) {
      // url encoded session stored as "sub-cookies"
      var meta = QueryString.decode(cookie);
      if (!domain) {
        
        domain = meta.base_domain;
      }
      return meta;
    }
  }.apply(this, arguments), '?object']);}, {"signature":"function():?object"}),

  
  loadSignedRequest: __w(function() /*?string*/ {return __t([function() {
    return getRaw('fbsr_');
  }.apply(this, arguments), '?string']);}, {"signature":"function():?string"}),

  
  setSignedRequestCookie: __w(function(/*string*/ signedRequest,
      /*number*/ expiration) {__t([signedRequest, 'string', 'signedRequest'], [expiration, 'number', 'expiration']);
    if (!signedRequest) {
      throw new Error('Value passed to Cookie.setSignedRequestCookie ' +
                      'was empty.');
    }
    setRaw('fbsr_', signedRequest, expiration);
  }, {"signature":"function(string,number)"}),

  
  clearSignedRequestCookie: function() {
    setRaw('fbsr_', '', 0);
  },

  setRaw: setRaw
};

module.exports = Cookie;


},null);


__d("guid",[],function(global,require,requireDynamic,requireLazy,module,exports) {
function guid() {
  return 'f' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
}

module.exports = guid;


},null);


__d("UserAgent",[],function(global,require,requireDynamic,requireLazy,module,exports) {


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
}

var UserAgent = {

  
  ie: function() {
    return _populate() || _ie;
  },

  
  ieCompatibilityMode: function() {
    return _populate() || (_ie_real_version > _ie);
  },


  
  ie64: function() {
    return UserAgent.ie() && _win64;
  },

  
  firefox: function() {
    return _populate() || _firefox;
  },


  
  opera: function() {
    return _populate() || _opera;
  },


  
  webkit: function() {
    return _populate() || _webkit;
  },

  
  safari: function() {
    return UserAgent.webkit();
  },

  
  chrome : function() {
    return _populate() || _chrome;
  },


  
  windows: function() {
    return _populate() || _windows;
  },


  
  osx: function() {
    return _populate() || _osx;
  },

  
  linux: function() {
    return _populate() || _linux;
  },

  
  iphone: function() {
    return _populate() || _iphone;
  },

  mobile: function() {
    return _populate() || (_iphone || _ipad || _android || _mobile);
  },

  nativeApp: function() {
    
    return _populate() || _native;
  },

  android: function() {
    return _populate() || _android;
  },

  ipad: function() {
    return _populate() || _ipad;
  }
};

module.exports = UserAgent;


},null);


__d("hasNamePropertyBug",["guid","UserAgent"],function(global,require,requireDynamic,requireLazy,module,exports,guid,UserAgent) {
   
   

var hasBug = UserAgent.ie() ? undefined : false;




function test() /*boolean*/ {return __t([function() {
    var form = document.createElement("form"),
        input = form.appendChild(document.createElement("input"));
    input.name = guid();
    hasBug = input !== form.elements[input.name];
    form = input = null;
    return hasBug;
}.apply(this, arguments), 'boolean']);}__w(test, {"signature":"function():boolean"}); 

function hasNamePropertyBug() /*boolean*/ {return __t([function() {
  return typeof hasBug === 'undefined'
    ? test()
    : hasBug;
}.apply(this, arguments), 'boolean']);}__w(hasNamePropertyBug, {"signature":"function():boolean"}); 

module.exports = hasNamePropertyBug;


},null);


__d("wrapFunction",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var wrappers = {};
function wrapFunction(/*function*/ fn, /*?string*/ type, /*?string*/ source)
    /*function*/ {__t([fn, 'function', 'fn'], [type, '?string', 'type'], [source, '?string', 'source']);return __t([function() {
  type = type || 'default';

  return function() {
    var callee = type in wrappers
      ? wrappers[type](fn, source)
      : fn;

    return callee.apply(this, arguments);
  };
}.apply(this, arguments), 'function']);}__w(wrapFunction, {"signature":"function(function,?string,?string):function"}); 

wrapFunction.setWrapper = __w(function(/*function*/ fn, /*?string*/ type) {__t([fn, 'function', 'fn'], [type, '?string', 'type']);
  type = type || 'default';
  wrappers[type] = fn;
}, {"signature":"function(function,?string)"});

module.exports = wrapFunction;


},null);


__d("DOMEventListener",["wrapFunction"],function(global,require,requireDynamic,requireLazy,module,exports,wrapFunction) {
   

var add, remove;

if (window.addEventListener) {

  
  add = __w(function(target, /*string*/ name, /*function*/ listener) {__t([name, 'string', 'name'], [listener, 'function', 'listener']);
    listener.wrapper =
      wrapFunction(listener, 'entry', 'DOMEventListener.add ' + name);
    target.addEventListener(name, listener.wrapper, false);
  }, {"signature":"function(string,function)"});
  remove = __w(function(target, /*string*/ name, /*function*/ listener) {__t([name, 'string', 'name'], [listener, 'function', 'listener']);
    target.removeEventListener(name, listener.wrapper, false);
  }, {"signature":"function(string,function)"});

} else if (window.attachEvent) {

  
  add = __w(function(target, /*string*/ name, /*function*/ listener) {__t([name, 'string', 'name'], [listener, 'function', 'listener']);
    listener.wrapper =
      wrapFunction(listener, 'entry', 'DOMEventListener.add ' + name);
    target.attachEvent('on' + name, listener.wrapper);
  }, {"signature":"function(string,function)"});
  remove = __w(function(target, /*string*/ name, /*function*/ listener) {__t([name, 'string', 'name'], [listener, 'function', 'listener']);
    target.detachEvent('on' + name, listener.wrapper);
  }, {"signature":"function(string,function)"});

} else {
  remove = add = function()  {};
}

var DOMEventListener = {

  
  add: __w(function(target, /*string*/ name, /*function*/ listener) {__t([name, 'string', 'name'], [listener, 'function', 'listener']);
    
    
    add(target, name, listener);
    return {
      
      
      // someone is hanging on to this 'event' object.
      remove: function() {
        remove(target, name, listener);
        target = null;
      }
    };
  }, {"signature":"function(string,function)"}),

  
  remove: remove

};
module.exports = DOMEventListener;


},null);


__d("sdk.createIframe",["guid","hasNamePropertyBug","DOMEventListener"],function(global,require,requireDynamic,requireLazy,module,exports,guid,hasNamePropertyBug,DOMEventListener) {
   
   
   

function createIframe(/*object*/ opts) /*DOMElement*/ {__t([opts, 'object', 'opts']);return __t([function() {
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

  
  //       into the container, so we set it to "javascript:false" as a
  
  //       instead default to "about:blank", which causes SSL mixed-content
  
  frame.src = "javascript:false";
  root.appendChild(frame);
  if (onLoad) {
    var onLoadListener = DOMEventListener.add(frame, 'load', function()  {
      onLoadListener.remove();
      onLoad();
    });
  }

  if (onError) {
    var onErrorListener = DOMEventListener.add(frame, 'error', function()  {
      onErrorListener.remove();
      onError();
    });
  }

  
  // "javascript:false" to work around the IE issue mentioned above)
  frame.src = src;
  return frame;
}.apply(this, arguments), 'DOMElement']);}__w(createIframe, {"signature":"function(object):DOMElement"}); 

module.exports = createIframe;


},null);

__d("DOMWrapper",[],function(global,require,requireDynamic,requireLazy,module,exports) {
/*global self:true*/
var rootElement,
    windowRef;


// `obj || default` pattern to account for 'resetting'.
var DOMWrapper = {
  setRoot: __w(function(/*?DOMElement*/ root) {__t([root, '?DOMElement', 'root']);
    rootElement = root;
  }, {"signature":"function(?DOMElement)"}),
  getRoot: __w(function() /*DOMElement*/ {return __t([function() {
    return rootElement || document.body;
  }.apply(this, arguments), 'DOMElement']);}, {"signature":"function():DOMElement"}),
  setWindow: function(win) {
    windowRef = win;
  },
  getWindow: function() {
    return windowRef || self;
  }
};

module.exports = DOMWrapper;


},null);


__d("sdk.feature",["JSSDKConfig"],function(global,require,requireDynamic,requireLazy,module,exports,SDKConfig) {
   

function feature(/*string*/ name, defaultValue) {__t([name, 'string', 'name']);
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

  return typeof defaultValue !== 'undefined'
    ? defaultValue
    : null;
}__w(feature, {"signature":"function(string)"}); 

module.exports = feature;


},null);


__d("sdk.getContextType",["UserAgent","sdk.Runtime"],function(global,require,requireDynamic,requireLazy,module,exports,UserAgent,Runtime) {
   
   

function getContextType() /*number*/ {return __t([function() {
  
  
  
  
  
  
  if (UserAgent.nativeApp()) {
    return 3;
  }
  if (UserAgent.mobile()) {
    return 2;
  }
  if (Runtime.isEnvironment(Runtime.ENVIRONMENTS.CANVAS)) {
    return 5;
  }
  return 1;
}.apply(this, arguments), 'number']);}__w(getContextType, {"signature":"function():number"}); 

module.exports = getContextType;


},null);


__d("UrlMap",["UrlMapConfig"],function(global,require,requireDynamic,requireLazy,module,exports,UrlMapConfig) {
   

var UrlMap = {
  
  resolve: __w(function(/*string*/ key, /*?boolean*/ https) /*string*/ {__t([key, 'string', 'key'], [https, '?boolean', 'https']);return __t([function() {
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
  }.apply(this, arguments), 'string']);}, {"signature":"function(string,?boolean):string"})
};

module.exports = UrlMap;


},null);


__d("sdk.Impressions",["guid","QueryString","sdk.Runtime","UrlMap"],function(global,require,requireDynamic,requireLazy,module,exports,guid,QueryString,Runtime,UrlMap) {
   
   
   
   

function request(/*object*/ params) {__t([params, 'object', 'params']);
  var clientID = Runtime.getClientID();

  if (!params.api_key && clientID) {
    params.api_key = clientID;
  }

  params.kid_directed_site = Runtime.getKidDirectedSite();

  var image = new Image();

  image.src = QueryString.appendToUrl(
    UrlMap.resolve('www', /*force ssl*/true) +
      '/impression.php/' + guid() + '/',
    params
  );
}__w(request, {"signature":"function(object)"}); 

var Impressions = {
  log: __w(function(/*number*/ lid, /*object*/ payload) {__t([lid, 'number', 'lid'], [payload, 'object', 'payload']);
    if (!payload.source) {
      payload.source = 'jssdk';
    }

    request({
      lid: lid, 
      payload: ES('JSON', 'stringify', false,payload)
    });
  }, {"signature":"function(number,object)"}),

  impression: request
};

module.exports = Impressions;


},null);


__d("Log",["sprintf"],function(global,require,requireDynamic,requireLazy,module,exports,sprintf) {
   

var Level = {
  DEBUG    : 3,
  INFO     : 2,
  WARNING  : 1,
  ERROR    : 0
};

function log(/*string*/ name, /*number*/ level/*, args*/ ) {__t([name, 'string', 'name'], [level, 'number', 'level']);
  var args = Array.prototype.slice.call(arguments, 2);
  var msg = sprintf.apply(null, args);
  var console = window.console;
  if (console && Log.level >= level) {
    console[name in console ? name : 'log'](msg);
  }
}__w(log, {"signature":"function(string,number)"}); 

var Log = {
  
  level: __DEV__ ? 3 : -1,

  
  Level: Level,

  
  debug : ES(log, 'bind', true,null, 'debug', Level.DEBUG),
  info  : ES(log, 'bind', true,null, 'info',  Level.INFO),
  warn  : ES(log, 'bind', true,null, 'warn',  Level.WARNING),
  error : ES(log, 'bind', true,null, 'error', Level.ERROR)
};
module.exports = Log;



},null);


__d("Base64",[],function(global,require,requireDynamic,requireLazy,module,exports) {



var en =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function en3(c) {
  c = (c.charCodeAt(0) << 16) | (c.charCodeAt(1) << 8) | c.charCodeAt(2);
  return String.fromCharCode(
    en.charCodeAt(c >>> 18), en.charCodeAt((c >>> 12) & 63),
    en.charCodeAt((c >>> 6) & 63), en.charCodeAt(c & 63));
}


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
}

var Base64 = {
  encode: function(s) {
    
    s = unescape(encodeURI(s));
    var i = (s.length + 2) % 3;
    s = (s + '\0\0'.slice(i)).replace(/[\s\S]{3}/g, en3);
    return s.slice(0, s.length + i - 2) + '=='.slice(i);
  },
  decode: function(s) {
    
    s = s.replace(/[^A-Za-z0-9+\/]/g, '');
    var i = (s.length + 3) & 3;
    s = (s + 'AAA'.slice(i)).replace(/..../g, de4);
    s = s.slice(0, s.length + i - 3);
    
    try { return decodeURIComponent(escape(s)); }
    catch (_) { throw new Error('Not valid UTF-8'); }
  },
  encodeObject: function(obj) {
    return Base64.encode(ES('JSON', 'stringify', false,obj));
  },
  decodeObject: function(b64) {
    return ES('JSON', 'parse', false,Base64.decode(b64));
  },
  
  encodeNums: function(l) {
    return String.fromCharCode.apply(String, ES(l, 'map', true,function(val) {
      return en.charCodeAt((val | -(val > 63)) & -(val > 0) & 63);
    }));
  }
};

module.exports = Base64;


},null);


__d("sdk.SignedRequest",["Base64"],function(global,require,requireDynamic,requireLazy,module,exports,Base64) {
   

function parse(/*?string*/ signed_request) /*?object*/ {__t([signed_request, '?string', 'signed_request']);return __t([function() {
  if (!signed_request) {
    return null;
  }

  
  var payload = signed_request.split('.', 2)[1]
    .replace(/\-/g, '+').replace(/\_/g, '/');
  return Base64.decodeObject(payload);
}.apply(this, arguments), '?object']);}__w(parse, {"signature":"function(?string):?object"}); 


var SignedRequest = {
  parse: parse
};

module.exports = SignedRequest;


},null);


__d("URIRFC3986",[],function(global,require,requireDynamic,requireLazy,module,exports) {
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

  
  parse: __w(function(uriString) {__t([uriString, 'string', 'uriString']);return __t([function() {
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
  }.apply(this, arguments), '?object']);}, {"signature":"function(string):?object"})
};

module.exports = URIRFC3986;


},null);


__d("createObjectFrom",[],function(global,require,requireDynamic,requireLazy,module,exports) {

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
}

module.exports = createObjectFrom;


},null);


__d("URISchemes",["createObjectFrom"],function(global,require,requireDynamic,requireLazy,module,exports,createObjectFrom) {
   

var defaultSchemes = createObjectFrom([
  'fb',        
  'fbcf',
  'fbconnect', 
  'fb-messenger', 
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
  'sms'        
]);

var URISchemes = {

  
  isAllowed: __w(function(schema) {__t([schema, '?string', 'schema']);return __t([function() {
    if (!schema) {
      return true;
    }
    return defaultSchemes.hasOwnProperty(schema.toLowerCase());
  }.apply(this, arguments), 'boolean']);}, {"signature":"function(?string):boolean"})
};

module.exports = URISchemes;


},null);


__d("copyProperties",[],function(global,require,requireDynamic,requireLazy,module,exports) {

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
}

module.exports = copyProperties;


},null);


__d("eprintf",[],function(global,require,requireDynamic,requireLazy,module,exports) {


var eprintf = function(errorMessage/*, arg1, arg2, ...*/) {
  var args = ES(Array.prototype.slice.call(arguments), 'map', true,function(arg) {
    return String(arg);
  });
  var expectedLength = errorMessage.split('%s').length - 1;

  if (expectedLength !== args.length - 1) {
    
    return eprintf('eprintf args number mismatch: %s', ES('JSON', 'stringify', false,args));
  }

  var index = 1;
  return errorMessage.replace(/%s/g, function(whole) {
    return String(args[index++]);
  });
};

module.exports = eprintf;


},null);


__d("ex",["eprintf"],function(global,require,requireDynamic,requireLazy,module,exports,eprintf) {
   



var ex = function() {var args=Array.prototype.slice.call(arguments,0);
  args = ES(args, 'map', true,function(arg)  {return String(arg);});
  if (args[0].split('%s').length !== args.length) {
    
    return ex('ex args number mismatch: %s', ES('JSON', 'stringify', false,args));
  }

  if (__DEV__) {
    return eprintf.apply(null, args);
  } else {
    return ex._prefix + ES('JSON', 'stringify', false,args) + ex._suffix;
  }
};


ex._prefix = '<![EX[';
ex._suffix = ']]>';

module.exports = ex;


},null);


__d("invariant",[],function(global,require,requireDynamic,requireLazy,module,exports) {
"use strict";



var invariant = function(condition, format, a, b, c, d, e, f) {
  if (__DEV__) {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;


},null);


__d("URIBase",["URIRFC3986","URISchemes","copyProperties","ex","invariant"],function(global,require,requireDynamic,requireLazy,module,exports,URIRFC3986,URISchemes,copyProperties,ex,invariant) {
   
   
   
   
   


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
}




  
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
  }

  
  URIBase.prototype.setProtocol=function(protocol) {"use strict";
    invariant(
      URISchemes.isAllowed(protocol),
      '"%s" is not a valid protocol for a URI.', protocol
    );
    this.$URIBase_protocol = protocol;
    return this;
  };

  
  URIBase.prototype.getProtocol=function(protocol) {"use strict";
    return this.$URIBase_protocol;
  };

  
  URIBase.prototype.setSecure=function(secure) {"use strict";
    return this.setProtocol(secure ? 'https' : 'http');
  };

  
  URIBase.prototype.isSecure=function() {"use strict";
    return this.getProtocol() === 'https';
  };

  
  URIBase.prototype.setDomain=function(domain) {"use strict";
    
    if (UNSAFE_DOMAIN_PATTERN.test(domain)) {
      throw new Error(ex(
        'URI.setDomain: unsafe domain specified: %s for url %s',
        domain,
        this.toString()
      ));
    }

    this.$URIBase_domain = domain;
    return this;
  };

  
  URIBase.prototype.getDomain=function() {"use strict";
    return this.$URIBase_domain;
  };

  
  URIBase.prototype.setPort=function(port) {"use strict";
    this.$URIBase_port = port;
    return this;
  };

  
  URIBase.prototype.getPort=function() {"use strict";
    return this.$URIBase_port;
  };

  
  URIBase.prototype.setPath=function(path) {"use strict";
    if (__DEV__) {
      if (path && path.charAt(0) !== '/') {
        console.warn('Path does not begin with a "/" which means this URI ' +
          'will likely be malformed. Ensure any string passed to .setPath() ' +
          'leads with "/"');
      }
    }
    this.$URIBase_path = path;
    return this;
  };

  
  URIBase.prototype.getPath=function() {"use strict";
    return this.$URIBase_path;
  };

  
  URIBase.prototype.addQueryData=function(mapOrKey, value) {"use strict";
    // Don't use instanceof, as it doesn't work across windows
    if (Object.prototype.toString.call(mapOrKey) === '[object Object]') {
      copyProperties(this.$URIBase_queryData, mapOrKey);
    } else {
      this.$URIBase_queryData[mapOrKey] = value;
    }
    return this;
  };

  
  URIBase.prototype.setQueryData=function(map) {"use strict";
    this.$URIBase_queryData = map;
    return this;
  };

  
  URIBase.prototype.getQueryData=function() {"use strict";
    return this.$URIBase_queryData;
  };

  
  URIBase.prototype.removeQueryData=function(keys) {"use strict";
    if (!ES('Array', 'isArray', false,keys)) {
      keys = [keys];
    }
    for (var i = 0, length = keys.length; i < length; ++i) {
      delete this.$URIBase_queryData[keys[i]];
    }
    return this;
  };

  
  URIBase.prototype.setFragment=function(fragment) {"use strict";
    this.$URIBase_fragment = fragment;
    // fragment was updated - we don't care about forcing separator
    this.setForceFragmentSeparator(false);
    return this;
  };

  
  URIBase.prototype.getFragment=function() {"use strict";
    return this.$URIBase_fragment;
  };


  
  URIBase.prototype.setForceFragmentSeparator=function(shouldForce) {"use strict";
    this.$URIBase_forceFragmentSeparator = shouldForce;
    return this;
  };

  
  URIBase.prototype.getForceFragmentSeparator=function() {"use strict";
    return this.$URIBase_forceFragmentSeparator;
  };

  
  URIBase.prototype.isEmpty=function() {"use strict";
    return !(
      this.getPath() ||
      this.getProtocol() ||
      this.getDomain() ||
      this.getPort() ||
      ES('Object', 'keys', false,this.getQueryData()).length > 0 ||
      this.getFragment()
    );
  };

  
  URIBase.prototype.toString=function() {"use strict";
    var str = '';
    if (this.$URIBase_protocol) {
      str += this.$URIBase_protocol + '://';
    }
    if (this.$URIBase_domain) {
      str += this.$URIBase_domain;
    }
    if (this.$URIBase_port) {
      str += ':' + this.$URIBase_port;
    }
    // If there is a protocol, domain or port, we need to provide '/' for the
    // path. If we don't have either and also don't have a path, we can omit
    
    // with "?", "#", or is empty.
    if (this.$URIBase_path) {
      str += this.$URIBase_path;
    } else if (str) {
      str += '/';
    }
    var queryStr = this.$URIBase_serializer.serialize(this.$URIBase_queryData);
    if (queryStr) {
      str += '?' + queryStr;
    }
    if (this.$URIBase_fragment) {
      str += '#' + this.$URIBase_fragment;
    } else if (this.$URIBase_forceFragmentSeparator) {
      str += '#';
    }
    return str;
  };

  
  URIBase.prototype.getOrigin=function() {"use strict";
    return this.$URIBase_protocol
      + '://'
      + this.$URIBase_domain
      + (this.$URIBase_port ? ':' + this.$URIBase_port : '');
  };



URIBase.isValidURI = function(uri, serializer) {
  return parse(new URIBase(null, serializer), uri, false, serializer);
};

module.exports = URIBase;


},null);


__d("sdk.URI",["Assert","QueryString","URIBase"],function(global,require,requireDynamic,requireLazy,module,exports,Assert,QueryString,URIBase) {
   
   
   

var facebookRe = /\.facebook\.com$/;

var serializer = {
  serialize: function(map) {
    return map
      ? QueryString.encode(map)
      : '';
  },
  deserialize: function(text) {
    return text
      ? QueryString.decode(text)
      : {};
  }
};

for(var URIBase____Key in URIBase){if(URIBase.hasOwnProperty(URIBase____Key)){URI[URIBase____Key]=URIBase[URIBase____Key];}}var ____SuperProtoOfURIBase=URIBase===null?null:URIBase.prototype;URI.prototype=ES('Object', 'create', false,____SuperProtoOfURIBase);URI.prototype.constructor=URI;URI.__superConstructor__=URIBase;
  function URI(uri) {"use strict";
    Assert.isString(uri, 'The passed argument was of invalid type.');

    if (!(this instanceof URI)) {
      return new URI(uri);
    }

    URIBase.call(this,uri, serializer);
  }__w(URI, {"type":"URI"}); 

  URI.prototype.isFacebookURI=function()  {"use strict";
    return facebookRe.test(this.getDomain());
  };

  URI.prototype.valueOf=function()  {"use strict";
    return this.toString();
  };


module.exports = URI;


},null);

__d("sdk.domReady",[],function(global,require,requireDynamic,requireLazy,module,exports) {
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
}

function domReady(/*function*/ fn) {__t([fn, 'function', 'fn']);
  if (queue) {
    queue.push(fn);
    return;
  } else {
    fn();
  }
}__w(domReady, {"signature":"function(function)"}); 

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
    var test = function() {
      try {
        
        
        document.documentElement.doScroll('left');
      } catch(error) {
        setTimeout(test, 0);
        return;
      }
      flush();
    };
    test();
  }
}

module.exports = domReady;


},3);


__d("sdk.Content",["sdk.domReady","Log","UserAgent"],function(global,require,requireDynamic,requireLazy,module,exports,domReady,Log,UserAgent) {
   
   
   

var visibleRoot;
var hiddenRoot;

var Content = {

  
  append: __w(function(/*DOMElement|string*/ content, /*?DOMElement*/ root)
      /*DOMElement*/ {__t([content, 'DOMElement|string', 'content'], [root, '?DOMElement', 'root']);return __t([function() {

    
    if (!root) {
      if (!visibleRoot) {
        visibleRoot = root = document.getElementById('fb-root');
        if (!root) {
          Log.warn('The "fb-root" div has not been created, auto-creating');
          
          visibleRoot = root = document.createElement('div');
          root.id = 'fb-root';
          
          // that the body has loaded to avoid potential "operation aborted"
          
          
          
          
          if (UserAgent.ie() || !document.body) {
            domReady(function() {
              document.body.appendChild(root);
            });
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
  }.apply(this, arguments), 'DOMElement']);}, {"signature":"function(DOMElement|string,?DOMElement):DOMElement"}),

  
  appendHidden: __w(function(/*DOMElement|string*/ content) /*DOMElement*/ {__t([content, 'DOMElement|string', 'content']);return __t([function() {
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
  }.apply(this, arguments), 'DOMElement']);}, {"signature":"function(DOMElement|string):DOMElement"}),

  
  submitToTarget: __w(function(/*object*/ opts, /*?boolean*/ get) {__t([opts, 'object', 'opts'], [get, '?boolean', 'get']);
    var form = document.createElement('form');
    form.action = opts.url;
    form.target = opts.target;
    form.method = (get) ? 'GET' : 'POST';
    Content.appendHidden(form);

    for (var key in opts.params) {
      if (opts.params.hasOwnProperty(key)) {
        var val = opts.params[key];
        if (val !== null && val !== undefined) {
          var input = document.createElement('input');
          input.name = key;
          input.value = val;
          form.appendChild(input);
        }
      }
    }

    form.submit();
    form.parentNode.removeChild(form);
  }, {"signature":"function(object,?boolean)"})
};

module.exports = Content;


},null);


__d("sdk.Event",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var Event = {

  SUBSCRIBE: 'event.subscribe',
  UNSUBSCRIBE: 'event.unsubscribe',

  
  subscribers: __w(function() /*object*/ {return __t([function() {
    
    
    
    
    if (!this._subscribersMap) {
      this._subscribersMap = {};
    }
    return this._subscribersMap;
  }.apply(this, arguments), 'object']);}, {"signature":"function():object"}),

  
  subscribe: __w(function(/*string*/ name, /*function*/ cb) {__t([name, 'string', 'name'], [cb, 'function', 'cb']);
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
  }, {"signature":"function(string,function)"}),

  
  unsubscribe: __w(function(/*string*/ name, /*function*/ cb) {__t([name, 'string', 'name'], [cb, 'function', 'cb']);
    var subs = this.subscribers()[name];
    if (subs) {
      ES(subs, 'forEach', true,function(value, key) {
        if (value == cb) {
          subs.splice(key, 1);
        }
      });
    }
    if (name != this.SUBSCRIBE && name != this.UNSUBSCRIBE) {
      this.fire(this.UNSUBSCRIBE, name, subs);
    }
  }, {"signature":"function(string,function)"}),

  
  monitor: __w(function(/*string*/ name, /*function*/ callback) {__t([name, 'string', 'name'], [callback, 'function', 'callback']);
    if (!callback()) {
      var
        ctx = this,
        fn = function() {
          if (callback.apply(callback, arguments)) {
            ctx.unsubscribe(name, fn);
          }
        };

      this.subscribe(name, fn);
    }
  }, {"signature":"function(string,function)"}),

  
  clear: __w(function(/*string*/ name) {__t([name, 'string', 'name']);
    delete this.subscribers()[name];
  }, {"signature":"function(string)"}),

  
  fire: __w(function(/*string*/ name) {__t([name, 'string', 'name']);
    var
      args = Array.prototype.slice.call(arguments, 1),
      subs = this.subscribers()[name];

    if (subs) {
      ES(subs, 'forEach', true,function(sub) {
        
        
        if (sub) {
          sub.apply(this, args);
        }
      });
    }
  }, {"signature":"function(string)"})
};

module.exports = Event;


},null);


__d("Queue",["copyProperties"],function(global,require,requireDynamic,requireLazy,module,exports,copyProperties) {
   


var registry = {};


  
  function Queue(opts) {"use strict";
    
    this._opts = copyProperties({
      interval: 0,
      processor: null
    }, opts);

    
    this._queue = [];
    this._stopped = true;
  }

  
  Queue.prototype._dispatch=function(force) {"use strict";
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
  };

  
  Queue.prototype.enqueue=function(message) {"use strict";
    if (this._opts.processor && !this._stopped) {
      this._opts.processor.call(this, message);
    } else {
      this._queue.push(message);
    }
    return this;
  };

  
  Queue.prototype.start=function(processor) {"use strict";
    if (processor) {
      this._opts.processor = processor;
    }
    this._stopped = false;
    this._dispatch();
    return this;
  };

  Queue.prototype.isStarted=function()  {"use strict";
    return !this._stopped;
  };

  
  Queue.prototype.dispatch=function() {"use strict";
    this._dispatch(true);
  };

  
  Queue.prototype.stop=function(scheduled) {"use strict";
    this._stopped = true;
    if (scheduled) {
      clearTimeout(this._timeout);
    }
    return this;
  };

  
  Queue.prototype.merge=function(queue, prepend) {"use strict";
    this._queue[prepend ? 'unshift' : 'push']
      .apply(this._queue, queue._queue);
    queue._queue = [];
    this._dispatch();
    return this;
  };

  
  Queue.prototype.getLength=function() {"use strict";
    return this._queue.length;
  };

  
  Queue.get=function(name, opts) {"use strict";
   var queue;
   if (name in registry) {
     queue = registry[name];
   } else {
    queue = registry[name] = new Queue(opts);
   }
   return queue;
  };

  
  Queue.exists=function(name) {"use strict";
    return name in registry;
  };

  
  Queue.remove=function(name) {"use strict";
    return delete registry[name];
  };



module.exports = Queue;


},null);


__d("JSONRPC",["Log"],function(global,require,requireDynamic,requireLazy,module,exports,Log) {
   



  function JSONRPC(write) {"use strict";
    this.$JSONRPC_counter = 0;
    this.$JSONRPC_callbacks = {};

    this.remote = ES(function(context)  {
      this.$JSONRPC_context = context;
      return this.remote;
    }, 'bind', true,this);

    this.local = {};

    this.$JSONRPC_write = write;
  }__w(JSONRPC, {"type":"JSONRPC"}); 

  
  JSONRPC.prototype.stub=function(stub) {"use strict";
    this.remote[stub] = ES(function()  {var args=Array.prototype.slice.call(arguments,0);
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
    }, 'bind', true,this);
  };

  
  JSONRPC.prototype.read=function(message, context) {"use strict";
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
      
      send = __w(function(/*string*/ type, value) {__t([type, 'string', 'type']);
        var response = {
          jsonrpc: '2.0',
          id: id
        };
        response[type] = value;

        
        
        setTimeout(function() {
          instance.$JSONRPC_write(ES('JSON', 'stringify', false,response), context);
        }, 0);
      }, {"signature":"function(string)"});
    } else {
      
      send = function() {};
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
  };


module.exports = JSONRPC;


},null);


__d("sdk.RPC",["Assert","JSONRPC","Queue"],function(global,require,requireDynamic,requireLazy,module,exports,Assert,JSONRPC,Queue) {
   
   
   

var outQueue = new Queue();
var jsonrpc = new JSONRPC(__w(function(/*string*/ message) {__t([message, 'string', 'message']);
  outQueue.enqueue(message);
}, {"signature":"function(string)"}));

var RPC = {
  local: jsonrpc.local,
  remote: jsonrpc.remote,
  stub: ES(jsonrpc.stub, 'bind', true,jsonrpc),
  setInQueue: __w(function(/*object*/ queue) {__t([queue, 'object', 'queue']);
    Assert.isInstanceOf(Queue, queue);

    queue.start(__w(function(/*string*/ message) {__t([message, 'string', 'message']);
      jsonrpc.read(message);
    }, {"signature":"function(string)"}));
  }, {"signature":"function(object)"}),
  getOutQueue: __w(function() /*object*/ {return __t([function() {
    return outQueue;
  }.apply(this, arguments), 'object']);}, {"signature":"function():object"})
};

module.exports = RPC;


},null);

__d("sdk.Scribe",["QueryString","sdk.Runtime","UrlMap"],function(global,require,requireDynamic,requireLazy,module,exports,QueryString,Runtime,UrlMap) {
   
   
   

function log(/*string*/ category, /*object*/ data) {__t([category, 'string', 'category'], [data, 'object', 'data']);
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
}__w(log, {"signature":"function(string,object)"}); 

var Scribe = {
  log: log
};

module.exports = Scribe;


},null);


__d("emptyFunction",["copyProperties"],function(global,require,requireDynamic,requireLazy,module,exports,copyProperties) {
   

function makeEmptyFunction(arg) {
  return function() {
    return arg;
  };
}


function emptyFunction() {}

copyProperties(emptyFunction, {
  thatReturns: makeEmptyFunction,
  thatReturnsFalse: makeEmptyFunction(false),
  thatReturnsTrue: makeEmptyFunction(true),
  thatReturnsNull: makeEmptyFunction(null),
  thatReturnsThis: function() { return this; },
  thatReturnsArgument: function(arg) { return arg; }
});

module.exports = emptyFunction;


},null);

__d("htmlSpecialChars",[],function(global,require,requireDynamic,requireLazy,module,exports) {


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
}

module.exports = htmlSpecialChars;


},null);


__d("Flash",["DOMEventListener","DOMWrapper","QueryString","UserAgent","copyProperties","guid","htmlSpecialChars"],function(global,require,requireDynamic,requireLazy,module,exports,DOMEventListener,DOMWrapper,QueryString,UserAgent,copyProperties,guid,htmlSpecialChars) {
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
}

function unloadRegisteredSWFs() {
  for (var id in registry) {
    if (registry.hasOwnProperty(id)) {
        remove(id);
    }
  }
}


function normalize(s) {
  return s.replace(
    /\d+/g,
    function (m) { return '000'.substring(m.length) + m; }
  );
}

function register(id) {
  if (!unloadHandlerAttached) {
    
    
    if (UserAgent.ie() >= 9) {
      DOMEventListener.add(window, 'unload', unloadRegisteredSWFs);
    }
    unloadHandlerAttached = true;
  }
  registry[id] = id;
}


var Flash = {

  
  embed: function(src, container, params, flashvars) {
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
      '<object ' + (UserAgent.ie()
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
  },

  
  remove: remove,

  
  getVersion: function() {
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
  },

  
  checkMinVersion: function(minVersion) {
    var version = Flash.getVersion();
    if (!version) {
      return false;
    }
    return normalize(version.join('.')) >= normalize(minVersion);
  },

  
  isAvailable : function() {
    return !!Flash.getVersion();
  }

};

module.exports = Flash;


},null);


__d("dotAccess",[],function(global,require,requireDynamic,requireLazy,module,exports) {
function dotAccess(head, path, create) {
  var stack = path.split('.');
  do {
    var key = stack.shift();
    head = head[key] || create && (head[key] = {});
  } while(stack.length && head);
  return head;
}

module.exports = dotAccess;


},null);


__d("GlobalCallback",["DOMWrapper","dotAccess","guid","wrapFunction"],function(global,require,requireDynamic,requireLazy,module,exports,DOMWrapper,dotAccess,guid,wrapFunction) {
   
   
   
   

// window is the same as the 'global' object in the browser, but the variable
// 'global' might be shadowed.
var rootObject;
var callbackPrefix;

var GlobalCallback = {

  setPrefix: __w(function(/*string*/ prefix) {__t([prefix, 'string', 'prefix']);
    rootObject = dotAccess(DOMWrapper.getWindow(), prefix, true);
    callbackPrefix = prefix;
  }, {"signature":"function(string)"}),

  create: __w(function(/*function*/ fn, /*?string*/ description) /*string*/ {__t([fn, 'function', 'fn'], [description, '?string', 'description']);return __t([function() {
    if (!rootObject) {
      
      
      this.setPrefix('__globalCallbacks');
    }
    var id = guid();
    rootObject[id] = wrapFunction(fn, 'entry', description || 'GlobalCallback');

    return callbackPrefix + '.' + id;
  }.apply(this, arguments), 'string']);}, {"signature":"function(function,?string):string"}),

  remove: __w(function(/*string*/ name) {__t([name, 'string', 'name']);
    var id = name.substring(callbackPrefix.length + 1);
    delete rootObject[id]