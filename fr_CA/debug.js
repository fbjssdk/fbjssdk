
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
__d("JSSDKRuntimeConfig",[],{"locale":"fr_CA","rtl":false,"revision":"1352406"});__d("JSSDKConfig",[],{"bustCache":true,"tagCountLogRate":0.01,"errorHandling":{"rate":4},"usePluginPipe":true,"features":{"kill_fragment":true,"xfbml_profile_pic_server":true,"error_handling":{"rate":4},"e2e_ping_tracking":{"rate":1.0e-6},"xd_timeout":{"rate":4,"value":30000},"use_bundle":true},"api":{"mode":"warn","whitelist":["Canvas","Canvas.Prefetcher","Canvas.Prefetcher.addStaticResource","Canvas.Prefetcher.setCollectionMode","Canvas.getPageInfo","Canvas.hideFlashElement","Canvas.scrollTo","Canvas.setAutoGrow","Canvas.setDoneLoading","Canvas.setSize","Canvas.setUrlHandler","Canvas.showFlashElement","Canvas.startTimer","Canvas.stopTimer","Data","Data.process","Data.query","Data.query:wait","Data.waitOn","Data.waitOn:wait","Event","Event.subscribe","Event.unsubscribe","Music.flashCallback","Music.init","Music.send","Payment","Payment.cancelFlow","Payment.continueFlow","Payment.init","Payment.lockForProcessing","Payment.unlockForProcessing","Payment.parse","Payment.setSize","ThirdPartyProvider","ThirdPartyProvider.init","ThirdPartyProvider.sendData","UA","UA.nativeApp","XFBML","XFBML.RecommendationsBar","XFBML.RecommendationsBar.markRead","XFBML.parse","addFriend","api","getAccessToken","getAuthResponse","getLoginStatus","getUserID","init","login","logout","publish","share","ui","ui:subscribe"]},"initSitevars":{"enableMobileComments":1,"iframePermissions":{"read_stream":false,"manage_mailbox":false,"manage_friendlists":false,"read_mailbox":false,"publish_checkins":true,"status_update":true,"photo_upload":true,"video_upload":true,"sms":false,"create_event":true,"rsvp_event":true,"offline_access":true,"email":true,"xmpp_login":false,"create_note":true,"share_item":true,"export_stream":false,"publish_stream":true,"publish_likes":true,"ads_management":false,"contact_email":true,"access_private_data":false,"read_insights":false,"read_requests":false,"read_friendlists":true,"manage_pages":false,"physical_login":false,"manage_groups":false,"read_deals":false}}});__d("UrlMapConfig",[],{"www":"www.facebook.com","m":"m.facebook.com","connect":"connect.facebook.net","business":"business.facebook.com","api_https":"api.facebook.com","api_read_https":"api-read.facebook.com","graph_https":"graph.facebook.com","fbcdn_http":"fbstatic-a.akamaihd.net","fbcdn_https":"fbstatic-a.akamaihd.net","cdn_http":"static.ak.facebook.com","cdn_https":"s-static.ak.facebook.com"});__d("JSSDKXDConfig",[],{"XdUrl":"\/connect\/xd_arbiter.php?version=41","XdBundleUrl":"\/connect\/xd_arbiter\/sT9WD2idZGy.js?version=41","Flash":{"path":"https:\/\/connect.facebook.net\/rsrc.php\/v1\/yR\/r\/ks_9ZXiQ0GL.swf"},"useCdn":true});__d("JSSDKCssConfig",[],{"rules":".fb_hidden{position:absolute;top:-10000px;z-index:10001}.fb_invisible{display:none}.fb_reset{background:none;border:0;border-spacing:0;color:#000;cursor:auto;direction:ltr;font-family:\"lucida grande\", tahoma, verdana, arial, sans-serif;font-size:11px;font-style:normal;font-variant:normal;font-weight:normal;letter-spacing:normal;line-height:1;margin:0;overflow:visible;padding:0;text-align:left;text-decoration:none;text-indent:0;text-shadow:none;text-transform:none;visibility:visible;white-space:normal;word-spacing:normal}.fb_reset>div{overflow:hidden}.fb_link img{border:none}\n.fb_dialog{background:rgba(82, 82, 82, .7);position:absolute;top:-10000px;z-index:10001}.fb_reset .fb_dialog_legacy{overflow:visible}.fb_dialog_advanced{padding:10px;-moz-border-radius:8px;-webkit-border-radius:8px;border-radius:8px}.fb_dialog_content{background:#fff;color:#333}.fb_dialog_close_icon{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 0 transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif);cursor:pointer;display:block;height:15px;position:absolute;right:18px;top:17px;width:15px}.fb_dialog_mobile .fb_dialog_close_icon{top:5px;left:5px;right:auto}.fb_dialog_padding{background-color:transparent;position:absolute;width:1px;z-index:-1}.fb_dialog_close_icon:hover{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 -15px transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif)}.fb_dialog_close_icon:active{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yq\/r\/IE9JII6Z1Ys.png) no-repeat scroll 0 -30px transparent;_background-image:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yL\/r\/s816eWC-2sl.gif)}.fb_dialog_loader{background-color:#f2f2f2;border:1px solid #606060;font-size:24px;padding:20px}.fb_dialog_top_left,.fb_dialog_top_right,.fb_dialog_bottom_left,.fb_dialog_bottom_right{height:10px;width:10px;overflow:hidden;position:absolute}.fb_dialog_top_left{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 0;left:-10px;top:-10px}.fb_dialog_top_right{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -10px;right:-10px;top:-10px}.fb_dialog_bottom_left{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -20px;bottom:-10px;left:-10px}.fb_dialog_bottom_right{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ye\/r\/8YeTNIlTZjm.png) no-repeat 0 -30px;right:-10px;bottom:-10px}.fb_dialog_vert_left,.fb_dialog_vert_right,.fb_dialog_horiz_top,.fb_dialog_horiz_bottom{position:absolute;background:#525252;filter:alpha(opacity=70);opacity:.7}.fb_dialog_vert_left,.fb_dialog_vert_right{width:10px;height:100\u0025}.fb_dialog_vert_left{margin-left:-10px}.fb_dialog_vert_right{right:0;margin-right:-10px}.fb_dialog_horiz_top,.fb_dialog_horiz_bottom{width:100\u0025;height:10px}.fb_dialog_horiz_top{margin-top:-10px}.fb_dialog_horiz_bottom{bottom:0;margin-bottom:-10px}.fb_dialog_iframe{line-height:0}.fb_dialog_content .dialog_title{background:#6d84b4;border:1px solid #3b5998;color:#fff;font-size:14px;font-weight:bold;margin:0}.fb_dialog_content .dialog_title>span{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/yd\/r\/Cou7n-nqK52.gif) no-repeat 5px 50\u0025;float:left;padding:5px 0 7px 26px}body.fb_hidden{-webkit-transform:none;height:100\u0025;margin:0;overflow:visible;position:absolute;top:-10000px;left:0;width:100\u0025}.fb_dialog.fb_dialog_mobile.loading{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/ya\/r\/3rhSv5V8j3o.gif) white no-repeat 50\u0025 50\u0025;min-height:100\u0025;min-width:100\u0025;overflow:hidden;position:absolute;top:0;z-index:10001}.fb_dialog.fb_dialog_mobile.loading.centered{max-height:590px;min-height:590px;max-width:500px;min-width:500px}#fb-root #fb_dialog_ipad_overlay{background:rgba(0, 0, 0, .45);position:absolute;left:0;top:0;width:100\u0025;min-height:100\u0025;z-index:10000}#fb-root #fb_dialog_ipad_overlay.hidden{display:none}.fb_dialog.fb_dialog_mobile.loading iframe{visibility:hidden}.fb_dialog_content .dialog_header{-webkit-box-shadow:white 0 1px 1px -1px inset;background:-webkit-gradient(linear, 0\u0025 0\u0025, 0\u0025 100\u0025, from(#738ABA), to(#2C4987));border-bottom:1px solid;border-color:#1d4088;color:#fff;font:14px Helvetica, sans-serif;font-weight:bold;text-overflow:ellipsis;text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0;vertical-align:middle;white-space:nowrap}.fb_dialog_content .dialog_header table{-webkit-font-smoothing:subpixel-antialiased;height:43px;width:100\u0025}.fb_dialog_content .dialog_header td.header_left{font-size:12px;padding-left:5px;vertical-align:middle;width:60px}.fb_dialog_content .dialog_header td.header_right{font-size:12px;padding-right:5px;vertical-align:middle;width:60px}.fb_dialog_content .touchable_button{background:-webkit-gradient(linear, 0\u0025 0\u0025, 0\u0025 100\u0025, from(#4966A6), color-stop(.5, #355492), to(#2A4887));border:1px solid #29447e;-webkit-background-clip:padding-box;-webkit-border-radius:3px;-webkit-box-shadow:rgba(0, 0, 0, .117188) 0 1px 1px inset, rgba(255, 255, 255, .167969) 0 1px 0;display:inline-block;margin-top:3px;max-width:85px;line-height:18px;padding:4px 12px;position:relative}.fb_dialog_content .dialog_header .touchable_button input{border:none;background:none;color:#fff;font:12px Helvetica, sans-serif;font-weight:bold;margin:2px -12px;padding:2px 6px 3px 6px;text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0}.fb_dialog_content .dialog_header .header_center{color:#fff;font-size:16px;font-weight:bold;line-height:18px;text-align:center;vertical-align:middle}.fb_dialog_content .dialog_content{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/y9\/r\/jKEcVPZFk-2.gif) no-repeat 50\u0025 50\u0025;border:1px solid #555;border-bottom:0;border-top:0;height:150px}.fb_dialog_content .dialog_footer{background:#f2f2f2;border:1px solid #555;border-top-color:#ccc;height:40px}#fb_dialog_loader_close{float:left}.fb_dialog.fb_dialog_mobile .fb_dialog_close_button{text-shadow:rgba(0, 30, 84, .296875) 0 -1px 0}.fb_dialog.fb_dialog_mobile .fb_dialog_close_icon{visibility:hidden}\n.fb_iframe_widget{display:inline-block;position:relative}.fb_iframe_widget span{display:inline-block;position:relative;text-align:justify}.fb_iframe_widget iframe{position:absolute}.fb_iframe_widget_lift{z-index:1}.fb_hide_iframes iframe{position:relative;left:-10000px}.fb_iframe_widget_loader{position:relative;display:inline-block}.fb_iframe_widget_fluid{display:inline}.fb_iframe_widget_fluid span{width:100\u0025}.fb_iframe_widget_loader iframe{min-height:32px;z-index:2;zoom:1}.fb_iframe_widget_loader .FB_Loader{background:url(https:\/\/fbstatic-a.akamaihd.net\/rsrc.php\/v2\/y9\/r\/jKEcVPZFk-2.gif) no-repeat;height:32px;width:32px;margin-left:-16px;position:absolute;left:50\u0025;z-index:4}\n.fb_connect_bar_container div,.fb_connect_bar_container span,.fb_connect_bar_container a,.fb_connect_bar_container img,.fb_connect_bar_container strong{background:none;border-spacing:0;border:0;direction:ltr;font-style:normal;font-variant:normal;letter-spacing:normal;line-height:1;margin:0;overflow:visible;padding:0;text-align:left;text-decoration:none;text-indent:0;text-shadow:none;text-transform:none;visibility:visible;white-space:normal;word-spacing:normal;vertical-align:baseline}.fb_connect_bar_container{position:fixed;left:0 !important;right:0 !important;height:42px !important;padding:0 25px !important;margin:0 !important;vertical-align:middle !important;border-bottom:1px solid #333 !important;background:#3b5998 !important;z-index:99999999 !important;overflow:hidden !important}.fb_connect_bar_container_ie6{position:absolute;top:expression(document.compatMode==\"CSS1Compat\"? document.documentElement.scrollTop+\"px\":body.scrollTop+\"px\")}.fb_connect_bar{position:relative;margin:auto;height:100\u0025;width:100\u0025;padding:6px 0 0 0 !important;background:none;color:#fff !important;font-family:\"lucida grande\", tahoma, verdana, arial, sans-serif !important;font-size:13px !important;font-style:normal !important;font-variant:normal !important;font-weight:normal !important;letter-spacing:normal !important;line-height:1 !important;text-decoration:none !important;text-indent:0 !important;text-shadow:none !important;text-transform:none !important;white-space:normal !important;word-spacing:normal !important}.fb_connect_bar a:hover{color:#fff}.fb_connect_bar .fb_profile img{height:30px;width:30px;vertical-align:middle;margin:0 6px 5px 0}.fb_connect_bar div a,.fb_connect_bar span,.fb_connect_bar span a{color:#bac6da;font-size:11px;text-decoration:none}.fb_connect_bar .fb_buttons{float:right;margin-top:7px}\n.fbpluginrecommendationsbarleft,.fbpluginrecommendationsbarright{position:fixed !important;bottom:0;z-index:999}.fbpluginrecommendationsbarleft{left:10px}.fbpluginrecommendationsbarright{right:10px}","components":["css:fb.css.base","css:fb.css.dialog","css:fb.css.iframewidget","css:fb.css.connectbarwidget","css:fb.css.plugin.recommendationsbar"]});__d("ApiClientConfig",[],{"FlashRequest":{"swfUrl":"https:\/\/connect.facebook.net\/rsrc.php\/v1\/yW\/r\/PvklbuW2Ycn.swf"}});__d("JSSDKCanvasPrefetcherConfig",[],{"blacklist":[144959615576466],"sampleRate":500});__d("JSSDKPluginPipeConfig",[],{"threshold":0,"enabledApps":{"209753825810663":1,"187288694643718":1}});__d("JSSDKConnectBarConfig",[],{"imgs":{"buttonUrl":"rsrc.php\/v2\/yY\/r\/h_Y6u1wrZPW.png","missingProfileUrl":"rsrc.php\/v2\/yo\/r\/UlIqmHJn-SK.gif"}});


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
    delete rootObject[id];
  }, {"signature":"function(string)"})

};

