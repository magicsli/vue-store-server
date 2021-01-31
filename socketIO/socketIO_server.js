const { ChatModel } = require("../db/models");

// 链接映射表
const linkMap = {};

module.exports = function (server) {
  const io = require("socket.io")(server, {
    cors: {
      origin: "http://localhost:5200",
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"],
      credentials: true,
    },
  });
  //  监视客户端和服务器的链接
  io.on("connection", function (socket) {
    // console.log(socket.client);

    // socket.on("sendMsg", function({})
    
    socket.on("bindUserSocket", function ({_id}) {
      linkMap[_id] = socket.id
    });

    // 绑定监听, 监听客户端发过来的消息
    socket.on("sendMsg", function ({ from, to, content }) {
      // 保存消息
      const chat_id = [from, to].sort().join("_"),
        create_time = Date.now();
      new ChatModel({
        from,
        to,
        content,
        chat_id,
        create_time,
        read: false,
      }).save(function (err, chatMsg) {

        // 保存数据后, 要向对象发送
        io.to(linkMap[from]).emit("receiveMsg", err || chatMsg);
        io.to(linkMap[to]).emit("receiveMsg", err || chatMsg);
      });
    });

  });
};
