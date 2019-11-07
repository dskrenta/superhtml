'use strict';

window.superhtml = (() => {
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
    for (let { type, className, attribute } of mappings) {
      if (type === 'replaceContent') {
        document.getElementsByClassName(className)[0].innerHTML = value;
      }
      else if (type === 'attribute') {
        document.getElementsByClassName(className)[0].setAttribute(attribute, value);
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
    Takes a string passed through a tagged template and returns a formatted HTML string

    @param {string} str - String passed through tagged template
    @return {string} - resultant formatted HTML string
  */
  function render(strings, ...values) {
    const tagBeforeStateRegex = /<.+>$/;
    const tagAfterStateRegex = /^<\/.+>/;
    const attributeBeforeStateRegex = /<.+=$/;
    const attributeAfterStateRegex = /^.+>/;
    const classCaptureRegex = /<.+class="(.+)".*>$/;
    const classCaptureBeforeStateAttributeRegex = /<.*class="(.*)".*$/;
    const classCaptureAfterStateAttributeRegex = /^.*class="(.*)".*>/;

    const fullString = strings.map((string, index) => `${string}${values[index] || ''}`).join('');
    let htmlString = '';

    // Get state values
    const stateValues = fullString.match(/{state\..*}/g);

    // Get strings between state uses
    const parsed = fullString.split(/{state\..*}/);

    for (let i = 0; i < parsed.length; i++) {
      const stateKey = stateValues[i] ? stateValues[i].match(/{state\.(.+)}/)[1] : null;
      const currentString = parsed[i].trim();
      const nextString = parsed[i + 1] ? parsed[i + 1].trim() : null;

      if (currentString && nextString && stateKey) {
        // State wrapped in HTML element
        if (boolMatch(currentString, tagBeforeStateRegex) && boolMatch(nextString, tagAfterStateRegex)) {
          const classCapture = currentString.match(classCaptureRegex);
          // HTML element has class
          if (classCapture) {
            const className = createRandomClass();
            const currentClass = classCapture[1];
            const newClass = `${currentClass} ${className}`;
            const classSelectionRegex = new RegExp(`class="${currentClass}"`);
            const newString = currentString.replace(classSelectionRegex, `class="${newClass}"`);
            addUpdateMapping(stateKey, {
              type: 'replaceContent',
              className
            });
            htmlString += `${newString}${objectResolvePath(state, stateKey)}`;
          }
          // HTML element does not have class
          else {
            const className = createRandomClass();
            const stringWithClass = currentString.replace(/>$/, ` class="${className}">`);
            addUpdateMapping(stateKey, {
              type: 'replaceContent',
              className
            });
            htmlString += `${stringWithClass}${objectResolvePath(state, stateKey)}`;
          }
        }
        // State contained within class attribute
        else if (boolMatch(currentString, /class=$/)) {
          htmlString += `${currentString}${objectResolvePath(state, stateKey)}`;
        }
        // State contained in other attribute
        else if (boolMatch(currentString, attributeBeforeStateRegex) && boolMatch(nextString, attributeAfterStateRegex)) {
          const classCaptureBefore = currentString.match(classCaptureBeforeStateAttributeRegex);
          const classCaptureAfter = nextString.match(classCaptureAfterStateAttributeRegex);
          if (classCaptureBefore) {
            const className = createRandomClass();
            const currentClass = classCaptureBefore[1];
            const newClass = `${currentClass} ${className}`;
            const classSelectionRegex = new RegExp(`class="${currentClass}"`);
            const newString = currentString.replace(classSelectionRegex, `class="${newClass}"`);
            addUpdateMapping(stateKey, {
              type: 'attribute',
              className,
              attribute: 'draggable'
            });
            htmlString += `${newString}${objectResolvePath(state, stateKey)}`;
          }
        }
        else {
          const className = createRandomClass();
          addUpdateMapping(stateKey, {
            type: 'replaceContent',
            className
          });
          htmlString += `${currentString}<div class="${className}">${objectResolvePath(state, stateKey)}</div>`;
        }
      }
      // Catchall for other JS expressions contained in curly brackets
      else if (boolMatch(parsed[i], /{.+}/)) {
        console.log('suspected js expression');
        // actually parse expression
        const expression = new Function('return');
        htmlString += `${expression()}${parsed[i].replace(/{.+}/, '')}${stateKey ? objectResolvePath(state, stateKey) : ''}`;
      }
      // If none of the cases are above add the string directly to the HTML string with the current state value given the state key
      else {
        htmlString += `${parsed[i]}${stateKey ? objectResolvePath(state, stateKey) : ''}`;
      }
    }

    // Indicate the component is mounted, results in the component mounted callback firing
    componentMounted.resolve();

    return htmlString;
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

  // Expose API methods to client
  return {
    createState,
    render, 
    componentDidMount,
    registerToDOM
  };
})();