module.exports = GlobalCallback;


},null);


__d("XDM",["DOMEventListener","DOMWrapper","emptyFunction","Flash","GlobalCallback","guid","Log","UserAgent","wrapFunction"],function(global,require,requireDynamic,requireLazy,module,exports,DOMEventListener,DOMWrapper,emptyFunction,Flash,GlobalCallback,guid,Log,UserAgent,wrapFunction) {
   
   
   
   
   
   
   
   
   

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
}

var XDM = {

  
  register: function(name, provider) {
    Log.debug('Registering %s as XDM provider', name);
    configuration.transports.push(name);
    transports[name] = provider;
  },

  
  create: function(config) {
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
  }

};


XDM.register('flash', (function() {
  var inited = false;
  var swf;
  var doLog = false;
  var timeout = 15000;
  var timer;

  if (__DEV__) {
    doLog = true;
  }

  return {
    isAvailable: function() {
      
      
      return Flash.checkMinVersion('8.0.24');
    },
    init: function(config) {
      Log.debug('init flash: ' + config.channel);
      var xdm = {
        send: function(message, origin, windowRef, channel) {
          Log.debug('sending to: %s (%s)', origin, channel);
          swf.postMessage(message, origin, channel);
        }
      };
      if (inited) {
        config.whenReady(xdm);
        return;
      }
      var div = config.root.appendChild(window.document.createElement('div'));

      var callback = GlobalCallback.create(function() {
        GlobalCallback.remove(callback);
        clearTimeout(timer);
        Log.info('xdm.swf called the callback');
        var messageCallback = GlobalCallback.create(function(msg, origin) {
          msg = decodeURIComponent(msg);
          origin = decodeURIComponent(origin);
          Log.debug('received message %s from %s', msg, origin);
          config.onMessage(msg, origin);
        }, 'xdm.swf:onMessage');
        swf.init(config.channel, messageCallback);
        config.whenReady(xdm);
      }, 'xdm.swf:load');

      swf = Flash.embed(config.flashUrl, div, null, {
        protocol: location.protocol.replace(':', ''),
        host: location.host,
        callback: callback,
        log: doLog
      });

      timer = setTimeout(function() {
        Log.warn('The Flash component did not load within %s ms - ' +
          'verify that the container is not set to hidden or invisible ' +
          'using CSS as this will cause some browsers to not load ' +
          'the components', timeout);
      }, timeout);
      inited = true;
    }
  };
})());


XDM.register('postmessage', (function() {
  var inited = false;

  return {
    isAvailable : function() {
      return !!window.postMessage;
    },
    init: function(config) {
      Log.debug('init postMessage: ' + config.channel);
      var prefix = '_FB_' + config.channel;
      var xdm = {
        send: function(message, origin, windowRef, channel) {
          if (window === windowRef) {
            Log.error('Invalid windowref, equal to window (self)');
            throw new Error();
          }
          Log.debug('sending to: %s (%s)', origin, channel);
          var send = function() {
            
            windowRef.postMessage('_FB_' + channel + message, origin);
          };
          // IE8's postMessage is syncronous, meaning that if you have a
          
          
          
          
          
          
          
          if (UserAgent.ie() == 8 || UserAgent.ieCompatibilityMode()) {
            setTimeout(send, 0);
          } else{
            send();
          }
        }
      };
      if (inited) {
        config.whenReady(xdm);
        return;
      }

      DOMEventListener.add(window, 'message', wrapFunction(function(event) {
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
      }, 'entry', 'onMessage'));
      config.whenReady(xdm);
      inited = true;
    }
  };
})());

module.exports = XDM;


},null);


__d("isFacebookURI",[],function(global,require,requireDynamic,requireLazy,module,exports) {
var facebookURIRegex = null;

var FB_PROTOCOLS = ['http', 'https'];


function isFacebookURI(uri) {__t([uri, 'URI', 'uri']);return __t([function() {
  if (!facebookURIRegex) {
    
    facebookURIRegex = new RegExp('(^|\\.)facebook\\.com$', 'i');
  }

  if (uri.isEmpty()) {
    return false;
  }

  if (!uri.getDomain() && !uri.getProtocol()) {
    return true;
  }

  return (ES(FB_PROTOCOLS, 'indexOf', true,uri.getProtocol()) !== -1 &&
          facebookURIRegex.test(uri.getDomain()));
}.apply(this, arguments), 'boolean']);}__w(isFacebookURI, {"signature":"function(URI):boolean"}); 

module.exports = isFacebookURI;


},null);


