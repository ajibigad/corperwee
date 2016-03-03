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
            .state('corperwee.home.searchResults',{
                url: '/searchResults',
                //controller: '',
                templateUrl: 'partials/fragments/search_results.html'
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
            })
            .state('corperwee.addPlace',{
                url: '/addPlace',
                controller: 'AddPlaceCtrl',
                templateUrl: 'partials/fragments/place/addPlace.html'
            });
        $urlRouterProvider.otherwise('/corperwee/home');
        $httpProvider.defaults.headers.common["X-Requested-With"] = 'XMLHttpRequest';
        $httpProvider.defaults.withCredentials = true;
    }]).
    run(['$rootScope', '$state', '$cookieStore', 'authService', '$http', '$window', function ($rootScope, $state, $cookieStore, authService, $http, $window) {
        $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, error) {
            if (error.unAuthorized) {
                $state.go('welcome');
            }
            else if (error.authorized) {
                $state.go('corperwee.home');
            }
        });

        /*Am trying to fix the scrollBar issue with this code but its not solving*/
        $rootScope.$on('$stateChangeSuccess', function () {
            console.log("in changed state");
            //$window.scrollTo(0,0);
            //$("html,body").animate({scrollTop:0}, 200);
        });

        authService.user = $cookieStore.get('user'); //in case of a page refresh
        authService.userDetails = $cookieStore.get('userDetails');
        $rootScope.$broadcast('authService:changed', authService.user, authService.userDetails);
    }]
);

