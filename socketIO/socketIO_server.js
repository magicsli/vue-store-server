const {ChatModel} = require('../db/models')

module.exports = function (server) {
    const io = require('socket.io')(server)

    //  监视客户端和服务器的链接
    io.on('connection', function (socket) {
        console.log('链接成功')

        // 绑定监听, 监听客户端发过来的消息
        socket.on('sendMsg', function ({from, to, content}) {
            
            // 保存消息
            const chat_id = [from, to].sort().join('_'),
            create_time = Date.now();    
            new ChatModel({from, to, content, chat_id, create_time, read:false}).save(function(err, chatMsg){
                // 保存数据后, 要向对象发送
     
                io.emit('receiveMsg', chatMsg)
            })
        })
  
    })
}