__d("sdk.XD",["sdk.Content","sdk.Event","Log","QueryString","Queue","sdk.RPC","sdk.Runtime","sdk.Scribe","sdk.URI","UrlMap","JSSDKXDConfig","XDM","isFacebookURI","sdk.createIframe","sdk.feature","guid"],function(global,require,requireDynamic,requireLazy,module,exports,Content,Event,Log,QueryString,Queue,RPC,Runtime,Scribe,URI,UrlMap,XDConfig,XDM,isFacebookURI,createIframe,feature,guid) {
   
   
   
   
   
   
   
   
   
   
   
   

   
   
   
   

var facebookQueue = new Queue();
var httpProxyQueue = new Queue();
var httpsProxyQueue = new Queue();
var httpProxyFrame;
var httpsProxyFrame;
var proxySecret = guid();

var xdArbiterTier = XDConfig.useCdn ? 'cdn' : 'www';
var xdArbiterPathAndQuery = feature('use_bundle')
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

function onRegister(/*string*/ registeredAs) {__t([registeredAs, 'string', 'registeredAs']);
  Log.info('Remote XD can talk to facebook.com (%s)', registeredAs);
  Runtime.setEnvironment(
    registeredAs === 'canvas'
      ? Runtime.ENVIRONMENTS.CANVAS
      : Runtime.ENVIRONMENTS.PAGETAB);
}__w(onRegister, {"signature":"function(string)"}); 

function handleAction(/*object*/ message, /*string*/ senderOrigin) {__t([message, 'object', 'message'], [senderOrigin, 'string', 'senderOrigin']);
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

      proxyQueue.start(__w(function(/*string|object*/ message) {__t([message, 'string|object', 'message']);
        xdm.send(
          typeof message === 'string' ? message : QueryString.encode(message),
          senderOrigin,
          targetProxyFrame.contentWindow,
          channel + '_' + protocol
        );
      }, {"signature":"function(string|object)"}));
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
}__w(handleAction, {"signature":"function(object,string)"}); 




function onMessage(/*string|object*/ message, /*?string*/ senderOrigin) {__t([message, 'string|object', 'message'], [senderOrigin, '?string', 'senderOrigin']);
  if (senderOrigin && senderOrigin !== 'native' &&
      !isFacebookURI(URI(senderOrigin))) {
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
}__w(onMessage, {"signature":"function(string|object,?string)"}); 

function sendToFacebook(/*string*/ recipient, /*object|string*/ message) {__t([recipient, 'string', 'recipient'], [message, 'object|string', 'message']);
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
}__w(sendToFacebook, {"signature":"function(string,object|string)"}); 


RPC.getOutQueue().start(__w(function(/*string*/ message) {__t([message, 'string', 'message']);
  sendToFacebook('facebook', 'FB_RPC:' + message);
}, {"signature":"function(string)"}));

function init(/*?string*/ xdProxyName) {__t([xdProxyName, '?string', 'xdProxyName']);
  if (inited) {
    return;
  }

  
  var container = Content.appendHidden(document.createElement('div'));

  
  var transport = XDM.create({
    blacklist: null,
    root: container,
    channel: channel,
    flashUrl: XDConfig.Flash.path,
    whenReady: __w(function(/*object*/ instance) {__t([instance, 'object', 'instance']);
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
    }, {"signature":"function(object)"}),
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
}__w(init, {"signature":"function(?string)"}); 


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

  
  inform: __w(function(/*string*/ method, /*?object*/ params, /*?string*/ relation,
      /*?string*/ behavior) {__t([method, 'string', 'method'], [params, '?object', 'params'], [relation, '?string', 'relation'], [behavior, '?string', 'behavior']);
    sendToFacebook('facebook', {
      method: method,
      params: ES('JSON', 'stringify', false,params || {}),
      behavior: behavior || 'p',
      relation: relation
    });
  }, {"signature":"function(string,?object,?string,?string)"}),

  
  handler: __w(function(/*function*/ cb, /*?string*/ relation, /*?boolean*/ forever,
      /*?string*/ id) /*string*/ {__t([cb, 'function', 'cb'], [relation, '?string', 'relation'], [forever, '?boolean', 'forever'], [id, '?string', 'id']);return __t([function() {
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
  }.apply(this, arguments), 'string']);}, {"signature":"function(function,?string,?boolean,?string):string"}),

  registerCallback: __w(function(/*function*/ cb, /*?boolean*/ persistent,
      /*?string*/ id) /*string*/ {__t([cb, 'function', 'cb'], [persistent, '?boolean', 'persistent'], [id, '?string', 'id']);return __t([function() {
    id = id || guid();
    if (persistent) {
      XD._forever[id] = true;
    }
    XD._callbacks[id] = cb;
    return id;
  }.apply(this, arguments), 'string']);}, {"signature":"function(function,?boolean,?string):string"})
};





Event.subscribe('init:post', __w(function(/*object*/ options) {__t([options, 'object', 'options']);
  init(options.xdProxyName);
  var timeout = feature('xd_timeout');
  if (timeout) {
    setTimeout(function() {
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
    }, timeout);
  }
}, {"signature":"function(object)"}));


module.exports = XD;


},null);


__d("sdk.Auth",["sdk.Cookie","sdk.createIframe","DOMWrapper","sdk.feature","sdk.getContextType","guid","sdk.Impressions","Log","ObservableMixin","sdk.Runtime","sdk.SignedRequest","UrlMap","sdk.URI","sdk.XD"],function(global,require,requireDynamic,requireLazy,module,exports,Cookie,createIframe,DOMWrapper,feature,getContextType,guid,Impressions,Log,ObservableMixin,Runtime,SignedRequest,UrlMap,URI,XD) {
   
   
   
   
   
   
   
   
   
   
   
   
   
   

var currentAuthResponse;

var timer;

var Auth = new ObservableMixin();

function setAuthResponse(/*?object*/ authResponse, /*string*/ status) {__t([authResponse, '?object', 'authResponse'], [status, 'string', 'status']);
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
}__w(setAuthResponse, {"signature":"function(?object,string)"}); 

function getAuthResponse() /*?object*/ {return __t([function() {
  return currentAuthResponse;
}.apply(this, arguments), '?object']);}__w(getAuthResponse, {"signature":"function():?object"}); 

function xdResponseWrapper(/*function*/ cb, /*?object*/ authResponse,
    /*?string*/ method) /*function*/ {__t([cb, 'function', 'cb'], [authResponse, '?object', 'authResponse'], [method, '?string', 'method']);return __t([function() {
  return __w(function (/*?object*/ params) /*?object*/ {__t([params, '?object', 'params']);return __t([function() {
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
    } else if (method === 'logout' || method === 'login_status') {
      
      
      
      
      if (params.error && params.error === 'not_authorized') {
        status = 'not_authorized';
      } else {
        status = 'unknown';
      }
      setAuthResponse(null, status);
      if (Runtime.getUseCookie()) {
        Cookie.clearSignedRequestCookie();
      }
    }

    
    if (params && params.https == 1) {
      Runtime.setSecure(true);
    }

    if (cb) {
      cb({
        authResponse: authResponse,
        status: Runtime.getLoginStatus()
      });
    }
    return authResponse;
  }.apply(this, arguments), '?object']);}, {"signature":"function(?object):?object"});
}.apply(this, arguments), 'function']);}__w(xdResponseWrapper, {"signature":"function(function,?object,?string):function"}); 

function fetchLoginStatus(/*function*/ fn) {__t([fn, 'function', 'fn']);
  var frame, fetchStart = ES('Date', 'now', false);

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  var handleResponse = xdResponseWrapper(fn, currentAuthResponse,
    'login_status');

  var url = URI(UrlMap.resolve('www', true) + '/connect/ping')
    .setQueryData({
      client_id: Runtime.getClientID(),
      response_type: 'token,signed_request,code',
      domain: location.hostname,
      origin: getContextType(),
      redirect_uri: XD.handler(__w(function(/*object*/ response) {__t([response, 'object', 'response']);
        if (feature('e2e_ping_tracking', true)) {
          var events = {
            init: fetchStart,
            close: ES('Date', 'now', false),
            method: 'ping'
          };
          Log.debug('e2e: %s', ES('JSON', 'stringify', false,events));
          
          Impressions.log(114, {
            payload: events
          });
        }
        frame.parentNode.removeChild(frame);
        if (handleResponse(response)) {
          
          timer = setTimeout(function() {
            fetchLoginStatus(function() {});
          }, 1200000); 
        }
      }, {"signature":"function(object)"}), 'parent'),
      sdk: 'joey',
      kid_directed_site: Runtime.getKidDirectedSite()
    });

  frame = createIframe({
    root: DOMWrapper.getRoot(),
    name: guid(),
    url: url.toString(),
    style: { display: 'none' }
  });

}__w(fetchLoginStatus, {"signature":"function(function)"}); 

var loadState;
function getLoginStatus(/*?function*/ cb, /*?boolean*/ force) {__t([cb, '?function', 'cb'], [force, '?boolean', 'force']);
  if (!Runtime.getClientID()) {
    Log.warn('FB.getLoginStatus() called before calling FB.init().');
    return;
  }

  
  
  if (cb) {
    if (!force && loadState == 'loaded') {
      cb({ status: Runtime.getLoginStatus(),
           authResponse: getAuthResponse()});
      return;
    } else {
      Auth.subscribe('FB.loginStatus', cb);
    }
  }

  // if we're already loading, and this is not a force load, we're done
  if (!force && loadState == 'loading') {
    return;
  }

  loadState = 'loading';

  
  var lsCb = __w(function(/*?object*/ response) {__t([response, '?object', 'response']);
    
    loadState = 'loaded';

    
    Auth.inform('FB.loginStatus', response);
    Auth.clearSubscribers('FB.loginStatus');
  }, {"signature":"function(?object)"});

  fetchLoginStatus(lsCb);
}__w(getLoginStatus, {"signature":"function(?function,?boolean)"}); 

ES('Object', 'assign', false,Auth, {
  getLoginStatus: getLoginStatus,
  fetchLoginStatus: fetchLoginStatus,
  setAuthResponse: setAuthResponse,
  getAuthResponse: getAuthResponse,
  parseSignedRequest: SignedRequest.parse,
  
  xdResponseWrapper: xdResponseWrapper
});

module.exports = Auth;


},null);


__d("toArray",["invariant"],function(global,require,requireDynamic,requireLazy,module,exports,invariant) {
   


function toArray(obj) {__t([obj, 'object|function|filelist', 'obj']);return __t([function() {
  var length = obj.length;

  // Some browse builtin objects can report typeof 'function' (e.g. NodeList in
  
  invariant(
    !ES('Array', 'isArray', false,obj) &&
    (typeof obj === 'object' || typeof obj === 'function'),
    'toArray: Array-like object expected'
  );

  invariant(
    typeof length === 'number',
    'toArray: Object needs a length property'
  );

  invariant(
    length === 0 ||
    (length - 1) in obj,
    'toArray: Object should have keys for indices'
  );

  // Old IE doesn't give collections access to hasOwnProperty. Assume inputs
  
  
  if (obj.hasOwnProperty) {
    try {
      return Array.prototype.slice.call(obj);
    } catch (e) {
      
    }
  }

  
  
  var ret = Array(length);
  for (var ii = 0; ii < length; ii++) {
    ret[ii] = obj[ii];
  }
  return ret;
}.apply(this, arguments), 'array']);}__w(toArray, {"signature":"function(object|function|filelist):array"}); 

module.exports = toArray;


},null);


__d("createArrayFrom",["toArray"],function(global,require,requireDynamic,requireLazy,module,exports,toArray) {
   


function hasArrayNature(obj) {return __t([function() {
  return (
    
    !!obj &&
    
    (typeof obj == 'object' || typeof obj == 'function') &&
    
    ('length' in obj) &&
    
    !('setInterval' in obj) &&
    
    // a 'select' element has 'length' and 'item' properties on IE8
    (typeof obj.nodeType != 'number') &&
    (
      
      ES('Array', 'isArray', false,obj) ||
      
      ('callee' in obj) ||
      
      ('item' in obj)
    )
  );
}.apply(this, arguments), 'boolean']);}__w(hasArrayNature, {"signature":"function():boolean"}); 


function createArrayFrom(obj) {return __t([function() {
  if (!hasArrayNature(obj)) {
    return [obj];
  } else if (ES('Array', 'isArray', false,obj)) {
    return obj.slice();
  } else {
    return toArray(obj);
  }
}.apply(this, arguments), 'array']);}__w(createArrayFrom, {"signature":"function():array"}); 

module.exports = createArrayFrom;


},null);


__d("sdk.DOM",["Assert","createArrayFrom","sdk.domReady","UserAgent"],function(global,require,requireDynamic,requireLazy,module,exports,Assert,createArrayFrom,domReady,UserAgent) {
   
   
   
   

var cssRules = {};

function getAttr(/*DOMElement*/ dom, /*string*/ name) /*?string*/ {__t([dom, 'DOMElement', 'dom'], [name, 'string', 'name']);return __t([function() {
  var attribute = (
    dom.getAttribute(name) ||
    dom.getAttribute(name.replace(/_/g, '-')) ||
    dom.getAttribute(name.replace(/-/g, '_')) ||
    dom.getAttribute(name.replace(/-/g, '')) ||
    dom.getAttribute(name.replace(/_/g, '')) ||
    dom.getAttribute('data-' + name) ||
    dom.getAttribute('data-' + name.replace(/_/g, '-')) ||
    dom.getAttribute('data-' + name.replace(/-/g, '_')) ||
    dom.getAttribute('data-' + name.replace(/-/g, '')) ||
    dom.getAttribute('data-' + name.replace(/_/g, ''))
  );
  return attribute
    ? String(attribute)
    : null;
}.apply(this, arguments), '?string']);}__w(getAttr, {"signature":"function(DOMElement,string):?string"}); 

function getBoolAttr(/*DOMElement*/ dom, /*string*/ name) /*?boolean*/ {__t([dom, 'DOMElement', 'dom'], [name, 'string', 'name']);return __t([function() {
  var attribute = getAttr(dom, name);
  return attribute
    ? /^(true|1|yes|on)$/.test(attribute)
    : null;
}.apply(this, arguments), '?boolean']);}__w(getBoolAttr, {"signature":"function(DOMElement,string):?boolean"}); 

function getProp(/*DOMElement*/ dom, /*string*/ name) /*string*/ {__t([dom, 'DOMElement', 'dom'], [name, 'string', 'name']);return __t([function() {
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(name);

  try {
    return String(dom[name]);
  } catch (e) {
    throw new Error('Could not read property ' + name + ' : ' + e.message);
  }
}.apply(this, arguments), 'string']);}__w(getProp, {"signature":"function(DOMElement,string):string"}); 

function html(/*DOMElement*/ dom, /*string*/ content) {__t([dom, 'DOMElement', 'dom'], [content, 'string', 'content']);
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(content);

  try {
    dom.innerHTML = content;
  } catch (e) {
    throw new Error('Could not set innerHTML : ' + e.message);
  }
}__w(html, {"signature":"function(DOMElement,string)"}); 


function hasClass(/*DOMElement*/ dom, /*string*/ className) /*boolean*/ {__t([dom, 'DOMElement', 'dom'], [className, 'string', 'className']);return __t([function() {
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(className);

  var cssClassWithSpace = ' ' + getProp(dom, 'className') + ' ';
  return ES(cssClassWithSpace, 'indexOf', true,' ' + className + ' ') >= 0;
}.apply(this, arguments), 'boolean']);}__w(hasClass, {"signature":"function(DOMElement,string):boolean"}); 


function addClass(/*DOMElement*/ dom, /*string*/ className) {__t([dom, 'DOMElement', 'dom'], [className, 'string', 'className']);
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(className);

  if (!hasClass(dom, className)) {
    dom.className = getProp(dom, 'className') + ' ' + className;
  }
}__w(addClass, {"signature":"function(DOMElement,string)"}); 


function removeClass(/*DOMElement*/ dom, /*string*/ className) {__t([dom, 'DOMElement', 'dom'], [className, 'string', 'className']);
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(className);

  var regExp = new RegExp('\\s*' + className, 'g');
  dom.className = ES(getProp(dom, 'className').replace(regExp, ''),'trim', true);
}__w(removeClass, {"signature":"function(DOMElement,string)"}); 


function getByClass(/*string*/ className, dom, tagName) /*array<DOMElement>*/ {__t([className, 'string', 'className']);return __t([function() {
  Assert.isString(className);

  dom = dom || document.body;
  tagName = tagName || '*';
  if (dom.querySelectorAll) {
    return createArrayFrom(
      dom.querySelectorAll(tagName + '.' + className)
    );
  }
  var all = dom.getElementsByTagName(tagName),
      els = [];
  for (var i = 0, len = all.length; i < len; i++) {
    if (hasClass(all[i], className)) {
      els[els.length] = all[i];
    }
  }
  return els;
}.apply(this, arguments), 'array<DOMElement>']);}__w(getByClass, {"signature":"function(string):array<DOMElement>"}); 


function getStyle(/*DOMElement*/ dom, /*string*/ styleProp) /*string*/ {__t([dom, 'DOMElement', 'dom'], [styleProp, 'string', 'styleProp']);return __t([function() {
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(styleProp);

  // camelCase (e.g. 'marginTop')
  styleProp = styleProp.replace(/-(\w)/g, function(m, g1) {
    return g1.toUpperCase();
  });

  var currentStyle = dom.currentStyle ||
    document.defaultView.getComputedStyle(dom, null);

  var computedStyle = currentStyle[styleProp];

  
  // for some reason it doesn't return '0%' for defaults. so needed to
  // translate 'top' and 'left' into '0px'
  if (/backgroundPosition?/.test(styleProp) &&
      /top|left/.test(computedStyle)) {
    computedStyle = '0%';
  }
  return computedStyle;
}.apply(this, arguments), 'string']);}__w(getStyle, {"signature":"function(DOMElement,string):string"}); 


function setStyle(/*DOMElement*/ dom, /*string*/ styleProp, value) {__t([dom, 'DOMElement', 'dom'], [styleProp, 'string', 'styleProp']);
  Assert.isTruthy(dom, 'element not specified');
  Assert.isString(styleProp);

  // camelCase (e.g. 'marginTop')
  styleProp = styleProp.replace(/-(\w)/g, function(m, g1) {
    return g1.toUpperCase();
  });
  dom.style[styleProp] = value;
}__w(setStyle, {"signature":"function(DOMElement,string)"}); 


function addCssRules(/*string*/ styles, /*array<string>*/ names) {__t([styles, 'string', 'styles'], [names, 'array<string>', 'names']);
  
  
  var allIncluded = true;
  for (var i = 0, id; id = names[i++];) {
    if (!(id in cssRules)) {
      allIncluded = false;
      cssRules[id] = true;
    }
  }

  if (allIncluded) {
    return;
  }

  if (!UserAgent.ie()) {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = styles;
    document.getElementsByTagName('head')[0].appendChild(style);
  } else {
    try {
      document.createStyleSheet().cssText = styles;
    } catch (exc) {
      
      
      
      if (document.styleSheets[0]) {
        document.styleSheets[0].cssText += styles;
      }
    }
  }
}__w(addCssRules, {"signature":"function(string,array<string>)"}); 


function getViewportInfo() /*object*/ {return __t([function() {
  
  var root = (document.documentElement && document.compatMode == 'CSS1Compat')
    ? document.documentElement
    : document.body;

  return {
    
    scrollTop  : root.scrollTop || document.body.scrollTop,
    scrollLeft : root.scrollLeft || document.body.scrollLeft,
    width      : window.innerWidth  ? window.innerWidth  : root.clientWidth,
    height     : window.innerHeight ? window.innerHeight : root.clientHeight
  };
}.apply(this, arguments), 'object']);}__w(getViewportInfo, {"signature":"function():object"}); 


function getPosition(/*DOMElement*/ node) /*object*/ {__t([node, 'DOMElement', 'node']);return __t([function() {
  Assert.isTruthy(node, 'element not specified');

  var x = 0,
      y = 0;
  do {
    x += node.offsetLeft;
    y += node.offsetTop;
  } while (node = node.offsetParent);

  return {x: x, y: y};
}.apply(this, arguments), 'object']);}__w(getPosition, {"signature":"function(DOMElement):object"}); 


var DOM = {
  containsCss: hasClass,
  addCss: addClass,
  removeCss: removeClass,
  getByClass: getByClass,

  getStyle: getStyle,
  setStyle: setStyle,

  getAttr: getAttr,
  getBoolAttr: getBoolAttr,
  getProp: getProp,

  html: html,

  addCssRules: addCssRules,

  getViewportInfo: getViewportInfo,
  getPosition: getPosition,

  ready: domReady
};

module.exports = DOM;


},null);


__d("sdk.ErrorHandling",["sdk.feature","ManagedError","sdk.Runtime","sdk.Scribe","UserAgent","wrapFunction"],function(global,require,requireDynamic,requireLazy,module,exports,feature,ManagedError,Runtime,Scribe,UserAgent,wrapFunction) {
   
   
   
   
   
   

var handleError = feature('error_handling', false);
var currentEntry = '';

function errorHandler(/*object*/ error) {__t([error, 'object', 'error']);
  var originalError = error._originalError;
  delete error._originalError;
  Scribe.log('jssdk_error', {
    appId: Runtime.getClientID(),
    error: error.name || error.message,
    extra: error
  });

  
  throw originalError;
}__w(errorHandler, {"signature":"function(object)"}); 


function normalizeError(err) /*object*/ {return __t([function() {
  var info = {
    line: err.lineNumber || err.line,
    message: err.message,
    name: err.name,
    script: err.fileName || err.sourceURL || err.script,
    stack: err.stackTrace || err.stack
  };

  
  info._originalError = err;

  // Chrome: There's no script/line info in Error objects, and if you rethrow
  
  
  
  if (UserAgent.chrome() && /([\w:\.\/]+\.js):(\d+)/.test(err.stack)) {
    info.script = RegExp.$1;
    info.line = parseInt(RegExp.$2, 10);
  }

  
  for (var k in info) {
    (info[k] == null && delete info[k]);
  }
  return info;
}.apply(this, arguments), 'object']);}__w(normalizeError, {"signature":"function():object"}); 

function guard(/*function*/ func, /*?string*/ entry) /*function*/ {__t([func, 'function', 'func'], [entry, '?string', 'entry']);return __t([function() {
  return function() {
    
    
    if (!handleError) {
      return func.apply(this, arguments);
    }

    try {
      currentEntry = entry;
      return func.apply(this, arguments);
    } catch(error) {
      
      
      if (error instanceof ManagedError) {
        throw error;
      }

      var data = normalizeError(error);
      data.entry = entry;

      
      var sanitizedArgs = ES(Array.prototype.slice.call(arguments), 'map', true,function(arg) {
        var type = Object.prototype.toString.call(arg);
        return (/^\[object (String|Number|Boolean|Object|Date)\]$/).test(type)
          ? arg
          : arg.toString();
      });

      data.args = ES('JSON', 'stringify', false,sanitizedArgs).substring(0, 200);
      errorHandler(data);
    } finally {
      currentEntry = '';
    }
  };
}.apply(this, arguments), 'function']);}__w(guard, {"signature":"function(function,?string):function"}); 

function unguard(/*function*/ func) /*function*/ {__t([func, 'function', 'func']);return __t([function() {
  if (!func.__wrapper) {
    func.__wrapper = function() {
      try {
        return func.apply(this, arguments);
      } catch(e) {
        
        window.setTimeout(function() {
          throw e;
        }, 0);
        return false;
      }
    };
  }
  return func.__wrapper;
}.apply(this, arguments), 'function']);}__w(unguard, {"signature":"function(function):function"}); 

function wrap(real, entry) {
  return function(fn, delay) {
    var name = entry + ':' +
      (currentEntry || '[global]') + ':' +
      (fn.name
       || '[anonymous]' + (arguments.callee.caller.name
         ? '(' +  arguments.callee.caller.name + ')'
         : ''));
    return real(wrapFunction(fn, 'entry', name), delay);
  };
}

if (handleError) {
  
  setTimeout = wrap(setTimeout, 'setTimeout');
  setInterval = wrap(setInterval, 'setInterval');
  wrapFunction.setWrapper(guard, 'entry');
}


var ErrorHandler = {
  guard: guard,
  unguard: unguard
};

module.exports = ErrorHandler;


},null);


__d("sdk.Insights",["sdk.Impressions"],function(global,require,requireDynamic,requireLazy,module,exports,Impressions) {
   

var Insights = {
  TYPE: {
    NOTICE: 'notice',
    WARNING: 'warn',
    ERROR: 'error'
  },
  CATEGORY:  {
    DEPRECATED: 'deprecated',
    APIERROR: 'apierror'
  },

  
  log: __w(function(/*string*/ type, /*string*/ category, /*string*/ content) {__t([type, 'string', 'type'], [category, 'string', 'category'], [content, 'string', 'content']);
    var payload = {
      source: 'jssdk',
      type: type,
      category: category,
      payload: content
    };

    Impressions.log(
      113, 
      payload
    );
  }, {"signature":"function(string,string,string)"}),
  
  impression: Impressions.impression
};

module.exports = Insights;


},null);


__d("FB",["sdk.Auth","JSSDKCssConfig","dotAccess","sdk.domReady","sdk.DOM","sdk.ErrorHandling","sdk.Content","DOMWrapper","GlobalCallback","sdk.Insights","Log","sdk.Runtime","sdk.Scribe","JSSDKConfig"],function(global,require,requireDynamic,requireLazy,module,exports,Auth,CssConfig,dotAccess,domReady,DOM,ErrorHandling,Content,DOMWrapper,GlobalCallback,Insights,Log,Runtime,Scribe,SDKConfig) {
   
   
   
   
   
   
   
   
   
   
   
   
   
   

var externalInterface;
var apiWhitelist, apiWhitelistMode = dotAccess(SDKConfig, 'api.mode');
var logged = {};
externalInterface = window.FB = {};
var FB = {};

if (__DEV__) {
  FB.require = require;
  window._FB = FB
}




Log.level = __DEV__ ? 3 : 1;

// Whitelisted by our SWF's
GlobalCallback.setPrefix('FB.__globalCallbacks');

var fbRoot = document.createElement('div');
DOMWrapper.setRoot(fbRoot);

domReady(function() {
  Log.info('domReady');
  Content.appendHidden(fbRoot);
  if (CssConfig.rules) {
    DOM.addCssRules(CssConfig.rules, CssConfig.components);
  }
});

Runtime.subscribe('AccessToken.change', __w(function(/*?string*/ value) {__t([value, '?string', 'value']);
  if (!value && Runtime.getLoginStatus() === 'connected') {
    // The access token was invalidated, but we're still connected
    
    Auth.getLoginStatus(null, true);
  }
}, {"signature":"function(?string)"}));



if (dotAccess(SDKConfig, 'api.whitelist.length')) {
  apiWhitelist = {};
  ES(SDKConfig.api.whitelist, 'forEach', true,__w(function(/*string*/ key) {__t([key, 'string', 'key']);
    apiWhitelist[key] = 1;
  }, {"signature":"function(string)"}));
}

function protect(/*function*/ fn, /*string*/ accessor, /*string*/ key,
    /*object*/ context) /*?function*/ {__t([fn, 'function', 'fn'], [accessor, 'string', 'accessor'], [key, 'string', 'key'], [context, 'object', 'context']);return __t([function() {
  var exportMode;
  if (/^_/.test(key)) {
    exportMode = 'hide';
  } else if (apiWhitelist && !apiWhitelist[accessor]) {
    exportMode = apiWhitelistMode;
  }

  switch(exportMode) {
    case 'hide':
      return;
    case 'stub':
      return function() {
        Log.warn('The method FB.%s has been removed from the JS SDK.',
          accessor);
      };
      break;
    default:
      return ErrorHandling.guard(function(/*args*/) {
        if (exportMode === 'warn') {
          Log.warn('The method FB.%s is not officially supported by ' +
            'Facebook and access to it will soon be removed.', accessor);
          if (!logged.hasOwnProperty(accessor)) {
            Insights.log(
              Insights.TYPE.WARNING,
              Insights.CATEGORY.DEPRECATED,
              'FB.' + accessor
            );

            
            Scribe.log('jssdk_error', {
              appId: Runtime.getClientID(),
              error: 'Private method used',
              extra: {args: accessor}
            });

            logged[accessor] = true;
          }
        }

        function unwrap(val) {
          if (ES('Array', 'isArray', false,val)) {
            return ES(val, 'map', true,unwrap);
          }
          if (val && typeof val === 'object' && val.__wrapped) {
            
            return val.__wrapped;
          }
          
          // throwing an error during execution, it doesn't bubble up through
          // the JS SDK's callstack.
          // Due to FF's typeof returning 'function' for HTMLObjectElement,
          
          return typeof val === 'function' && /^function/.test(val.toString())
            ? ErrorHandling.unguard(val)
            : val;
        }

        var args = ES(Array.prototype.slice.call(arguments), 'map', true,unwrap);

        var result = fn.apply(context, args);
        var facade;
        var isPlainObject = true;

        if (result && typeof result === 'object') {
          // This crazy block here creates a 'facade' object that we can return
          
          // object, they aren't subject to the same limitations :)
          var F = Function();
          F.prototype = result;
          facade = new F();
          facade.__wrapped = result;

          
          
          for (var key in result) {
            var property = result[key];
            if (typeof property !== 'function' || key === 'constructor') {
              continue;
            }
            isPlainObject = false;
            facade[key] = protect(property, accessor + ':' + key, key, result);
          }
        }

          if (!isPlainObject) {
            return facade;
          }
        return isPlainObject
          ? result
          : facade;
      }, accessor);
  }
}.apply(this, arguments), '?function']);}__w(protect, {"signature":"function(function,string,string,object):?function"}); 


function provide(/*string*/ name, /*object*/ source) {__t([name, 'string', 'name'], [source, 'object', 'source']);
  var externalTarget = name
    ? dotAccess(externalInterface, name, true)
    : externalInterface;

  ES(ES('Object', 'keys', false,source), 'forEach', true,__w(function(/*string*/ key) {__t([key, 'string', 'key']);
    var value = source[key];

    
    if (typeof value === 'function') {
      var accessor = (name ? name + '.' : '') + key;
      var exportedProperty = protect(value, accessor, key, source);
      if (exportedProperty) {
        externalTarget[key] = exportedProperty;
      }
    }
  }, {"signature":"function(string)"}));
}__w(provide, {"signature":"function(string,object)"}); 



Runtime.setSecure((__w(function() /*?boolean*/ {return __t([function() {
  // Resolve whether we're in a canvas context or not
  var inCanvas = /iframe_canvas|app_runner/.test(window.name);
  var inDialog = /dialog/.test(window.name);

  
  
  if (location.protocol == 'https:' &&
      (window == top || !(inCanvas || inDialog))) {
    
    
    
    return true;
  }

  
  
  if (/_fb_https?/.test(window.name)) {
    return ES(window.name, 'indexOf', true,'_fb_https') != -1;
  }
}.apply(this, arguments), '?boolean']);}, {"signature":"function():?boolean"}))());


ES('Object', 'assign', false,FB, {

  
  provide: provide

});

module.exports = FB;


},null);


__d("ArgumentError",["ManagedError"],function(global,require,requireDynamic,requireLazy,module,exports,ManagedError) {
   

function ArgumentError(message, innerError) {
  ManagedError.prototype.constructor.apply(this, arguments);
}
ArgumentError.prototype = new ManagedError();
ArgumentError.prototype.constructor = ArgumentError;

module.exports = ArgumentError;


},null);

__d("CORSRequest",["wrapFunction","QueryString"],function(global,require,requireDynamic,requireLazy,module,exports,wrapFunction,QueryString) {
/*global self:true*/
   
   

function createCORSRequest(/*string*/ method, /*string*/ url) /*?object*/ {__t([method, 'string', 'method'], [url, 'string', 'url']);return __t([function() {
   if (!self.XMLHttpRequest) {
    return null;
   }
   var xhr = new XMLHttpRequest();
   var noop = function() {};
   if ('withCredentials' in xhr) {
     xhr.open(method, url, true);
     xhr.setRequestHeader(
       'Content-type', 'application/x-www-form-urlencoded');
   } else if (self.XDomainRequest) {
     xhr = new XDomainRequest();
     try {
       
       
       
       
       xhr.open(method, url);

       
       
       
       
       
       
       xhr.onprogress = xhr.ontimeout = noop;
     } catch (accessDeniedError) {
       return null;
     }
   } else {
     return null;
   }

   var wrapper = {
     send: __w(function(/*string*/ data) {__t([data, 'string', 'data']);
       xhr.send(data);
     }, {"signature":"function(string)"})
   };
   var onload = wrapFunction(function() {
     onload = noop;
     if ('onload' in wrapper)  {
       wrapper.onload(xhr);
     }
   }, 'entry', 'XMLHttpRequest:load');
   var onerror = wrapFunction(function() {
     onerror = noop;
     if ('onerror' in wrapper) {
       wrapper.onerror(xhr);
     }
   }, 'entry', 'XMLHttpRequest:error');

   
   
   
   

   xhr.onload = function() {
     onload();
   };

   xhr.onerror = function() {
     onerror();
   };

   xhr.onreadystatechange = function() {
     if (xhr.readyState == 4) {
       if (xhr.status == 200) {
         onload();
       } else {
         onerror();
       }
     }
   };

   return wrapper;
}.apply(this, arguments), '?object']);}__w(createCORSRequest, {"signature":"function(string,string):?object"}); 

function execute(/*string*/ url, /*string*/ method, /*object*/ params,
    /*function*/ cb) /*boolean*/ {__t([url, 'string', 'url'], [method, 'string', 'method'], [params, 'object', 'params'], [cb, 'function', 'cb']);return __t([function() {
  params.suppress_http_code = 1;
  var data = QueryString.encode(params);

  if (method != 'post') {
    url = QueryString.appendToUrl(url, data);
    data = '';
  }

  var request = createCORSRequest(method, url);
  if (!request) {
    return false;
  }

  request.onload = function(xhr) {
    cb(ES('JSON', 'parse', false,xhr.responseText));
  };
  request.onerror = function(xhr) {
    if (xhr.responseText) {
      cb(ES('JSON', 'parse', false,xhr.responseText));
    } else {
      cb({
        error: {
          type   : 'http',
          message: 'unknown error',
          status : xhr.status
        }
      });
    }
  };
  request.send(data);
  return true;
}.apply(this, arguments), 'boolean']);}__w(execute, {"signature":"function(string,string,object,function):boolean"}); 

var CORSRequest = {
  execute: execute
};
module.exports = CORSRequest;


},null);


__d("FlashRequest",["DOMWrapper","Flash","GlobalCallback","QueryString","Queue"],function(global,require,requireDynamic,requireLazy,module,exports,DOMWrapper,Flash,GlobalCallback,QueryString,Queue) {
       
            
   
      
            

var flashQueue; 
var requestCallbacks = {}; 
var swfUrl; 
var swf; 

function initFlash() {
  if (!swfUrl) {
    throw new Error('swfUrl has not been set');
  }

  var initCallback = GlobalCallback.create(function() {
    flashQueue.start(__w(function(/*object*/ item) {__t([item, 'object', 'item']);
      var id = swf.execute(
        item.method,
        item.url,
        item.body);

      if (!id) {
        throw new Error('Could create request');
      }
      requestCallbacks[id] = item.callback;
    }, {"signature":"function(object)"}));
  });

  
  var requestCallback = GlobalCallback.create(__w(function(/*number*/ id,
      /*number*/ status, /*string*/ response) {__t([id, 'number', 'id'], [status, 'number', 'status'], [response, 'string', 'response']);
    var data;
    try {
      data = ES('JSON', 'parse', false,decodeURIComponent(response));
    } catch (parseError) {
      data = {
        error: {
          type   : 'SyntaxError',
          message: parseError.message,
          status : status,
          raw    : response
        }
      };
    }

    requestCallbacks[id](data);
    delete requestCallbacks[id];
  }, {"signature":"function(number,number,string)"}));

  swf = Flash.embed(swfUrl, DOMWrapper.getRoot(), null, {
    log: __DEV__ ? true : false,
    initCallback: initCallback,
    requestCallback: requestCallback
  });
}


function execute(/*string*/ url, /*string*/ method, /*object*/ params,
    /*function*/ cb) /*boolean*/ {__t([url, 'string', 'url'], [method, 'string', 'method'], [params, 'object', 'params'], [cb, 'function', 'cb']);return __t([function() {
  
  
  params.suppress_http_code = 1;

  
  
  
  if (!params.method) {
    params.method = method;
  }


  var body = QueryString.encode(params);
  if (method === 'get' && url.length + body.length < 2000) {
    
    
    url = QueryString.appendToUrl(url, body);
    body = '';
  } else {
    method = 'post';
  }

  
  if (!flashQueue) {
    if (!Flash.isAvailable()) {
      return false;
    }
    flashQueue = new Queue();
    initFlash();
  }

  
  flashQueue.enqueue({
    method: method,
    url: url,
    body: body,
    callback: cb
  });
  return true;
}.apply(this, arguments), 'boolean']);}__w(execute, {"signature":"function(string,string,object,function):boolean"}); 

var FlashRequest = {
  setSwfUrl: __w(function(/*string*/ swf_url) {__t([swf_url, 'string', 'swf_url']);
    swfUrl = swf_url;
  }, {"signature":"function(string)"}),
  execute: execute
};

module.exports = FlashRequest;


},null);


__d("flattenObject",[],function(global,require,requireDynamic,requireLazy,module,exports) {

function flattenObject(/*object*/ obj) /*object*/ {__t([obj, 'object', 'obj']);return __t([function() {
  var flat = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      var value = obj[key];
      if (null === value || undefined === value) {
        continue;
      } else if (typeof value == 'string') {
        flat[key] = value;
      } else {
        flat[key] = ES('JSON', 'stringify', false,value); }
    }
  }
  return flat;
}.apply(this, arguments), 'object']);}__w(flattenObject, {"signature":"function(object):object"}); 

module.exports = flattenObject;


},null);


