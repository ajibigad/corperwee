'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
    controller('MainController', ['authService', '$rootScope', '$scope', '$state', 'userService', 'categoryService', 'placeService', '$compile', function (authService, $rootScope, $scope, $state, userService, categoryService, placeService, $compile) {
        $scope.currentUser = authService.userDetails;
        $rootScope.retryFailed401Requests = false;
        $scope.logout = function () {
            authService.logout().then(function () {
                $state.go('welcome');
            }, function () {
                //show alert to say error occurred during logout
                $state.go('welcome'); //just temp hack till i fix logout on server side
            }); // this would logout you out and direct you to the home page
        };
        $scope.$on('authService:changed', function (event, newUserDetails) {
            $scope.currentUser = newUserDetails;
        }, true);
        $scope.getPlacesByName = function (searchQuery) {
            return placeService.getPlacesByName(searchQuery).then(function (data) {
                return data;
            });
        };
        $scope.viewPlace = function ($item, $model, $label, $event) {
            $state.go('corperwee.viewPlace', {id: $model.id});
        };

        $scope.$on('event:auth-loginRequired', function (event) {
            //we can clear the current authService so in any case if the user bypasses the sign in modal(which i have made lil hard except for developers), movement to any state would redirect him to the welcome state
            authService.clearAuthUser();
            $rootScope.retryFailed401Requests = true;
            //we should inject the modal html here before showing it
            var signInModalHolder = $('#injectSignInModalHere');
            console.log(signInModalHolder);
            if (!signInModalHolder.get(0)) { //painful hack!!!
                console.log("not found");
                $('body').append('<div id="injectSignInModalHere"></div>');
                signInModalHolder = $('#injectSignInModalHere');
            }
            //well i tot i would need to remove the html loaded into this div so we dont have several signin modals on the page each time this action occurs but it turns out the load function replaces anything in the div so we ok
            signInModalHolder.load('partials/fragments/signInModal.html', function () {
                $compile(signInModalHolder.contents())($scope); //bind the new html to the scope of the ctrl. we need to do this because angular has bootstrapped the page already b4 this occurs so we need to do it manually
                $('#signInModal').modal({
                    backdrop: 'static',
                    show: 'true',
                    keyboard: false
                });
            });
        });
    }])
    .controller('LandingController', ['$rootScope', function ($rootScope) {
        $rootScope.title = 'NYSC';
        $rootScope.logged_in = false;
        $rootScope.style = 'landing.css';
        $rootScope.navbar_url = 'partials/fragments/logout_navbar.html';
    }])
    .controller('CorperWeeCtrl', function ($rootScope, $scope, authService, userService, $state) {
        $rootScope.title = "NYSC - Home";
        $rootScope.logged_in = true; //this should be set by the authService
        $rootScope.style = 'home.css';
        $rootScope.navbar_url = 'partials/fragments/loggedin_navbar.html';
        //$state.go('corperwee.home');
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
        $scope.searchParams = placeService.searchParams; // this should not scare you cause its just for this user angular.copy(placeService.searchParams);
        $scope.fetchResults = function (nextPage) {
            $scope.searchBtnText = "Searching";
            $scope.searchLoading = true;
            if (nextPage) {
                $scope.searchParams.pageNumber = ++pageNumber;
            }
            else {
                $scope.searchParams.pageNumber = pageNumber = 0;
            }
            placeService.getPagedPlacesByTown($scope.searchParams).then(function (data) {
                if (nextPage) {
                    $scope.searchResults = $scope.searchResults.concat(data.content);
                }
                else {
                    $scope.searchResults = data.content;
                }
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
            console.log("reset param called");
            $scope.searchParams.state = userDetails.state;
            $scope.searchParams.lga = userDetails.lga;
            $scope.searchParams.town = userDetails.town;
            $scope.searchParams.sortingProperty = $scope.sortingProperties[1];
            $scope.searchParams.sortingOrder = placeService.sortingOrders.DESC;
            $scope.searchParams.pageNumber = pageNumber;
            $scope.searchParams.pageSize = pageSize;
            $scope.categories = categoryService.allCategories || "";
            $scope.searchParams.category = $scope.categories[0] || "";
            $scope.fetchResults();// for page refresh or first time on home state, this would fetch based on the person's details
        };

        $scope.$on('authService:changed', function (event, newUserDetails) {
            if(newUserDetails){
                resetSearchParams(newUserDetails);
            }
        }, true);

        if (authService.userDetails) {// for cases of a page refresh, this part is not yet understood
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
            console.log("searchParam changed");
            if (!angular.equals(newVal.category, oldVal.category)) {//this makes it specific to only tabs(categories nav) clicks
                console.log("searchParam changed initiate fetching");
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
        $scope.$watch('newUser.password', function (newVal, oldVal, scope) {
            $scope.newUser.confirmPassword = "";
        });
        $scope.signUp = function () {
            $scope.signUpLoading = true;
            //this should be called after a successful login
            signUpService.signUp($scope.newUser).then(function (response) {//the response here contains a json of the details of the user that just signed in
                authService.login($scope.newUser.username, $scope.newUser.password).then(function () {
                    //direct to home page
                    $('#signUpModal').on('hidden.bs.modal', function (e) {
                        $state.go('corperwee.home');
                    }).modal('hide');
                });
            }, function (response) {
                switch (response.status){
                    case 400 :  $scope.errorMessage = response.data.message;
                        break;
                    default : $scope.errorMessage = "Failed to connect to server";
                }
                $scope.failedSignUp = true;
                $('#signUpModal').animate({ scrollTop: 0 }, 'fast');
            }).finally(function () {
                $scope.signUpLoading = false;
            });
        };
        var getStates = function () {
            // when i get this api to work i would need to move this process into the $state resolve property
            // this is because the states need to be fetched before the sign up controller comes in
            // if the state loading fails, then the user would be required to refresh or check network connection
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
    .controller('SignInController', ['$scope', 'authService', '$state', 'alertModalService', '$rootScope', function ($scope, authService, $state, alertModalService, $rootScope) {
        $scope.user = {};
        if ($rootScope.retryFailed401Requests) {
            $scope.invalidLogin = true;
            $scope.errorMessage = "Your session has expired! Pls re-login";
        }
        $scope.signIn = function () {
            $scope.signInLoading = true;
            authService.login($scope.user.username, $scope.user.password).then(function () {
                //direct to home page
                //this should be called after a successful login
                $('#signInModal').on('hidden.bs.modal', function (e) {
                    $rootScope.retryFailed401Requests ? authService.loginConfirmed() : $state.go('corperwee.home');
                    $rootScope.retryFailed401Requests = false; // to make sure this change only be set to true by the auth-loginRequired event
                }).modal('hide');
            }, function (response) {
                //show alert for invalid Username/Password
                var errorMessage;
                switch (response.status){
                    case 401 :  errorMessage = "Wrong Username/Password Combination";
                        break;
                    default : errorMessage = "Failed to connect to server";
                }
                //alertModalService.modalTemplateOptions.title = "Sign In Error!!!";
                //alertModalService.modalTemplateOptions.message = errorMessage;
                //alertModalService.showErrorAlert();
                $scope.errorMessage = errorMessage;
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
    .controller('UpdateProfileCtrl', function ($scope, authService, userService, alertModalService, $state, REGEX_EXPs, $rootScope) {
        var username = authService.user.username; //this is because you can only be here if its your profile you viewed. The update button shows only when the logged in user views his/her profile
        var buttonDefault = "Update Profile";
        var buttonLoading = "Updating.......";
        $scope.failedUpdate = false;
        $scope.phoneNumberRegex = REGEX_EXPs.phoneNumber;
        $scope.updateButtonText = buttonDefault;
        $scope.user = angular.copy(authService.userDetails); //since am gonna edit the user object through the form, then we need to do a oopy
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
    .controller('ChangePasswordCtrl', function ($scope, userService, alertModalService) {
        $scope.passwordChange = {};
        $scope.changePassword = function () {
            $scope.changePasswordLoading = true;
            userService.changePassword($scope.passwordChange).then(function (data) {
                //alertSuccessBox
                alertChangeResult(false);
            }, function () {
                //alertFailureBox
                alertChangeResult(true);
            }).finally(function () {
                //stop ladda spining
                $scope.changePasswordLoading = false;
            });
        };
        var alertChangeResult = function (error) {
            if (error) {
                alertModalService.modalTemplateOptions.title = "Change Password Action Failed!!!";
                alertModalService.modalTemplateOptions.message = "Action to change user : " + $scope.currentUser.username + "'" + "s password failed";
                alertModalService.showErrorAlert();
            }
            else {
                alertModalService.modalTemplateOptions.title = "Change Password Action SuccessFull!!!";
                alertModalService.modalTemplateOptions.message = "Action to change user : " + $scope.currentUser.username + "'" + "s password was successful";
                alertModalService.showSuccessAlert();
            }
        };
    })
    .controller('AddPlaceCtrl', function ($scope, authService, alertModalService, $state, categoryService, placeService, REGEX_EXPs) {
        var defaultButtonText = 'Add Place';
        $scope.failedAction = false;
        $scope.place = {};
        $scope.place.state = authService.userDetails.state || "";
        $scope.place.lga = authService.userDetails.lga || "";
        $scope.place.town = authService.userDetails.town || "";
        $scope.addPlaceButtonText = defaultButtonText;
        $scope.phoneNumberRegex = REGEX_EXPs.phoneNumber;
        $scope.categories = categoryService.allCategories;
        $scope.$on('categoryService:changed', function (event, categories) {
            $scope.categories = categories;
        });
        $scope.$on('authService:changed', function (event, userDetails) {
            $scope.place.state = userDetails.state;
            $scope.place.lga = userDetails.lga;
            $scope.place.town = userDetails.town;
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
    .controller('ViewPlaceCtrl', function ($stateParams, $scope, authService, userService, reviewService, placeService, alertModalService, $state, $filter) {
        var getCurrentUserReview = function (username, placeId) {
            reviewService.getReviewByUserAndPlace(username, placeId).then(function (data) {
                $scope.currentUserReview = data;
            }, function (error) {
                //alert error
            });
        };

        var getReviews = function (placeId) {
            placeService.getReviews(placeId).then(function (data) {
                $scope.reviewsExist = data.length > 0; // its really dangerous having this here
                $scope.reviews = $filter('filter')(data, function (value) {
                    if (value.user.username == authService.user.username) {
                        return false;
                    }
                    return true;
                }, true);
            }, function (error) {
                //alert error
            });
        };

        var recalculateAverageRatings = function () {
            var totalRatings = 0;
            var reviews = angular.copy($scope.reviews);
            if ($scope.currentUserReview) {
                reviews.push(angular.copy($scope.currentUserReview));
            }
            for (var review in reviews) {
                totalRatings += reviews[review].rating;
            }
            $scope.place.rating = totalRatings / reviews.length;
        };

        $scope.updateReview = function (review) {
            $scope.updateReviewLoading = true;
            reviewService.updateReview(review).then(function (data) {
                $scope.currentUserReview = data;
                $scope.reviewsExist = true;
                recalculateAverageRatings();
                //alert success here
                alertModalService.modalTemplateOptions.title = "Update Review Successful!!!";
                alertModalService.modalTemplateOptions.message = "Action to Update a review by : " + $scope.currentUserReview.user.username + " succeeded";
                alertModalService.showSuccessAlert();
            }, function (error) {
                //alert error
            }).finally(function () {
                $scope.updateReviewLoading = false;
            });
        };

        $scope.addReview = function (review) {
            //review.user = authService.userDetails; the backend would take care of this
            review.place = $scope.place;
            $scope.addReviewLoading = true;
            reviewService.addReview(review).then(function (data) {
                $scope.currentUserReview = data;
                $scope.reviewsExist = true;
                recalculateAverageRatings();
                //getReviews($scope.place.id); wont be needed here since the reviews would be filtered to remove the user's review
                alertModalService.modalTemplateOptions.title = "Add Review Successful!!!";
                alertModalService.modalTemplateOptions.message = "Action to Add a review by : " + $scope.currentUserReview.user.username + " succeeded";
                alertModalService.showSuccessAlert();
            }, function (error) {
                //alert error
            }).finally(function () {
                $scope.addReviewLoading = false;
            });
        };

        placeService.getPlace($stateParams.id).then(function (data) {
            $scope.place = data;
            console.log($scope.place.addedBy.username + authService.user.username);
            $scope.place.addedBy.username === authService.user.username ? $scope.updateButton = true : $scope.updateButton = false;
            getCurrentUserReview(authService.user.username, $scope.place.id);// get the current user's review of the place
            getReviews($scope.place.id);
        }, function (error) {
            alertModalService.modalTemplateOptions.title = "Place Not Found";
            alertModalService.modalTemplateOptions.message = error.message;
            alertModalService.showErrorAlert();
            $state.go('corperwee.home');
        });
    })
    .controller('UpdatePlaceCtrl', function ($stateParams, $scope, authService, userService, alertModalService, $state, placeService, categoryService, place) {
        var oldPlace;
        var defaultUpdateBtnTxt = "Update";
        var loadingUpdateBtnTxt = "Updating ....";
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
        $scope.categories = categoryService.allCategories;
        $scope.place = place;
        oldPlace = angular.copy(place);

        $scope.updatePlace = function () {
            $scope.updatePlaceLoading = true;
            $scope.updatePlaceButtonText = loadingUpdateBtnTxt;
            placeService.updatePlace($scope.place).then(function (data) {
                $scope.place = data;
                oldPlace = angular.copy(data);
                alertUpdateResult(false);
            }, function (error) {
                alertUpdateResult(true, error.message);
            }).finally(function () {
                $scope.updatePlaceLoading = false;
                $scope.updatePlaceButtonText = defaultUpdateBtnTxt;
            });
        };

        $scope.reset = function () {
            $scope.place = angular.copy(oldPlace);
        };
    });