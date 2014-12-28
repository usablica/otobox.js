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

      /* CSS classes and IDs prefix */
      namingPrefix: 'otobox-'
    };

    //an empty list for activators
    this._activators = [];

    //an stack to keep pressed keys
    this._stack = '';

    //modes
    // 0 == normal
    // 1 == insert
    this._modes = {
      normal: 0,
      insert: 1
    }

    //current mode of otobox
    this._currentMode = this._modes.normal;

    //current activator
    this._currentActivator = null;

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
   * Get the name + prefix
   * For classNames and IDs
   */
  function _c (name) {
    return this._options.namingPrefix + name;
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

    //ul for choices list
    var ulWrapper = document.createElement('ul');
    ulWrapper.className = _c.call(this, 'choices');
    wrapperDiv.appendChild(ulWrapper);

    //bind keys to the target object
    _addBindingKeys.call(this, targetObject);
  }

  /**
   * Add an activator to activators list
   *
   * An example of activator object:
   *
   * {
   *   key: '*',
   *   source: 'http://example.com/boo.json'
   * }
   */
  function _addActivator (activatorObject) {
    if (activatorObject != null ) {
      if (typeof (activatorObject.key) != 'undefined' && typeof (activatorObject.source) != 'undefined') {
        this._activators.push(activatorObject);
      } else {
        _error.call(this, 'key and source fields are mandatory for activator object.');
      }
    } else {
      _error.call(this, 'Activator object is empty.');
    }
  }

  /**
   * Is the pressed key is an activator key?
   */
  function _isActivatorKey (e, targetObject) {
    if (this._activators.length > 0) {
      for (var i = 0; i < this._activators.length; i++) {
        var activator = this._activators[i];

        var regex = null;
        if (typeof (activator.key) == 'string') {
          //converting string to RegExp
          try {
            regex = new RegExp(activator.key);
          } catch (exp) {
            _error.call(this, exp.message);
          }
        } else if (typeof (activator.key) == 'object' && activator.key instanceof RegExp) {
          regex = activator.key;
        } else {
          error.call(this, 'Unable to match the entered character against activator key.')
        }

        //lets compare using lovely regex :)
        if (regex.test(String.fromCharCode(e.which))) {
          return activator;
          break;
        }
      }
    }

    return null;
  }

  /**
   * To get the source name + prefix
   */
  function _getSourceName (sourceName) {
    return sourceName + 'Source';
  }

  /**
   * Check the source and call corresponding method to lookup
   */
  function _routeToSource () {
    if (this._currentActivator != null) {
      var activator = this._currentActivator;
      var sourceName = null;

      if (typeof (activator.sourceType) == 'string') {
        sourceName = activator.sourceType;
      } else if (typeof (activator.source) == 'object') {
        //array, object, etc.
        if (activator.source instanceof Array) {
          sourceName = 'array';
        }
      } else if (typeof (activator.source) == 'string') {
        //xhr source
        sourceName = 'xhr';
      }

      if (sourceName != null) {
        if (typeof (otobox.prototype[_getSourceName.call(this, sourceName)]) == 'function') {
          return otobox.prototype[_getSourceName.call(this, sourceName)];
        } else {
          _error.call(this, 'No source with name "' + _getSourceName.call(this, sourceName) + '" found.');
        }
      } else {
        _error.call(this, 'Activator\'s source is unknown.');
      }

    } else {
      _error.call(this, 'Current activator is empty.');
    }
  }

  /**
   * Fill choices list with the corresponding source
   */
  function _fillChoicesList (source) {
    source.call(this, this._currentActivator, this._stack, function (result) {
      if (typeof (result) == 'object' && result instanceof Array) {
        for (var i = 0; i < result.length; i++) {
          var resultItem = result[i];

          var li = document.createElement('li');
          li.innerHTML = resultItem[this._options.displayKey];


        }
      } else {
        _error.call(this, 'Source returned bad data type.');
      }
    });
  }

  /**
   * Add binding keys
   */
  function _addBindingKeys (targetObject) {
    var self = this;

    targetObject.onkeypress = function (e) {

      var activatorObject = _isActivatorKey.call(self, e, targetObject);
      if (self._currentMode == self._modes.normal && activatorObject != null) {
        //set correct mode and current activator
        self._currentMode = self._modes.insert;
        self._currentActivator = activatorObject;
      } else {
        if (self._currentMode == self._modes.insert) {
          self._stack += String.fromCharCode(e.which);

          var sourceFunction = _routeToSource.call(self);

          _fillChoicesList.call(self, sourceFunction);
        } else {
          console.log('no');
        }
      }
    };
  }

  /**
   * To display an error
   */
  function _error (msg) {
    throw new Error('otobox - ' + msg);
  }

  /**
   * Default sources of otobox
   */
  function _arraySource (activator, stack, fn) {
    fn.call(this, activator.source);
  }

  /* constructor */
  var otobox = function (selector) {
    _init.call(this, selector);
  };

  otobox.prototype = {
    addActivator: function (activatorObject) {
      _addActivator.call(this, activatorObject);
      return this;
    },
    arraySource: _arraySource
  };

  return otobox;
}));