__d("JSONPRequest",["DOMWrapper","GlobalCallback","QueryString"],function(global,require,requireDynamic,requireLazy,module,exports,DOMWrapper,GlobalCallback,QueryString) {
       
   
      


function execute(/*string*/ url, /*string*/ method, /*object*/ params,
    /*function*/ cb) /*boolean*/ {__t([url, 'string', 'url'], [method, 'string', 'method'], [params, 'object', 'params'], [cb, 'function', 'cb']);return __t([function() {
  var script = document.createElement('script');

  var callbackWrapper = function(response) {
    callbackWrapper = function() {};
    GlobalCallback.remove(params.callback);
    cb(response);
    script.parentNode.removeChild(script);
  };

  params.callback = GlobalCallback.create(callbackWrapper);

  
  if (!params.method) {
    params.method = method;
  }

  url = QueryString.appendToUrl(url, params);
  if (url.length > 2000) {
    GlobalCallback.remove(params.callback);
    return false;
  }

  
  script.onerror = function() {
    callbackWrapper({
      error: {
        type   : 'http',
        message: 'unknown error'
      }
    });
  };

  
  var ensureCallbackCalled = function() {
    setTimeout(function() {
      
      
      callbackWrapper({
        error: {
          type   : 'http',
          message: 'unknown error'
        }
      });
    }, 0);
  };
  if (script.addEventListener) {
    script.addEventListener('load', ensureCallbackCalled, false);
  } else {
    script.onreadystatechange = function() {
      if (/loaded|complete/.test(this.readyState)) {
        ensureCallbackCalled();
      }
    };
  }

  script.src = url;
  DOMWrapper.getRoot().appendChild(script);
  return true;
}.apply(this, arguments), 'boolean']);}__w(execute, {"signature":"function(string,string,object,function):boolean"}); 

var JSONPRequest = {
  execute: execute
};

module.exports = JSONPRequest;


},null);


