'use strict';

/* Services */


// Demonstrate how to register services
angular.module('myApp.services', []).
    value('version', '0.1').
    value('HOST', "http://localhost:8086")
    .value('API', '/corperwee/api')
    .value('REGEX_EXPs', { // add future regex objects here
        phoneNumber: /\d{11}/,
        password: /[a-zA-Z0-9]{8,20}/
    });

angular.module('myApp.services').service('appEndpoints', function (HOST, API) {
    var ENDPOINT = HOST + API;
    this.LOGIN_ENDPOINT = ENDPOINT + "/login";
    this.LOGOUT_ENDPOINT = HOST + "/signout";
    this.SIGNUP_ENDPOINT = ENDPOINT + "/user";
    this.STATES_ENDPOINT = "http://states-cities.square-api.com/v1";
    this.USER_ENDPOINT = this.SIGNUP_ENDPOINT;
    this.CATEGORY_ENDPOINT = ENDPOINT + "/category";
    this.PLACE_ENDPOINT = ENDPOINT + "/place";
    this.REVIEW_ENDPOINT = ENDPOINT + "/review";
});

angular.module('myApp.services').factory('authService', ['appEndpoints', '$http', '$cookieStore', '$q', '$rootScope', 'userService',
    function (appEndpoints, $http, $cookieStore, $q, $rootScope, userService) {
        var auth = {};
        auth.getUserDetails = function (username) {
            userService.getUserDetails(username).then(function (userDetails) {
                auth.userDetails = userDetails;
                $cookieStore.put('userDetails', auth.userDetails);
                $rootScope.$broadcast('authService:changed', auth.user, auth.userDetails);
                return userDetails;
            }, function (error) {
                //this should must likely not happen since we were able to login, then the user exist
                //only case is if the user loses network at this point then just redirect the user to the login page to try again
                console.log(error.message);
                return {};
            });
        };
        auth.updateUserDetails = function (user) {
            auth.userDetails = angular.copy(user);
            $cookieStore.put('userDetails', auth.userDetails);
            $rootScope.$broadcast('authService:changed', auth.user, auth.userDetails);
        };
        auth.login = function (username, password) {
            //var headers = {Authorization : "Basic " + btoa(username + ":" + password)}; //for now lets use the defaulr username and password for spring. I would implement a real user store later
            var headers = {Authorization : "Basic " + btoa(username +":"+ password)};
            return $http.get(appEndpoints.LOGIN_ENDPOINT, {headers : headers}).then(function (response) {
                auth.user = response.data.principal;
                auth.getUserDetails(username);
                $cookieStore.put('user', auth.user);
                return auth.user;
            }, function(response){ return $q.reject(response)});
        };
        auth.logout = function () {
            return $http.get(appEndpoints.LOGOUT_ENDPOINT).then(function (response) {
                auth.user = undefined;
                auth.userDetails = undefined;
                $cookieStore.remove('user');
                $cookieStore.remove('userDetails');
                $rootScope.$broadcast('authService:changed', auth.user, auth.userDetails);
            }, function (response) {//just temp hack till i fix logout on server or client side
                auth.user = undefined;
                auth.userDetails = undefined;
                $cookieStore.remove('user');
                $cookieStore.remove('userDetails');
                $rootScope.$broadcast('authService:changed', auth.user, auth.userDetails);
            });
        };
        return auth;
    }]);

