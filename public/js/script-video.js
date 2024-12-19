const videoSocket = io('/user-namespace', {
    auth: {
        token: senderId
    }
});

let localStream;
let peerConnection;
let isInitiator = false;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Thêm biến để theo dõi thời gian cuộc gọi
let callStartTime;
let callDuration;

async function initializeCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        
        const localVideo = document.getElementById('localVideo');
        localVideo.srcObject = localStream;
        
        console.log('Đã khởi tạo local stream');

        createPeerConnection();

        // Xác định người gọi
        isInitiator = senderId === document.querySelector('[data-caller-id]')?.dataset.callerId;
        
        if (isInitiator) {
            console.log('Tạo offer vì là người gọi');
            createOffer();
        }

        // Bắt đầu đếm thời gian khi khởi tạo cuộc gọi
        callStartTime = new Date();
        
    } catch (error) {
        console.error('Lỗi khởi tạo call:', error);
        alert('Không thể truy cập camera hoặc microphone: ' + error.message);
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        console.log('Nhận được remote stream');
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
        }
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Gửi ICE candidate');
            videoSocket.emit('ice-candidate', {
                candidate: event.candidate,
                to: receiverId
            });
        }
    };
}

async function createOffer() {
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        videoSocket.emit('video-offer', {
            offer: offer,
            to: receiverId
        });
    } catch (error) {
        console.error('Lỗi tạo offer:', error);
    }
}

videoSocket.on('video-offer', async (data) => {
    try {
        if (!peerConnection) {
            createPeerConnection();
        }
        
        console.log('Nhận được offer');
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        videoSocket.emit('video-answer', {
            answer: answer,
            to: data.from
        });
    } catch (error) {
        console.error('Lỗi xử lý offer:', error);
    }
});

videoSocket.on('video-answer', async (data) => {
    try {
        console.log('Nhận được answer');
        const desc = new RTCSessionDescription(data.answer);
        await peerConnection.setRemoteDescription(desc);
    } catch (error) {
        console.error('Lỗi xử lý answer:', error);
    }
});

videoSocket.on('ice-candidate', async (data) => {
    try {
        if (peerConnection) {
            console.log('Nhận được ICE candidate');
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    } catch (error) {
        console.error('Lỗi thêm ICE candidate:', error);
    }
});

// Khởi tạo cuộc gọi khi trang được load
initializeCall();

// Xử lý các nút điều khiển - chỉ điều khiển local stream
document.getElementById('toggleMic').addEventListener('click', () => {
    const audioTrack = localStream.getAudioTracks()[0];
    audioTrack.enabled = !audioTrack.enabled;
    document.getElementById('toggleMic').textContent = 
        audioTrack.enabled ? 'Tắt Mic' : 'Bật Mic';
});

document.getElementById('toggleVideo').addEventListener('click', () => {
    const videoTrack = localStream.getVideoTracks()[0];
    videoTrack.enabled = !videoTrack.enabled;
    document.getElementById('toggleVideo').textContent = 
        videoTrack.enabled ? 'Tắt Camera' : 'Bật Camera';
});

// Chỉ giữ lại phần xử lý kết thúc cuộc gọi
document.getElementById('endCall').addEventListener('click', () => {
    callDuration = calculateCallDuration();
    
    videoSocket.emit('end-call', {
        to: receiverId,
        duration: callDuration
    });
    
    endCall();
});

function calculateCallDuration() {
    const endTime = new Date();
    const duration = endTime - callStartTime; // Thời gian tính bằng milliseconds
    
    // Chuyển đổi thành định dạng phút:giây
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

videoSocket.on('call-ended', () => {
    alert('Người kia đã kết thúc cuộc gọi');
    endCall();
});

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }

    // Gửi tin nhắn thông báo về thời gian cuộc gọi
    socket.emit('newChat', {
        sender_id: senderId,
        receiver_id: receiverId,
        message: `Cuộc gọi video kết thúc (${callDuration})`,
        isCallHistory: true
    });

    window.location.href = '/dashboard';
}