__d("ApiClient",["ArgumentError","Assert","CORSRequest","FlashRequest","flattenObject","JSONPRequest","Log","ObservableMixin","sprintf","sdk.URI","UrlMap","ApiClientConfig"],function(global,require,requireDynamic,requireLazy,module,exports,ArgumentError,Assert,CORSRequest,FlashRequest,flattenObject,JSONPRequest,Log,ObservableMixin,sprintf,URI,UrlMap,ApiClientConfig) {
    
           
      
     
    
     
              
   
          
              
           

   

var accessToken;
var clientID;
var defaultParams;

var METHODS = {
  'get': true,
  'post': true,
  'delete': true,
  'put': true
};

var READONLYCALLS = {
  fql_query: true,
  fql_multiquery: true,
  friends_get: true,
  notifications_get: true,
  stream_get: true,
  users_getinfo: true
};


function request(/*string*/ url, /*string*/ method, /*object*/ params,
    /*function*/ cb) {__t([url, 'string', 'url'], [method, 'string', 'method'], [params, 'object', 'params'], [cb, 'function', 'cb']);
  if (defaultParams) {
    params = ES('Object', 'assign', false,{}, defaultParams, params);
  }

  params.access_token = params.access_token || accessToken;
  params.pretty = params.pretty || 0;

  params = flattenObject(params);
  var availableTransports = {
    jsonp: JSONPRequest,
    cors : CORSRequest,
    flash: FlashRequest
  };

  
  
  var transports;
  if (params.transport) {
    transports = [params.transport];
    delete params.transport;
  } else {
    transports = ['jsonp', 'cors', 'flash'];
  }

  for (var i = 0; i < transports.length; i++) {
    var transport = availableTransports[transports[i]];
    var paramsCopy = ES('Object', 'assign', false,{}, params);
    if (transport.execute(url, method, paramsCopy, cb)) {
      return;
    }
  }

  cb({
    error: {
      type   : 'no-transport',
      message: 'Could not find a usable transport for request'
    }
  });
}__w(request, {"signature":"function(string,string,object,function)"}); 

function inspect(/*?function*/ callback, /*string*/ endpoint, /*string*/ method,
    /*object*/ params, response) {__t([callback, '?function', 'callback'], [endpoint, 'string', 'endpoint'], [method, 'string', 'method'], [params, 'object', 'params']);
  ApiClient.inform('request.complete', endpoint, method, params, response);
  if (callback) {
    callback(response);
  }
}__w(inspect, {"signature":"function(?function,string,string,object)"}); 


function requestUsingGraph(/*string*/ path) {__t([path, 'string', 'path']);
  Assert.isString(path, 'Invalid path');
  if (!/^https?/.test(path) && path.charAt(0) !== '/')  {
    path = '/' + path;
  }

  var uri;
  var args = {};

  try {
    uri = new URI(path);
  } catch (e) {
    throw new ArgumentError(e.message, e);
  }

  
  ES(Array.prototype.slice.call(arguments, 1), 'forEach', true,function(argument) {
    args[typeof argument] = argument;
  });

  var method = (args.string || 'get').toLowerCase();

  Assert.isTrue(
    METHODS.hasOwnProperty(method),
    sprintf('Invalid method passed to ApiClient: %s', method)
  );

  var callback = args['function'];
  if (!callback) {
    Log.warn('No callback passed to the ApiClient');
  }

  if (args.object) {
    uri.addQueryData(args.object);
  }
  var params = uri.getQueryData();

  var inspector = ES(inspect, 'bind', true,null, callback, uri.getPath(), method, params);

  var url = uri.getProtocol() && uri.getDomain()
    ? uri.setQueryData({}).toString()
    : UrlMap.resolve('graph') + uri.getPath();

  params.method = method;
  request(url, method == 'get' ? 'get' : 'post', params, inspector);
}__w(requestUsingGraph, {"signature":"function(string)"}); 


function requestUsingRest(/*object*/ params, /*?function*/ cb) {__t([params, 'object', 'params'], [cb, '?function', 'cb']);
  Assert.isObject(params);
  Assert.isString(params.method, 'method missing');

  if (!cb) {
    Log.warn('No callback passed to the ApiClient');
  }
  var method = params.method.toLowerCase().replace('.', '_');
  params.format = 'json-strings';
  params.api_key = clientID;

  var domain = method in READONLYCALLS ? 'api_read' : 'api';
  var url = UrlMap.resolve(domain) + '/restserver.php';
  var inspector = ES(inspect, 'bind', true,null, cb, '/restserver.php', 'get', params);
  request(url, 'get', params, inspector);
}__w(requestUsingRest, {"signature":"function(object,?function)"}); 

var ApiClient = ES('Object', 'assign', false,new ObservableMixin(), {
  setAccessToken: __w(function(/*?string*/ access_token) {__t([access_token, '?string', 'access_token']);
    accessToken = access_token;
  }, {"signature":"function(?string)"}),
  setClientID: __w(function(/*?string*/ client_id) {__t([client_id, '?string', 'client_id']);
    clientID = client_id;
  }, {"signature":"function(?string)"}),
  setDefaultParams: __w(function(/*?object*/ default_params) {__t([default_params, '?object', 'default_params']);
    defaultParams = default_params;
  }, {"signature":"function(?object)"}),
  rest: requestUsingRest,
  graph: requestUsingGraph
});


FlashRequest.setSwfUrl(ApiClientConfig.FlashRequest.swfUrl);

module.exports = ApiClient;


},null);


