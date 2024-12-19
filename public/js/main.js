//---------------Start Dynamic Chat App Script---------------

// function getCookie(name){
//     let matches = document.cookie.match(new RegExp(
//         "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')+"=([^;]*)"
//     ));
//     return matches ? decodeURIComponent(matches[1]) : undefined;
// }

function getCookie(name) {
    let matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1')+"=([^;]*)"
    ));
    if (matches) {
        console.log(`Cookie "${name}" found: ${decodeURIComponent(matches[1])}`);
        return decodeURIComponent(matches[1]);
    } else {
        console.log(`Cookie "${name}" not found.`);
        return undefined;
    }
}

var userData = JSON.parse(getCookie('user'));
var receiver_id;
var sender_id = userData._id;
var socket = io('/user-namespace',{
    auth:{
        token: userData._id
    }
});
var incomingCallData = null;
const ringtone = new Audio('/sounds/ringtone.mp3');

function stopRingtone() {
    ringtone.pause();
    ringtone.currentTime = 0;
}

$(document).ready(function(){
    $('.loader').click(function(){
        console.log("Đã click vào tên bạn");
        var userId = $(this).attr('data-id');
        receiver_id = userId;

        var userName = $(this).find('.name').text();
        var userImage = $(this).find('.albumcover img').attr('src');

        console.log("Cập nhật tên:", userName);
        console.log("Cập nhật ảnh:", userImage);

        $('#chat-name').text(userName);
        $('#chat-avatar').attr('src', userImage);

        socket.emit('existsChat',{
            sender_id:sender_id,
            receiver_id:receiver_id
        });
    });

    // Xử lý nút gọi video
    $('#video-icon').on('click', function() {
        if (!receiver_id) {
            alert('Vui lòng chọn người để gọi video!');
            return;
        }

        let receiverStatus = $('#' + receiver_id + '-status').text();
        if (receiverStatus === 'Offline') {
            alert('Người dùng này hiện không online!');
            return;
        }

        console.log('Gửi yêu cầu gọi video đến:', receiver_id);
        console.log('Thông tin người gọi:', {
            id: userData._id,
            name: userData.name
        });
        
        socket.emit('makeVideoCall', {
            caller: {
                id: userData._id,
                name: userData.name
            },
            receiver: receiver_id
        });
        
        alert('Đang đợi người dùng trả lời...');
    });

    // Lắng nghe sự kiện cuộc gọi đến - Di chuyển ra ngoài document.ready
    socket.on('incomingCall', function(data) {
        console.log('Nhận được cuộc gọi đến:', data);
        
        incomingCallData = data;
        
        const modal = document.getElementById('callModal');
        const modalText = document.getElementById('callModalText');
        modalText.textContent = `Bạn có cuộc gọi video đến từ ${data.caller.name}`;
        modal.style.display = 'block';
        
        // Phát âm thanh
        ringtone.loop = true;
        ringtone.play();
    });

    // Lắng nghe sự kiện cuộc gọi được chấp nhận
    socket.on('callAccepted', function(data) {
        console.log('Cuộc gọi được chấp nhận:', data);
        window.location.href = '/video-call/' + data.receiver;
    });

    // Xử lý nút trả lời
    $(document).on('click', '#acceptCall', function() {
        console.log('Nút trả lời được click');
        if (incomingCallData) {
            stopRingtone();
            socket.emit('acceptCall', {
                caller: incomingCallData.caller.id,
                receiver: userData._id
            });
            $('#callModal').hide();
            console.log('Chuyển hướng đến:', '/video-call/' + incomingCallData.caller.id);
            window.location.href = '/video-call/' + incomingCallData.caller.id;
        }
    });

    // Xử lý nút từ chối
    $(document).on('click', '#rejectCall', function() {
        console.log('Nút từ chối được click');
        if (incomingCallData) {
            stopRingtone();
            socket.emit('rejectCall', {
                caller: incomingCallData.caller.id,
                receiver: userData._id
            });
            $('#callModal').hide();
            incomingCallData = null;
        }
    });

    // Đóng modal khi click ra ngoài
    $(window).on('click', function(event) {
        const modal = document.getElementById('callModal');
        if (event.target == modal) {
            stopRingtone();
            if (incomingCallData) {
                socket.emit('rejectCall', {
                    caller: incomingCallData.caller.id,
                    receiver: userData._id
                });
                $('#callModal').hide();
                incomingCallData = null;
            }
        }
    });

    // Xử lý gửi tin nhắn
    $('#chat-form form').on('submit', function(e){
        e.preventDefault();
        
        var message = $('#message').val();
        if(!message || !receiver_id) return;

        console.log('Gửi tin nhắn:', message);
        console.log('Đến:', receiver_id);
        
        $.ajax({
            url:'/save-chat',
            type:'POST',
            data:{
                sender_id: sender_id,
                receiver_id: receiver_id,
                message: message
            },
            success: function(response){
                if(response.success){
                    console.log('Tin nhắn đã được lưu');
                    $('#message').val('');
                    
                    let messageHtml = `
                        <div class="message sent">
                            <div class="message-content">
                                <p>${message}</p>
                                <span class="time">${new Date().toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}</span>
                            </div>
                        </div>
                    `;
                    $('#chat-container').append(messageHtml);
                    
                    var chatContainer = document.getElementById('chat-container');
                    if(chatContainer) {
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                    }

                    socket.emit('newChat', {
                        sender_id: sender_id,
                        receiver_id: receiver_id,
                        message: message
                    });
                }
            }
        });
    });
});

// Socket event listeners
socket.on('loadNewChat', function(data){
    console.log('Nhận tin nhắn mới:', data);
    if(data.sender_id === receiver_id){
        let messageHtml;
        
        if(data.isCallHistory) {
            // Hiển thị tin nhắn lịch sử cuộc gọi
            messageHtml = `
                <div class="message call-history">
                    <div class="message-content">
                        <p><i class="fas fa-video"></i> ${data.message}</p>
                        <span class="time">${new Date().toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>
            `;
        } else {
            // Hiển thị tin nhắn thông thường
            messageHtml = `
                <div class="message received">
                    <div class="message-content">
                        <p>${data.message}</p>
                        <span class="time">${new Date().toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>
            `;
        }
        
        $('#chat-container').append(messageHtml);
        
        var chatContainer = document.getElementById('chat-container');
        if(chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
});

socket.on('loadChats', function(data){
    console.log('Nhận được tin nhắn cũ:', data);
    
    $('#chat-container').empty();
    
    if(data.chats && data.chats.length > 0){
        data.chats.forEach(function(chat){
            let messageHtml = `
                <div class="message ${chat.sender_id === sender_id ? 'sent' : 'received'}">
                    <div class="message-content">
                        <p>${chat.message}</p>
                        <span class="time">${new Date(chat.createdAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>
            `;
            $('#chat-container').append(messageHtml);
        });
        
        var chatContainer = document.getElementById('chat-container');
        if(chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
});

//update user online status
socket.on('getOnlineUser', function(data){
    $('#'+data.user_id+'-status').text('Online');
    $('#'+data.user_id+'-status').removeClass('artist-offline');
    $('#'+data.user_id+'-status').addClass('artist-online');
});

socket.on('getOfflineUser', function(data){
    $('#'+data.user_id+'-status').text('Offline');
    $('#'+data.user_id+'-status').addClass('artist-offline');
    $('#'+data.user_id+'-status').removeClass('artist-online');
    
});
