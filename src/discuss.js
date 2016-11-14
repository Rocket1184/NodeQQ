'use strict';

const msgcontent = require('./msgcontent');
const client = require('../libs/httpclient');
const tuling = require('./tuling');

/**
 * @type {Object}
 * 储存所有讨论组信息
 */
let allDiscuss = {
    name: new Map(),
    did: new Map()
}

/**
 * 向指定did的讨论组发送消息
 * 
 * @param {any} did
 * @param {any} msg
 * @param {any} callback
 */
function sendMsg(did, msg, callback) {
    var params = {
        r: JSON.stringify({
            did: did,
            content: msgcontent.bulid(msg),
            face: 537,
            clientid: global.clientid,
            msg_id: client.nextMsgId(),
            psessionid: global.auth_options.psessionid
        })
    };

    client.post({ url: 'http://d1.web2.qq.com/channel/send_discu_msg2' },
        params,
        (ret) => callback && callback(ret)
    );
};

function getAllDiscuss(callback) {
    let options = {
        method: 'GET',
        protocol: 'http:',
        host: 's.web2.qq.com',
        path: '/api/get_discus_list?clientid=' + global.auth_options.clientid + '&psessionid=' + global.auth_options.psessionid + '&vfwebqq=' + global.auth_options.vfwebqq + '&t=' + Date.now(),
        headers: {
            'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
            'Cookie': client.get_cookies_string()
        }
    };

    client.url_get(options, (err, res, data) => {
        let list = JSON.parse(data);
        list.result.dnamelist.forEach(e => {
            allDiscuss.did.set(e.name, e.did);
            allDiscuss.name.set(e.did, e.name);
        });
        callback && callback(allDiscuss);
    });
}

/**
 * 获取指定did讨论组的信息
 * 
 * @param {any} did
 * @param {any} cb
 */
function getDiscussInfo(did, callback) {
    var options = {
        method: 'GET',
        protocol: 'http:',
        host: 'd1.web2.qq.com',
        path: '/channel/get_discu_info?did=' + did + '&vfwebqq=' + global.auth_options.vfwebqq + '&clientid=' + global.auth_options.clientid + '&psessionid=' + global.auth_options.psessionid + '&t=' + Date.now(),
        headers: {
            'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
            'Cookie': client.get_cookies_string()
        }
    }

    client.url_get(options, (err, res, data) => {
        console.log(res);
        callback && callback(data);
    });
};

/**
 * 用图灵机器人API响应讨论组消息
 * 
 * @param {any} msg
 */
function Handle(msg) {
    var isAt = msg.content[1].indexOf('@' + global.auth_options.nickname);
    if (isAt > -1) {
        var val = msg.content[1].replace('@' + global.auth_options.nickname, '');
        tuling.getMsg(val.trim(), str => sendMsg(msg.did, str));
    }
}

/**
 * 根据讨论组did获取名称
 * 
 * @param {any} did
 * @param {any} callback
 * @returns
 */
function getDiscussName(did, callback) {
    let name = allDiscuss.name.get(did)
    if (callback) return callback(name);
    else return name;
}

/**
 * 根据讨论组名称获取临时did
 * 
 * @param {any} name
 * @param {any} callback
 * @returns
 */
function getDiscussDid(name, callback) {
    let did = allDiscuss.did.get(name)
    if (callback) return callback(did);
    else return did;
}

module.exports = {
    handle: Handle,
    getInfo: getDiscussInfo,
    getAll: getAllDiscuss,
    getName: getDiscussName,
    getDid: getDiscussDid
}