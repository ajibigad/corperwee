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
    .controller('CorperWeeCtrl', function ($rootScope, $scope, authService, userService, $state) {
        $rootScope.title = "NYSC - Home";
        $rootScope.logged_in = true; //this should be set by the authService
        $rootScope.style = 'dashboard.css';
        $rootScope.navbar_url = 'partials/fragments/loggedin_navbar.html';
        $state.go('corperwee.home.searchResults');
    })
    .controller('HomeController', function ($scope, authService, categoryService, $state, placeService) {
        var defaultButtonTxt = "Search";
        var pageNumber = 0; // to be increased by load more results function
        var pageSize = 5;
        $scope.lastPage = false;
        $scope.testing;
        $scope.reverseOrder = true; //this means by default, the results would be in desc order
        $scope.searchBtnText = defaultButtonTxt;
        $scope.searchLoading = false;
        $scope.showSearchFilter = false;
        $scope.searchResults = [];
        $scope.sortingProperties = ["name", "rating", "addedBy"];
        $scope.categories = categoryService.allCategories;
        $scope.searchParams = angular.copy(placeService.searchParams);
        $scope.fetchResults = function () {
            $scope.searchBtnText = "Searching";
            $scope.searchLoading = true;
            placeService.getPagedPlaces($scope.searchParams).then(function (data) {
                $scope.searchResults = data.content;
                pageNumber++;
                $scope.lastPage = data.last;
            }, function(){
                //alert error that occurred
                alert("Error in fetching places");
            }).finally(function () {
                $scope.searchBtnText = defaultButtonTxt;
                $scope.searchLoading = false;
            });
        };
        var resetSearchParams = function (userDetails) {
            $scope.searchParams.state = userDetails.state;
            $scope.searchParams.lga = userDetails.lga;
            $scope.searchParams.town = userDetails.town;
            $scope.searchParams.sortingProperty = $scope.sortingProperties[1];
            $scope.searchParams.sortingOrder = placeService.sortingOrders.DESC;
            $scope.searchParams.pageNumber = pageNumber;
            $scope.searchParams.pageSize = pageSize;
            $scope.categories = categoryService.allCategories;
            $scope.searchParams.category = $scope.categories[0];
            $scope.fetchResults();// for page refresh or first time on home state, this would fetch based on the person's details
        };

        $scope.$on('authService:changed', function (event, newUser, newUserDetails) {
            if(newUserDetails){
                resetSearchParams(newUserDetails);
            }
        }, true);

        if(authService.userDetails){// for cases of a page refresh
            resetSearchParams(authService.userDetails);
        }

        $scope.$on('categoryService:changed', function (event, categories) {
            console.log("categoryService:changed");
            $scope.categories = categories;
            $scope.searchParams.category = $scope.categories[0];
        });

        $scope.toggleFilterShow = function () {
            $scope.showSearchFilter = $scope.showSearchFilter ? false : true;
        };

        $scope.$watch('searchParams', function(newVal, oldVal){
            if(!angular.equals(newVal.category, oldVal.category)){
                $scope.fetchResults();
            }
        }, true);

        $scope.getRatingsArray = function (rating) {
            return new Array(rating);
        };

        $state.go('corperwee.home.searchResults');
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
                alertUpdateResult(false);
            }
            else{
                userService.updateUserDetails($scope.user).then(function (data) {
                    $scope.updateButtonText = buttonDefault;
                    $scope.updateLoading = false;
                    authService.updateUserDetails(data);
                    $scope.user = data;
                    alertUpdateResult(false);
                }, function (error) {
                    $scope.updateLoading = false;
                    $scope.updateButtonText = buttonDefault;
                    alertUpdateResult(true);
                });
            }
        };
        var alertUpdateResult = function (error) {
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
        };
        $scope.reset = function () {
            $scope.user = angular.copy(authService.userDetails);
        };
    })
    .controller('AddPlaceCtrl', function ($scope, authService, alertModalService, $state, categoryService, placeService) {
        var defaultButtonText = 'Add Place';
        $scope.failedAction = false;
        $scope.place = {};
        $scope.addPlaceButtonText = defaultButtonText;
        $scope.phoneNumberRegex = /\d{11}/;
        $scope.categories = categoryService.allCategories;
        $scope.$on('categoryService:changed', function (event, categories) {
            $scope.categories = categories;
        });
        $scope.addPlace = function () {
            $scope.addPlaceButtonText = "Adding .......";
            $scope.addPlaceLoading = true;
            //$scope.place.addedBy = authService.userDetails;
            placeService.addPlace($scope.place).then(function(data){
                $scope.place = data;
                $scope.addPlaceButtonText = defaultButtonText;
                $scope.addPlaceLoading = false;
                alertActionResult(false);
            }, function(){
                $scope.addPlaceButtonText = defaultButtonText;
                $scope.addPlaceLoading = false;
                alertActionResult(true);
            });
        };
        var alertActionResult = function (error) {
            if(error){
                alertModalService.modalTemplateOptions.title = "Add Place Action Failed!!!";
                alertModalService.modalTemplateOptions.message = "Action to add place : " + $scope.place.name + " failed";
                alertModalService.showErrorAlert();
            }
            else{
                alertModalService.modalTemplateOptions.title = "Add Place Action Success!!!";
                alertModalService.modalTemplateOptions.message = "Action to add place : " + $scope.place.name + " succeeded";
                alertModalService.showSuccessAlert();
            }
        }
    })
    .controller('ViewPlaceCtrl', function($stateParams, $scope, authService, userService){})
    .controller('UpdatePlaceCtrl', function($stateParams, $scope, authService, userService, alertModalService, $state){});