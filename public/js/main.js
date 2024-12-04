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


    $(document).ready(function(){
        $('.loader').click(function(){
            console.log("Đã click vào tên bạn");
            var userId = $(this).attr('data-id');
            receiver_id = userId;

            var userName = $(this).find('.name').text();  // Lấy tên người
        var userImage = $(this).find('.albumcover img').attr('src');  // Lấy đường dẫn hình ảnh

        // Cập nhật tên và ảnh trong khu vực chat
        console.log("Cập nhật tên:", userName);
        console.log("Cập nhật ảnh:", userImage);

        $('#chat-name').text(userName);  // Cập nhật tên người
        $('#chat-avatar').attr('src', userImage);  // Cập nhật ảnh

            socket.emit('existsChat',{
                sender_id:sender_id,
                receiver_id:receiver_id
            });
        });
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

    $('#chat-form').submit(function(event){
        event.preventDefault();

        var message = $('#message').val();

        $.ajax({
            url:'/save-chat',
            type: 'POST',
            data:{sender_id:sender_id, receiver_id:receiver_id,message:message},
            success:function(response){
                if(response.success){
                    console.log(response);
                    $('#message').val('');
                    let chat = response.data.message;
                    let html = `
                        <div class="message-box right">
                            <p>${chat}</p>
                        </div>                    
                    `;
                    $('#chat-container').append(html);
                    socket.emit('newChat',response.data);

                    scrollChat();
                }else{
                    alert(response.mgs);
                
                }
            }
        });
    });

    socket.on('loadNewChat',function(data){
        if(sender_id == data.receiver_id  && receiver_id ==data.sender_id){
            let html =`
            <div class="message-box left">
                <p>${data.message}</p>
            </div>
        `;
        $('#chat-container').append(html);
        }
        scrollChat();
        
    });

    //load old chats
    socket.on('loadChats',function(data){
        $('#chat-container').html('');

        var chats = data.chats;
        let html ='';

        for(let x = 0; x < chats.length;x++){
            let addClass ='';
            if(chats[x]['sender_id'] == sender_id){
                addClass='message-box right';
            }
            else{
                addClass = 'message-box left';
            }

            html +=`
                <div class='${addClass}'>
                            <p>${chats[x]['message']}</p>
                        </div>  
            `;
        }
        $('#chat-container').append(html);

        scrollChat();
    });

    function scrollChat(){
        $('#chat-container').animate({
            scrollTop: $('#chat-container').offset().top + $('#chat-container')[0].scrollHeight
        },0);
    }