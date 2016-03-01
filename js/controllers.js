'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
    controller('MainController', ['authService', '$rootScope', '$scope', '$state', 'userService', 'categoryService', function (authService, $rootScope, $scope, $state, userService, categoryService) {
        $scope.currentUser = authService.userDetails;
        $scope.logout = function () {
            authService.logout().then(function () {
                $state.go('welcome');
            }, function () {
                //show alert to say error occurred during logout
                $state.go('welcome'); //just temp hack till i fix logout on server side
            }, function () {
                console.log('still trying to logout... pls endure');
            }); // this would logout you out and direct you to the home page
        };
        $scope.sayHello = function () {
            userService.sayHello('').then(function (response) {
                alert(response.data);
            }, function (response) {
                console.log(response.status);
                alert(response.status);
            });
        };
        $scope.$on('authService:changed', function (event, newUser, newUserDetails) {
            $scope.currentUser = newUserDetails;
            $rootScope.title = "NYSC - Home";
            $rootScope.logged_in = true; //this should be set by the authService
            $rootScope.style = 'dashboard.css';
            $rootScope.navbar_url = 'partials/fragments/loggedin_navbar.html';
        }, true);
    }])
    .controller('LandingController', ['$rootScope', function ($rootScope) {
        //var postID = scope.postInstance._id, savedPostInstance = {};
        $rootScope.title = 'NYSC';
        $rootScope.logged_in = false;
        $rootScope.style = 'styles.css';
        $rootScope.navbar_url = 'partials/fragments/logout_navbar.html';
    }])
    .controller('CorperWeeCtrl', ['$rootScope', '$scope', 'authService', 'userService', function ($rootScope, $scope, authService, userService) {
        $rootScope.title = "NYSC - Home";
        $rootScope.logged_in = true; //this should be set by the authService
        $rootScope.style = 'dashboard.css';
        $rootScope.navbar_url = 'partials/fragments/loggedin_navbar.html';
    }])
    .controller('HomeController', function ($scope, authService, categoryService) {
        $scope.searchBtnText = "Search";
        $scope.searchLoading = false;
        $scope.showSearchFilter = false;
        $scope.categories = categoryService.allCategories;
        if(authService.userDetails){// for cases of a page refresh
            $scope.searchParams = {
                state : authService.userDetails.state,
                lga : authService.userDetails.lga,
                town : authService.userDetails.town
            };
        }

        $scope.$on('authService:changed', function (event, newUser, newUserDetails) {
            $scope.searchParams = {
                state : newUserDetails.state,
                lga : newUserDetails.lga,
                town : newUserDetails.town
            };
        }, true);

        $scope.$on('categoryService:changed', function (event, categories) {
            $scope.categories = categories;
        });

        $scope.toggleFilterShow = function () {
            $scope.showSearchFilter = $scope.showSearchFilter ? false : true;
        }
    })
    .controller('SignUpController', ['$scope', 'authService', 'signUpService', '$state', 'nigStatesService', 'userService', 'alertModalService', function ($scope, authService, signUpService, $state, nigStatesService, userService, alertModalService) {
        $scope.newUser = {};
        $scope.phoneNumberRegex = /\d{11}/;
        $scope.signUp = function () {
            var newUser = $scope.newUser;
            $scope.signUpLoading = true;
            //this should be called after a successful login
            signUpService.signUp(newUser).then(function (response) {
                authService.login(newUser.username, newUser.password).then(function (data) {
                    //direct to home page
                    $scope.signUpLoading = false;
                    $('#signUpModal').on('hide.bs.modal', function (e) {
                        //userService.currentUser = newUser;
                        $state.go('corperwee.home');
                    }).modal('hide');
                });
            }, function (response) {
                var errorMessage;
                $scope.signUpLoading = false;
                switch (response.status){
                    case 400 :  $scope.errorMessage = response.data.message;
                        break;
                    default : $scope.errorMessage = "Failed to connect to server";
                };
                var modalTemplateOptions = {
                    title : "Sign Up Error!!!",
                    message : errorMessage
                };
                //errorMessage ? alertModalService.showErrorAlert(modalTemplateOptions) : '';
                $scope.failedSignUp = true;
                $('#signUpModal').animate({ scrollTop: 0 }, 'fast');
                //$('#signupfailurealert').setAttribute('auto-focus');
            });
        };
        var getStates = function () {
            nigStatesService.getAllStates().then(function (response) {
                $scope.states = response.data;
            }, function (response) {
                var errorMessage = "Failed to fetch states";
                //switch (response.status){
                //    case 401 :  errorMessage = "Failed to ";
                //        break;
                //    default : errorMessage = "Failed to connect to server";
                //};
                alertModalService.modalTemplateOptions.title = "State Fetch Error";
                alertModalService.modalTemplateOptions.message = errorMessage;
                alertModalService.showErrorAlert();
                //alertModalService.showInfoAlert(modalTemplateOptions);
            });
        };
        //getStates();
    }])
    .controller('SignInController', ['$scope', 'authService', '$state', 'alertModalService', function ($scope, authService, $state, alertModalService) {
        $scope.user = {};
        //$scope.signInLoading = false;
        //$scope.invalidLogin = true;
        $scope.signIn = function () {
            var user = $scope.user;
            $scope.signInLoading = true;
            authService.login(user.username, user.password).then(function (data) {
                //direct to home page
                //this should be called after a successful login
                $scope.signInLoading = false;
                $('#signInModal').on('hide.bs.modal', function (e) {
                    $state.go('corperwee.home');
                }).modal('hide');
            }, function (response) {
                //show alert for invalid Username/Password
                $scope.signInLoading = false;
                var errorMessage;
                switch (response.status){
                    case 401 :  errorMessage = "Wrong Username/Password Combination";
                        break;
                    default : errorMessage = "Failed to connect to server";
                };
                alertModalService.modalTemplateOptions.title = "Sign In Error!!!";
                alertModalService.modalTemplateOptions.message = errorMessage;
                alertModalService.showErrorAlert();
                response.status == 401 ? $scope.invalidLogin = true : $scope.invalidLogin = false;
            });
        };
    }])
    .controller('alertModalInstanceCtrl', function ($scope, $uibModalInstance, modalTemplateOptions, alertType) {
        $scope.alertTitle = modalTemplateOptions.title;
        $scope.alertMessage = modalTemplateOptions.message;
        $scope.okMessage = modalTemplateOptions.okMessage || "OK";
        $scope.alertType = alertType;

        $scope.ok = function () {
            $uibModalInstance.close('closed');
        };

        //$scope.cancel = function () {
        //    $uibModalInstance.dismiss('cancel');
        //};
    })
    .controller('ViewProfileCtrl', function ($stateParams, $scope, authService, userService) {
        var username = $stateParams.username;
        $scope.updateButton = false;
        if(username === authService.userDetails.username){ //i can use the currentUser from the parent scope but this is safer
            $scope.user = authService.userDetails;
            $scope.updateButton = true;
        }
        else{
            userService.getUserDetails(username).then(function (data) {
                $scope.user = data;
            }, function (error) {
                //alert error that the user was not found then return to previous state
            });
        }
    })
    .controller('UpdateProfileCtrl', function ($stateParams, $scope, authService, userService, alertModalService, $state, $rootScope) {
        var username = $stateParams.username;
        var buttonDefault = "Update Profile";
        var buttonLoading = "Updating.......";
        $scope.failedUpdate = false;
        $scope.phoneNumberRegex = /\d{11}/;
        $scope.updateButtonText = buttonDefault;
        if(username === authService.userDetails.username){
            $scope.user = angular.copy(authService.userDetails); //since am gonna edit the user object through the form, then we need to do a oopy
        }
        else{ //this means the account tried to update does not belong to the person logged in so.. no show
            var modalTemplateOptions = {
                title : "UnAuthorized Action!!!",
                message : "Please you dont have permission to update user : " + username + "'" + "s Profile. Click <a ui-sref='corperwee.viewProfile({username : user.username})'>here</a> to view his/her profile"
            };
            //alertModalService.showErrorAlert(modalTemplateOptions);
            $state.go('corperwee.viewProfile', {
                username: authService.userDetails.username
            });
        }
        $scope.update = function () {
            //send the user object to server and respond as usual
            $scope.updateButtonText = buttonLoading;
            $scope.updateLoading = true;
            if(angular.equals($scope.user, authService.userDetails)){
                $scope.reset();
                $scope.updateButtonText = buttonDefault;
                $scope.updateLoading = false;
                $scope.alertUpdateResult(false);
            }
            else{
                userService.updateUserDetails($scope.user).then(function (data) {
                    $scope.updateButtonText = buttonDefault;
                    $scope.updateLoading = false;
                    authService.updateUserDetails(data);
                    $scope.user = data;
                    $scope.alertUpdateResult(false);
                }, function (error) {
                    $scope.updateLoading = false;
                    $scope.alertUpdateResult(true);
                });
            }
        };
        $scope.alertUpdateResult = function (error) {
            if(error){
                alertModalService.modalTemplateOptions.title = "Update Action Failed!!!";
                alertModalService.modalTemplateOptions.message = "Action to update user : " + username + "'" + "s Profile failed";
                alertModalService.showErrorAlert();
            }
            else{
                alertModalService.modalTemplateOptions.title = "Update Action SuccessFull!!!";
                alertModalService.modalTemplateOptions.message = "Action to update user : " + username + "'" + "s Profile was successful";
                alertModalService.showSuccessAlert();
            }
        }
        $scope.reset = function () {
            $scope.user = angular.copy(authService.userDetails);
        };
    });