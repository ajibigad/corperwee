'use strict';

/* Services */


// Demonstrate how to register services
angular.module('myApp.services', []).
    value('version', '0.1').
    value('HOST', "http://localhost:8086")
    .value('API', '/corperwee/api');

angular.module('myApp.services').service('appEndpoints', function (HOST, API) {
    var ENDPOINT = HOST + API;
    this.LOGIN_ENDPOINT = ENDPOINT + "/login";
    this.LOGOUT_ENDPOINT = ENDPOINT + "/signout";
    this.SIGNUP_ENDPOINT = ENDPOINT + "/user";
    this.STATES_ENDPOINT = "http://states-cities.square-api.com/v1";
    this.USER_ENDPOINT = this.SIGNUP_ENDPOINT;
    this.CATOGORY_ENDPOINT = ENDPOINT + "/category";
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
            var headers = {Authorization : "Basic " + btoa("user:password")};
            return $http.get(appEndpoints.LOGIN_ENDPOINT, {headers : headers}).then(function (response) {
                auth.user = response.data.principal;
                //auth.userDetails = auth.getUserDetails(username).then(function (data) {
                //    console.log(data);
                //    return data;
                //});
                auth.getUserDetails(username);
                $cookieStore.put('user', auth.user);
                //$cookieStore.put('userDetails', auth.userDetails); // this allows us to make this call only once
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
        function (appEndpoints, $http, $cookieStore, authService){
            return {
                signUp : function (newUser) {
                            return $http.post(appEndpoints.SIGNUP_ENDPOINT, newUser);
                         }
            };
        }])
    .factory('userService', ['$http', 'HOST', 'appEndpoints', '$q',
        function($http, HOST, appEndpoints, $q){
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
              }
          }
        }])
    .service('categoryService', function (appEndpoints, $http, $q, $rootScope) {
        var self =this;
        var getAllCategories = function () {
            $http.get(appEndpoints.CATOGORY_ENDPOINT).then(function (response) {
                self.allCategories = response.data;
                $rootScope.$broadcast('categoryService:changed', self.allCategories);
            }, function (response) {
                alert("Error in Fetching Categories");
                //return $q.reject(response);
            });
        };
        getAllCategories();
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
            $uibModal.open(options);
        };

        this.modalTemplateOptions = {
            title : "Info, Error, Success Header",
            message : "Info, Error, Success Message",
            okMessage : "OK"
        };

        this.showErrorAlert = function (){
            show(-1, this.modalTemplateOptions, 'sm');
        };

        this.showInfoAlert = function (){
            show(0, this.modalTemplateOptions, 'sm');
        };

        this.showSuccessAlert = function (){
            show(1, this.modalTemplateOptions, 'sm');
        };
    });