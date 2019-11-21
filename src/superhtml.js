'use strict';

window.superhtml = (() => {
  // Slice length of the word "state"
  const LENGTH_OF_STATE_WORD = 6;

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
    Returns a random hash to be used as an HTML class

    @return {string} resultant hash
  */
  function createRandomClass() {
    return window.btoa(window.crypto.getRandomValues(new Uint32Array(1)));
  }

  /*
    Evaluates a regular expression on a string and returns a match boolean
    
    @param {string} string - input string
    @param {RegExp} regex - regular expression 
    @return {boolean} matched or not
  */
  function boolMatch(string, regex) {
    const match = string.match(regex);
    return match ? match[0] : false;
  }

  /*
    Resolves the path of a key to a given object

    @param {object} o - input object
    @param {string} s- object key
    @return {*} value at key in object
  */
  function objectResolvePath(o, s) {
    s = s.replace(/\[(\w+)\]/g, '.$1');
    s = s.replace(/^\./, '');
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
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

    @param {string} stateKey - state key
    @param {object} inputObj - object containing data required for update
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

    @param {array} mappings - array of mappings
    @param {*} value - value insert into DOM 
  */
  function updateDOM(mappings, value) {
    for (let { type, className, expression, attribute } of mappings) {
      if (type === 'replaceContent') {
        document.getElementsByClassName(className)[0].innerHTML = runExpression(expression);
      }
      else if (type === 'attribute') {
        document.getElementsByClassName(className)[0].setAttribute(attribute, runExpression(expression));
      }
    }
  }


  /*
    Creates a SuperHTML state object given an object

    @param {object} stateObject - input state object
    @return {object} - proxied version of input state object
  */
  function createState(stateObject) {
    const handler = {
      set: (obj, prop, value) => {
        obj[prop] = value;
        updateDOM(updateMap[prop], value);
        return true;
      }
    };

    state = new Proxy(stateObject, handler);

    return state;
  }

  /*
    Runs a JS expression and returns the result

    @param {string} str - JS expression as a string
    @return {*} result of expression
  */
  function runExpression(str) {
    return Function(`'use strict'; return(${str})`)();
  }

  /*
    Takes a string passed through a tagged template and returns a formatted HTML string

    @param {string} str - String passed through tagged template
    @return {string} - resultant formatted HTML string
  */
  function render(strings, ...values) {
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
        let stateKeys = [];
        if (stateKeysRegex) {
          stateKeys = stateKeysRegex.map(str => str.slice(LENGTH_OF_STATE_WORD));
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
              type: 'replaceContent',
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

    return htmlStr;
  }
  
  /*
    Runs a callback when component is mounted

    @param {function} onMountCallback - callback to be run on component mount
  */
  function componentDidMount(onMountCallback) {
    mountCallback = onMountCallback;
  }
  
  /*
    Registers a component to the DOM given an element id

    @param {string} id - element id
    @param {string} component - HTML string resulting from the SuperHTML render function
  */
  function registerToDOM(id, component) {
    document.getElementById(id).insertAdjacentHTML('afterbegin', component(state));
  }

  /*
    Concatenates parameters together as a string

    @param {array} list of parameters
    @return {string} resultant string
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