__d("sdk.PlatformVersioning",["sdk.Runtime","ManagedError"],function(global,require,requireDynamic,requireLazy,module,exports,Runtime,ManagedError) {
   
   

var REGEX = /^v\d+\.\d\d?$/;

var PlatformVersioning = {

  REGEX: REGEX,

  assertVersionIsSet: function() {
    if (!Runtime.getVersion()) {
      throw new ManagedError('init not called with valid version');
    }
  },

  assertValidVersion: __w(function(/*string*/ version) {__t([version, 'string', 'version']);
    if (!REGEX.test(version)) {
      throw new ManagedError('invalid version specified');
    }
  }, {"signature":"function(string)"})

};

module.exports = PlatformVersioning;


},null);


__d("sdk.api",["ApiClient","sdk.PlatformVersioning","sdk.Runtime","sdk.URI"],function(global,require,requireDynamic,requireLazy,module,exports,ApiClient,PlatformVersioning,Runtime,URI) {
    
   
      
   

var currentAccessToken;

Runtime.subscribe('ClientID.change', __w(function(/*?string*/ value) {__t([value, '?string', 'value']);
  ApiClient.setClientID(value);
}, {"signature":"function(?string)"}));

Runtime.subscribe('AccessToken.change', __w(function(/*?string*/ value) {__t([value, '?string', 'value']);
  currentAccessToken = value;
  ApiClient.setAccessToken(value);
}, {"signature":"function(?string)"}));

ApiClient.setDefaultParams({
  sdk: 'joey'
});


ApiClient.subscribe('request.complete', __w(function(/*string*/ endpoint,
    /*string*/ method, /*object*/ params, response) {__t([endpoint, 'string', 'endpoint'], [method, 'string', 'method'], [params, 'object', 'params']);
    var invalidateToken = false;
    if (response && typeof response == 'object') {
      if (response.error) {
        if (response.error == 'invalid_token'
            || (response.error.type == 'OAuthException'
                && response.error.code == 190)) {
          invalidateToken = true;
        }
      } else if (response.error_code) {
        if (response.error_code == '190') {
          invalidateToken = true;
        }
      }
    }
  if (invalidateToken
      && currentAccessToken === Runtime.getAccessToken()) {
    
    Runtime.setAccessToken(null);
  }
}, {"signature":"function(string,string,object)"}));

// Inspector for calls that untos'es the app
ApiClient.subscribe('request.complete', __w(function(/*string*/ endpoint,
    /*string*/ method, /*object*/ params, response) {__t([endpoint, 'string', 'endpoint'], [method, 'string', 'method'], [params, 'object', 'params']);
  if (((endpoint == '/me/permissions'
        && method === 'delete')
       || (endpoint == '/restserver.php'
            && params.method == 'Auth.revokeAuthorization'))
      && response === true) {
    Runtime.setAccessToken(null);
  }
}, {"signature":"function(string,string,object)"}));


function api(path) {

  
  if (typeof path === 'string') {
    if (Runtime.getIsVersioned()) {
      PlatformVersioning.assertVersionIsSet();

      
      if (!/https?/.test(path) && path.charAt(0) !== '/') {
        path = '/' + path;
      }
      path = URI(path).setDomain(null).setProtocol(null).toString();

      
      if (!PlatformVersioning.REGEX
            .test(path.substring(1, ES(path, 'indexOf', true,'/', 1)))) {
        path = '/' + Runtime.getVersion() + path;
      }

      var args = [path].concat(Array.prototype.slice.call(arguments, 1));
      ApiClient.graph.apply(ApiClient, args);
    } else {
      ApiClient.graph.apply(ApiClient, arguments);
    }
  } else {
    ApiClient.rest.apply(ApiClient, arguments);
  }
}

module.exports = api;


},null);


