'use strict';

/* Controllers */

angular.module('rouletteApp.controllers', ['ngRoute'])

.controller('HomeController', function($scope, $location, sharedProperties){
	$scope.form = {};

	$scope.generateRandRoom = function() {
		function s4() {
	    	return Math.floor((1 + Math.random()) * 0x10000)
	               .toString(16)
	               .substring(1);
		}
		return s4() + s4();
	}
	$scope.form.createR = function(){
		$scope.room = $scope.generateRandRoom();
		sharedProperties.setUsername($scope.form.username);
		$location.path('/room/'+$scope.room+'/chat');
	}
})

.controller('EnterRoomController', function($scope, $location, sharedProperties){
	var room = window.location.hash.split('/').pop();
	$scope.room = room;
	$scope.form = {};
	$scope.form.submitTheForm = function(){
		sharedProperties.setUsername($scope.form.username);
		$location.path('/room/'+$scope.room+'/chat');
	}
})

.controller('RoomMainController', function($scope, $location, socket, sharedProperties, $sce){
	var room = window.location.hash.split('/');
	$scope.url = $location.absUrl(),
	$scope.acceptedCamReq = false;
	$scope.room = room[2];
	$scope.chat = true; 		//app is in chat mode
	$scope.imVictim = false; 	//im roulette victim
	$scope.roulette = false; 	//video is playing somewhere
	$scope.victimVidid = null;
	$scope.watchingVictimVideo = false;

	$scope.username = sharedProperties.getUsername();

	if(!$scope.username){
		$location.path('/room/'+ $scope.room);
		return;
	}
	$scope.copiedUrl = function(){
		alert('URL copied to clipboard. Share it to invite people to this room.');
	}
	$scope.checkDisableRoulette = function(){
		return $scope.roulette || $scope.users.length < 10;
	}
	$scope.watchVictimVideo = function(){
		var victim_video = $('#victim_video');
		$scope.watchingVictimVideo = !$scope.watchingVictimVideo;
		if($scope.watchingVictimVideo){
			victim_video.get(0).play();
		}else{
			victim_video.get(0).pause();
		}
	}
	$scope.joinRoom =  function (video_id){
	    socket.emit('join', { room: $scope.room, username: $scope.username, video_id: video_id });
	}
	$scope.sendMessage = function(msg){
		var m = { room: $scope.room, from: $scope.username, message: msg, time: new Date().getTime() };
		socket.emit('chat', m);
	}
	$scope.startRoulette = function(){
		socket.emit('roulette', { room: $scope.room, from: $scope.username });
	}
	$scope.cancelVideoWatch = function(){
		$scope.imVictim = false;
		socket.emit('cancel_video', { room: $scope.room, username: $scope.username });
	}
	$scope.videoEnded = function(){
		socket.emit('video_ended', { room: $scope.room, username: $scope.username });
	}
	$scope.takePhoto = function(data){
		socket.emit('photo', data);
	}
	$scope.captureVideoImg = function(id, victim){
		var videoEl = $('#'+id);
		var canvas = document.getElementById('canvas');
		var context = canvas.getContext('2d');
		canvas.width = 400;
		canvas.height = 400
		context.drawImage(videoEl[0],0,0,400,400);
		var url = canvas.toDataURL();
		var img = $('<img>');
		img.attr('src', url);
		img.appendTo('#imagediv');

		var data = {userPhoto: victim, username: $scope.username, photo: url, room: $scope.room};
		$scope.takePhoto(data);
	}
	$scope.stopVideo = function(data){
		$scope.roulette = false;
		$scope.imVictim = false;
		$scope.victimVidid = null;
		$scope.video = null;
		$scope.watchingVictimVideo = false;
		$('#'+data.victim_video).removeClass('selected');
		$('#user_'+data.victim_video).removeClass('btn-danger');
		$('#take_photo_'+data.victim_video).remove();
	}

	$('#side_bar_tabs a').click(function (e) {
	  	e.preventDefault();
	  	$(this).tab('show');
	  	return false;
	});

	$scope.messages = [];
	$scope.photos = [];

	$('#close_video_modal_but').click(function(){
		$scope.cancelVideoWatch();
	});

	$scope.users = [$scope.username];

	$scope.refreshChat = function(){
		//$scope.$apply();
		var msgHolder = $(".tab-content");
		msgHolder.animate({ scrollTop: msgHolder[0].scrollHeight}, 20);
	}

	socket.on('users', function (data) {
		$('#roulette_but').removeAttr('disabled');
		$scope.users = data.users;
		var takePhotoElems = $('.take-photo-cont');
		var inUser;
		$.each(takePhotoElems, function( index, elem ) {
			inUser = false;
			$.each($scope.users, function(i,e){
				if(e.video_id == elem.getAttribute('data-vidid')){
					inUser = true;
				}
			})
			if(!inUser){
				elem.parentNode.removeChild(elem);
				$scope.roulette = false;
			}
		});
		var msg;
		if(data.new_user){
			msg = data.new_user+' joined';
		}else if(data.user_left){
			msg = data.user_left+' left';
		}else{
			return;
		}

		$scope.messages.push({from: "#"+ $scope.room, message: msg, time: new Date().getTime()});
		$scope.refreshChat();
  	});
  	socket.on('room', function (data) {
		if(data.message){
			$scope.messages.push(data);
			$scope.refreshChat();
		}
  	});
  	socket.on('photo', function (data) {
		$scope.messages.push({from: "#"+ $scope.room, message: data.username + ' took a photo', time: new Date().getTime()});
		$scope.photos.push({src: data.photoUrl, tookBy: data.username, userPhoto: data.userPhoto});
		$scope.refreshChat();
  	});
  	socket.on('cancel_video', function (data) {
		//add message to chat
		$scope.stopVideo(data);
		$scope.messages.push({from: "#"+$scope.room, message: data.username + ' is a PUSSY!', time: new Date().getTime()});
		$scope.refreshChat();
  	});
  	socket.on('video_ended', function (data) {
  		$scope.stopVideo(data);
		//add message to chat
		$scope.messages.push({from: "#"+$scope.room, message: data.username + ' watched the video!', time: new Date().getTime()});
		$scope.refreshChat();
  	});

	var vid_elem_modal = $('#video_elem_modal');
	vid_elem_modal[0].onended = function(e) {
      	$scope.videoEnded();
      	$('#video_modal').modal('hide');
    };
	$('#video_modal').on('hidden.bs.modal', function () {
		$scope.video = null;
		var video = vid_elem_modal.get(0).pause();
	});
  	socket.on('roulette', function (data) {
		$scope.messages.push({from: "#"+$scope.room, message: "next victim: " + data.victim, time: new Date().getTime()});
		$scope.refreshChat();
		$scope.videoSrc = data.video;
		$scope.roulette = true;

		$scope.victimVidid = data.victim_video;

		$scope.trustVideoSrc = function(src) {
    		return $sce.trustAsResourceUrl(src);
  		}
		var victimId = getSessionId();
		if(data.victim_video == victimId){
			$scope.imVictim = true;
			$('#video_modal').modal('show');
			console.log(data.video)
			$scope.video = data.video+'?'+Math.random();

		}else{
			$scope.imVictim = false;
			$('#'+data.victim_video).addClass('selected');
			var d = $('<div class="take-photo-cont"></div>');
			var b = $('<button class="btn btn-primary btn-danger"></button>');
			d.attr('id','take_photo_'+data.victim_video);
			d.attr('data-vidid', data.victim_video);
			b.html('<span class="glyphicon glyphicon-camera"></span>');
			b.click(function(){
				$scope.captureVideoImg(data.victim_video, data.victim);
			});
			d.append(b);
			$('#'+data.victim_video).after(d);
		}
  	});
  	var webrtc = new SimpleWebRTC({
	  	localVideoEl: 'localVideo',
	  	// the id/element dom element that will hold remote videos
	  	remoteVideosEl: 'remotesVideos',
	  	autoRequestMedia: true
	});
	//webrtc.startLocalVideo();
	webrtc.on('readyToCall', function () {
		$scope.acceptedCamReq = true;
	  	webrtc.joinRoom(prefix_webrtc + $scope.room);
	  	$scope.joinRoom(getSessionId());
	});

	function getSessionId() {
		return webrtc.connection.connection.socket.sessionid+'_video_incoming';
	}
})

.controller('MessageController', function($scope){
	$scope.form = {};
	$scope.form.submitTheForm = function(){
		$scope.sendMessage($scope.form.message);
		$scope.form.message = '';
	}
});
