'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
    controller('MainController', ['authService', '$rootScope', '$scope', '$state', 'userService', 'categoryService', 'placeService', '$compile', 'nigStatesService', function (authService, $rootScope, $scope, $state, userService, categoryService, placeService, $compile, nigStatesService) {
        $scope.currentUser = authService.userDetails;
        $rootScope.retryFailed401Requests = false;
        $scope.logout = function () {
            authService.logout().then(function () {
                $state.go('welcome.landing');
            }, function () {
                //show alert to say error occurred during logout
                $state.go('welcome.landing'); //just temp hack till i fix logout on server side
            }); // this would logout you out and direct you to the home page
        };
        $scope.$on('event:authService:changed', function (event, newUserDetails) {
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
            if (!signInModalHolder.get(0)) { //painful hack!!! for page refresh case
                console.log("sign in modal not found");
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

        nigStatesService.getAllStates().then(function(response){
            nigStatesService.states = response.data;
            $rootScope.$broadcast(nigStatesService.events.statesFetched, response.data);
        }, function(response){
            $rootScope.$broadcast(nigStatesService.events.stateFetchFailed, response.data);
            alert("failed to fetch states: "+ response.data.message);
        });
    }])
    .controller('LandingController', ['$rootScope', function ($rootScope) {
        $rootScope.title = 'NYSC-welcome';
        $rootScope.style = 'landing.css';
    }])
    .controller('CorperWeeCtrl', function ($rootScope, $scope, authService, userService) {
        $rootScope.title = "NYSC - Home";
        $rootScope.logged_in = true; //this should be set by the authService
        $rootScope.style = 'home.css';
        $rootScope.navbar_url = 'partials/fragments/loggedin_navbar.html';
        $rootScope.smallProfilePicture = userService.profilePictureEndpoint + "/" + authService.user.username;
        $scope.$on('event:userService:profilePictureUpdated', function(event, newProfilePicture){
            $rootScope.smallProfilePicture = userService.profilePictureEndpoint + "/" + authService.user.username;
        });
    })
    .controller('HomeController', function ($scope, authService, categoryService, $state, placeService, $q) {
        //$('#smallProfilePicture').attr('src', userService.profilePictureEndpoint + "/" + authService.user.username);
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
            //console.log("stupid category sent!! ");
            console.log($scope.searchParams.category);
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

        function getCategoryPromise () {
            var deferred = $q.defer();
            //after a login, non of these events would be broadcast again since category is fetched in the welcome state
            //to make sure we still get our categories here --> code below
            if(categoryService.allCategories){
                console.log("category service fetched already");
                deferred.resolve(categoryService.allCategories);
            }
            $scope.$on('event:categoryService:changed', function (event, categories) {
                console.log("category service success event");
                deferred.resolve(categories);
            });
            $scope.$on('event:categoryService:failed', function (event, message) {
                console.log("category service error event");
                deferred.reject(message);
            });
            return deferred.promise;
        }
        var categoryPromise = getCategoryPromise(); // to setup the listeners
        var resetSearchParams = function (userDetails) {
            console.log("reset param called");
            $scope.searchParams.state = userDetails.state;
            $scope.searchParams.lga = userDetails.lga;
            $scope.searchParams.town = userDetails.town;
            $scope.searchParams.sortingProperty = $scope.sortingProperties[1];
            $scope.searchParams.sortingOrder = placeService.sortingOrders.DESC;
            $scope.searchParams.pageNumber = pageNumber;
            $scope.searchParams.pageSize = pageSize;
            categoryPromise.then(function (categories) {
                console.log("where do you play in all this mess");
                $scope.categories = categories;
                $scope.searchParams.category = $scope.categories[0];
                // the above changes would trigger the stateParams watcher so dont bother fetchingResults here
                //$scope.fetchResults();// for page refresh or first time on home state, this would fetch based on the person's details
            }, function (message) {
                //alert with the message to tell the user to reload the page or check network connection
                alert("failed to receive any alert from category service");
            });
        };

        $scope.$on('event:authService:changed', function (event, newUserDetails) {
            console.log("active authService listener");
            if(newUserDetails){
                resetSearchParams(newUserDetails);
            }
        }, true);

        if (authService.userDetails) {// for cases of a page refresh, this part is not yet understood
            resetSearchParams(authService.userDetails);
        }

        $scope.toggleFilterShow = function () {
            $scope.showSearchFilter = !$scope.showSearchFilter;
        };

        $scope.$watch('searchParams', function(newVal, oldVal){
            console.log("searchParam changed");
            if(newVal == oldVal && newVal.category){ // the extra condition is to make sure we don't send an empty category with the request
                console.log("called due to initialization");
                // we still need to fetch here for result to display during state load
                $scope.fetchResults();
            }
            if (!angular.equals(newVal.category, oldVal.category)) {// this makes it specific to only tabs(categories nav) clicks
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
        var showError = function(response){
            switch (response.status){
                case 400 :
                case 404 :  $scope.errorMessage = response.data.message; // this is madness, cant remain this way
                    break;
                case 500 :
                    $scope.errorHeader = "Failed due to internal issue in the server";
                    $scope.errorMessage = "Pls bear with us. Our IT team are on it, but pls do feel free to contact us about this error if it persist. Thank you";
                    break;
                default : $scope.errorMessage = "Failed to connect to server";
            }
            $scope.failedSignUp = true;
            $('#signUpModal').animate({ scrollTop: 0 }, 'fast');
        };
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
                showError(response);
            }).finally(function () {
                $scope.signUpLoading = false;
            });
        };
        var getStates = function () {
            // if the state loading fails, then the user would be required to refresh or check network connection
            // well might not need to do the above again. i can just use a ladda btn to indicate when states are being fetched on the form
            // and disable the select field that is being fetched. The form would not still be submittable bcos the field in question would not have gotten any selection
        };

        //listen to nig-state events and get the data from them or fetch the states from the service itself but check first if it is available

        var setStates = function (event, states) {
            $scope.states = states;
        };

        var setStatesLGAs = function (event, lgas) {
            $scope.lgas = lgas;
        };

        var handleFailedOperation = function (event, error) {
            showError(error.message);
        };

        $scope.$on(nigStatesService.events.statesFetched, setStates);
        $scope.$on(nigStatesService.events.lgasFetched, setStatesLGAs);
        $scope.$on(nigStatesService.events.stateFetchFailed, handleFailedOperation);// for failed states fetch which might not be needed
        $scope.$on(nigStatesService.events.lgasFetchFailed, handleFailedOperation);// for failed lgas fetch

        if(nigStatesService.states){
            $scope.states = nigStatesService.state;
        }
        //var getStateCities = function(state){
        //    nigStatesService.getStateCities(state).then(function(response){
        //        $scope.cities = response.data;
        //    }, function(response){
        //        showError(response);
        //    });
        //};

        $scope.$on('$destroy', function(){
            $('#signUpModal').off('hidden.bs.modal');
        });
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
                $scope.invalidLogin = true;
                $('#signInAlert').slideDown();
                //response.status == 401 ? $scope.invalidLogin = true : $scope.invalidLogin = false;// this helps to show the correct error incase of a no network issue
            }).finally(function () {
                $scope.signInLoading = false;
            });
        };
        $scope.forgotPassword = function () {
        //this function should stop all held down request if retryFailed401Requests is true
            if($rootScope.retryFailed401Requests){
                authService.loginCancelled({}, "user forgot his password");
                $rootScope.retryFailed401Requests = false;
            }
            $('#signInModal').on('hidden.bs.modal', function (e) {
                $state.go('welcome.resetPassword');
            }).modal('hide');
        };
        $('#signInModal').find('input').keypress(function (evt) {
            //var key = String.fromCharCode();
            var enterBtnCode = 13; // for readability
            if(evt.which == enterBtnCode){
                // fire sign in
                $scope.signIn();
            }
        });
        $scope.$on('$destroy',function(){
            //cancel all timers, watchers and custom listeners for efficiency
            $('#signInModal').find('input').off('keypress').off('hidden.bs.modal'); //this chaining should not be necessary
        });
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
        $('#profilePicture').attr("src", userService.profilePictureEndpoint + "/" + username); //sets the profile picture
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
        var profilePicURI;
        var profilePicture = $('#profilePicture');
        var setProfilePictureURL = function (imageURL) { // default for state
            profilePicture.attr("src", imageURL);
        };

        var setUsernameProfilePicture = function () {
            setProfilePictureURL(userService.profilePictureEndpoint + "/" + username);
        };

        var setProfilePictureURI = function (imageURI) { // used during uploading operations
            profilePicURI = imageURI;
            setProfilePictureURL(imageURI);
        };
        $scope.failedUpdate = false;
        $scope.phoneNumberRegex = REGEX_EXPs.phoneNumber;
        $scope.updateButtonText = buttonDefault;
        $scope.user = angular.copy(authService.userDetails); //since am gonna edit the user object through the form, then we need to do a oopy
        setUsernameProfilePicture();
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

        $scope.uploading = false;
        $scope.showUploadBtn = false;
        $scope.resetProfilePicture = function(){
            setUsernameProfilePicture();
            $scope.showUploadBtn = false;
        };

        var handleImageSelect = function(event){
            var files = event.target.files, pic;
            if (files && files.length > 0) {
                pic = files[0];
            }
            //var pic = evt.target.files[0];
            var reader = new FileReader();
            if(!pic.type.match('image.*')){
                //alert wrong file extension
                alertModalService.modalTemplateOptions.title = "Wrong File Extension!!!";
                alertModalService.modalTemplateOptions.message = "Please select an image file. Thank you";
                alertModalService.showErrorAlert();
                return;
            }
            reader.onload = function(e) {
                setProfilePictureURI(e.target.result);
                $scope.$apply(function () {
                    $scope.showUploadBtn = true;
                });
            };
            reader.readAsDataURL(pic);
        };

        $scope.uploadPhoto = function () {
            $scope.uploading = true;
            var URIinfoRegex = /^data\:image\/(\w+)\;base64\,/;
            var rawImageData = profilePicURI.replace(URIinfoRegex, '');
            var matches = URIinfoRegex.exec(profilePicURI);
            var imageType = matches[1]; //contains image type info
            userService.uploadProfilePicture(rawImageData, imageType).then(function(imageName){
                authService.userDetails.profilePicture = imageName; // update the logged in details
                $scope.user.profilePicture = imageName;
                setUsernameProfilePicture(); //returns the url for the just uploaded image
                $scope.showUploadBtn = false;
                alertModalService.modalTemplateOptions.title = "Upload Image SuccessFull!!!";
                alertModalService.modalTemplateOptions.message = "Action to upload user : " + username + "'" + "s Profile Picture was successful";
                alertModalService.showSuccessAlert();
            }, function(error){
                alertModalService.modalTemplateOptions.title = "Upload Image Action Failed!!!";
                alertModalService.modalTemplateOptions.message = error.message;
                alertModalService.showErrorAlert();
            }).finally(function () {
                $scope.uploading = false;
            });
        };
        /*
        * Flow here is : a modal would pop up with the camera
        * user then takes picture and decides to save it or dismiss
        * after taking it, we then present it as the profile picture
        */

        $scope.freezeImage = false;
        $scope.freezeImageCtrl = function(freeze){
            freeze ? Webcam.freeze() : Webcam.unfreeze();
            $scope.freezeImage = freeze;
        };
        $scope.viewCamera = function () {
            $('#cameraViewerModal').modal({
                backdrop: 'static',
                show: 'true',
                keyboard: false
            });
            Webcam.set({
                width: 320,
                height: 240,
                crop_width: 240,
                crop_height: 240
            });
            Webcam.attach( '#cameraViewer' );
        };
        $scope.takePhoto = function () {
            Webcam.snap(function(data_uri){
                setProfilePictureURI(data_uri);
                profilePicture.attr("src", profilePicURI);
                $scope.showUploadBtn = true;
            });
            Webcam.reset();
            $('#cameraViewerModal').on('hide.bs.modal', function (e) {
                $scope.freezeImage = false;
            }).modal('hide');
        };
        $scope.closeCamera = function () {
            Webcam.reset();
            $scope.freezeImage = false;
        };
        $('#profileUpload').change(handleImageSelect);
        $scope.$on('$destroy',function(){
            $('#cameraViewerModal').off('hide.bs.modal');
            $('#profileUpload').off('change');
        });
    })
    .controller('UpdatePasswordCtrl', function ($scope, userService, alertModalService) {
        $scope.passwordUpdate = {};
        $scope.updatePassword = function () {
            $scope.updatePasswordLoading = true;
            userService.updatePassword($scope.passwordUpdate).then(function (data) {
                //alertSuccessBox
                alertChangeResult();
            }, function (data) {
                //alertFailureBox
                alertChangeResult(data);
            }).finally(function () {
                //stop ladda spining
                $scope.updatePasswordLoading = false;
            });
        };
        var alertChangeResult = function (error) {
            if (error) {
                alertModalService.modalTemplateOptions.title = "Update Password Action Failed!!!";
                alertModalService.modalTemplateOptions.message = "Action to update user : " + $scope.currentUser.username + "'" + "s password failed due to : " + error.message;
                alertModalService.modalSize = 'lg';
                alertModalService.showErrorAlert();
            }
            else {
                alertModalService.modalTemplateOptions.title = "Update Password Action SuccessFull!!!";
                alertModalService.modalTemplateOptions.message = "Action to update user : " + $scope.currentUser.username + "'" + "s password was successful";
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
        $scope.$on('event:categoryService:changed', function (event, categories) {
            $scope.categories = categories;
        });
        $scope.$on('event:authService:changed', function (event, userDetails) {
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
    })
    .controller('ResetPasswordCtrl', function ($rootScope, $scope, userService, alertModalService) {
        // $rootScope.navbar_url = 'partials/fragments/logout_navbar.html';
        $rootScope.title = 'NYSC-resetPassword';
        $scope.formVisible = true;
        $scope.resetPassword = function () {
            $scope.resetPasswordLoading = true;
            userService.resetPassword($scope.reset.password.username).then(function () {
                $('#emailAlert').slideDown();
                $scope.formVisible = false;
            }, function (error) {
                //alert failure
                alertModalService.modalTemplateOptions.title = "Reset Password Action Failed!!!";
                alertModalService.modalTemplateOptions.message = error.message;
                alertModalService.showErrorAlert();
            }).finally(function () {
                $scope.resetPasswordLoading = false;
            });
        }
    })
    .controller('ChangePasswordCtrl', function ($stateParams, userService, $scope, $rootScope, alertModalService) {
        $rootScope.title = 'NYSC-changePassword';
        $scope.formVisible = true;
        var passwordReset = {
            userId: $stateParams.id,
            token: $stateParams.token
        };
        $scope.changePassword = function () {
            $scope.changePasswordLoading = true;
            passwordReset.password = $scope.password;
            userService.changePassword(passwordReset, true).then(function () {
                $('#changePasswordAlert').slideDown();
                $scope.formVisible = false;
            }, function (error) {
                //alert failure
                alertModalService.modalTemplateOptions.title = "Change Password Action Failed!!!";
                alertModalService.modalTemplateOptions.message = error.message;
                alertModalService.showErrorAlert();
            }).finally(function () {
                $scope.changePasswordLoading = false;
            });
        };
    });