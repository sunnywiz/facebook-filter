﻿var app = angular
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

    $scope.loginStatus = "vader does not yet know status";

    updateLoginStatus();

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

    /**
     * Update loginStatus result
     */
    function updateLoginStatus() {
        ezfb.getLoginStatus(function (res) {
            $scope.loginStatus = res.status;
        });
    }

    $scope.postsViewModel = [];
    $scope.allPosts = {};
    $scope.baseFeedUrl = 'me/home?fields=id,icon,from,story,permalink_url,picture,description';
    $scope.nextFeedUrl = $scope.baseFeedUrl;
    $scope.dupStories = 0;
    $scope.newStories = 0;
    $scope.lastLoadTime = 0;

    $scope.getPosts = function () {
        var startTime = Date.now();
        ezfb.api($scope.nextFeedUrl,
            function(feedResult) {
                console.log(feedResult);

                for (var i = 0; i < feedResult.data.length; i++) {
                    var post = feedResult.data[i];
                    if (!post) continue;

                    var id = post.id;
                    if (!id) continue;

                    if ($scope.allPosts[id]) {
                        $scope.dupStories++;
                    } else {
                        $scope.newStories++;
                    }
                    $scope.allPosts[id] = post; // update it anyway!
                }

                if (feedResult.paging && feedResult.paging.cursors && feedResult.paging.cursors.after) {
                    $scope.nextFeedUrl = $scope.baseFeedUrl + "&after=" + feedResult.paging.cursors.after + "&limit=25";
                } else {
                    $scope.nextFeedUrl = null;
                }

                var endTime = Date.now();
                $scope.lastLoadTime = endTime - startTime;

                $scope.rebuildViewModel();
            });
    }

    $scope.numPosts = function () {
        return Object.keys($scope.allPosts).length;
    }

    $scope.rebuildViewModel = function () {
        $scope.postsViewModel = [];
        var keys = Object.keys($scope.allPosts);
        keys.sort(function (a, b) {
            return new Date($scope.allPosts[b].created_time) - new Date($scope.allPosts[a].created_time);
        });
        for (var i = 0; i < keys.length; i++) {
            var post = $scope.allPosts[keys[i]];
            $scope.postsViewModel.push({
                prettyCreated: prettyDate(post.created_time),
                from: post.from.name,
                story: post.story,
                description: post.description,
                picture: post.picture
            });
        }
    }

});
