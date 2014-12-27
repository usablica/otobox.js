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
   * To init basic settings and variables
   */
  function _init (selector) {
    /**
     * Default options
     */
    this._options = {
      /* Display and value keys */
      displayKey: 'name',
      valueKey: 'value',

      /* CSS classes prefix */
      cssClassPrefix: 'otobox-'
    };

    //an empty list for activators
    this.activators = [];

    //ok lets find the target object according to the given parameters
    var targetObject = null;
    if (typeof (selector) == 'object') {
      targetObject = selector;
    } else if (typeof (selector) == 'string') {
      var queryObject = document.querySelector(selector);

      if (queryObject != null) {
        targetObject = queryObject;
      } else {
        _error.call(this,'Unable to find the target object with the given CSS selector.');
      }
    } else {
      _error.call(this, 'Unable to initiate with the given parameter for init.');
    }

    if (targetObject != null) {
      this._targetObject = targetObject;
      //wrap the target object in the otobox container
      _wrapIn.call(this, targetObject);
    } else {
      _error.call(this, 'targetObject is empty.');
    }
  }

  /**
   * Get the css class name + prefix
   */
  function _c (className) {
    return this._options.cssClassPrefix + className;
  }

  /**
   * Wrap the target element in otobox container
   */
  function _wrapIn (targetObject) {
    var wrapperDiv = document.createElement('div');
    wrapperDiv.className = _c.call(this, 'wrapper');

    //append wrapper right before the target object
    targetObject.parentNode.insertBefore(wrapperDiv, targetObject);

    //add the target object
    wrapperDiv.appendChild(targetObject);

    //bind keys to the target object
    _addBindingKeys(targetObject);
  }

  /**
   * Add an activator to activators list
   */
  function _addActivator (activatorObject) {
    if (activatorObject != null ) {
      if (typeof (activatorObject.key) != 'undefined' && typeof (activatorObject.source) != 'undefined') {
        this.activators.push(activatorObject);
      } else {
        _error.call(this, 'key and source fields are mandatory for activator object.');
      }
    } else {
      _error.call(this, 'Activator object is empty.');
    }
  }

  /**
   * Is activator key?
   */
  function _isActivatorKey (e, targetObject) {
    if (this.activators.length > 0) {
      for (var i = 0; i < this.activators.length; i++) {

      }
    }
  }

  /**
   * Add binding keys
   */
  function _addBindingKeys (targetObject) {
    targetObject.onkeyup = function (e) {
      if (_isActivatorKey(e, targetObject)) {
        console.log('yes');
      } else {
        console.log('no');
      }
    };
  }

  /**
   * To display an error
   */
  function _error (msg) {
    throw new Error('otobox - ' + msg);
  }

  /* constructor */
  var otobox = function (selector) {
    _init.call(this, selector);
  };

  otobox.prototype = {
    addActivator: function (activatorObject) {
      _addActivator.call(this, activatorObject);
      return this;
    }
  };

  return otobox;
}));
