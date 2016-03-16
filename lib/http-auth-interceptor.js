/*global angular:true, browser:true */

/**
 * @license HTTP Auth Interceptor Module for AngularJS
 * (c) 2012 Witold Szczerba
 * License: MIT
 */
(function () {
    'use strict';

    angular.module('http-auth-interceptor', ['http-auth-interceptor-buffer'])
    /**
     * $http interceptor.
     * On 401 response (without 'ignoreAuthModule' option) stores the request
     * and broadcasts 'event:auth-loginRequired'.
     * On 403 response (without 'ignoreAuthModule' option) discards the request
     * and broadcasts 'event:auth-forbidden'.
     */
        .config(['$httpProvider', function ($httpProvider) {
            $httpProvider.interceptors.push(['$rootScope', '$q', 'httpBuffer', function ($rootScope, $q, httpBuffer) {
                return {
                    responseError: function (rejection) {
                        var config = rejection.config || {};
                        if (!config.ignoreAuthModule) {
                            switch (rejection.status) {
                                case 401:
                                    var deferred = $q.defer();
                                    httpBuffer.append(config, deferred);
                                    $rootScope.$broadcast('event:auth-loginRequired', rejection);
                                    return deferred.promise;
                                case 403:
                                    $rootScope.$broadcast('event:auth-forbidden', rejection);
                                    break;
                            }
                        }
                        // otherwise, default behaviour
                        return $q.reject(rejection);
                    }
                };
            }]);
        }]);

    /**
     * Private module, a utility, required internally by 'http-auth-interceptor'.
     */
    angular.module('http-auth-interceptor-buffer', [])

        .factory('httpBuffer', ['$injector', function ($injector) {
            /** Holds all the requests, so they can be re-requested in future. */
            var buffer = [];

            /** Service initialized later because of circular dependency problem. */
            var $http;

            function retryHttpRequest(config, deferred) {
                function successCallback(response) {
                    deferred.resolve(response);
                }

                function errorCallback(response) {
                    deferred.reject(response);
                }

                $http = $http || $injector.get('$http');
                $http(config).then(successCallback, errorCallback);
            }

            return {
                /**
                 * Appends HTTP request configuration object with deferred response attached to buffer.
                 */
                append: function (config, deferred) {
                    buffer.push({
                        config: config,
                        deferred: deferred
                    });
                },

                /**
                 * Abandon or reject (if reason provided) all the buffered requests.
                 */
                rejectAll: function (reason) {
                    if (reason) {
                        for (var i = 0; i < buffer.length; ++i) {
                            buffer[i].deferred.reject(reason);
                        }
                    }
                    buffer = [];
                },

                /**
                 * Retries all the buffered requests clears the buffer.
                 */
                retryAll: function (updater) {
                    for (var i = 0; i < buffer.length; ++i) {
                        var _cfg = updater(buffer[i].config);
                        if (_cfg !== false)
                            retryHttpRequest(_cfg, buffer[i].deferred);
                    }
                    buffer = [];
                }
            };
        }]);
})();