__d("legacy:fb.api",["FB","sdk.api"],function(global,require,requireDynamic,requireLazy,__DO_NOT_USE__module,__DO_NOT_USE__exports,FB,api) {
   
   

FB.provide('', {
  api: api
});


},3);


__d("sdk.Canvas.Environment",["sdk.RPC"],function(global,require,requireDynamic,requireLazy,module,exports,RPC) {
   

function getPageInfo(/*function*/ appCallback) {__t([appCallback, 'function', 'appCallback']);
  RPC.remote.getPageInfo(__w(function(/*object*/ response) {__t([response, 'object', 'response']);
    appCallback(response.result);
  }, {"signature":"function(object)"}));
}__w(getPageInfo, {"signature":"function(function)"}); 

function scrollTo(/*?number*/ x, /*?number*/ y) {__t([x, '?number', 'x'], [y, '?number', 'y']);
  RPC.remote.scrollTo({ x: x || 0, y: y || 0 });
}__w(scrollTo, {"signature":"function(?number,?number)"}); 


RPC.stub('getPageInfo');
RPC.stub('scrollTo');

var Environment = {
  getPageInfo: getPageInfo,
  scrollTo: scrollTo
};

module.exports = Environment;


},null);


__d("sdk.Intl",["Log"],function(global,require,requireDynamic,requireLazy,module,exports,Log) {
   


var _punctCharClass = (
  '[' +
    '.!?' +
    '\u3002' +  
    '\uFF01' +  
    '\uFF1F' +  
    '\u0964' +  // Hindi "full stop"
    '\u2026' +  
    '\u0EAF' +  
    '\u1801' +  
    '\u0E2F' +  
    '\uFF0E' +  
  ']'
);


function _endsInPunct(/*?string*/ str) /*boolean*/ {__t([str, '?string', 'str']);return __t([function() {
  if (typeof str != 'string') {
    return false;
  }

  return !!str.match(new RegExp(
    _punctCharClass +
    '[' +
      ')"' +
      "'" +
      // JavaScript doesn't support Unicode character
      
      
      // abbreviated list of the "final punctuation"
      // and "close punctuation" Unicode codepoints,
      // excluding symbols we're unlikely to ever
      
      '\u00BB' +  
      '\u0F3B' +  
      '\u0F3D' +  
      '\u2019' +  
      '\u201D' +  
      '\u203A' +  
      '\u3009' +  
      '\u300B' +  
      '\u300D' +  
      '\u300F' +  
      '\u3011' +  
      '\u3015' +  
      '\u3017' +  
      '\u3019' +  
      '\u301B' +  
      '\u301E' +  
      '\u301F' +  
      '\uFD3F' +  
      '\uFF07' +  
      '\uFF09' +  
      '\uFF3D' +  
      '\\s' +
    ']*$'
  ));
}.apply(this, arguments), 'boolean']);}__w(_endsInPunct, {"signature":"function(?string):boolean"}); 


function _substituteTokens(/*string*/ str, /*?object*/ args) /*string*/ {__t([str, 'string', 'str'], [args, '?object', 'args']);return __t([function() {
  
  
  if (args !== undefined) {
    if (typeof args != 'object') {
      Log.error(
        'The second arg to FB.Intl.tx() must be an Object for ' +
        'FB.Intl.tx(' + str + ', ...)'
      );
    } else {
      var regexp;
      for (var key in args) {
        if (args.hasOwnProperty(key)) {
          // _substituteTokens("You are a {what}.", {what:'cow!'}) should be
          // "You are a cow!" rather than "You are a cow!."

          if (_endsInPunct(args[key])) {
            
            
            regexp = new RegExp('\\{' + key + '\\}' +
                                  _punctCharClass + '*',
                                'g');
          } else {
            regexp = new RegExp('\\{' + key + '\\}', 'g');
          }
          str = str.replace(regexp, args[key]);
        }
      }
    }
  }
  return str;
}.apply(this, arguments), 'string']);}__w(_substituteTokens, {"signature":"function(string,?object):string"}); 


function tx() {
  throw new Error('Placeholder function');
}

// FB.Intl.tx('key') is rewritten to FB.Intl.tx._('Translated value')
tx._ = _substituteTokens;


module.exports = {
  tx: tx};


},null);


