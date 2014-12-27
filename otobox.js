/**
 * otobox - Simple and fast JavaScript/HTML5 library to create autocomplete inputs
 *
 * Afshin Mehrabani [@afshinmeh]
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    // Browser globals
    root.otobox = factory();
  }
}(this, function () {

  /**
   * Default options
   */
  var _options = {
    /* Display and value keys */
    displayKey: 'name',
    valueKey: 'value',

    /* CSS classes prefix */
    cssClassPrefix: 'otobox-'
  };

  /**
   * Binding keys
   */
  var _bindingKeys = {
    activator: '@'
  };

  /**
   * To init basic settings and variables
   */
  function _init (selector) {

    var targetObject = null;
    if (typeof (selector) == 'object') {
      targetObject = selector;
    } else if (typeof (selector) == 'string') {
      var queryObject = document.querySelector(selector);

      if (queryObject != null) {
        targetObject = queryObject;
      } else {
        _error('Unable to find the target object with the given CSS selector.');
      }
    } else {
      _error('Unable to initiate with the given parameter for init.');
    }

    if (targetObject != null) {
      //wrap the target object in the otobox container
      _wrapIn(targetObject);
    }
  }

  /**
   * Get the css class name + prefix
   */
  function _c (className) {
    return _options.cssClassPrefix + className;
  }

  /**
   * Wrap the target element in otobox container
   */
  function _wrapIn (targetObject) {
    var wrapperDiv = document.createElement('div');
    wrapperDiv.className = _c('wrapper');

    //append wrapper right before the target object
    targetObject.parentNode.insertBefore(wrapperDiv, targetObject);

    //add the target object
    wrapperDiv.appendChild(targetObject);

    //bind keys to the target object
    _addBindingKeys(targetObject);
  }

  /**
   * Add binding keys
   */
  function _addBindingKeys (targetObject) {
    targetObject.onkeyup = function (e) {
      if (e.keyCode) {

      }
    };
  }

  /**
   * To display an error
   */
  function _error (msg) {
    throw new Error('otobox - ' + msg);
  }

  return {
    init: function (selector) {
      _init(selector);
    }
  };
}));
