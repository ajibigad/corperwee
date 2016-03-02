'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]);

angular.module('myApp.directives').directive('searchResult', function() {
      return {
        restrict: 'AEC',
        replace: true,
        templateUrl: 'partials/fragments/search_result.html',
        link: function(scope, elem, attrs) {
          elem.bind('mouseover', function() {
            elem.css('cursor', 'pointer');
          });
        }
      };
    });
