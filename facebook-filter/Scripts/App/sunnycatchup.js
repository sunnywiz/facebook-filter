var app = angular
.module('sunnycatchup', ['ezfb'])
.config(function (ezfbProvider) {
    /**
     * Basic setup
     *
     * https://github.com/pc035860/angular-easyfb#configuration
     */
    ezfbProvider.setInitParams({
        appId: '426833590733307',
        version: 'v2.3' // use graph api version 2.3!!! till July 2017.  then /me/home goes away.
    });
})
.controller('darth', function ($scope, ezfb, $window, $location) {

    // private stuff

    var baseFeedUrl = 'me/home?fields=id,icon,from,story,caption,link,message,picture,full_picture,description';
    var allPosts = {};

    // non-bound-stuff local stuff

    function storeToLocalStorage() {
        localStorage.setItem("allPosts", JSON.stringify(allPosts));
        localStorage.setItem("localStorageLimit", $scope.localStorageLimit);
    }

    function loadFromLocalStorage() {
        var x = localStorage.allPosts;
        if (!x) x = "{}";
        x = JSON.parse(x);
        if (!x) x = {};
        allPosts = x;

        $scope.localStorageLimit = parseInt(localStorage.localStorageLimit);
        if (!$scope.localStorageLimit) {
            $scope.localStorageLimit = 1000;
        }
    }

    function updateLoginStatus() {
        ezfb.getLoginStatus(function (res) {
            $scope.loginStatus = res.status;
        });
    }

    function rebuildViewModel() {
        $scope.postsViewModel = [];
        var keys = Object.keys(allPosts);

        // this part gives ascending sort order
        keys.sort(function (a, b) {
            var da = new Date(allPosts[a].created_time);
            var db = new Date(allPosts[b].created_time);
            if (db > da) return 1;
            if (da > db) return -1;
            return 0;
        });

        // this part enforces the limit
        while (keys.length > $scope.localStorageLimit && keys.length > 25) {
            delete allPosts[keys[keys.length - 1]];
            keys.splice(-1, 1);
        }

        for (var i = 0; i < keys.length; i++) {
            var post = allPosts[keys[i]];
            var vm = {
                post: post,
                prettyCreated: prettyDate(post.created_time),
                story: post.story
            };
            if (vm.story && vm.from) {
                vm.story = vm.story.replace(vm.from, '');
            }
            $scope.postsViewModel.push(vm);
        }

    }

    // scope stuff

    $scope.loginStatus = "vader does not yet know status";

    $scope.login = function () {
        /**
         * Calling FB.login with required permissions specified
         * https://developers.facebook.com/docs/reference/javascript/FB.login/v2.0
         */
        ezfb.login(function (res) {
            /**
             * no manual $scope.$apply, I got that handled
             */
            if (res.authResponse) {
                updateLoginStatus();
            }
        }, { scope: 'public_profile,email,user_posts,read_stream' });
    };

    $scope.logout = function () {
        /**
         * Calling FB.logout
         * https://developers.facebook.com/docs/reference/javascript/FB.logout
         */
        ezfb.logout(function () {
            updateLoginStatus();
        });
    };

    $scope.postsViewModel = [];
    $scope.dupStories = 0;
    $scope.newStories = 0;
    $scope.lastLoadTime = 0;

    $scope.getPosts = function () {
        var startTime = Date.now();
        ezfb.api($scope.nextFeedUrl,
            function (feedResult) {
                console.log(feedResult);

                for (var i = 0; i < feedResult.data.length; i++) {
                    var post = feedResult.data[i];
                    if (!post) continue;

                    var id = post.id;
                    if (!id) continue;

                    if (allPosts[id]) {
                        $scope.dupStories++;
                    } else {
                        $scope.newStories++;
                        // have not seen this post before.. 
                        // initialize some stuff. 
                        post.visible = true;
                        allPosts[id] = post;
                    }
                }

                if (feedResult.paging && feedResult.paging.cursors && feedResult.paging.cursors.after) {
                    $scope.nextFeedUrl = baseFeedUrl + "&after=" + feedResult.paging.cursors.after + "&limit=25";
                } else {
                    $scope.nextFeedUrl = null;
                }

                var endTime = Date.now();
                $scope.lastLoadTime = endTime - startTime;

                storeToLocalStorage();
                rebuildViewModel();
            });
    }

    $scope.numPosts = function () {
        return Object.keys(allPosts).length;
    };

    $scope.clearLocalStorage = function () {
        allPosts = {};
        storeToLocalStorage();
        rebuildViewModel();
    };

    $scope.changedLocalStorageLimit = function () {
        storeToLocalStorage();
    };

    $scope.hidePost = function (post) {
        post.post.visible = false;
        storeToLocalStorage();
    }

    $scope.numHidden = function () {
        var count = 0;
        var keys = Object.keys(allPosts);
        for (var i = 0; i < keys.length; i++) {
            if (!allPosts[keys[i]].visible) {
                count++;
            }
        }
        return count;
    }

    $scope.unhideAll = function() {
        var keys = Object.keys(allPosts);
        for (var i = 0; i < keys.length; i++) {
            allPosts[keys[i]].visible = true;
        }
    }

    // INITIALIZE!
    updateLoginStatus();
    loadFromLocalStorage();
    rebuildViewModel();
    $scope.nextFeedUrl = baseFeedUrl;


});
