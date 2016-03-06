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
        scope: true,
        templateUrl: 'partials/fragments/review/review.html',
        link: function (scope, elem, attrs) {
          scope.$watch('currentUserReview', function (value) {
            //scope.review = angular.copy(scope.currentUserReview);
            scope.review = angular.copy(value);
            scope.editMode = false;
          });
          console.log(attrs.userReview);
          if (attrs.userReview) {//once in here it can never be readOnly
            console.log("user review set");
            // this means the directive should behave for the logged in user
            // this behaviour includes allowing him to edit his review or enter his review
            if (scope.currentUserReview) {//incase the object is empty
              scope.review = angular.copy(scope.currentUserReview);
              //show user both editable and readonly review
              scope.readOnlyMode = true;
            }
            else {
              console.log("user review edit first");
              // the logged in user has no review for the place so lets show him the editable review
              scope.editMode = true;
            }
          }
          else {
            //just show the readonly review features
            console.log("Just readonly");
            scope.editMode = false;
            scope.readOnlyMode = true;
          }
        }
      };
    })
    .directive('backToTop', function () { //when added to an element, it would bind the element to the onclick event and then scrollTop to the top of the page
      return {
        restrict: 'A'
      };
    });
