'use strict';

const msgcontent = require('./msgcontent');
const client = require('../libs/httpclient');
const tuling = require('./tuling');

/**
 * @type {Object}
 * 
 * @member {Map} detail
 * @member {Map} name
 * @member {Map} uin
 * 储存所有群组信息
 */
let allGroups = {
    detail: new Map(),
    name: new Map(),
    uin: new Map()
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
 * 向指定uin的群组发送消息
 * 
 * @param {number} uin group uin
 * @param {string} msg msg string
 * @param {function} cb callback(httpPOSTReturn)
 */
function sendMsg(uin, msg, cb) {
    let params = {
        r: JSON.stringify({
            group_uin: uin,
            content: msgcontent.bulid(msg),
            clientid: global.clientid,
            msg_id: client.nextMsgId(),
            psessionid: global.auth_options.psessionid
        })
    };

    client.post({
        url: 'http://d1.web2.qq.com/channel/send_qun_msg2'
    }, params, function (ret) {
        cb && cb(ret);
    });
};

/**
 * 获取当前QQ号所有群，名称及临时 gid !pass
 * 
 * @param {function} callback callback(mapAllGroups)
 */
function getAllGroups(callback) {
    let params = {
        r: JSON.stringify({
            vfwebqq: global.auth_options.vfwebqq,
            hash: hashU(global.auth_options.uin, global.auth_options.ptwebqq)
        })
    };

    client.post({ url: 'http://s.web2.qq.com/api/get_group_name_list_mask2' },
        params,
        response => {
            if(response.retcode != 0) return getAllGroups(callback);
            response.result.gnamelist.forEach(e => {
                allGroups.uin.set(e.name, e.gid);
                allGroups.name.set(e.gid, e.name);
            });
            callback && callback(allGroups);
        }
    );
};

/**
 * 根据临时 gid 获取群详细信息 pass!
 * 
 * @param {any} gid 群组gid
 * @param {function} callback
 */
function getDetail(uin, callback) {
    if (allGroups.detail.has(uin)) {
        return callback && callback(allGroups.detail.get(uin));
    }
    let gid = parseInt(uin);
    let options = {
        method: 'GET',
        protocol: 'http:',
        host: 's.web2.qq.com',
        path: '/api/get_group_info_ext2?gcode=' + gid + '&vfwebqq=' + global.auth_options.vfwebqq + '&t=' + Date.now(),
        headers: {
            'Cookie': client.get_cookies_string(),
            'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1'
        }
    };

    client.url_get(options, function (err, res, data) {
        allGroups.detail.set(uin, JSON.parse(data));
        callback && callback(allGroups.detail.get(uin));
    });
};

/**
 * 使用图灵机器人API处理消息
 * 
 * @param {Object} msg 消息对象/poll返回对象
 */
function Handle(msg) {
    let isAt = msg.content.indexOf('@' + global.auth_options.nickname);
    if (isAt >= 0) {
        let val = '';
        if (isAt == 1) {
            val = msg.content[3];
        } else { val = msg.content[1] + msg.content[4]; }

        tuling.getMsg(val.trim(), str => sendMsg(msg.group_code, str));
    }
}

/**
 * 根据群uin获取名称
 * 
 * @param {any} uin
 * @param {any} callback
 * @returns
 */
function getGroupName(uin, callback) {
    let name = allGroups.name.get(uin)
    if (callback) return callback(name);
    else return name;
}

/**
 * 根据群名称获取临时uin
 * 
 * @param {any} name
 * @param {any} callback
 * @returns
 */
function getGroupUin(name, callback) {
    let uin = allGroups.uin.get(name)
    if (callback) return callback(uin);
    else return uin;
}

module.exports = {
    handle: Handle,
    getAll: getAllGroups,
    getDetail: getDetail,
    getName: getGroupName,
    getUin: getGroupUin
}