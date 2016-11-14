'use strict';

const client = require('../libs/httpclient');

function getSelfInfo (callback) {
    var url = 'http://s.web2.qq.com/api/get_self_info2?t=' + Date.now();
    client.get(url, ret => {
        if (ret.retcode === 0) {
            global.auth_options.nickname = ret.result.nick;
        }
        callback && callback();
    });
}

module.exports = {
    getSelfInfo: getSelfInfo
}