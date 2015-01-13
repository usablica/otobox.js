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

    if (targetObject.className != '') {
      wrapperDiv.className += ' ' + targetObject.className;
    }

    //append wrapper right before the target object
    targetObject.parentNode.insertBefore(wrapperDiv, targetObject);

    targetObject.className += ' ' + _c.call(this, 'input');
    //add the target object
    wrapperDiv.appendChild(targetObject);

    //div for editing
    var editableDiv = document.createElement('div');
    editableDiv.setAttribute('contenteditable', true);
    editableDiv.setAttribute('data-placeholder', targetObject.placeholder);
    editableDiv.className = _c.call(this, 'editableDiv');

    //set width and height to the wrapper
    wrapperDiv.style.width = targetObjectSize.width + 'px';

    //if it's textarea
    if (targetObject.nodeName.toLowerCase() == 'textarea') {
      editableDiv.className += ' ' + _c.call(this, 'textarea-target');
      wrapperDiv.style.height = targetObjectSize.height + 'px';
    } else {
      editableDiv.className += ' ' + _c.call(this, 'input-target');
    }

    wrapperDiv.appendChild(editableDiv);

    //ul for choices list
    var ulWrapper = document.createElement('ul');
    ulWrapper.className = _c.call(this, 'choices');
    wrapperDiv.appendChild(ulWrapper);

    //loading element
    var loadingElement = document.createElement("div");
    loadingElement.className = _c.call(this, 'loadingElement');
    wrapperDiv.appendChild(loadingElement);

    //bind keys to the target object
    _addBindingKeys.call(this, targetObject);
  };

  /**
   * Add an activator to activators list
   *
   * An example of activator object:
   *
   * {
   *   name: 'mention.array',
   *   key: /./,
   *   source: 'http://example.com/boo.json',
   *   allowedChars: /[a-zA-Z]+/,
   *   displayKey: 'name',
   *   valueKey: 'value',
   *   mode: 'select'
   * }
   */
  function _addActivator (activatorObject) {
    if (activatorObject != null ) {
      if (typeof (activatorObject.key) != 'undefined' && typeof (activatorObject.source) != 'undefined' && typeof (activatorObject.name) != 'undefined') {
        //check allowed chars regex
        activatorObject.allowedChars = _normalizeActivatorAllowedCharsRegExp.call(this, activatorObject);

        //normalize activator key regex
        activatorObject.key = _normalizeActivatorKeyRegExp.call(this, activatorObject);

        //can user enter a custom choice?
        activatorObject.customChoice = !!activatorObject.customChoice;

        //check and set correct display and value keys
        activatorObject.displayKey = activatorObject.displayKey || this._options.displayKey;
        activatorObject.valueKey   = activatorObject.valueKey   || this._options.valueKey;

        //include activator key in display or not
        activatorObject.includeKey = typeof (activatorObject.includeKey) != 'undefined' ? !!activatorObject.includeKey : true;

        this._activators.push(activatorObject);
      } else {
        _error.call(this, 'Name, key and source fields are mandatory for activator object.');
      }
    } else {
      _error.call(this, 'Activator object is empty.');
    }
  };

  /**
   * Get an activator by name
   */
  function _getActivator (name) {
    for (var i = 0; i < this._activators.length; i++) {
      var activator = this._activators[i];

      if (activator.name == name)
        return activator;
    }

    return null;
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
  };

  /**
   * Normalize activator's allowed character allowed chars
   */
  function _normalizeActivatorAllowedCharsRegExp (activator) {
    return activator.allowedChars || /.+/;
  };

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

    _setTargetObjectValue.call(this, editableDiv.textContent);
  };

  /**
   * Generate choice element
   */
  function _generateChoiceElement (activatorKey, value, display, activator) {
    var choiceLink = document.createElement('a');
    choiceLink.className = _c.call(this, 'choiceItem');
    _setChoiceElementAttrs.call(this, choiceLink, activatorKey, value, display, activator);

    return choiceLink;
  };

  /**
   * Append and set attributes to the choice element
   */
  function _setChoiceElementAttrs (choiceLink, activatorKey, value, display, activator) {

    choiceLink.textContent = (activator.includeKey ? activatorKey : '') + display;

    choiceLink.setAttribute('data-value', value);
    choiceLink.setAttribute('data-display', display);
    choiceLink.setAttribute('data-key', activatorKey);
    choiceLink.setAttribute('data-activator', activator.name);
  };

  /**
   * Set the choice
   */
  function _setChoice (item) {
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    var selectedRange = document.getSelection();
    var activator = this._currentActivator;

    if (selectedRange.focusNode == editableDiv || selectedRange.focusNode.nodeType == 3) {
      var choiceLink = _generateChoiceElement.call(this, this._stackActivator, item[activator.valueKey], item[activator.displayKey], activator);

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
    _setTargetObjectValue.call(this, editableDiv.textContent);
  };

  /**
   * Fill choices list with the corresponding source
   */
  function _fillChoicesList (source) {
    var self = this;

    //add loading to the container
    if (!/loading/.test(this._wrapper.className)) {
      this._wrapper.className += ' ' + _c.call(this, 'loading');
    }

    source.call(this, this._currentActivator, this._stack, this._options, function (result) {
      //clear items first
      _clearChoicesList.call(self);

      if (typeof (result) == 'object' && result instanceof Array) {
        var ulWrapper = self._wrapper.querySelector('ul.' + _c.call(self, 'choices'));

        if (result.length > 0) {
          for (var i = 0; i < result.length; i++) {
            var resultItem = result[i];

            var li = document.createElement('li');

            var anchor = document.createElement('a');
            anchor.href = 'javascript:void(0);';
            anchor.setAttribute('data-value', resultItem[self._currentActivator.valueKey]);
            anchor.setAttribute('data-display', resultItem[self._currentActivator.displayKey]);
            anchor.textContent = resultItem[self._options.displayKey];

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
          var span = document.createElement('span');
          span.className = _c.call(self, 'empty');
          span.textContent = 'No result';
          li.appendChild(span);

          ulWrapper.appendChild(li);
        }
      } else {
        _error.call(self, 'Source returned bad data type.');
      }

      //remove loading class
      self._wrapper.className = self._wrapper.className.replace(new RegExp(_c.call(self, 'loading')), '').trim();
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
  };

  /**
   * Remove hint element and change it to a text element
   */
  function _convertHintToText () {
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    var hintElement = editableDiv.querySelector('.' + _c.call(this, 'hint'));

    if (hintElement != null) {
      var textElement = document.createTextNode(hintElement.textContent);

      //add the text element and remove the hint element
      hintElement.parentNode.insertBefore(textElement, hintElement);
      hintElement.parentNode.removeChild(hintElement);

      var selectedRange = document.getSelection();

      //TODO: compatible it with older versions of IE
      var createdRange = document.createRange();
      createdRange.setStart(textElement, hintElement.textContent.length);

      selectedRange.removeAllRanges();
      selectedRange.addRange(createdRange);
    }
  };

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
      targetObject.textContent = value;
    }
  };

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
      return targetObject.textContent;
    }
  };

  /**
   * Check to see if the user is typing in a hint area
   * e.g.: Hello world @afshin...
   */
  function _isHintArea () {
    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));
    //TODO: compatible it with older versions of IE
    var selectedRange = document.getSelection().getRangeAt(0);

    //hint elements should be inside the editable div
    if (selectedRange.startContainer.parentNode != editableDiv)
      return;

    if (selectedRange.startContainer.nodeType == 3) {
      var inputValue = selectedRange.startContainer.textContent;
    } else {
      var inputValue = editableDiv.textContent;
    }

    var before = '';
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
  };

  /**
   * Check if the given text can match against one of activators
   */
  function _isActivatorText (text) {
    if (this._activators.length > 0) {
      var activatorKey = text[0];
      var hint = text.substr(1, text.length - 1);

      for (var i = 0; i < this._activators.length; i++) {
        var activator = this._activators[i];

        //first match the activatorkey
        if (activator.key.test(activatorKey)) {
          //then check if the whole part of the text is match
          if (activator.allowedChars.test(hint)) {
            return {
              activator: activator,
              activatorKey: activatorKey,
              hintText: hint
            };
          }
        }
      }

      //and then check if the whole text can match with
      //one of activators allowedchars. Please note that
      //developers can set `includekey` to `false`.
      for (var i = 0; i < this._activators.length; i++) {
        var activator = this._activators[i];

        if (!activator.includeKey && activator.allowedChars.test(text)) {
          return {
            activator: activator,
            activatorKey: activatorKey,
            hintText: hint
          };
        }
      }
    }

    return null;
  };

  /**
   * Place hint element at the current range
   */
  function _placeHintElement (text, activator) {
    var hintElement = document.createElement('span');
    hintElement.className = _c.call(this, 'hint');

    hintElement.setAttribute('data-activator', activator.name);
    hintElement.textContent = text;

    var selectedRange = document.getSelection();
    selectedRange.getRangeAt(0).insertNode(hintElement);

    //TODO: compatible it with older versions of IE
    var createdRange = document.createRange();
    createdRange.setStart(hintElement, 1);

    selectedRange.removeAllRanges();
    selectedRange.addRange(createdRange);

    return hintElement;
  };

  /**
   * check if the pressed key is in the hint area
   */
  function _handleHintArea (e) {
    var targetObject = this._targetObject;

    if (this._currentMode == this._modes.normal) {
      //check and see if user is typing in a hint area that is not considered as a hint element already
      var activatorParts = _isHintArea.call(this);

      if (activatorParts != null) {
        _changeMode.call(this, this._modes.insert);
        this._currentActivator = activatorParts.activator;
        this._stackActivator = activatorParts.activatorKey;
        this._stack = activatorParts.hintText;

        //place the hint element first
        var hintElement = _placeHintElement.call(this, this._stackActivator + this._stack, activatorParts.activator);

        //and them eliminate the text
        var prevElement = hintElement.previousSibling;

        if (prevElement.nodeType == 3) {
          prevElement.textContent = '';
        }
      }
    }
  };

  /**
   * check if the pressed key is for one of activators
   */
  function _handleActivatorKey (e) {
    var targetObject = this._targetObject;
    var activatorObject = _isActivatorKey.call(this, String.fromCharCode(e.which), targetObject);
    var focusNode = document.getSelection().focusNode;

    if (this._currentMode == this._modes.normal && activatorObject != null) {
      //set correct mode and current activator
      _changeMode.call(this, this._modes.insert);
      this._currentActivator = activatorObject;
      this._stackActivator = String.fromCharCode(e.which);

      //append hint element
      _placeHintElement.call(this, String.fromCharCode(e.which), activatorObject);

      e.preventDefault()
    } else {
      if (this._currentMode == this._modes.insert && /hint/.test(focusNode.parentNode.className)) {
        var activator = this._currentActivator;

        //check if the entered character is valid or not
        if (activator.allowedChars.test(String.fromCharCode(e.which))) {
          this._stack += String.fromCharCode(e.which);

          var sourceFunction = _routeToSource.call(this);

          _fillChoicesList.call(this, sourceFunction);

          //show choices list
          _toggleChoiceListState.call(this, true);
        } else {
          _changeMode.call(this, this._modes.normal);
          _toggleChoiceListState.call(this, false);
        }
      }
    }
  };

  /**
   * Check and see if user has changed one of choices
   */
  function _handleChoiceChange (e) {
    var focusNode = document.getSelection().focusNode;
    var activator = this._currentActivator;

    //a flag to hold the state
    var isSpaceBetween = false;

    if (this._currentMode == this._modes.normal && /choiceItem/.test(focusNode.parentNode.className)) {
      var choiceElement = focusNode.parentNode;

      //since we consider whitespace as a global separator character, we handle it
      //more carefully when it comes into choice elements
      if (/\s/.test(String.fromCharCode(e.which))) {
        var selection = document.getSelection();
        var selectionRange = selection.getRangeAt(0);
        var startOffset = selectionRange.startOffset;

        var textNodeContent = '';
        //we are at the end of the choice element

        if (choiceElement.textContent.length == startOffset) {
          textNodeContent = '\u00A0';
        } else {
          //other parts of the choice element
          var beforeStr = choiceElement.textContent.substr(0, startOffset).trim();
          var afterStr = choiceElement.textContent.substr(startOffset, choiceElement.textContent.length);
          isSpaceBetween = true;

          //first alter the content of the choice link
          choiceElement.textContent = beforeStr;
          textNodeContent = '\u00A0' + afterStr;
        }

        var textNode = document.createTextNode(textNodeContent);

        choiceElement.parentNode.insertBefore(textNode, choiceElement.nextSibling);

        var createdRange = document.createRange();
        createdRange.setStart(textNode, 1);
        createdRange.collapse(true);

        selection.removeAllRanges();
        selection.addRange(createdRange);

        //well, we should remove the whitepsace that user is pressed
        //I think this approach is the best
        choiceElement.textContent = choiceElement.textContent.trim();
      }

      //it seems user is changing the choice content
      if (activator.customChoice) {

        //its okay if user change the content of the choice
        //we will alter attributes for the choice as well
        var activatorParts = _isActivatorText.call(this, choiceElement.textContent);

        if (activatorParts != null) {
          _setChoiceElementAttrs.call(this, choiceElement, activatorParts.activatorKey, activatorParts.hintText, activatorParts.hintText, activatorParts.activator);
        } else {
          var textElement = document.createTextNode(choiceElement.textContent);

          choiceElement.parentNode.insertBefore(textElement, choiceElement);
          choiceElement.parentNode.removeChild(choiceElement);
        }

      } else {
        var selectedRange = document.getSelection();
        var startOffset = selectedRange.getRangeAt(0).startOffset;
        var createdRange = document.createRange();

        //in this part we should remove the choice element and convert it to text
        var textElement = document.createTextNode(choiceElement.textContent);

        //add the text element and remove the hint element
        choiceElement.parentNode.insertBefore(textElement, choiceElement);
        choiceElement.parentNode.removeChild(choiceElement);

        if (!isSpaceBetween) {
          createdRange.setStart(textElement, startOffset);
          createdRange.collapse(true);

          selectedRange.removeAllRanges();
          selectedRange.addRange(createdRange);
        }
      }
    }
  };

  /**
   * Check and remove hint element if it's empty
   */
  function _handleEmptyHintElement () {
    if (this._currentMode == this._modes.insert) {
      var hintElement = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv') + ' .' + _c.call(this, 'hint'));

      if (hintElement == null || hintElement.textContent == '' || hintElement.textContent == this._stackActivator) {
        _changeMode.call(this, this._modes.normal);
        _toggleChoiceListState.call(this, false);
      }
    }
  };

  /**
   * Update and show the new suggestions list
   */
  function _handleUpdatedChoices () {
    if (this._currentMode == this._modes.insert) {
      var sourceFunction = _routeToSource.call(this);

      _fillChoicesList.call(this, sourceFunction);

      //show choices list
      _toggleChoiceListState.call(this, true);
    }
  };

  /**
   * Update and set the new stack value according to the hint element
   */
  function _updateStack () {
    if (this._currentMode == this._modes.insert) {
      var hintElement = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv') + ' .' + _c.call(this, 'hint'));

      if (hintElement != null) {
        var activatorName = hintElement.getAttribute('data-activator');
        var activator = _getActivator.call(this, activatorName);

        if (activator.includeKey) {
          this._stack = hintElement.textContent.substr(1, hintElement.textContent.length);
        } else {
          this._stack = hintElement.textContent;
        }
      }
    }
  };

  /**
   * Go to next choice and make it active
   */
  function _selectChoice (e, up) {
    if (this._currentMode == this._modes.insert) {
      var currentChoice = this._wrapper.querySelector('.' + _c.call(this, 'active'));

      if (currentChoice != null) {
        currentChoice.className = '';
        if (up) {
          var previousItem = currentChoice.previousSibling;

          if (previousItem != null) {
            previousItem.className = _c.call(this, 'active')
          }
        } else {
          var nextItem = currentChoice.nextSibling;

          if (nextItem != null) {
            nextItem.className = _c.call(this, 'active')
          }
        }
      } else {
        if (up) {
          var lastItem = this._wrapper.querySelector('ul.' + _c.call(this, 'choices') + ' > li:last-child');

          if (lastItem != null) {
            lastItem.className = _c.call(this, 'active');
          }
        } else {
          var firstItem = this._wrapper.querySelector('ul.' + _c.call(this, 'choices') + ' > li:first-child');

          if (firstItem != null) {
            firstItem.className = _c.call(this, 'active');
          }
        }
      }

      e.preventDefault();
    }
  };

  /**
   * Add binding keys
   */
  function _addBindingKeys (targetObject) {
    var self = this;

    var editableDiv = this._wrapper.querySelector('.' + _c.call(this, 'editableDiv'));

    editableDiv.onkeypress = function (e) {
      _handleHintArea.call(self, e);
      _handleActivatorKey.call(self, e);
    };

    editableDiv.onkeydown = function (e) {
      if (e.keyCode == 38) {
        //up
        _selectChoice.call(self, e, true);
      }

      if (e.keyCode == 40) {
        //down
        _selectChoice.call(self, e, false);
      }

      if (e.keyCode == 13) {
        //enter
        if (self._currentMode == self._modes.insert) {
          //now we should select an item
          var currentAnchor = self._wrapper.querySelector('li.' + _c.call(self, 'active') + ' a');

          var itemObject = {};
          itemObject[self._currentActivator.displayKey] = currentAnchor.getAttribute('data-display');
          itemObject[self._currentActivator.valueKey] = currentAnchor.getAttribute('data-value');

          //clear the hint first
          _clearHint.call(self);
          _setChoice.call(self, itemObject);
        }

        e.preventDefault();
      }
    };

    editableDiv.onkeyup = function (e) {
      //check if the user is changing the choice element
      _handleChoiceChange.call(self, e);

      //set value to target element
      _setTargetObjectValue.call(self, editableDiv.textContent);

      if (e.keyCode == 46 || e.keyCode == 8) {
        //delete or backspace

        //update stack
        _updateStack.call(self);

        //show updated list to the user
        _handleUpdatedChoices.call(self);

        //check and see if the hint element is empty
        _handleEmptyHintElement.call(self);
      }

      if (e.keyCode == 37 || e.keyCode == 39) {
        //left or right
        _changeMode.call(self, self._modes.normal);
        _toggleChoiceListState.call(self, false);
      }

      if (e.keyCode == 32) {
        //whitespace
        _changeMode.call(self, self._modes.normal);
        _toggleChoiceListState.call(self, false);
      }

      if (e.keyCode == 27) {
        //escape
        _changeMode.call(self, self._modes.normal);
        _toggleChoiceListState.call(self, false);
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
   * Overwrites obj1's values with obj2's and adds obj2's if non existent in obj1
   * via: http://stackoverflow.com/questions/171251/how-can-i-merge-properties-of-two-javascript-objects-dynamically
   *
   * @param obj1
   * @param obj2
   * @returns obj3 a new object based on obj1 and obj2
   */
  function _mergeOptions (obj1, obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
  }

  /**
   * Default sources of otobox
   */
  function _arraySource (activator, stack, options, fn) {
    var result = [];

    for (var i = 0; i < activator.source.length; i++) {
      var item = activator.source[i];

      if (new RegExp(stack, 'gi').test(item)) {
        var itemObject = {};

        itemObject[activator.displayKey] = item;
        itemObject[activator.valueKey]   = item;

        result.push(itemObject);
      }
    }

    fn.call(this, result);
  };

  /**
   * Remote XHR resource
   */
  function _xhrSource (activator, stack, options, fn) {
    var result = [];

    var r = new XMLHttpRequest();
    r.open("GET", activator.source, true);
    r.onreadystatechange = function () {
      if (r.readyState != 4 || r.status != 200) {
        return;
      }

      var items = JSON.parse(r.responseText);

      for (var i = 0; i < items.length; i++) {
        var itemObject = {};

        itemObject[activator.displayKey] = items[i].displayName;
        itemObject[activator.valueKey]   = items[i].username;
        result.push(itemObject);
      }

      fn.call(this, result);
    };

    r.send("q=" + stack);
  };

  /* constructor */
  var otobox = function (selector) {
    _init.call(this, selector);
  };

  otobox.prototype = {
    setOption: function (option, value) {
      this._options[option] = value;
      return this;
    },
    setOptions: function (options) {
      this._options = _mergeOptions(this._options, options);
      return this;
    },
    addActivator: function (activatorObject) {
      _addActivator.call(this, activatorObject);
      return this;
    },
    arraySource: _arraySource,
    xhrSource: _xhrSource
  };

  return otobox;
}));
