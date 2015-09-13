'use strict';

/* Services */

angular.module('rouletteApp.services', ['ngRoute'])

.factory('socket', function ($rootScope) {
    var socket = io(appConfig.url_sio);
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {  
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
})

.service('sharedProperties', function () {
    var username = null;

    return {
        getUsername: function () {
            return username;
        },
        setUsername: function(value) {
            username = value;
        }
    };
});