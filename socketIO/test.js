module.exports = function (server) {
    const io = require('socket.io')(server)

    //  监视客户端和服务器的链接
    io.on('connection', function(socket){
        console.log('链接成功')

        socket.on('sendMsg', function(data){
            console.log(data)
            data.name = data.name.toUpperCase();
            socket.emit('receiveMsg', data)
        })

    })
}