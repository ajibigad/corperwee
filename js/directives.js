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
          scope.toggleUserReviewMode = function () {
            var tempMode = scope.userReviewMode.viewMode;
            scope.userReviewMode.viewMode = scope.userReviewMode.editMode;
            scope.userReviewMode.editMode = tempMode;
          };
          scope.$watch('currentUserReview', function (value) {
            //scope.review = angular.copy(scope.currentUserReview);
            if (value && attrs.userReview) {
              scope.review = angular.copy(value);
              scope.userReviewMode = {};
              scope.userReviewMode.viewMode = true;
              scope.userReviewMode.editMode = false;
              scope.viewReviewsMode = false;
            }
            else {
              if (attrs.userReview) {
                scope.userReviewMode = {};
                scope.userReviewMode.viewMode = false;
                scope.userReviewMode.editMode = true;
                scope.viewReviewsMode = false;
              }
              else {
                //means we are in the review without the userReview attr so we dont care about any change in currentUserReview
                scope.userReviewMode = null;
                scope.viewReviewsMode = true;
              }
            }
          });
          console.log(attrs.userReview);
          if (attrs.userReview) {//once in here it can never be readOnly
            console.log("user review set");
            // this means the directive should behave for the logged in user
            // this behaviour includes allowing him to edit his review or enter his review
            if (scope.currentUserReview) {
              scope.review = angular.copy(scope.currentUserReview);
              // show user both editable and readonly review
              scope.userReviewMode = {};
              scope.userReviewMode.viewMode = true;
              scope.userReviewMode.editMode = false;
              scope.viewReviewsMode = false;
            }
            else { // in case the object is empty
              console.log("user review edit first");
              // the logged in user has no review for the place so lets show him the editable review
              scope.userReviewMode = {};
              scope.userReviewMode.editMode = true;
              scope.userReviewMode.viewMode = false;
              scope.viewReviewsMode = false;
            }
          }
          else {
            //just show the readonly review features
            console.log("Just readonly");
            scope.userReviewMode = null;
            scope.viewReviewsMode = true;
          }
        }
      };
    })
    .directive('backToTop', function () { //when added to an element, it would bind the element to the onclick event and then scrollTop to the top of the page
      return {
        restrict: 'A'
      };
    });
