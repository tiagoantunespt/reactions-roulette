var express = require("express");

var app = express();
var http = require('http'),
	socketio = require('socket.io'),
	fs = require("fs"),
	config = require('config');

//configs
var photosHost   = config.get('photosHost');
var videosHost   = config.get('videosHost');
var photosPath   = config.get('photos_path');

app.set('views', __dirname + '/app/views');
app.use(express.static(__dirname + '/app'));
app.engine('html', require('ejs').renderFile);

app.get('/', function(request, response) {
	response.render('index.html');
});
app.get('/room/:room_name', function(request, response){
	response.render('index.html');
})

var port = process.env.PORT || 5000;
app.listen(port, function() {
	console.log("Listening on " + port);
});

var io = require('socket.io'),
    http = require('http'),
    server = http.createServer(app),
    io = io.listen(server);

var users = [];
function delUser(id){
	var username;
	for(room in users){
		for(var j=0;j<users[room].length;j++){
			if(users[room][j].id == id){
				username = users[room][j].username;
				users[room].splice(j,1);
				return {room: room, username: username};
			}
		}
	}
	return null;
}
function getUserIdByRoom(room, id){
	for(var j=0;j<users[room].length;j++){
		if(users[room][j].id == id){
			return j;
		}
	}
	return null;
}

function getUsernames(room){
	if(!users[room]) return [];
	names = [];
	for(var j=0;j<users[room].length;j++){
		names.push(users[room][j].username);
	}
	return names;
}

function saveImgFromBase64(name, base64){
	var matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    	response = {};

  	if (matches.length !== 3) {
    	return new Error('Invalid input string');
  	}

  	response.type = matches[1];
  	response.data = new Buffer(matches[2], 'base64');
  	name = name+'_'+process.hrtime()+'.png';
  	fs.writeFile(photosPath+name, response.data, function(err) {});

  	return photosHost+name;
}

var videos = ['vid1.mp4', 'vid2.mp4'];

function getRandVideo() {
  return videosHost + videos[Math.floor(Math.random() * videos.length)]
}

io.on('connection', function (socket) {
  	socket.on('join', function(data){
  		var room = data.room;

  		socket.join(room);
  		if(!users[room]){
  			users[room] = [];
  		}
  		users[room].push({id: socket.id, username: data.username, video_id: data.video_id, watched_videos: 0});
  		//io.to(room).emit('room', data.username + ' joined');
  		console.log('new user: '+data.username);
  		console.log(users);
  		io.to(room).emit('users', {new_user: data.username, users: users[room]});
  	});

  	socket.on('disconnect', function(){
  		var del = delUser(this.id);
  		if(!del) return;

  		io.to(del.room).emit('users', {users: users[del.room], user_left: del.username});
  		console.log(del.username + ' left from room ' + del.room);
  		console.log(users)
  	});

  	socket.on('chat', function(data){
  		io.to(data.room).emit('room', data);
  	});

  	socket.on('cancel_video', function(data){
  		console.log(data.username + ' canceled video');
  		var id = getUserIdByRoom(data.room, socket.id);
  		data.victim_video = users[data.room][id].video_id;
  		io.to(data.room).emit('cancel_video', data);
  	});
  	socket.on('video_ended', function(data){
  		console.log(data.username + ' watched video');
  		var room = data.room;
  		var id = getUserIdByRoom(room, socket.id);
  		users[room][id].watched_videos = users[room][id].watched_videos + 1;
  		data.victim_video = users[room][id].video_id;
  		io.to(room).emit('video_ended', data);
  		io.to(room).emit('users', {users: users[room]});
  	});

  	socket.on('roulette', function(data){
  		console.log('roulette from room ' + data.room);
  		var rand = Math.floor(Math.random() * users[data.room].length);
  		data.victim = users[data.room][rand].username;
  		data.victim_video = users[data.room][rand].video_id;
  		data.video = getRandVideo();
  		io.to(data.room).emit('roulette', data);
  	});

  	// data = {takenby: '', username: '', photo: '', room}
  	socket.on('photo', function(data){
  		data.photoUrl = saveImgFromBase64(data.username, data.photo);
  		io.to(data.room).emit('photo', data);
  	});
});
server.listen(8080);