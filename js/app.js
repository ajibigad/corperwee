'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', [
    'ngRoute',
    'ngCookies',
    'ngAnimate',
    'ui.bootstrap',
    'ui.router',
    'angular-ladda',
    'myApp.filters',
    'myApp.services',
    'myApp.directives',
    'myApp.controllers',
    'http-auth-interceptor'
]).
    config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$routeProvider', '$httpProvider', function ($stateProvider, $urlRouterProvider, $locationProvider, $routeProvider, $httpProvider) {
        $stateProvider.state('welcome', {
            url: '/welcome',
            abstract: true,
            controller: function ($rootScope) {
                $rootScope.logged_in = false;
                $rootScope.navbar_url = 'partials/fragments/logout_navbar.html';
            },
            templateUrl: 'partials/welcomePage.html',
            resolve: {
                user: ['authService', '$q', function (authService, $q) {
                    if (authService.user) {
                        return $q.reject({authorized: true});
                    }
                }]
            }
        })
            .state('welcome.landing', {
                url: '/landing',
                controller: 'LandingController',
                templateUrl: 'partials/landing_page.html'
            })
            .state('welcome.resetPassword', {
                url: '/resetPassword',
                controller: 'ResetPasswordCtrl',
                templateUrl: 'partials/resetPassword.html'
            })
            .state('welcome.changePassword', {
                url: '/changePassword?id&token',
                controller: 'ChangePasswordCtrl',
                templateUrl: 'partials/changePassword.html'
            })
            .state('corperwee', {
                abstract: true,
                url: '/corperwee',
                controller: 'CorperWeeCtrl',
                templateUrl: 'partials/corperwee.html',
                resolve: {
                    //user:['authService','$q',function(authService,$q){
                    //  return authService.user || $q.reject({unAuthorized:true});
                    //}]
                    user: function (authService, $q) {
                        if (!authService.user) {
                            return $q.reject({unAuthorized: true});
                        }
                    }
                }
            })
            .state('corperwee.home', {
                url: '/home',
                controller: 'HomeController',
                templateUrl: 'partials/fragments/home.html'
            })
            .state('corperwee.viewProfile', {
                url: '/viewProfile/:username',
                controller: 'ViewProfileCtrl',
                templateUrl: 'partials/fragments/profile/viewProfile.html'
            })
            .state('corperwee.updateProfile', {
                url: '/updateProfile',
                controller: 'UpdateProfileCtrl',
                templateUrl: 'partials/fragments/profile/updateProfile.html'
            })
            .state('corperwee.addPlace',{
                url: '/addPlace',
                controller: 'AddPlaceCtrl',
                templateUrl: 'partials/fragments/place/addPlace.html'
            })
            .state('corperwee.viewPlace', {
                url: '/viewPlace/:id',
                controller: 'ViewPlaceCtrl',
                templateUrl: 'partials/fragments/place/viewPlace.html'
            })
            .state('corperwee.updatePlace', {
                url: '/updatePlace/:id',
                controller: 'UpdatePlaceCtrl',
                templateUrl: 'partials/fragments/place/updatePlace.html',
                resolve: {
                    place: function (authService, placeService, alertModalService, $stateParams, $state) {
                        return placeService.getPlace($stateParams.id).then(function (data) {
                            if (data.addedBy.username !== authService.user.username) {
                                alertModalService.modalTemplateOptions.title = "UnAuthorized Action";
                                alertModalService.modalTemplateOptions.message = "You are not authorized to update this place";
                                alertModalService.showErrorAlert();
                                $state.go('corperwee.viewPlace', {id: $stateParams.id});
                            }
                            return data;
                        }, function (error) {//we can check the status code with error.code
                            alertModalService.modalTemplateOptions.title = "Place Not Found";
                            alertModalService.modalTemplateOptions.message = error.message;
                            alertModalService.showErrorAlert();
                            $state.go('corperwee.home');
                        });
                    }
                }
            })
            .state('corperwee.updatePassword', {
                url: '/updatePassword',
                controller: 'UpdatePasswordCtrl',
                templateUrl: 'partials/fragments/profile/updatePassword.html'
            });
        $urlRouterProvider.otherwise('/corperwee/home');
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
        $httpProvider.defaults.withCredentials = true;
    }]).
    run(['$rootScope', '$state', '$cookieStore', 'authService', '$http', '$window', function ($rootScope, $state, $cookieStore, authService, $http, $window) {
        $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
            if (error.unAuthorized) {
                $state.go('welcome.landing');
            }
            else if (error.authorized) {
                $state.go('corperwee.home');
            }
        });

        authService.user = $cookieStore.get('user'); //in case of a page refresh
        authService.userDetails = $cookieStore.get('userDetails');
        $rootScope.$broadcast('authService:changed', authService.user, authService.userDetails);
    }]
);

