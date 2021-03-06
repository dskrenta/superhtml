'use strict';

window.superhtml = (() => {
  // Debug
  const DEBUG = false;

  // Length of the string "state."
  const LENGTH_OF_STATE_PREFIX = 6;

  /*
    Class containg a promise exposing resolve and reject functions externally
  */
  class Deferred {
    /*
      Sets promise, reject, and resolve to instance variables allowing them to be accessed externally
    */
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.reject = reject;
        this.resolve = resolve;
      });
    }
  }

  // Interal state object
  let state = {};

  // Internal update map object
  let updateMap = {};

  // Instantiation of Deferred class for waiting until component mounted to run mountCallback function
  const componentMounted = new Deferred();

  // Variable containing the callback to be run after mounting
  let mountCallback = null;

  // Run mountCallback when component mounted
  componentMounted.promise.then(() => {
    if (mountCallback) {
      mountCallback();
    }
  })

  /*
    Returns a random hash to be used as an HTML element class

    @return {String} resultant hash
  */
  function createRandomClass() {
    return window.btoa(window.crypto.getRandomValues(new Uint32Array(1)));
  }

  /*
    Evaluates a regular expression on a string and returns a match boolean
    
    @param {String} string - input string
    @param {RegExp} regex - regular expression 
    @return {Boolean} matched or not
  */
  function boolMatch(string, regex) {
    const match = string.match(regex);
    return match ? match[0] : false;
  }

  /*
    Returns boolean based on whether passed value is object

    @param {*} value - input value
    @return {Boolean} value is object boolean
  */
  function isObject(value) {
    return typeof value === 'object' && value !== null && !value.length;
  }

  /*
    Resolves the path of a key to a given object

    @param {Object} o - input object
    @param {String} s- object key
    @return {*} value at key in object
  */
  function objectResolvePath(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1');
    s = s.replace(/^\./, '');
    let a = s.split('.');
    for (let i = 0, n = a.length; i < n; ++i) {
        let k = a[i];
        if (k in o) {
            o = o[k];
        } else {
            return;
        }
    }
    return o;
  }

  /*
    Adds update mapping to update map

    @param {String} stateKey - state key
    @param {Object} inputObj - object containing data required for update
  */
  function addUpdateMapping(stateKey, inputObj) {
    if (stateKey in updateMap) {
       updateMap[stateKey].push(inputObj);
    }
    else {
      updateMap[stateKey] = [
        inputObj
      ];
    }
  }

  /*
    Updates the DOM given a series of update mappings and value

    @param {Array} mappings - array of mappings
  */
  function updateDOM(updateProp) {
    const mappings = updateMap[updateProp];
    if (mappings) {
      for (const { type, className, expression, attribute } of mappings) {
        if (type === 'replaceContent') {
          document.getElementsByClassName(className)[0].innerHTML = runExpression(expression);
        }
        else if (type === 'replaceAttribute') {
          let newAttributeValue = runExpression(expression);
          // If attribute is class, don't overwrite our inserted hash class from render
          if (attribute === 'class') {
            newAttributeValue += ` ${className}`;
          } 
          document.getElementsByClassName(className)[0].setAttribute(attribute, newAttributeValue);
        }
      }
    }
  }

  /*
    Returns the full nested path of a object prop and value given the object
    Assumes every [key, value] pair throughout object is unique

    @param {Object} obj - input object
    @param {String} inputProp - input prop
    @param {String} inputValue - input value
    @param {String} path - path recursion temporary storage variable 
  */
  function findFullPath(obj, inputProp, inputValue, path = '') {
    for (const [prop, value] of Object.entries(obj)) {
      if (prop === inputProp && value === inputValue) {
        path += `.${prop}`;
        // Remove leading dot
        return path.slice(1);
      }
      else if (isObject(obj[prop])) {
        path += `.${prop}`;
        return findFullPath(obj[prop], inputProp, inputValue, path);
      }
    }

    return false;
  }

  /*
    Returns a proxy trap which runs updateDOM with passed prop on underlying object set trigger
  */
  function createProxyTraps() {
    return {
      set: (obj, prop, value) => {
        obj[prop] = value;
        updateDOM(findFullPath(state, prop, value));
        return true;
      }
    };
  }

  /*
    Iterates over all child objects given parent object and inserts proxy for update mapping

    @param {Object} obj - object
    @return {Object} - object with proxies replacing children objects
  */
  function recurseObjectAndInsertProxies(obj) {
    for (const prop in obj) {
      if (isObject(obj[prop])) {
        obj[prop] = new Proxy(obj[prop], createProxyTraps());
        recurseObjectAndInsertProxies(obj[prop]);
      }
    }
    
    return obj;
  }

  /*
    Creates a SuperHTML state object given an object

    @param {Object} stateObject - input state object
    @return {Object} - proxied version of input state object
  */
  function createState(stateObject) {
    state = new Proxy(
      recurseObjectAndInsertProxies(stateObject, createProxyTraps()), 
      createProxyTraps()
    );

    return state;
  }

  /*
    Runs a JS expression and returns the result

    @param {String} str - JS expression as a string
    @return {*} result of expression
  */
  function runExpression(str) {
    return Function(`'use strict'; return(${str})`)();
  }

  /*
    Returns boolean based on if passsed function name is a prototype function of commonly used data types

    @param {String} functionName - function name
    @return {Boolean} is prototype boolean
  */
  function isPrototypeFunction(functionName) {
    return (
      Array.prototype.hasOwnProperty(functionName) || 
      Object.prototype.hasOwnProperty(functionName) || 
      Number.prototype.hasOwnProperty(functionName) || 
      String.prototype.hasOwnProperty(funcitonName) || 
      Boolean.prototype.hasOwnProperty(functionName) ||
      Function.prototype.hasOwnProperty(funcitonName) ||
      Symbol.prototype.hasOwnProperty(funcitonName) ||
      BigInt.prototype.hasOwnProperty(functionName) ||
      Math.prototype.hasOwnProperty(functionName) ||
      Date.prototype.hasOwnProperty(functionName)
    );
  }

  /*
    Takes a string passed through a tagged template and returns a formatted HTML string

    @param {String} str - String passed through tagged template
    @return {String} - resultant formatted HTML string
  */
  function render(strings, ...values) {
    let renderHash = createRandomClass();

    if (DEBUG) {
      console.time(`render${renderHash}`);
    }

    let htmlStr = '';
    const fullString = strings.map((string, index) => `${string}${values[index] || ''}`).join();
    const expressions = fullString.match(/\{(.*?)\}/g).map(str => str.slice(1, str.length - 1));
    const parsed = fullString.split(/\{.*?\}/);

    let currentTag = '';
    let aheadText = null;
    let hashClass = null;

    for (let i = 0; i < parsed.length; i++) {
      const beforeStr = parsed[i].trim();
      const expression = expressions[i];
      const afterStr = parsed[i + 1] ? parsed[i + 1].trim() : null;

      if (beforeStr && expression && afterStr) {
        // Full tag
        if (boolMatch(beforeStr, /<[^/]+>$/)) {
          const fullTagRegex = beforeStr.match(/<[^/|<]+/g);
          currentTag = fullTagRegex.pop();
          aheadText = beforeStr.replace(currentTag, '');
          hashClass = createRandomClass();
        }
        // Opening tag
        else if (boolMatch(beforeStr, /<[^>]+$/)) {
          const openingTagRegex = beforeStr.match(/<[^>]+$/);
          currentTag = `${openingTagRegex[0]}${runExpression(expression)}`;
          aheadText = beforeStr.replace(openingTagRegex[0], '');
          hashClass = createRandomClass();
        }
        // Closing tag
        else if (boolMatch(beforeStr, /.+>$/)) {
          currentTag += beforeStr;
        }
        // Other
        else {
          currentTag += `${beforeStr}${runExpression(expression)}`;
        }
        
        // If current tag is a complete element
        if (boolMatch(currentTag, /<.+>/)) {          
          const classCapture = currentTag.match(/class="(.+?)"/);
          // currentTag has class
          if (classCapture) {
            currentTag = currentTag.replace(/class=".+?"/, `class="${classCapture[1]} ${hashClass}"`);
          }
          // currentTag does not have class
          else {
            currentTag = `${currentTag.slice(0, currentTag.length - 1)} class="${hashClass}">`;
          } 

          // Add back ahead text
          htmlStr += `${aheadText}${currentTag}${runExpression(expression)}`;
          aheadText = '';
        }

        // Get all state keys used in expression
        const stateKeysRegex = expression.match(/state\.([^\.]+)/g);

        // Get all nested state keys used in expression
        const nestedStateKeysRegex = expression.match(/state\.(.*\..*)/g);
        
        let stateKeys = [];

        if (stateKeysRegex) {
          stateKeys = stateKeysRegex.map(str => str.slice(LENGTH_OF_STATE_PREFIX));
        }

        if (nestedStateKeysRegex) {
          for (const stateKey of nestedStateKeysRegex) {
            const functionPrototypeRegex = stateKey.match(/\.([a-zA-Z]+)\(/);
            if (functionPrototypeRegex && isPrototypeFunction(functionPrototypeRegex[1])) {
              stateKeys.push(stateKey.replace(/\.[a-zA-z]+\(.*/, '').slice(LENGTH_OF_STATE_PREFIX));
            }
            else {
              stateKeys.push(stateKey.slice(LENGTH_OF_STATE_PREFIX));
            }
          }
        }

        // State used within HTML element
        if (boolMatch(beforeStr, />$/) && boolMatch(afterStr, /^<\//)) {
          for (let stateKey of stateKeys) {
            addUpdateMapping(stateKey, {
              type: 'replaceContent',
              className: hashClass,
              expression: expression
            });
          }
        }
        // State used in HTML element attribute
        else if (boolMatch(beforeStr, /="$/) && boolMatch(afterStr, /^"/)) {
          const attributeRegex = beforeStr.match(/([a-zA-Z1-9]+)="$/);
          for (let stateKey of stateKeys) {
            addUpdateMapping(stateKey, {
              type: 'replaceAttribute',
              className: hashClass,
              attribute: attributeRegex[1],
              expression: expression
            });
          }
        }
      }
      else {
        htmlStr += beforeStr;
      }
    }

    componentMounted.resolve();

    if (DEBUG) {
      console.timeEnd(`render${renderHash}`);
      console.log(updateMap);
    };

    return htmlStr;
  }
  
  /*
    Runs a callback when component is mounted

    @param {Function} onMountCallback - callback to be run on component mount
  */
  function componentDidMount(onMountCallback) {
    mountCallback = onMountCallback;
  }
  
  /*
    Registers a component to the DOM given an element id

    @param {String} id - element id
    @param {String} component - HTML string resulting from the SuperHTML render function
  */
  function registerToDOM(id, component) {
    document.getElementById(id).insertAdjacentHTML('afterbegin', component(state));
  }

  /*
    Concatenates parameters together as a string

    @param {Array} list of parameters
    @return {String} resultant string
  */
  function template(...strings) {
    return strings.join('');
  }

  // Expose API methods to client
  return {
    createState,
    render, 
    componentDidMount,
    registerToDOM,
    template
  };
})();