angular.module('ui.bootstrap.collapse',['ui.bootstrap.transition'])

// The collapsible directive indicates a block of html that will expand and collapse
.directive('collapse', ['$q', '$transition', function($q, $transition) {
  // CSS transitions don't work with height: auto, so we have to manually change the height to a
  // specific value and then once the animation completes, we can reset the height to auto.
  // Unfortunately if you do this while the CSS transitions are specified (i.e. in the CSS class
  // "collapse") then you trigger a change to height 0 in between.
  // The fix is to remove the "collapse" CSS class while changing the height back to auto - phew!
  var fixUpHeight = function(element, height) {
    element.css({ height: height });
    var x = element[0].offsetWidth;
  };

  return {
    link: function(scope, element, attrs) {
      var isCollapsed;
      var initialAnimSkip = true;

      scope.$watch(function (){ return element[0].scrollHeight; }, function (value) {
        //The listener is called when scollHeight changes
        //It actually does on 2 scenarios:
        // 1. Parent is set to display none
        // 2. angular bindings inside are resolved
        //When we have a change of scrollHeight we are setting again the correct height if the group is opened
        if (value !== 0) {
          if(angular.isDefined(isCollapsed) ?  isCollapsed : attrs.collapse){
            fixUpHeight(element, '0px');
          }
        }
      });

      scope.$watch(attrs.collapse, function(value) {
        if (value) {
          collapse();
        } else {
          expand();
        }
      });

      var currentTransition;

      var doTransition = function(change) {
        var d = $q.defer();

        if ( currentTransition ) {
          currentTransition.cancel();
        }

        currentTransition = $transition(element, change);

        currentTransition.then(function(){
          currentTransition = undefined;
          d.resolve();
        }, function(){
          currentTransition = undefined;
          d.reject();
        });

        return d.promise;
      };

      var fixElement = function(fix){
        if(fix){
          element.removeClass('collapsing');
          if(isCollapsed){
            element.removeClass('in');
          } else {
            element.addClass('in');
          }
        }

        if(isCollapsed){
          fixUpHeight(element, '0px');
        } else {
          fixUpHeight(element, 'auto');
        }
      };

      var expand = function() {
        isCollapsed = false;
        if(initialAnimSkip){
          fixUpHeight(element, 'auto');
          element.addClass('collapse').addClass('in');
          initialAnimSkip = false;
        } else {
          element.addClass('in').addClass('collapsing');

          doTransition({'height' : element[0].scrollHeight + 'px'})
          .then(function(){
            fixElement(true);
          }, function(){
            fixElement(false);
          });
        }
      };

      var collapse = function() {
        isCollapsed = true;
        if(initialAnimSkip){
          element.addClass('collapse');
          initialAnimSkip = false;
        } else {
          fixUpHeight(element, element[0].scrollHeight + 'px');
          element.addClass('collapsing');

          doTransition({'height':'0px'})
          .then(function(){
            fixElement(true);
          }, function(){
            fixElement(false);
          });
        }
      };
    }
  };
}]);