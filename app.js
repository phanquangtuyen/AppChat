
//thiết lập và chạy server Node.js kết nối đến dữ liệu MongoDB 
require('dotenv').config();

var mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/chat-app');

const app = require('express')();

const http = require('http').Server(app);

const userRoute = require('./routes/userRoute');

const User = require('./models/userModel');

app.use('/',userRoute);

const io = require('socket.io')(http);
// Server sẽ lắng nghe các kết nối đến từ client trong namespace /user-namespace.
// Khi một client kết nối thành công vào namespace này, server sẽ in thông báo User Connected.
// Khi client ngắt kết nối, server sẽ in thông báo User Disconnected.
var usp = io.of('/user-namespace');

usp.on('connection',async function(socket){
    console.log('User Connected');

    var userId = socket.handshake.auth.token;

    await   User.findByIdAndUpdate({_id: userId}, {$set:{is_online:'1'}});


    //user broachcast online status 

    socket.broadcast.emit('getOnlineUser',{ user_id: userId});

    socket.on('disconnect', async function(){
        console.log('user Disconnected');

        var userId = socket.handshake.auth.token;

        await User.findByIdAndUpdate({_id: userId}, {$set:{is_online:'0'}});

        //user broachcast offline status 
        socket.broadcast.emit('getOfflineUser',{ user_id:userId});
    });

    //chatting imlementation 
        socket.on('newChat',function(data){
            socket.broadcast.emit('loadNewChat', data);
        });
});



http.listen(3000,function(){
    console.log('Server is runnig');
});