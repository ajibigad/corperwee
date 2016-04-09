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
            elem.attr('title', 'click to view place');
          });
        }
      };
    })
    .directive('review', function (userService) {
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
          var activateUserReviewViewMode = function () {
            scope.userReviewMode = {};
            scope.userReviewMode.viewMode = true;
            scope.userReviewMode.editMode = false;
            scope.viewReviewsMode = false;
          };
          var activateUserReviewEditMode = function () {
            scope.userReviewMode = {};
            scope.userReviewMode.viewMode = false;
            scope.userReviewMode.editMode = true;
            scope.viewReviewsMode = false;
          };
          var activateViewReviewsMode = function () {
            scope.userReviewMode = null;
            scope.viewReviewsMode = true;
          };
          scope.$watch('currentUserReview', function (value) {
            //scope.review = angular.copy(scope.currentUserReview);
            if (value && attrs.userReview) {
              scope.review = angular.copy(value);
              activateUserReviewViewMode();
            }
            else {
              if (attrs.userReview) {
                activateUserReviewEditMode();
              }
              else {
                //means we are in the review without the userReview attr so we dont care about any change in currentUserReview
                activateViewReviewsMode();
              }
            }
          });
          console.log(attrs.userReview);
          if (attrs.userReview) {//once in here it can never be readOnly and this is for the logged in user
            console.log("user review set");
            // this means the directive should behave for the logged in user
            // this behaviour includes allowing him to edit his review or enter his review
            // this belongs to the logged in user
            scope.reviewersImageURL = userService.profilePictureEndpoint + '/' + scope.currentUser.username;
            if (scope.currentUserReview) {
              scope.review = angular.copy(scope.currentUserReview);
              // show user both editable and readonly review
              activateUserReviewViewMode();
            }
            else { // in case the object is empty
              console.log("user review edit first");
              // the logged in user has no review for the place so lets show him the editable review
              activateUserReviewEditMode();
            }
          }
          else {
            //just show the readonly review features
            console.log("Just readonly");
            scope.reviewersImageURL = userService.profilePictureEndpoint + '/' + scope.review.user.username;
            activateViewReviewsMode();
          }
        }
      };
    })
    .directive('backToTop', function () { //when added to an element, it would bind the element to the onclick event and then scrollTop to the top of the page
      return {
        restrict: 'A'
      };
    })
    .directive('usernameExist', function ($http) {
    }) // this is gonna help me validate if the username exist right inside the form
    .directive('confirmPassword', function () { //i think this can have global use. It can just be used to validate any field who's content must be equal to whatever is passed to the directive (confirmPassword="valueToCheck")
      return {
        restrict: 'A',
        require: 'ngModel',
        scope: {
          confirmPassword: '='
        },
        link: function (scope, elm, attrs, ctrl) {
          ctrl.$validators.confirmPassword = function (modelValue) {
            return modelValue == scope.confirmPassword;
          };

          scope.$watch("confirmPassword", function() {
            ctrl.$validate();
          });
        }
      };
    })
    .directive('password', function (REGEX_EXPs) {
      // i know ud be thinking Dammy why this directive when i can just use ng-pattern on my password field
      // well i tot bout dat also before doin this but men look at this scenario
      // if we had like several fields in the app dat requires a password pattern then we would have to hard-code this patterns(with ng-pattern) in every single one of them
      // then when you wake up one morning and say, men!! i have to change this regex for password on the app. Pele!! ud have to go look for all your password fields and change them one after the other
      // good news is, with this directive, ull just need to update the regex for password in the REGEX_EXPs service and BAM!!! all your password fields that has this directive would surely behave real quick
      // n moreover its your choice. Use any one you like ng-pattern or password directive
      return {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, elm, attrs, ctrl) {
          //here we would the app's general rule for a password
          //not less than 8 not greater than 20 and cannot be empty
          //we can specify the combination of letters and numbers we want also
          ctrl.$validators.password = function (modelValue, viewValue) {
            return REGEX_EXPs.password.test(viewValue)
          }
        }
      };
    })
    .directive('nigStates', function(nigStatesService, $rootScope){
      return {
        restrict: 'A',
        scope: {
          nigState: '='
        },
        link: function(scope, elm, atrrs){

          // this might not be needed at the end of the day because we can get this info from the nigStatesService.states or from listening to events or from the local storage

          function getStatesLGAs(state){
            nigStatesService.getStateLGAs(state).then(function(response){
              $rootScope.$broadcast(nigStatesService.events.lgasFetched, response.data);
            }, function(response){
              // we can determine errors by broadcasting them with the response details
              $rootScope.$broadcast(nigStatesService.events.lgasFetchFailed, response.data);
            });
          }

          scope.$watch('nigState', function(newVal, oldVal){
            if(angular.equals(newVal, oldVal)){
              //just getting initialized, do nothing
              return;
            }
            getStatesLGAs(newVal);
          });
        }
      };
    });
