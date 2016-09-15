angular.module("contactsApp", ['ngRoute'])
    .config(function($routeProvider) {
        $routeProvider
            // .when("/", {
            //     templateUrl: "list.html",
            //     controller: "UploadsController",
            //     resolve: {
            //         uploads: function(Uploads) {
            //             return Uploads.getUploads();
            //         }
            //     }
            // })
            .when("/counts", {
                templateUrl: "list.html",
                controller: "UploadsController",
                resolve: {
                    uploads: function(Uploads) {
                        return Uploads.getUploads();
                    },
                    megabytes: function(Uploads) {
                        var megs = 0
                        for (upload in Uploads) {
                            megs += upload.ImageSize
                        }
                        return megs
                    }
                }
            })
            .otherwise({
                redirectTo: "/"
            })
    })
    .service("Uploads", function($http) {
        this.getUploads = function() {
            return $http.get("/uploads").
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error finding uploads.");
                });
        }
    })
    .controller("UploadsController", function(uploads, $scope) {
        $scope.uploads = uploads.data;
    });