/* 包含 N 个操作数据库集合数据的model模块 */

const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/gzhipin")

const conn = mongoose.connection

conn.on("connected", () => {
    console.log("db connect success")
})
const userSchema = mongoose.Schema({
    username:{type:String, required:true}, // 用户名
    password:{type:String, required: true}, // 密码
    type: {type: String, required:true}, // 用户类型
    header:{type:String},   // 头像名称
    post:{type:String},     // 职位
    info:{type:String},   // 个人或职位简介
    company:{type:String}, // 公司名称
    salary:{type:String}  // 工资
 }) 

 // 用户模块
 const UserModel = mongoose.model('user', userSchema)

 // 消息模块
const chatSchema = mongoose.Schema({
    from: { type: String, required: true }, // 发送用户的id
    to: { type: String, required: true },  //接收用户的id
    chat_id: { type: String, required: true }, // from 和 to组成的字符串
    content: { type: String, required: true }, // 内容
    read: { type: Boolean, required: false }, // 未读 / 已读
    create_time:{type: Number } // 消息时间
})

const ChatModel = mongoose.model('chat', chatSchema) // 集合为:chats

exports.ChatModel = ChatModel

exports.UserModel = UserModel;