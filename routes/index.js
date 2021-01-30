var express = require("express");
var router = express.Router();
const md5 = require("blueimp-md5");
const filter = { password: 0, __v: 0 };
const jwt = require("jsonwebtoken");
/* GET home page. */

const { UserModel, ChatModel } = require("../db/models");

const expressJwt = require("express-jwt"); //模块引入
const { json } = require("express");

const secret = "https://github.com/magicsli"; //密钥

router.use(
  expressJwt({
    secret,
    algorithms: ["HS256"],
    getToken: function (req) {
      if (
        req.headers.authorization &&
        req.headers.authorization.split(" ")[0] === "Bearer"
      ) {
        return req.headers.authorization.split(" ")[1];
      } else if (req.query && req.query.token) {
        return req.query.token;
      }
      return null;
    },
  }).unless({
    path: ["/login", "/register"], //除了这些地址，其他的URL都需要验证
  })
);

// 注册路由
router.post("/register", (req, res) => {
  //1读取请求参数
  const { username, password, type } = req.body;
  //2 处理

  if (!username) {
    res.send({ code: 1, msg: "用户名不能为空" });
    return;
  }

  if (!password) {
    res.send({ code: 1, msg: "密码不能为空" });
    return;
  }

  if (!type) {
    res.send({ code: 1, msg: "用户类型不能为空" });
    return;
  }
  // 判断用户是否存在
  UserModel.findOne({ username }, (err, user) => {
    if (user) {
      res.send({ code: 1, msg: "此用户名已存在" });
    } else {
      new UserModel({ username, password: md5(password), type }).save(
        (error, users) => {
          // res.cookie("userid", users._id, { maxAge: 1000 * 60 * 60 * 24 }); // 注册一个星期的cookie
          const token =
            "Bearer " +
            jwt.sign(Object.assign({}, users), secret, {
              expiresIn: 60 * 60 * 12, // 过期时间
            });
          // res.cookie("token", token, { maxAge: 1000 * 60 * 60 * 24 }); // 注册一个星期的cookie
          const data = { username, type }; // 响应数据中不要携带密码
          res.send({ code: 0, data, token });
        }
      );
    }
  });

  //3返回响应数据
});

// 登录路由
router.post("/login", function (req, res) {
  const { username, password } = req.body;
  // 根据userName 和 password 查询数据库
  UserModel.findOne(
    { username, password: md5(password) },
    filter,
    (err, user) => {
      if (err) res.send({ code: 1, msg: "连接出错: \n" + err });
      if (user) {
        // 3. 生成token
        const token =
          "Bearer " +
          jwt.sign(Object.assign({}, user), secret, {
            expiresIn: 60 * 60 * 12, // 过期时间
          });
        res.send({ code: 0, user, token });
      } else {
        res.send({ code: 1, msg: "用户名或密码不正确" });
      }
    }
  );
});

// 更新用户信息
router.post("/updata", function (req, res) {
  // 取到用户数据

  const userid = req.user._doc._id;
  // 没有userid说明未登录
  if (!userid) return res.send({ code: 401, msg: "登录超时" });

  // 更新数据库中的数据
  const user = req.body;
  UserModel.findByIdAndUpdate({ _id: userid }, user, function (err, olduser) {
    if (err || !olduser) {
      // res.clearCookie("userid");

      res.send({ code: 401, msg: "出现未知错误,请重新登录" });
    } else {
      const { _id, username, type } = olduser;
      const data = Object.assign({ _id, username, type }, user);
      res.send({ code: 0, data });
    }
  });
});

// 获取用户信息
router.get("/user", function (req, res) {
  const userid = req.user._doc._id;
  if (!userid) {
    return res.send({ code: 401, msg: "登录超时" });
  }

  UserModel.findOne({ _id: userid }, filter, function (error, user) {
    if (error) {
      return res.send({ code: 401, msg: "登录超时" });
    }
    // console.log(user)
    res.send({
      code: 0,
      data: {
        username: user.username,
        type: user.type,
        avatar: user.avatar,
        _id: userid,
      },
    });
  });
});

// 获取用户列表
router.get("/userlist", function (req, res) {
  const { type } = req.query;
  UserModel.find({ type }, filter, function (err, users) {
    if (err) return res.send({ code: 1, msg: "出现了未知错误" });
    res.send({ code: 0, data: users });
  });
});

// 获取消息列表
router.get("/msglist", function (req, res) {
  const userid = req.user._doc._id;
  UserModel.find(function (err, userDocs) {
    const users = {};
    userDocs.forEach((doc) => {
      users[doc._id] = {
        username: doc.username,
        header: doc.header,
        id: doc._id,
      };
    });

    ChatModel.find(
      { $or: [{ from: userid }, { to: userid }] },
      filter,
      function (err, chatMsgs) {
        // 过滤聊天列表
        const msgList = chatMsgs.reduce((countArr, item) => {
          if (!countArr.find((i) => item.chat_id === i.chat_id)) {
            return [
              {
                ...item._doc,
                opposite: users[item.from === userid ? item.to : item.from],
              },
              ...countArr,
            ];
          } else {
            // 如果此聊天记录已经存在于列表中了, 即判断哪条是最新的, 进行更新
            return countArr.map((chatItem) => {
              if (
                chatItem.chat_id === item.chat_id &&
                chatItem.create_time < item.create_time
              ) {
                return {
                  ...item._doc,
                  opposite: users[item.from === userid ? item.to : item.from],
                };
              } else {
                return chatItem;
              }
            });
          }
        }, []);

        res.send({
          code: 0,
          data: { chatMsgs: msgList, total: msgList.length },
        });
      }
    );
  });
});

// 获取针对用户的消息列表
router.post("/msgAimlist", function (req, res) {
  const userid = req.user._doc._id;
  const to = req.body.to;
  UserModel.find(function (err, userDocs) {
    const users = {};
    userDocs.forEach((doc) => {
      users[doc._id] = {
        username: doc.username,
        header: doc.header,
        id: doc._id,
      };
    });
    ChatModel.find(
      {
        $or: [
          { from: userid, to },
          { to: userid, from: to },
        ],
      },
      filter,
      function (err, chatMsgs) {
        res.send({
          code: 0,
          data: { chatMsgs, total: chatMsgs.length, opposite: users[to] },
        });
      }
    );
  });
});

// 查看消息
router.post("/readmsg", function (req, res) {
  const from = req.body.from;
  const to = req.user._doc._id;
  /*
    更新数据库中的chat数据
    参数1: 查询条件
    参数2: 更新为指定的数据对象
    参数3: 是否1次更新多条, 默认只更新一条
    参数4: 更新完成的回调函数
     */
  ChatModel.find({ from, to, read: false }, function (err, users) {
    // console.log(users, err)
  });
  ChatModel.update(
    { from, to, read: false },
    { read: true },
    { multi: true },
    function (err, doc) {
      res.send({ code: 0, data: doc.nModified });
    }
  );
});
router.use(function (err, req, res, next) {
  //当token验证失败时会抛出如下错误
  if (err.name === "UnauthorizedError") {
    // 返回错误
    res.status(401).send({ code: "401", msg: "invalid token..." });
  }
});
module.exports = router;
