const videoSocket = (io) => {
    const videoNamespace = io.of('/video-namespace');

    videoNamespace.on('connection', (socket) => {
        const userId = socket.handshake.auth.token;
        
        socket.join(userId);

        // Xử lý video offer
        socket.on('video-offer', (data) => {
            socket.to(data.to).emit('video-offer', {
                offer: data.offer,
                from: userId
            });
        });

        // Xử lý video answer
        socket.on('video-answer', (data) => {
            socket.to(data.to).emit('video-answer', {
                answer: data.answer,
                from: userId
            });
        });

        // Xử lý ICE candidate
        socket.on('ice-candidate', (data) => {
            socket.to(data.to).emit('ice-candidate', {
                candidate: data.candidate,
                from: userId
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected from video call');
        });
    });
};

module.exports = videoSocket;