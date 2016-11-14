'use strict';

const msgcontent = require('./msgcontent');
const client = require('../libs/httpclient');
const tuling = require('./tuling');

/**
 * @type {Object}
 * 储存所有好友信息，昵称与uin
 */
let allFriends = {
    uin: new Map(),
    nick: new Map(),
    account: new Map()
}

function hashU(x, K) {
    let N, T, U, V;
    x += "";
    for (N = [], T = 0; T < K.length; T++) N[T % 4] ^= K.charCodeAt(T);
    U = ["EC", "OK"];
    V = [];
    V[0] = x >> 24 & 255 ^ U[0].charCodeAt(0);
    V[1] = x >> 16 & 255 ^ U[0].charCodeAt(1);
    V[2] = x >> 8 & 255 ^ U[1].charCodeAt(0);
    V[3] = x & 255 ^ U[1].charCodeAt(1);
    U = [];
    for (T = 0; T < 8; T++) U[T] = T % 2 == 0 ? N[T >> 1] : V[T >> 1];
    N = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
    V = "";
    for (T = 0; T < U.length; T++) {
        V += N[U[T] >> 4 & 15];
        V += N[U[T] & 15]
    }
    return V;
};


/**
 * 获取所有好友昵称和uin
 * 
 * @param {any} callback
 */
function getAllFriends(callback) {
    let params = {
        r: JSON.stringify({
            vfwebqq: global.auth_options.vfwebqq,
            hash: hashU(global.auth_options.uin, global.auth_options.ptwebqq)
        })
    };

    client.post({ url: 'http://s.web2.qq.com/api/get_user_friends2' },
        params,
        response => {
            response.result.info.forEach(e => {
                allFriends.uin.set(e.nick, e.uin);
                allFriends.nick.set(e.uin, e.nick);
            });
            callback && callback(allFriends);
        }
    );
}

/**
 * 根据好友uin获取nick
 * 
 * @param {any} uin
 * @param {any} callback
 * @returns
 */
function getFriendNick(uin, callback) {
    let nick = allFriends.nick.get(uin)
    if (callback) return callback(nick);
    else return nick;
}

/**
 * 根据好友nick获取uin
 * 
 * @param {any} nick
 * @param {any} callback
 * @returns
 */
function getFriendUin(nick, callback) {
    let uin = allFriends.uin.get(nick)
    if (callback) return callback(uin);
    else return uin;
}

/**
 * 根据好友uin获取QQ号
 * 
 * @param {number} uin
 * @param {function} callback
 */
function getFriendAccount(uin, callback) {
    let account = allFriends.account.get(uin);
    if (account) return callback && callback(account);
    let options = {
        method: 'GET',
        protocol: 'http:',
        host: 's.web2.qq.com',
        path: '/api/get_friend_uin2?tuin=' + uin + '&type=1&vfwebqq=' + global.auth_options.vfwebqq + '&t=' + Date.now(),
        headers: {
            'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
            'Cookie': client.get_cookies_string()
        }
    };

    client.url_get(options, (err, res, data) => {
        if (data.account) {
            allFriends.account.set(uin, data.account);
            callback && callback(data.uin);
        } else { callback && callback(data); }
    });
}

/**
 * 向指定uin的好友发送消息
 * 
 * @param {number} uin
 * @param {string} msg
 * @param {function} callback
 */
function sendMsg(uin, msg, callback) {
    let params = {
        r: JSON.stringify({
            to: uin,
            face: 522,
            content: msgcontent.bulid(msg),
            clientid: global.clientid,
            msg_id: client.nextMsgId(),
            psessionid: global.auth_options.psessionid
        })
    };

    client.post({ url: 'http://d1.web2.qq.com/channel/send_buddy_msg2' },
        params,
        response => callback && callback(response)
    );
};

/**
 * 使用图灵机器人API处理消息
 * 
 * @param {Object} msg 消息对象/poll返回对象
 * @param {any} callback
 */
function Handle(item, callback) {
    getFriendAccount(item.from_uin);
    tuling.getMsg(item.content[1], str => {
        sendMsg(item.from_uin, str, callback);
    });
}

module.exports = {
    getAll: getAllFriends,
    getUin: getFriendUin,
    getNick: getFriendNick,
    getAccount: getFriendAccount,
    handle: Handle
}