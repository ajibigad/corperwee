'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]);

angular.module('myApp.directives')
    .directive('searchResult', function () {
      return {
        restrict: 'E',
        replace: true,
        templateUrl: 'partials/fragments/search_result.html',
        link: function(scope, elem, attrs) {
          elem.bind('mouseover', function() {
            elem.css('cursor', 'pointer');
          });
        }
      };
    })
    .directive('review', function () {
      return {
        restrict: 'E',
        replace: true,
        templateUrl: 'partials/fragments/review/review.html'
      };
    })
    .directive('backToTop', function () { //when added to an element, it would bind the element to the onclick event and then scrollTop to the top of the page
      return {
        restrict: 'A'
      };
    });
