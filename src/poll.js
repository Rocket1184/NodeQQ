'use strict';

const async = require('async');
const Log = require('log');
const log = new Log('debug');
const _ = require('lodash');
const client = require('../libs/httpclient');
const login = require('./login');
const group = require('./group');
const buddy = require('./buddy');
const discuss = require('./discuss');
const info = require('./info');

let toPoll = false;

function onPoll(aaa, cb) {
    let params = {
        r: JSON.stringify({
            ptwebqq: global.auth_options.ptwebqq,
            clientid: global.auth_options.clientid,
            psessionid: global.auth_options.psessionid,
            key: ""
        })
    };
    client.post({
        url: "http://d1.web2.qq.com/channel/poll2",
        timeout: 65000
    }, params, ret => cb(ret));
};

function stopPoll() {
    toPoll = false;
};

function startPoll() {
    toPoll = true;
    log.info('polling...');
    if (!global.auth_options.nickname) {
        info.getSelfInfo(() => loopPoll(global.auth_options))
    } else {
        loopPoll(global.auth_options);
    }
};

function onDisconnect() {
    log.info(`Disconnect.`);
    // fixme: 需要重新登录
    stopPoll();
    login._Login(client.get_cookies_string(), () => startPoll());
}

function loopPoll(auth_options) {
    if (!toPoll) return;
    onPoll(auth_options, (e) => {
        _onPoll(e);
        loopPoll();
    })
};

function _onPoll(ret) {
    if (!ret) return;
    if (typeof ret === 'string') return;
    if (ret.retcode === 102) return;
    if (ret.retcode === 103) {
        log.info('请先登录一下WebQQ!');
        toPoll = false;
        return;
    }
    if (ret.retcode != 0) {
        return onDisconnect();
    }
    if (!Array.isArray(ret.result)) return;

    ret.result = ret.result.sort((a, b) => a.value.time - b.value.time);

    async.eachSeries(ret.result, (item, next) => {
        _.extend(item, item.value);
        delete item.value;

        if (['input_notify', 'buddies_status_change', 'system_message'].indexOf(item.poll_type) > -1) {
            return next();
        }

        async.waterfall([
            next => {
                console.log(`[New Message]: ${JSON.stringify(item)}`);
                switch (item.poll_type) {
                    case 'group_message':
                        group.handle(item);
                        break;
                    case 'discu_message':
                        discuss.handle(item);
                        break;
                    case 'message':
                        buddy.handle(item);
                    default:
                        break;
                }
                next();
            }
        ]);
    });
    return;
};

module.exports = {
    onPoll: onPoll,
    stopPoll: stopPoll,
    startPoll: startPoll,
    onDisconnect: onDisconnect,
    loopPoll: loopPoll,
    _onPoll: _onPoll
}