angular.module('myApp.services')
    .factory('signUpService', ['appEndpoints', '$http', '$cookieStore', 'authService',
        function (appEndpoints, $http) {
            return {
                signUp : function (newUser) {
                            return $http.post(appEndpoints.SIGNUP_ENDPOINT, newUser);
                         }
            };
        }])
    .factory('userService', ['$http', 'HOST', 'appEndpoints', '$q', '$injector',
        function ($http, HOST, appEndpoints, $q, $injector) {
          return {
              //currentUser : {name : "damoooooo"},
              getUserDetails : function (username) {
                  //use http to fetch user object for the userName
                  return $http.get(appEndpoints.USER_ENDPOINT + "/" + username).then(function (response) {
                      return response.data;
                  }, function (response) {
                      return $q.reject(response.data); // this should be an error object, error.message should return the error message
                  });
              },
              updateUserDetails : function (user) {
                  return $http.put(appEndpoints.USER_ENDPOINT, user).then(function (response) {
                      return response.data;
                  }, function (response) {
                      return $q.reject(response.data); // this should be an error object, error.message should return the error message
                  });
              },
              sayHello : function (message){
                  return $http.get(HOST+'/hello', {params : {message : " Can i hit the morning!!!!"}});
              },
              changePassword: function (passwordChange) {
                  //well i had to use an injector here because of this error : Circular dependency found: authService <- userService <- authService
                  // this basically means when authService is injected it required userService which now has to be injected but... he too needs authService
                  // so to fix this we leave the injection of authservice in this service to be within the changePassword function
                  var authService = $injector.get('authService');
                  return $http.put(appEndpoints.USER_ENDPOINT + "/" + authService.user.username + "/changePassword", passwordChange).then(function (response) {
                      return response.data;
                  }, function (response) {
                      return $q.reject(response.data);
                  });
              }
          }
        }])
    .service('categoryService', function (appEndpoints, $http, $q, $rootScope) {
        var self =this;
        var getAllCategories = function () {
            $http.get(appEndpoints.CATEGORY_ENDPOINT).then(function (response) {
                self.allCategories = response.data;
                $rootScope.$broadcast('categoryService:changed', self.allCategories);
            }, function (response) {
                alert("Error in Fetching Categories");
                //return $q.reject(response);
            });
        };
        getAllCategories();
    })
    .service('placeService', function(appEndpoints, $http, $q){
        this.addPlace = function(place){
            return $http.post(appEndpoints.PLACE_ENDPOINT, place).then(function(response){
                return response.data;
            });
        };

        this.getPlace = function (placeId) {
            return $http.get(appEndpoints.PLACE_ENDPOINT + "/" + placeId).then(function (response) {
                return response.data;
            }, function (response) {
                return $q.reject(response.data);
            });
        };

        this.updatePlace = function (placeId) {
            return $http.put(appEndpoints.PLACE_ENDPOINT + "/" + placeId).then(function (response) {
                return response.data;
            }, function (response) {
                return $q.reject(response.data);
            });
        };

        this.getReviews = function (placeId) {
            return $http.get(appEndpoints.PLACE_ENDPOINT + "/" + placeId + "/reviews").then(function (response) {
                return response.data;
            }, function (response) {
                return $q.reject(response.data);
            });
        };

        this.searchParams = {
            state : "",
            lga : "",
            town : "",
            pageNumber : "",
            pageSize : "",
            sortingProperty : "",
            sortingOrder : "",
            category : ""
        };

        this.sortingOrders = {
            ASC : "ASC",
            DESC : "DESC"
        };

        this.getPagedPlaces = function(searchParams){
            return $http.post(appEndpoints.PLACE_ENDPOINT + "/town/paged", searchParams).then(function(response){
                return response.data;
            });
        }
    })
    .service('reviewService', function ($http, $q, appEndpoints) {

        this.addReview = function (review) {
            return $http.post(appEndpoints.REVIEW_ENDPOINT, review).then(function (response) {
                return response.data;
            }, function (response) {
                return $q.reject(response.data);
            });
        };

        this.updateReview = function (review) {
            return $http.put(appEndpoints.REVIEW_ENDPOINT, review).then(function (response) {
                return response.data;
            }, function (response) {
                return $q.reject(response.data);
            });
        };

        this.getReviewByUserAndPlace = function (username, placeId) {
            return $http.get(appEndpoints.REVIEW_ENDPOINT + "/user/place", {
                params: {
                    username: username,
                    placeId: placeId
                }
            })
                .then(function (response) {
                    return response.data;
                }, function (response) {
                    return $q.reject(response.data);
                });
        };
    })
    .factory('nigStatesService',['$http', 'appEndpoints',
        function($http, appEndpoints){
            return {
                getAllStates : function () {
                    return $http.get(appEndpoints.STATES_ENDPOINT + '/states');
                },
                getStateLGAs : function (state) {
                    return $http.get(appEndpoints.STATES_ENDPOINT + '/state/' + state + '/lgas');
                },
                getStateTowns : function (state) {
                    return $http.get(appEndpoints.STATES_ENDPOINT + '/state' + state + '/cities');
                }
            }
        }])
    .service('alertModalService', function($uibModal){
        var error = -1, info = 0, success = 1;
        var self = this; //so we can get the 'this' instance of this class inside any function
        this.modalSize = 'sm';
        this.result; //this would hold the result (which is a promise) so any controller interested can get this result and perform actions when the modal is closed or dismissed
        var show = function (alertType, modalTemplateOptions, size) {
            var options = {
                    templateUrl: 'partials/fragments/alertModal.html',
                    controller: 'alertModalInstanceCtrl',
                    size: size || 'sm',
                    backdropClass : "alertModal",
                    resolve: {
                        modalTemplateOptions : function () {
                            return modalTemplateOptions;
                        },
                        alertType : alertType
                    }
                };
            self.result = $uibModal.open(options);
        };

        this.modalTemplateOptions = {
            title : "Info, Error, Success Header",
            message : "Info, Error, Success Message",
            okMessage : "OK"
        };

        this.showErrorAlert = function (){
            show(error, this.modalTemplateOptions, this.modalSize);
        };

        this.showInfoAlert = function (){
            show(info, this.modalTemplateOptions, this.modalSize);
        };

        this.showSuccessAlert = function (){
            show(success, this.modalTemplateOptions, this.modalSize);
        };
    });