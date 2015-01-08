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

    //to hold the key that called the activator
    this._stackActivator = '';

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

    //wrapper
    this._wrapper = null;

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
  };

  /**
   * Get the name + prefix
   * For classNames and IDs
   */
  function _c (name) {
    return this._options.namingPrefix + name;
  };

  /**
   * Wrap the target element in otobox container
   */
  function _wrapIn (targetObject) {
    var targetObjectSize = targetObject.getBoundingClientRect();

    var wrapperDiv = this._wrapper = document.createElement('div');
    wrapperDiv.className = _c.call(this, 'wrapper');

    //append wrapper right before the target object
    targetObject.parentNode.insertBefore(wrapperDiv, targetObject);

    targetObject.className += _c.call(this, 'input');
    //add the target object
    wrapperDiv.appendChild(targetObject);

    //div for editing
    var editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', true);
    editableDiv.setAttribute('data-placeholder', targetObject.placeholder);
    editableDiv.className = _c.call(this, 'editableDiv');
    editableDiv.style.width = targetObjectSize.width + 'px';

    //if it's textarea
    if (targetObject.nodeName.toLowerCase() == 'textarea') {
      editableDiv.style.height = targetObjectSize.height + 'px';
    }

    wrapperDiv.appendChild(editableDiv);

    //ul for choices list
    var ulWrapper = document.createElement('ul');
    ulWrapper.className = _c.call(this, 'choices');
    wrapperDiv.appendChild(ulWrapper);

    //bind keys to the target object
    _addBindingKeys.call(this, targetObject);
  };

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
  };

  /**
   * Normalize activator's activator key regex
   */
  function _normalizeActivatorKeyRegExp (activator) {
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

    return regex;
  }

  /**
   * Normalize activator's allowed character allowed chars
   */
  function _normalizeActivatorAllowedCharsRegExp (activator) {
    return activator.allowedChars || /.+/;
  }

  /**
   * Is the pressed key is an activator key?
   */
  function _isActivatorKey (str, targetObject) {
    if (this._activators.length > 0) {
      for (var i = 0; i < this._activators.length; i++) {
        var activator = this._activators[i];
        var regex = _normalizeActivatorKeyRegExp.call(this, activator);

        //lets compare using lovely regex :)
        if (regex.test(str)) {
          return activator;
          break;
        }
      }
    }

    return null;
  };

  /**
   * To get the source name + prefix
   */
  function _getSourceName (sourceName) {
    return sourceName + 'Source';
  };

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
  };

  /**
   * Clear choices list
   */
  function _clearChoicesList () {
    var liList = this._wrapper.querySelectorAll('ul.' + _c.call(this, 'choices') + ' > li');

    if (liList != null && liList.length > 0) {
      for (var i = 0; i < liList.length; i++) {
        liList[i].parentNode.removeChild(liList[i]);
      }
    }
  };

  /**
   * Remove hint from targetobject
   */
  function _clearHint () {
    var targetObject = this._targetObject;
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    var hintElement = editableDiv.querySelector('.' + _c.call(this, 'hint'));

    if (hintElement != null) {
      hintElement.parentNode.removeChild(hintElement);
    }

    _setTargetObjectValue.call(this, editableDiv.innerText);
  }

  /**
   * Set the choice
   */
  function _setChoice (item) {
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    var selectedRange = document.getSelection();

    if (selectedRange.focusNode == editableDiv) {
      var choiceLink = document.createElement('a');
      choiceLink.className = _c.call(this, 'choiceItem');
      choiceLink.innerText = this._stackActivator + item[this._options.displayKey];
      choiceLink.setAttribute('data-value', item[this._options.valueKey]);

      var textNode = document.createTextNode('\u00A0');

      selectedRange.getRangeAt(0).insertNode(textNode);
      selectedRange.getRangeAt(0).insertNode(choiceLink);

      //TODO: compatible it with older version of IE
      var createdRange = document.createRange();
      createdRange.setStart(textNode, 1);
      createdRange.collapse(true);

      selectedRange.removeAllRanges();
      selectedRange.addRange(createdRange);
    }

    _changeMode.call(this, this._modes.normal);
    _toggleChoiceListState.call(this, false);
  }

  /**
   * Fill choices list with the corresponding source
   */
  function _fillChoicesList (source) {
    var self = this;

    //clear items first
    _clearChoicesList.call(this);

    source.call(this, this._currentActivator, this._stack, this._options, function (result) {
      if (typeof (result) == 'object' && result instanceof Array) {
        var ulWrapper = self._wrapper.querySelector('ul.' + _c.call(self, 'choices'));

        if (result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            var resultItem = result[i];

            var li = document.createElement('li');

            var anchor = document.createElement('a');
            anchor.href = 'javascript:void(0);';
            anchor.setAttribute('data-value', resultItem[self._options.valueKey]);
            anchor.innerText = resultItem[self._options.displayKey];

            (function (resultItem) {
              anchor.onclick = function () {
                //clear the hint first
                _clearHint.call(self);

                _setChoice.call(self, resultItem);
              };
            }(resultItem));

            li.appendChild(anchor);

            ulWrapper.appendChild(li);
          }
        } else {
          var li = document.createElement('li');
          li.innerHTML = 'No result';

          ulWrapper.appendChild(li);
        }
      } else {
        _error.call(self, 'Source returned bad data type.');
      }
    });
  };

  /**
   * Set choices list to active or deactive
   */
  function _toggleChoiceListState (isActive) {
    isActive = !!isActive;
    var wrapper = this._wrapper;

    //remove active class first
    wrapper.className = wrapper.className.replace(/otobox-active/gi, '').trim();

    if (isActive === true) {
      wrapper.className += ' otobox-active';
    }
  };

  /**
   * Change otobox mode
   */
  function _changeMode (mode) {
    if (mode == this._modes.normal) {
      this._stack = '';
      this._stackActivator = '';
      this._currentMode = this._modes.normal;

      //also remove the hint box and convert it to text
      _convertHintToText.call(this);
    } else if (mode == this._modes.insert) {
      this._stack = '';
      this._stackActivator = '';
      this._currentMode = this._modes.insert;
    }
  }

  /**
   * Remove hint element and change it to a text element
   */
  function _convertHintToText () {
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    var hintElement = editableDiv.querySelector('.' + _c.call(this, 'hint'));

    if (hintElement != null) {
      var textElement = document.createTextNode(hintElement.innerText);

      //add the text element and remove the hint element
      hintElement.parentNode.insertBefore(textElement, hintElement);
      hintElement.parentNode.removeChild(hintElement);
    }
  }

  /**
   * Set value to target object
   */
  function _setTargetObjectValue (value) {
    var targetObject = this._targetObject;

    if (typeof (targetObject.value) != 'undefined') {
      //input
      targetObject.value = value;
    } else {
      //textarea
      targetObject.innerText = value;
    }
  }

  /**
   * Get current value of targetObject
   */
  function _getTargetObjectValue () {
    var targetObject = this._targetObject;

    if (typeof (targetObject.value) != 'undefined') {
      //input
      return targetObject.value;
    } else {
      //textarea
      return targetObject.innerText;
    }
  }

  /**
   * Check to see if the user is typing in a hint area
   * e.g.: Hello world @afshin...
   */
  function _isHintArea () {
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    //TODO: compatible it with older versions of IE
    var selectedRange = document.getSelection().getRangeAt(0);

    if (selectedRange.startContainer.nodeType == 3) {
      var inputValue = selectedRange.startContainer.textContent;
    } else {
      var inputValue = editableDiv.innerText;
    }

    var before = '';
    console.log('offset', selectedRange.startOffset);
    for (var i = selectedRange.startOffset - 1; i >= 0; i--) {
      var currentValue = inputValue[i];

      //whitespace is a breaking word
      if (/\s/.test(currentValue)) {
        break;
      }

      before = currentValue + before;
    }

    var after = '';
    for (var i = selectedRange.startOffset; i < inputValue.length; i++) {
      var currentValue = inputValue[i];

      //whitespace is a breaking word
      if (/\s/.test(currentValue)) {
        break;
      }

      after += currentValue;
    }

    return _isActivatorText.call(this, before + after);
  }

  /**
   * Check if the given text can match against one of activators
   */
  function _isActivatorText (text) {
    var activatorKey = text[0];
    var hint = text.substr(1, text.length - 1);

    if (this._activators.length > 0) {
      for (var i = 0; i < this._activators.length; i++) {
        var activator = this._activators[i];
        var regex = _normalizeActivatorKeyRegExp.call(this, activator);

        //first match the activatorkey
        if (regex.test(activatorKey)) {
          var allowedCharsRegExp = _normalizeActivatorAllowedCharsRegExp.call(this, activator);

          //then check if all
          if (allowedCharsRegExp.test(hint)) {
            return {
              activator: activator,
              activatorKey: activatorKey,
              hintText: hint
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Place hint element at the current range
   */
  function _placeHintElement (text) {
    var hintElement = document.createElement('span');
    hintElement.className = _c.call(this, 'hint');
    hintElement.innerText = text;

    var selectedRange = document.getSelection();
    selectedRange.getRangeAt(0).insertNode(hintElement);

    //TODO: compatible it with older versions of IE
    var createdRange = document.createRange();
    createdRange.setStart(hintElement, 1);

    selectedRange.removeAllRanges();
    selectedRange.addRange(createdRange);

    return hintElement;
  }

  /**
   * Add binding keys
   */
  function _addBindingKeys (targetObject) {
    var self = this;

    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));

    editableDiv.onkeypress = function (e) {
      var activatorObject = _isActivatorKey.call(self, String.fromCharCode(e.which), targetObject);

      if (self._currentMode == self._modes.normal && activatorObject != null) {
        //set correct mode and current activator
        _changeMode.call(self, self._modes.insert);
        self._currentActivator = activatorObject;
        self._stackActivator = String.fromCharCode(e.which);

        //append hint element
        _placeHintElement.call(self, String.fromCharCode(e.which));

        e.preventDefault()
      } else {
        if (self._currentMode == self._modes.insert) {
          var activator = self._currentActivator;
          var allowedChars = _normalizeActivatorAllowedCharsRegExp.call(self, activator);

          //check if the entered character is valid or not
          if (allowedChars.test(String.fromCharCode(e.which))) {
            self._stack += String.fromCharCode(e.which);

            var sourceFunction = _routeToSource.call(self);

            _fillChoicesList.call(self, sourceFunction);

            //show choices list
            _toggleChoiceListState.call(self, true);
          } else {
            _changeMode.call(self, self._modes.normal);
            _toggleChoiceListState.call(self, false);
          }
        }
      }
    };

    editableDiv.onkeyup = function (e) {
      if (self._currentMode == self._modes.normal) {
        //check and see if user is typing in a hint area that is not considered as a hint element already
        var activatorParts = _isHintArea.call(self);

        if (activatorParts != null) {
          _changeMode.call(self, self._modes.insert);
          self._currentActivator = activatorParts.activator;
          self._stackActivator = activatorParts.activatorKey;
          self._stack = activatorParts.hintText;

          //place the hint element first
          var hintElement = _placeHintElement.call(self, self._stackActivator + self._stack);

          //and them eliminate the text
          var prevElement = hintElement.previousSibling;

          if (prevElement.nodeType == 3) {
            prevElement.textContent = '';
          }
        }
      }

      //set value to target element
      _setTargetObjectValue.call(self, editableDiv.innerText);
    };

    //I don't know whether can we handle backspace or delete keys with onkeypress event or not
    //So I'm going to use onkeydown to handle delete and backspace
    editableDiv.onkeydown = function (e) {
      if (e.keyCode == 37 || e.keyCode == 39) {
        //left or right
        _changeMode.call(self, self._modes.normal);
        _toggleChoiceListState.call(self, false);
      }

      if (e.keyCode == '32') {
        //whitespace
        _changeMode.call(self, self._modes.normal);
        _toggleChoiceListState.call(self, false);
      }

      if (e.keyCode == 27) {
        //escape
        _changeMode.call(self, self._modes.normal);
        _toggleChoiceListState.call(self, false);
      }

      if (e.keyCode == 8) {
        //backspace
        self._stack = self._stack.substr(0, self._stack.length - 1);

        if (self._currentMode == self._modes.insert) {
          var sourceFunction = _routeToSource.call(self);

          _fillChoicesList.call(self, sourceFunction);

          //show choices list
          _toggleChoiceListState.call(self, true);
        }
      }
    };
  };

  /**
   * To display an error
   */
  function _error (msg) {
    throw new Error('otobox - ' + msg);
  };

  /**
   * Default sources of otobox
   */
  function _arraySource (activator, stack, options, fn) {
    var result = [];

    for (var i = 0; i < activator.source.length; i++) {
      var item = activator.source[i];

      if (new RegExp(stack, 'gi').test(item)) {
        var itemObject = {};

        itemObject[options.displayKey] = item;
        itemObject[options.valueKey]   = item;

        result.push(itemObject);
      }
    }

    fn.call(this, result);
  };

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
