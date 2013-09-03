angular.module('ui.bootstrap.typeahead', ['ui.bootstrap.position', 'ui.bootstrap.bindHtml'])

/**
 * A helper service that can parse typeahead's syntax (string provided by users)
 * Extracted to a separate service for ease of unit testing
 */
  .factory('typeaheadParser', ['$parse', function ($parse) {

  //                      00000111000000000000022200000000000000003333333333333330000000000044000
  var TYPEAHEAD_REGEXP = /^\s*(.*?)(?:\s+as\s+(.*?))?\s+for\s+(?:([\$\w][\$\w\d]*))\s+in\s+(.*)$/;

  return {
    parse:function (input) {

      var match = input.match(TYPEAHEAD_REGEXP), modelMapper, viewMapper, source;
      if (!match) {
        throw new Error(
          "Expected typeahead specification in form of '_modelValue_ (as _label_)? for _item_ in _collection_'" +
            " but got '" + input + "'.");
      }

      return {
        itemName:match[3],
        source:$parse(match[4]),
        viewMapper:$parse(match[2] || match[1]),
        modelMapper:$parse(match[1])
      };
    }
  };
}])

  .directive('typeahead', ['$compile', '$parse', '$q', '$timeout', '$document', '$position', 'typeaheadParser',
    function ($compile, $parse, $q, $timeout, $document, $position, typeaheadParser) {

  var HOT_KEYS = [9, 13, 27, 38, 40];

  return {
    require:['typeahead', 'ngModel'],
    controller: ['$scope', '$element', '$attrs',
    function TypeaheadController($scope, $element, $attrs) {

      //binding to a variable that indicates if matches are being retrieved asynchronously
      var isLoadingSetter = $parse($attrs.typeaheadLoading).assign || angular.noop;
      var $setModelValue = $parse($attrs.ngModel).assign || angular.noop;

      // Use controller to sync up stuff
      this.matches = [];
      this.active = -1;
      //we need to propagate user's query so we can higlight matches
      this.query = undefined;

      this.resetMatches = function () {
        this.matches = [];
        this.active = -1;
      };

      // Run on query init
      this.queryParsers = [];

      // Run on select
      this.selectListeners = [];

      //expressions used by typeahead
      this.parserResult = typeaheadParser.parse($attrs.typeahead);

      this.initQuery = function (queryInput) {
        var q = $q.when(queryInput);
        // run query processors asynchronously
        for (var i = 0; i < this.queryParsers.length; i++) {
          q = q.then(this.queryParsers[i].bind(this));
        }
        // then finally, get matches
        return q.then(this.getMatches.bind(this));
      };

      this.matchProcessor = function (inputValue, match) {
        var locals = {$viewValue: inputValue};
        locals[this.parserResult.itemName] = match;
        return {
          label: this.parserResult.viewMapper($scope, locals),
          model: match
        };
      };

      // getMatches skips query parsers
      this.getMatches = function (inputValue) {
        var ctrl = this;
        var locals = {$viewValue: inputValue};
        // Is loading
        isLoadingSetter($scope, true);

        this.query = inputValue;
        $q.when(this.parserResult.source($scope, locals)).then(function(matches) {

          //it might happen that several async queries were in progress if a user were typing fast
          //but we are interested only in responses that correspond to the current view value
          if (inputValue === ctrl.query) {
            if (matches.length > 0) {

              ctrl.active = 0;

              //transform labels
              ctrl.matches = matches.map(ctrl.matchProcessor.bind(ctrl, inputValue));

              // TODO: This might be the responsibility of the typeaheadPopup element
              // After match received, need to set scope position? Or just send this over via scope?

              //position pop-up with matches - we need to re-calculate its position each time we are opening a window
              //with matches as a pop-up might be absolute-positioned and position of an input might have changed on a page
              //due to other elements being rendered
              ctrl.position = $position.position($element);
              ctrl.position.top = ctrl.position.top + $element.prop('offsetHeight');

            } else {
              ctrl.resetMatches();
            }
            isLoadingSetter($scope, false);
          }
        }, function(){
          ctrl.resetMatches();
          isLoadingSetter($scope, false);
        });
      };

      this.select = function (activeIdx) {
        var locals = {};
        var model, item;

        locals[this.parserResult.itemName] = item = this.matches[activeIdx].model;
        model = this.parserResult.modelMapper($scope, locals);
        $setModelValue($scope, model);

        for (var i = 0; i < this.selectListeners.length; i++) {
          // TODO: Wrap in try/catch
          this.selectListeners[i]($scope, {
            $item: item,
            $model: model,
            $label: this.parserResult.viewMapper($scope, locals)
          });
        }

        this.resetMatches();

        //return focus to the input element if a mach was selected via a mouse click event
        $element[0].focus();
      };

    }],
    link:function (originalScope, element, attrs, controllers) {

      var typeaheadCtrl = controllers[0],
          modelCtrl = controllers[1];

      //SUPPORTED ATTRIBUTES (OPTIONS)

      //minimal no of characters that needs to be entered before typeahead kicks-in
      var minSearch = originalScope.$eval(attrs.typeaheadMinLength) || 1;

      //minimal wait time after last character typed before typehead kicks-in
      var waitTime = originalScope.$eval(attrs.typeaheadWaitMs) || 0;

      //should it restrict model values to the ones selected from the popup only?
      var isEditable = originalScope.$eval(attrs.typeaheadEditable) !== false;

      var inputFormatter = attrs.typeaheadInputFormatter ? $parse(attrs.typeaheadInputFormatter) : undefined;

      //INTERNAL VARIABLES

      //pop-up element used to display matches
      var popUpEl = angular.element('<typeahead-popup></typeahead-popup>');
      popUpEl.attr({
        matches : 'typeaheadCtrl.matches',
        active  : 'typeaheadCtrl.active',
        select  : 'typeaheadCtrl.select(activeIdx)',
        query   : 'typeaheadCtrl.query',
        position: 'typeaheadCtrl.position'
      });
      //custom item template
      if (angular.isDefined(attrs.typeaheadTemplateUrl)) {
        popUpEl.attr('template-url', attrs.typeaheadTemplateUrl);
      }

      //create a child scope for the typeahead directive so we are not polluting original scope
      //with typeahead-specific data (matches, query etc.)
      var scope = originalScope.$new();
      //share typeaheadCtrl through scope (since this popUpEl is a sibling, can't use require)
      scope.typeaheadCtrl = typeaheadCtrl;

      originalScope.$on('$destroy', function(){
        scope.$destroy();
      });

      typeaheadCtrl.resetMatches();

      if (minSearch) {
        typeaheadCtrl.queryParsers.push(function (query) {
          if (query && query.length >= minSearch) {
            return query;
          }
          // This short-circuits the query parsing
          return $q.reject('Query shorter than min length.');
        });
      }

      //Declare the timeout promise var outside the function scope so that stacked calls can be cancelled later 
      var timeoutPromise;

      if (waitTime > 0) {
        typeaheadCtrl.queryParsers.push(function (query) {
          if (timeoutPromise) {
            $timeout.cancel(timeoutPromise);//cancel previous timeout
            timeoutPromise = null;
          }
          timeoutPromise = $timeout(function () {
            return query;
          }, waitTime);
          return timeoutPromise;
        });
      }

      //plug into $parsers pipeline to open a typeahead on view changes initiated from DOM
      //$parsers kick-in on all the changes coming from the view as well as manually triggered by $setViewValue

      // TODO: This seems like a hack and really should be listening to input events
      // This also depends on the ngModel controller
      modelCtrl.$parsers.unshift(function (inputValue) {

        typeaheadCtrl.initQuery(inputValue);

        // This really might be another
        if (isEditable) {
          return inputValue;
        } else {
          modelCtrl.$setValidity('editable', false);
          return undefined;
        }
      });

      modelCtrl.$formatters.push(function (modelValue) {

        var candidateViewValue, emptyViewValue;
        var locals = {};

        // This might be in another directive too?
        if (inputFormatter) {

          locals['$model'] = modelValue;
          return inputFormatter(originalScope, locals);

        } else {

          //it might happen that we don't have enough info to properly render input value
          //we need to check for this situation and simply return model value if we can't apply custom formatting
          locals[typeaheadCtrl.parserResult.itemName] = modelValue;
          candidateViewValue = typeaheadCtrl.parserResult.viewMapper(originalScope, locals);
          locals[typeaheadCtrl.parserResult.itemName] = undefined;
          emptyViewValue = typeaheadCtrl.parserResult.viewMapper(originalScope, locals);

          return candidateViewValue!== emptyViewValue ? candidateViewValue : modelValue;
        }
      });

      typeaheadCtrl.selectListeners.push(function () {
        modelCtrl.$setValidity('editable', true);
      });

      //bind keyboard events: arrows up(38) / down(40), enter(13) and tab(9), esc(27)
      element.bind('keydown', function (evt) {

        //typeahead is open and an "interesting" key was pressed
        if (typeaheadCtrl.matches.length === 0 || HOT_KEYS.indexOf(evt.which) === -1) {
          return;
        }

        evt.preventDefault();

        if (evt.which === 40) {
          typeaheadCtrl.active = (typeaheadCtrl.active + 1) % typeaheadCtrl.matches.length;
          scope.$digest();

        } else if (evt.which === 38) {
          typeaheadCtrl.active = (typeaheadCtrl.active ? typeaheadCtrl.active : typeaheadCtrl.matches.length) - 1;
          scope.$digest();

        } else if (evt.which === 13 || evt.which === 9) {
          scope.$apply(function () {
            typeaheadCtrl.select(typeaheadCtrl.active);
          });

        } else if (evt.which === 27) {
          evt.stopPropagation();

          typeaheadCtrl.resetMatches();
          scope.$digest();
        }
      });

      // Keep reference to click handler to unbind it.
      var dismissClickHandler = function (evt) {
        if (element[0] !== evt.target) {
          typeaheadCtrl.resetMatches();
          scope.$digest();
        }
      };

      $document.bind('click', dismissClickHandler);

      originalScope.$on('$destroy', function(){
        $document.unbind('click', dismissClickHandler);
      });

      element.after($compile(popUpEl)(scope));
    }
  };

}])

  .directive('typeaheadOnSelect', ['$parse', function ($parse) {
    return {
      restrict:'A',
      require: 'typeahead',
      link:function (scope, element, attrs, typeaheadCtrl) {

        //a callback executed when a match is selected
        var onSelectCallback = $parse(attrs.typeaheadOnSelect);
        typeaheadCtrl.selectListeners.push(onSelectCallback);

      }
    };
  }])

  .directive('typeaheadPopup', function () {
    return {
      restrict:'E',
      scope:{
        matches:'=',
        query:'=',
        active:'=',
        position:'=',
        select:'&'
      },
      replace:true,
      templateUrl:'template/typeahead/typeahead-popup.html',
      link:function (scope, element, attrs) {

        scope.templateUrl = attrs.templateUrl;

        scope.isOpen = function () {
          return scope.matches.length > 0;
        };

        scope.isActive = function (matchIdx) {
          return scope.active == matchIdx;
        };

        scope.selectActive = function (matchIdx) {
          scope.active = matchIdx;
        };

        scope.selectMatch = function (activeIdx) {
          scope.select({activeIdx:activeIdx});
        };
      }
    };
  })

  .directive('typeaheadMatch', ['$http', '$templateCache', '$compile', '$parse', function ($http, $templateCache, $compile, $parse) {
    return {
      restrict:'E',
      scope:{
        index:'=',
        match:'=',
        query:'='
      },
      link:function (scope, element, attrs) {
        var tplUrl = $parse(attrs.templateUrl)(scope.$parent) || 'template/typeahead/typeahead-match.html';
        $http.get(tplUrl, {cache: $templateCache}).success(function(tplContent){
           element.replaceWith($compile(tplContent.trim())(scope));
        });
      }
    };
  }])

  .filter('typeaheadHighlight', function() {

    function escapeRegexp(queryToEscape) {
      return queryToEscape.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    }

    return function(matchItem, query) {
      return query ? matchItem.replace(new RegExp(escapeRegexp(query), 'gi'), '<strong>$&</strong>') : matchItem;
    };
  });