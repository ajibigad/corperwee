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
    'myApp.controllers'
]).
    config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$routeProvider', '$httpProvider', function ($stateProvider, $urlRouterProvider, $locationProvider, $routeProvider, $httpProvider) {
        $stateProvider.state('welcome', {
            url: '/welcome',
            controller: 'LandingController',
            templateUrl: 'partials/landing_page.html',
            resolve: {
                user: ['authService', '$q', function (authService, $q) {
                    if (authService.user) {
                        return $q.reject({authorized: true});
                    }
                }]
            }
        })
            .state('corperwee', {
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
                url: '/updateProfile/:username',
                controller: 'UpdateProfileCtrl',
                templateUrl: 'partials/fragments/profile/updateProfile.html'
            });
        $urlRouterProvider.otherwise('/corperwee/home');
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
        $httpProvider.defaults.withCredentials = true;

    }]).
    run(['$rootScope', '$state', '$cookieStore', 'authService', '$http', function ($rootScope, $state, $cookieStore, authService, $http) {
        $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
            if (error.unAuthorized) {
                $state.go('welcome');
            }
            else if (error.authorized) {
                $state.go('corperwee.home');
            }
        });

        authService.user = $cookieStore.get('user'); //in case of a page refresh
        authService.userDetails = $cookieStore.get('userDetails');
        //$http.defaults.headers.common.Authorization = "Basic " + btoa("user" + ":" + "password");
    }]
);