__d("sdk.Dialog",["sdk.Canvas.Environment","sdk.Content","sdk.DOM","DOMEventListener","sdk.Intl","ObservableMixin","sdk.Runtime","Type","UserAgent","sdk.feature"],function(global,require,requireDynamic,requireLazy,module,exports,CanvasEnvironment,Content,DOM,DOMEventListener,Intl,ObservableMixin,Runtime,Type,UserAgent,feature) {
   
   
   
   
   
   
   
   
   
   

var MAX_HEIGHT_MOBILE = 590;
var MAX_WIDTH_MOBILE = 500;
var MAX_HEIGHT_DESKTOP = 240;
var MAX_WIDTH_DESKTOP = 575;


var isTablet = __w(function() /*boolean*/ {return __t([function() {
  var result;
  if (feature('dialog_resize_refactor')) {
      var size = getMobileSize();
      result = size
        && (size.height >= MAX_HEIGHT_MOBILE || size.width >= MAX_WIDTH_MOBILE);
    } else {
      result = !!UserAgent.ipad();
    }
    isTablet = __w(function() /*boolean*/ {return __t([function() { return result; }.apply(this, arguments), 'boolean']);}, {"signature":"function():boolean"});
    return result;
}.apply(this, arguments), 'boolean']);}, {"signature":"function():boolean"});

function getMobileSize() /*?object*/ {return __t([function() {
  
  if (feature('dialog_resize_refactor')) {
    var info = DOM.getViewportInfo();
    if (info.height && info.width) {
      return {
        width: Math.min(info.width, MAX_HEIGHT_MOBILE),
        height: Math.min(info.height, MAX_WIDTH_MOBILE)
      };
    }
  }
  return null;
}.apply(this, arguments), '?object']);}__w(getMobileSize, {"signature":"function():?object"}); 


var SdkDialog = Type.extend({
  constructor: __w(function SdkDialog(/*string*/ id, /*string*/ display) {__t([id, 'string', 'id'], [display, 'string', 'display']);
    this.parent();
    this.id = id;
    this.display = display;
    
    this._e2e = {};

    if (!Dialog._dialogs) {
      Dialog._dialogs = {};
      Dialog._addOrientationHandler();
    }
    Dialog._dialogs[id] = this;
    this.trackEvent('init');
  }, {"type":"SdkDialog","signature":"function(string,string)"}),

  trackEvent: __w(function(/*string*/ name, /*?number*/ time) /*SdkDialog*/ {__t([name, 'string', 'name'], [time, '?number', 'time']);return __t([function() {
    if (this._e2e[name]) {
      return this;
    }
    this._e2e[name] = time || ES('Date', 'now', false);
    if (name == 'close') {
      
      this.inform('e2e:end', this._e2e);
    }
    return this;
  }.apply(this, arguments), 'SdkDialog']);}, {"signature":"function(string,?number):SdkDialog"}),

  trackEvents: __w(function(/*string|object*/ events) /*SdkDialog*/ {__t([events, 'string|object', 'events']);return __t([function() {
    if (typeof events === 'string') {
      events = ES('JSON', 'parse', false,events);
    }
    for (var key in events) {
      if (events.hasOwnProperty(key)) {
        this.trackEvent(key, events[key]);
      }
    }
    return this;
  }.apply(this, arguments), 'SdkDialog']);}, {"signature":"function(string|object):SdkDialog"})
}, ObservableMixin);

var Dialog = {
  newInstance: __w(function(/*string*/ id, /*string*/ display) /*SdkDialog*/ {__t([id, 'string', 'id'], [display, 'string', 'display']);return __t([function() {
    return new SdkDialog(id, display);
  }.apply(this, arguments), 'SdkDialog']);}, {"signature":"function(string,string):SdkDialog"}),

  
  _dialogs: null,
  _lastYOffset: 0,

  
  _loaderEl: null,

  
  _overlayEl: null,

  
  _stack: [],

  
  _active: null,

  
  get: __w(function(/*string*/ id) /*SdkDialog*/ {__t([id, 'string', 'id']);return __t([function() {
    return Dialog._dialogs[id];
  }.apply(this, arguments), 'SdkDialog']);}, {"signature":"function(string):SdkDialog"}),


  
  _findRoot: __w(function(/*DOMElement*/ node) /*DOMElement*/ {__t([node, 'DOMElement', 'node']);return __t([function() {
    while (node) {
      if (DOM.containsCss(node, 'fb_dialog')) {
        return node;
      }
      node = node.parentNode;
    }
  }.apply(this, arguments), 'DOMElement']);}, {"signature":"function(DOMElement):DOMElement"}),

  _createWWWLoader: __w(function(/*number*/ width) /*DOMElement*/ {__t([width, 'number', 'width']);return __t([function() {
    width = width ? width : 460;
    return Dialog.create({
      content: (
      '<div class="dialog_title">' +
      '  <a id="fb_dialog_loader_close">' +
      '    <div class="fb_dialog_close_icon"></div>' +
      '  </a>' +
      '  <span>Facebook</span>' +
      '  <div style="clear:both;"></div>' +
      '</div>' +
      '<div class="dialog_content"></div>' +
      '<div class="dialog_footer"></div>'),
      width: width
    });
  }.apply(this, arguments), 'DOMElement']);}, {"signature":"function(number):DOMElement"}),

  _createMobileLoader: __w(function() /*DOMElement*/ {return __t([function() {
    
    // We're copying the HTML/CSS output of an XHP element here
    
    
    
    var chrome = UserAgent.nativeApp()
      ? ''
      : ('<table>' +
        '  <tbody>' +
        '    <tr>' +
        '      <td class="header_left">' +
        '        <label class="touchable_button">' +
        '          <input type="submit" value="' +
                     Intl.tx._("Annuler") + '"' +
        '            id="fb_dialog_loader_close"/>' +
        '        </label>' +
        '      </td>' +
        '      <td class="header_center">' +
        '        <div>' + Intl.tx._("Chargement...") + '</div>' +
        '      </td>' +
        '      <td class="header_right">' +
        '      </td>' +
        '    </tr>' +
        '  </tbody>' +
        '</table>');

    return Dialog.create({
      classes: 'loading' + (isTablet() ? ' centered' : ''),
      content: (
        '<div class="dialog_header">' +
          chrome +
        '</div>')
    });
  }.apply(this, arguments), 'DOMElement']);}, {"signature":"function():DOMElement"}),

  _restoreBodyPosition: function() {
    if (!isTablet()) {
      var body = document.getElementsByTagName('body')[0];
      DOM.removeCss(body, 'fb_hidden');
    }
  },

  _showTabletOverlay: function() {
    if (!isTablet()) {
      return;
    }
    if (!Dialog._overlayEl) {
      Dialog._overlayEl = document.createElement('div');
      Dialog._overlayEl.setAttribute('id', 'fb_dialog_ipad_overlay');
      Content.append(Dialog._overlayEl, null);
    }
    Dialog._overlayEl.className = '';
  },

  _hideTabletOverlay: function() {
    if (isTablet()) {
      Dialog._overlayEl.className = 'hidden';
    }
  },

  
  showLoader: __w(function(/*?function*/ cb, /*number*/ width) {__t([cb, '?function', 'cb'], [width, 'number', 'width']);
    Dialog._showTabletOverlay();

    if (!Dialog._loaderEl) {
      Dialog._loaderEl = Dialog._findRoot(UserAgent.mobile()
        ? Dialog._createMobileLoader()
        : Dialog._createWWWLoader(width));
    }

    // this needs to be done for each invocation of showLoader. since we don't
    
    
    
    if (!cb) {
      cb = function() {};
    }
    var loaderClose = document.getElementById('fb_dialog_loader_close');
    DOM.removeCss(loaderClose, 'fb_hidden');
    loaderClose.onclick = function() {
      Dialog._hideLoader();
      Dialog._restoreBodyPosition();
      Dialog._hideTabletOverlay();
      cb();
    };
    var tabletOverlay = document.getElementById('fb_dialog_ipad_overlay');
    if (tabletOverlay) {
      tabletOverlay.ontouchstart = loaderClose.onclick;
    }

    Dialog._makeActive(Dialog._loaderEl);
  }, {"signature":"function(?function,number)"}),

  
  _hideLoader: function() {
    if (Dialog._loaderEl && Dialog._loaderEl == Dialog._active) {
      Dialog._loaderEl.style.top = '-10000px';
    }
  },

  
  _makeActive: __w(function(/*DOMElement*/ el) {__t([el, 'DOMElement', 'el']);
    Dialog._setDialogSizes();
    Dialog._lowerActive();
    Dialog._active = el;
    if (Runtime.isEnvironment(Runtime.ENVIRONMENTS.CANVAS)) {
      CanvasEnvironment.getPageInfo(function(pageInfo) {
        Dialog._centerActive(pageInfo);
      });
    }
    Dialog._centerActive();
  }, {"signature":"function(DOMElement)"}),

  
  _lowerActive: function() {
    if (!Dialog._active) {
      return;
    }
    Dialog._active.style.top = '-10000px';
    Dialog._active = null;
  },

  
  _removeStacked: __w(function(/*DOMElement*/ dialog) {__t([dialog, 'DOMElement', 'dialog']);
    Dialog._stack = ES(Dialog._stack, 'filter', true,function(node) {
      return node != dialog;
    });
  }, {"signature":"function(DOMElement)"}),

  
  _centerActive: __w(function(/*?object*/ pageInfo) {__t([pageInfo, '?object', 'pageInfo']);
    var dialog = Dialog._active;
    if (!dialog) {
      return;
    }

    var view = DOM.getViewportInfo();
    var width = parseInt(dialog.offsetWidth, 10);
    var height = parseInt(dialog.offsetHeight, 10);
    var left = view.scrollLeft + (view.width - width) / 2;

    
    // these ensure that the dialog is always within the iframe's
    
    
    
    
    
    var minTop = (view.height - height) / 2.5;
    if (left < minTop) {
      minTop = left;
    }
    var maxTop = view.height - height - minTop;

    
    var top = (view.height - height) / 2;
    if (pageInfo) {
      top = pageInfo.scrollTop - pageInfo.offsetTop +
        (pageInfo.clientHeight - height) / 2;
    }

    
    if (top < minTop) {
      top = minTop;
    } else if (top > maxTop) {
      top = maxTop;
    }

    // offset by the iframe's scroll
    top += view.scrollTop;

    
    
    if (UserAgent.mobile()) {
      
      
      
      // space. If page doesn't have enough height, then OS will effectively
      
      
      
      
      
      
      // down, then the "click" event may fire from a differnt DOM element and
      
      
      
      
      // such that page won't be forced to scroll beyeond its limit when
      
      
      
      var paddingHeight = 100;

      
      
      if (isTablet()) {
        paddingHeight += (view.height - height) / 2;
      } else {
        var body = document.getElementsByTagName('body')[0];
        DOM.addCss(body, 'fb_hidden');
        if (feature('dialog_resize_refactor')) {
          body.style.width = 'auto';
        }
        top = 10000;
      }

      var paddingDivs = DOM.getByClass('fb_dialog_padding', dialog);
      if (paddingDivs.length) {
        paddingDivs[0].style.height = paddingHeight + 'px';
      }
    }

    dialog.style.left = (left > 0 ? left : 0) + 'px';
    dialog.style.top = (top > 0 ? top : 0) + 'px';
  }, {"signature":"function(?object)"}),

  _setDialogSizes: function() {
    if (!UserAgent.mobile() || isTablet()) {
      return;
    }
    for (var id in Dialog._dialogs) {
      if (Dialog._dialogs.hasOwnProperty(id)) {
        var iframe = document.getElementById(id);
        if (iframe) {
          iframe.style.width = Dialog.getDefaultSize().width + 'px';
          iframe.style.height = Dialog.getDefaultSize().height + 'px';
        }
      }
    }
  },
  getDefaultSize: __w(function() /*object*/ {return __t([function() {
    if (UserAgent.mobile()) {
      var size = getMobileSize();

      if (size) {
        return size;
      }

      
      // Keep this old ipad logic: it's pretty straightforward.
      if (UserAgent.ipad()) {
        return {
          width: MAX_WIDTH_MOBILE,
          height: MAX_HEIGHT_MOBILE
        };
      }

      if (UserAgent.android()) {
        
        // window.innerWidth/Height doesn't return correct values
        return {
          width: screen.availWidth,
          height: screen.availHeight
        };
      } else {
        var width = window.innerWidth;
        var height = window.innerHeight;
        var isLandscape = width / height > 1.2;
        
        
        // window.innerHeight is not good enough because it doesn't take into
        
        
        
        
        
        
        
        
        return {
          width: width,
          height: Math.max(height,
                         (isLandscape ? screen.width : screen.height))
        };
      }
    }
    return {width: MAX_WIDTH_DESKTOP, height: MAX_HEIGHT_DESKTOP};
  }.apply(this, arguments), 'object']);}, {"signature":"function():object"}),


  
  _handleOrientationChange: function(e) {

    var screenWidth = feature('dialog_resize_refactor', false)
      ? DOM.getViewportInfo().width
      : screen.availWidth;

    
    
    
    
    // "orientation" event, but change shortly after (50-150ms later).
    
    
    
    
    if (UserAgent.android() &&
        screenWidth == Dialog._availScreenWidth) {
      setTimeout(Dialog._handleOrientationChange, 50);
      return;
    }

    Dialog._availScreenWidth = screenWidth;

    if (isTablet()) {
      Dialog._centerActive();
    } else {
      var width = Dialog.getDefaultSize().width;
      for (var id in Dialog._dialogs) {
        if (Dialog._dialogs.hasOwnProperty(id)) {
          
          var iframe = document.getElementById(id);
          if (iframe) {
            iframe.style.width = width + 'px';
          }
        }
      }
    }
  },

  
  _addOrientationHandler: function() {
    if (!UserAgent.mobile()) {
      return;
    }
    
    
    
    var event_name = "onorientationchange" in window
      ? 'orientationchange'
      : 'resize';

    Dialog._availScreenWidth = feature('dialog_resize_refactor', false)
      ? DOM.getViewportInfo().width
      : screen.availWidth;

    DOMEventListener.add(window, event_name, Dialog._handleOrientationChange);
  },

  
  create: __w(function(/*object*/ opts) /*DOMElement*/ {__t([opts, 'object', 'opts']);return __t([function() {
    opts = opts || {};

    var
      dialog      = document.createElement('div'),
      contentRoot = document.createElement('div'),
      className   = 'fb_dialog';

    
    if (opts.closeIcon && opts.onClose) {
      var closeIcon = document.createElement('a');
      closeIcon.className = 'fb_dialog_close_icon';
      closeIcon.onclick = opts.onClose;
      dialog.appendChild(closeIcon);
    }

    className += ' ' + (opts.classes || '');

    
    if (UserAgent.ie()) {
      className += ' fb_dialog_legacy';
      ES([ 'vert_left',
        'vert_right',
        'horiz_top',
        'horiz_bottom',
        'top_left',
        'top_right',
        'bottom_left',
        'bottom_right'], 'forEach', true,__w(function(/*string*/ name) {__t([name, 'string', 'name']);
          var span = document.createElement('span');
          span.className = 'fb_dialog_' + name;
          dialog.appendChild(span);
        }, {"signature":"function(string)"}));
    } else {
      