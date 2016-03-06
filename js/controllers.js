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
            }); // this would logout you out and direct you to the home page
        };
        $scope.$on('authService:changed', function (event, newUser, newUserDetails) {
            $scope.currentUser = newUserDetails;
        }, true);
    }])
    .controller('LandingController', ['$rootScope', function ($rootScope) {
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
        $state.go('corperwee.home');
    })
    .controller('HomeController', function ($scope, authService, categoryService, $state, placeService) {
        var defaultButtonTxt = "Search";
        var pageNumber = 0; // to be increased by load more results function
        var pageSize = 10;
        $scope.lastPage = false;
        $scope.reverseOrder = true; //this means by default, the results would be in desc order
        $scope.searchBtnText = defaultButtonTxt;
        $scope.searchLoading = false;
        $scope.showSearchFilter = false;
        $scope.searchResults = [];
        $scope.sortingProperties = ["name", "rating", "addedBy"];
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
                //the alert modal service should be used here
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

        //$scope.getRatingsArray = function (rating) {
        //    return new Array(rating);
        //};

        $scope.viewPlace = function (placeId) {
            $state.go('corperwee.viewPlace', {id: placeId});
        };
    })
    .controller('SignUpController', ['$scope', 'authService', 'signUpService', '$state', 'nigStatesService', 'userService', 'alertModalService', 'REGEX_EXPs', function ($scope, authService, signUpService, $state, nigStatesService, userService, alertModalService, REGEX_EXPs) {
        $scope.newUser = {};
        $scope.phoneNumberRegex = REGEX_EXPs.phoneNumber;
        $scope.signUp = function () {
            $scope.signUpLoading = true;
            //this should be called after a successful login
            signUpService.signUp($scope.newUser).then(function (response) {//the response here contains a json of the details of the user that just signed in
                authService.login($scope.newUser.username, $scope.newUser.password).then(function () {
                    //direct to home page
                    $('#signUpModal').on('hide.bs.modal', function (e) {
                        $state.go('corperwee.home');
                    }).modal('hide');
                });
            }, function (response) {
                switch (response.status){
                    case 400 :  $scope.errorMessage = response.data.message;
                        break;
                    default : $scope.errorMessage = "Failed to connect to server";
                };
                $scope.failedSignUp = true;
                $('#signUpModal').animate({ scrollTop: 0 }, 'fast');
            }).finally(function () {
                $scope.signUpLoading = false;
            });
        };
        var getStates = function () {
            // when i get this api to work i would need to move this process into the $state resolve property
            //this is because the states need to be fetched before the sign up controller comes in
            //if the state loading fails, then the user would be required to refresh or check network connection
            nigStatesService.getAllStates().then(function (response) {
                $scope.states = response.data;
            }, function () {
                alertModalService.modalTemplateOptions.title = "State Fetch Error";
                alertModalService.modalTemplateOptions.message = "Failed to fetch states";
                alertModalService.showErrorAlert();
            });
        };
        //getStates();
    }])
    .controller('SignInController', ['$scope', 'authService', '$state', 'alertModalService', function ($scope, authService, $state, alertModalService) {
        $scope.user = {};
        $scope.signIn = function () {
            $scope.signInLoading = true;
            authService.login($scope.user.username, $scope.user.password).then(function () {
                //direct to home page
                //this should be called after a successful login
                $('#signInModal').on('hide.bs.modal', function (e) {
                    $state.go('corperwee.home');
                }).modal('hide');
            }, function (response) {
                //show alert for invalid Username/Password
                var errorMessage;
                switch (response.status){
                    case 401 :  errorMessage = "Wrong Username/Password Combination";
                        break;
                    default : errorMessage = "Failed to connect to server";
                };
                alertModalService.modalTemplateOptions.title = "Sign In Error!!!";
                alertModalService.modalTemplateOptions.message = errorMessage;
                alertModalService.showErrorAlert();
                response.status == 401 ? $scope.invalidLogin = true : $scope.invalidLogin = false;// this helps to show the correct error incase of a no network issue
            }).finally(function () {
                $scope.signInLoading = false;
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
    .controller('ViewProfileCtrl', function ($stateParams, $scope, authService, userService, alertModalService, $state) {
        var username = $stateParams.username;
        $scope.updateButton = false;
        //issue with this approach is, if the app is opened in another it would fail to update over there too
        if(username === authService.userDetails.username){ //i can use the currentUser from the parent scope but this is safer
            $scope.user = authService.userDetails;
            $scope.updateButton = true;
        }
        else{
            userService.getUserDetails(username).then(function (data) {
                $scope.user = data;
            }, function (error) {
                //alert error that the user was not found then return to home state
                alertModalService.modalTemplateOptions.title = "Username Not Found!!!";
                alertModalService.modalTemplateOptions.message = error.message;
                alertModalService.showErrorAlert();
                $state.go('corperwee.home');
            });
        }
    })
    .controller('UpdateProfileCtrl', function ($stateParams, $scope, authService, userService, alertModalService, $state, REGEX_EXPs, $rootScope) {
        var username = $stateParams.username;
        var buttonDefault = "Update Profile";
        var buttonLoading = "Updating.......";
        $scope.failedUpdate = false;
        $scope.phoneNumberRegex = REGEX_EXPs.phoneNumber;
        $scope.updateButtonText = buttonDefault;
        if(username === authService.userDetails.username){
            $scope.user = angular.copy(authService.userDetails); //since am gonna edit the user object through the form, then we need to do a oopy
        }
        else{ //this means the account tried to update does not belong to the person logged in so.. no show
            alertModalService.modalTemplateOptions.title = "UnAuthorized Action!!!";
            alertModalService.modalTemplateOptions.message = "Please you dont have permission to update user : " + username + "'" + "s Profile.";
            alertModalService.showErrorAlert();
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
                    authService.updateUserDetails(data);
                    $scope.user = data;
                    alertUpdateResult(false);
                }, function (error) {
                    alertUpdateResult(true);
                }).finally(function () {
                    $scope.updateLoading = false;
                    $scope.updateButtonText = buttonDefault;
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
    .controller('AddPlaceCtrl', function ($scope, authService, alertModalService, $state, categoryService, placeService, REGEX_EXPs) {
        var defaultButtonText = 'Add Place';
        $scope.failedAction = false;
        $scope.place = {};
        $scope.addPlaceButtonText = defaultButtonText;
        $scope.phoneNumberRegex = REGEX_EXPs.phoneNumber;
        $scope.categories = categoryService.allCategories;
        $scope.$on('categoryService:changed', function (event, categories) {
            $scope.categories = categories;
        });
        $scope.addPlace = function () {
            $scope.addPlaceButtonText = "Adding .......";
            $scope.addPlaceLoading = true;
            placeService.addPlace($scope.place).then(function(data){
                $scope.place = data;
                $scope.successfulUpdate = true;
                alertActionResult(false);
                $state.go('corperwee.viewPlace', {
                    id: data.id
                });
            }, function(){
                alertActionResult(true);
            }).finally(function () {
                $scope.addPlaceButtonText = defaultButtonText;
                $scope.addPlaceLoading = false;
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
    .controller('ViewPlaceCtrl', function ($stateParams, $scope, authService, userService, reviewService, placeService, alertModalService) {
        var getCurrentUserReview = function (username, placeId) {
            reviewService.getReviewByUserAndPlace(username, placeId).then(function (data) {
                $scope.currentUserReview = data;
            }, function (error) {
                //alert error
            });
        };

        var getReviews = function (placeId) {
            placeService.getReviews(placeId).then(function (data) {
                $scope.reviews = data;
            }, function (error) {
                //alert error
            });
        };

        $scope.updateReview = function (review) {
            reviewService.updateReview(review).then(function (data) {
                $scope.currentUserReview = data;
                //alert success here
                alertModalService.modalTemplateOptions.title = "Update Review Successful!!!";
                alertModalService.modalTemplateOptions.message = "Action to Update a review by : " + $scope.currentUserReview.user.username + " succeeded";
                alertModalService.showSuccessAlert();
            }, function (error) {
                //alert error
            });
        };

        $scope.addReview = function (review) {
            //review.user = authService.userDetails; the backend would take care of this
            review.place = $scope.place;
            reviewService.addReview(review).then(function (data) {
                $scope.currentUserReview = data;
                alertModalService.modalTemplateOptions.title = "Add Review Successful!!!";
                alertModalService.modalTemplateOptions.message = "Action to Add a review by : " + $scope.currentUserReview.user.username + " succeeded";
                alertModalService.showSuccessAlert();
            }, function (error) {
                //alert error
            });
        };

        placeService.getPlace($stateParams.id).then(function (data) {
            $scope.place = data;
            getCurrentUserReview(authService.user.username, $scope.place.id);// get the current user's review of the place
            getReviews($scope.place.id);
        }, function (error) {
            alertModalService.modalTemplateOptions.title = "Place Not Found";
            alertModalService.modalTemplateOptions.message = error.message;
            alertModalService.showErrorAlert();
            $state.go('corperwee.home');
        });
    })
    .controller('UpdatePlaceCtrl', function ($stateParams, $scope, authService, userService, alertModalService, $state) {
        var placeId = $stateParams.id;
        var oldPlace;
        var defaultUpdateBtnTxt = "Update";
        var loadingUpdateBtnTxt = "Updating ....";
        var updatePlaceLoading = false;
        $scope.updatePlaceButtonText = defaultUpdateBtnTxt;
        var alertUpdateResult = function (error, reason) {
            if (error) {
                alertModalService.modalTemplateOptions.title = "Update Action Failed";
                alertModalService.modalTemplateOptions.message = "Update operation was not successful. " + reason;
                alertModalService.showErrorAlert();
            }
            else {
                alertModalService.modalTemplateOptions.title = "Update Successful";
                alertModalService.modalTemplateOptions.message = "Update operation was successful";
                alertModalService.showSuccessAlert();
            }

        };
        placeService.getPlace(placeId).then(function (data) {
            $scope.place = data;
            oldPlace = angular.copy(data); // local copy of place
            $scope.place.user.username === authService.user.username ? $scope.updateButton = true : $scope.updateButton = false;
        }, function (error) {//we can check the status code with error.code
            alertModalService.modalTemplateOptions.title = "Place Not Found";
            alertModalService.modalTemplateOptions.message = error.message;
            alertModalService.showErrorAlert();
            $state.go('corperwee.home');
        });

        $scope.update = function () {
            updatePlaceLoading = true;
            $scope.updatePlaceButtonText = loadingUpdateBtnTxt;
            if ($scope.place.user.username === authService.user.username) {
                if (angular.equals($scope.place, oldPlace)) {
                    $scope.reset();
                    updatePlaceLoading = false;
                    $scope.updatePlaceButtonText = defaultUpdateBtnTxt;
                }
                else {
                    placeService.updatePlace(placeId).then(function (data) {
                        $scope.place = data;
                        alertUpdateResult(false);
                    }, function (error) {
                        alertUpdateResult(true, error.message);
                    }).finally(function () {
                        updatePlaceLoading = false;
                        $scope.updatePlaceButtonText = defaultUpdateBtnTxt;
                    });
                }
            }
            else {
                alertModalService.modalTemplateOptions.title = "UnAuthorized Action";
                alertModalService.modalTemplateOptions.message = "You are not authorized to update this place";
                alertModalService.showErrorAlert();
                $state.go('corperwee.home');
            }
        };

        $scope.reset = function () {
            $scope.place = angular.copy(oldPlace);
        };
    });