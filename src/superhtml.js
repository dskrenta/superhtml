'use strict';

window.superhtml = (() => {
  class Deferred {
    constructor() {
      this.promise = new Promise((resolve, reject) => {
        this.reject = reject;
        this.resolve = resolve;
      });
    }
  }

  let state = {};
  let updateMap = {};
  const componentMounted = new Deferred();
  let mountCallback = null;

  componentMounted.promise.then(() => {
    if (mountCallback) {
      mountCallback();
    }
  })

  function createRandomClass() {
    return window.btoa(window.crypto.getRandomValues(new Uint32Array(1)));
  }

  function boolMatch(string, regex) {
    const match = string.match(regex);
    return match ? match[0] : false;
  }

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

  function runExpression(str) {
    return Function(`'use strict'; return(${str})`)();
  }

  function render(strings, ...values) {
    let htmlStr = '';
    const fullString = strings.map((string, index) => `${string}${values[index] || ''}`).join();
    const expressions = fullString.match(/\{(.*?)\}/g).map(str => str.slice(1, str.length - 1));
    const parsed = fullString.split(/\{.*?\}/);

    let currentTag = '';
    let hashClass = null;
    let startingIndex = 0;
    let endingIndex = 0;

    for (let i = 0; i < parsed.length; i++) {
      const beforeStr = parsed[i].trim();
      const expression = expressions[i];
      const afterStr = parsed[i + 1] ? parsed[i + 1].trim() : null;

      // console.log(beforeStr, expression, afterStr);

      // console.log('Full tag', beforeStr.match(/<.+>/g));
      // console.log('Partial tag', beforeStr.match(/<[^>]+$/));

      if (beforeStr && expression && afterStr) {
        const addStr = `${beforeStr}${runExpression(expression)}`;
        htmlStr += addStr;

        // Full tag
        if (boolMatch(beforeStr, /<[^/]+>$/)) {
          // console.log('Full tag', beforeStr);
          currentTag = beforeStr.match(/<[^/|<]+/g).pop();
          startingIndex = i;
          endingIndex = null;
          hashClass = createRandomClass();
        }
        // Opening tag
        else if (boolMatch(beforeStr, /<[^>]+$/)) {
          // console.log('Opening tag', beforeStr);
          currentTag = `${beforeStr.match(/<[^>]+$/)[0]}${runExpression(expression)}`;
          // currentTag += addStr;
          startingIndex = i;
          hashClass = createRandomClass();
        }
        // Closing tag
        else if (boolMatch(beforeStr, /.+>$/)) {
          // console.log('Closing tag', beforeStr);
          currentTag += beforeStr;
          endingIndex = i;
        }
        // Other
        else {
          // console.log('Other', beforeStr);
          currentTag += addStr;
        }
        
        if (boolMatch(currentTag, /<.+>/)) {
          console.log(currentTag, startingIndex, endingIndex);
          
          if (endingIndex) {
            console.log('index range');
            for (let i = startingIndex; i <= endingIndex; i++) {
              console.log(expressions[i]);
            }
          }
          else {
            console.log('fixed index', expression);
          }
        }

        // For building update map
        // Find where state key is used
        // Add record to update map
        /*
        if (boolMatch(beforeStr, />$/) && boolMatch(afterStr, /^<\//)) {
          // console.log('within tag');
          // console.log(currentTag);
        }
        else if (boolMatch(beforeStr, /="$/) && boolMatch(afterStr, /^"/)) {
          // console.log('attr');
          // console.log(currentTag);
        }
        */
      }
      else {
        htmlStr += beforeStr;
      }
    }

    return htmlStr;
  }

  /*
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

    const stateValues = fullString.match(/{state\..*}/g);
    const parsed = fullString.split(/{state\..*}/);

    for (let i = 0; i < parsed.length; i++) {
      const stateKey = stateValues[i] ? stateValues[i].match(/{state\.(.+)}/)[1] : null;
      const currentString = parsed[i].trim();
      const nextString = parsed[i + 1] ? parsed[i + 1].trim() : null;

      if (currentString && nextString && stateKey) {
        if (boolMatch(currentString, tagBeforeStateRegex) && boolMatch(nextString, tagAfterStateRegex)) {
          const classCapture = currentString.match(classCaptureRegex);
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
        else if (boolMatch(currentString, /class=$/)) {
          htmlString += `${currentString}${objectResolvePath(state, stateKey)}`;
        }
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
      else if (boolMatch(parsed[i], /{.+}/)) {
        console.log('suspected js expression');
        // actually parse expression
        const expression = new Function('return');
        htmlString += `${expression()}${parsed[i].replace(/{.+}/, '')}${stateKey ? objectResolvePath(state, stateKey) : ''}`;
      }
      else {
        htmlString += `${parsed[i]}${stateKey ? objectResolvePath(state, stateKey) : ''}`;
      }
    }

    componentMounted.resolve();

    return htmlString;
  }
  */

  function componentDidMount(onMountCallback) {
    mountCallback = onMountCallback;
  }
  
  function registerToDOM(id, component) {
    document.getElementById(id).insertAdjacentHTML('afterbegin', component(state));
  }

  return {
    createState,
    render, 
    componentDidMount,
    registerToDOM
  };
})();