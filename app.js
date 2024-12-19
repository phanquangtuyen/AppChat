//thiết lập và chạy server Node.js kết nối đến dữ liệu MongoDB 
require('dotenv').config();

var mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/chat-app');

const app = require('express')();

const http = require('http').Server(app);

const userRoute = require('./routes/userRoute');

const User = require('./models/userModel');

const Chat = require('./models/chatModel');

const videoSocket = require('./socket/videoSocket');


app.use('/',userRoute);

const io = require('socket.io')(http);
// Server sẽ lắng nghe các kết nối đến từ client trong namespace /user-namespace.
// Khi một client kết nối thành công vào namespace này, server sẽ in thông báo User Connected.
// Khi client ngắt kết nối, server sẽ in thông báo User Disconnected.
var usp = io.of('/user-namespace');



usp.on('connection',async function(socket){
    console.log('User Connected with ID:', socket.handshake.auth.token);
    var userId = socket.handshake.auth.token;
    
    // Lưu socket ID cho user
    socket.join(userId);
    console.log('User joined room:', userId);
    
    await User.findByIdAndUpdate({_id: userId}, {$set:{is_online:'1'}});
    socket.broadcast.emit('getOnlineUser',{ user_id: userId});

    // Xử lý cuộc gọi video
    socket.on('makeVideoCall', function(data) {
        console.log('Server nhận yêu cầu gọi video:', {
            from: data.caller,
            to: data.receiver
        });
        
        socket.to(data.receiver).emit('incomingCall', {
            caller: data.caller,
            receiver: data.receiver
        });
    });

    socket.on('acceptCall', function(data) {
        console.log('Cuộc gọi được chấp nhận:', data);
        // Gửi thông báo đến người gọi
        socket.to(data.caller).emit('callAccepted', {
            receiver: data.receiver
        });
    });

    socket.on('rejectCall', function(data) {
        console.log('Cuộc gọi bị từ chối:', data);
        socket.to(data.caller).emit('callRejected');
    });

    socket.on('disconnect', async function(){
        console.log('User Disconnected:', userId);
        await User.findByIdAndUpdate({_id: userId}, {$set:{is_online:'0'}});
        socket.broadcast.emit('getOfflineUser',{ user_id: userId});
    });

    //chatting imlementation 
        socket.on('newChat',function(data){
            console.log('Nhận tin nhắn mới:', data);
            socket.broadcast.emit('loadNewChat', data);
        });

        //load old chats
        socket.on('existsChat',async function(data){
            console.log('Load tin nhắn cũ giữa:', data.sender_id, 'và', data.receiver_id);
            var  chats = await Chat.find({ $or:[
                {sender_id:data.sender_id, receiver_id: data.receiver_id},
                {sender_id:data.receiver_id, receiver_id: data.sender_id},
            ]}).sort({createdAt: 1});

            socket.emit('loadChats',{ chats:chats});
        });

        // Xử lý cuộc gọi video
        socket.on('makeVideoCall', function(data) {
            console.log('Gửi cuộc gọi từ', data.caller.name, 'đến', data.receiver);
            
            // Gửi thông báo đến người nhận cụ thể
            socket.to(data.receiver).emit('incomingCall', {
                caller: data.caller,
                receiver: data.receiver
            });
        });

        // Xử lý từ chối cuộc gọi
        socket.on('rejectCall', function(data) {
            console.log('Cuộc gọi bị từ chối');
            socket.to(data.caller).emit('callRejected');
        });

        // Xử lý tham gia cuộc gọi
        socket.on('joinVideoCall', function(data) {
            console.log('User joined video call:', data);
            socket.to(data.caller).emit('userJoinedCall');
            socket.to(data.receiver).emit('userJoinedCall');
        });

        // Xử lý kết thúc cuộc gọi
        socket.on('endCall', function(data) {
            socket.to(data.caller).emit('callEnded');
            socket.to(data.receiver).emit('callEnded');
        });

        // Xử lý tín hiệu ICE candidates
        socket.on('ice-candidate', function(data){
            socket.broadcast.emit('ice-candidate', {
                candidate: data.candidate,
                to: data.to
            });
        });
    
        // Xử lý khi kết thúc cuộc gọi
        socket.on('endCall', function(data){
            socket.broadcast.emit('callEnded', {
                from: data.from,
                to: data.to
            });
        });

        // Xử lý cuộc gọi được chấp nhận
        socket.on('acceptCall', function(data) {
            console.log('Cuộc gọi được chấp nhận');
            socket.to(data.caller).emit('callAccepted', {
                receiver: data.receiver
            });
        });

        // Thêm vào phần xử lý socket
        socket.on('video-offer', (data) => {
            console.log('Chuyển tiếp video offer');
            socket.to(data.to).emit('video-offer', {
                offer: data.offer,
                from: socket.handshake.auth.token
            });
        });

        socket.on('video-answer', (data) => {
            console.log('Chuyển tiếp video answer');
            socket.to(data.to).emit('video-answer', {
                answer: data.answer,
                from: socket.handshake.auth.token
            });
        });

        socket.on('ice-candidate', (data) => {
            console.log('Chuyển tiếp ICE candidate');
            socket.to(data.to).emit('ice-candidate', {
                candidate: data.candidate,
                from: socket.handshake.auth.token
            });
        });

        socket.on('toggle-audio', (data) => {
            console.log('Chuyển tiếp trạng thái audio');
            socket.to(data.to).emit('toggle-audio', {
                enabled: data.enabled
            });
        });

        socket.on('toggle-video', (data) => {
            console.log('Chuyển tiếp trạng thái video');
            socket.to(data.to).emit('toggle-video', {
                enabled: data.enabled
            });
        });

        socket.on('end-call', (data) => {
            console.log('Chuyển tiếp kết thúc cuộc gọi');
            socket.to(data.to).emit('call-ended');
        });

});

videoSocket(io);




http.listen(3000,function(){
    console.log('Server is runnig');
});


