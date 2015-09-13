'use strict';

//var socket = io(appConfig.url_sio);
var prefix_webrtc = appConfig.prefix_webrtc;

var app = angular.module('rouletteApp', ['ngRoute', 'rouletteApp.controllers', 'rouletteApp.services', 'zeroclipboard']);

app.config(['$routeProvider', '$sceDelegateProvider', 'uiZeroclipConfigProvider',
	function($routeProvider, $sceDelegateProvider, uiZeroclipConfigProvider) {

	$sceDelegateProvider.resourceUrlWhitelist([
        "self",
        "http://127.0.0.1/**",
        "http://reactionsroulette.tk/**"
    ]);

    //config ZeroClipboard
    uiZeroclipConfigProvider.setZcConf({
      swfPath: '../bower_components/zeroclipboard/dist/ZeroClipboard.swf'
    });

    $routeProvider.
      	when('/room/:name', {
      		controller: 'EnterRoomController',
        	templateUrl: '/views/enter_room.html',
      	}).
      	when('/room/:name/chat', {
        	controller: 'RoomMainController',
        	templateUrl: '/views/room.html',
      	}).
      	when('/', {
      		controller: 'HomeController',
        	templateUrl: '/views/create_room.html',
      	});
	}]);
