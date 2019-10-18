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

  function render(strings, ...values) {
    let htmlStr = '';
    const fullStr = strings.map((string, index) => `${string}${values[index] || ''}`).join('');

    const stateValues = fullStr.match(/{state\..*}/g);
    const parsed = fullStr.split(/{state\..*}/);

    // console.log(fullStr, stateValues, parsed);

    // console.log(parsed);

    for (let i = 0; i < parsed.length; i++) {
      const beforeStr = parsed[i].trim();
      const stateKey = stateValues[i] ? stateValues[i].match(/{state\.(.+)}/)[1] : null;
      const afterStr = parsed[i + 1] ? parsed[i + 1].trim() : null;
      // console.log(beforeStr, stateKey, afterStr);

      if (beforeStr && stateKey && afterStr) {
        console.log('contained');
        htmlStr += `${beforeStr}${objectResolvePath(state, stateKey)}`;
      }
      else {  
        console.log('not contained');
        htmlStr += beforeStr;
      }
    }

    console.log(htmlStr);

    componentMounted.resolve();

    return htmlStr;
  }

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