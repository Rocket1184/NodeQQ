'use strict';

const fs = require('fs');
const Log = require('log');
const log = new Log('debug');
const client = require('../libs/httpclient');

let ptwebqq,
    vfwebqq;

function sleep(milliSeconds) {
    let startTime = new Date().getTime();
    while (new Date().getTime() < startTime + milliSeconds);
}

function Login(callback) {
    //获取二维码
    let url = "https://ssl.ptlogin2.qq.com/ptqrshow?appid=501004106&e=0&l=M&s=5&d=72&v=4&t=" + Math.random();
    client.url_get(url, function (err, res, data) {
        fs.writeFile('./code.png', data, 'binary', function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("down success");
                require('child_process').exec('open ./code.png');
                waitingScan(callback);
            }
        });
    }, function (res) {
        res.setEncoding('binary');
    });
};

function _Login(cookie, callback) {
    log.info('自动登录...');
    ptwebqq = cookie.match(/ptwebqq=(.+?);/)[1];

    client.set_cookies(cookie);

    getVfwebqq(ptwebqq, function (ret) {
        if (ret.retcode === 0) vfwebqq = ret.result.vfwebqq;
        loginToken(ptwebqq, null, function (ret) {
            if (ret.retcode === 0) {
                // 重新获取二维码登录
                if (!ret.result) {
                    require('child_process').exec('rm -rf cookie.data')
                    Login();
                    return;
                }

                log.info('登录成功');

                global.auth_options = {
                    clientid: global.clientid,
                    ptwebqq: ptwebqq,
                    vfwebqq: vfwebqq,
                    uin: ret.result.uin,
                    psessionid: ret.result.psessionid
                }

                callback && callback();
            } else {
                log.info("登录失败");
                return log.error(ret);
            }
        });
    });
}

function checkVcode(cb) {
    let options = {
        protocol: 'https:',
        host: 'ssl.ptlogin2.qq.com',
        path: '/ptqrlogin?webqq_type=10&remember_uin=1&login2qq=1&aid=' + global.appid + '&u1=http%3A%2F%2Fw.qq.com%2Fproxy.html%3Flogin2qq%3D1%26webqq_type%3D10&ptredirect=0&ptlang=2052&daid=164&from_ui=1&pttype=1&dumy=&fp=loginerroralert&action=0-0-' + (Math.random() * 900000 + 1000000) + '&mibao_css=m_webqq&t=undefined&g=1&js_type=0&js_ver=10141&login_sig=&pt_randsalt=0',
        headers: {
            'Cookie': client.get_cookies_string(),
            'Referer': 'https://ui.ptlogin2.qq.com/cgi-bin/login?daid=164&target=self&style=16&mibao_css=m_webqq&appid=501004106&enable_qlogin=0&no_verifyimg=1&s_url=http%3A%2F%2Fw.qq.com/proxy.html&f_url=loginerroralert&strong_login=1&login_state=10&t=20130723001&f_qr=0'
        }
    };

    client.url_get(options, function (err, res, data) {
        let ret = data.match(/\'(.*?)\'/g).map(function (i) {
            let last = i.length - 2;
            return i.substr(1, last);
        });
        cb(ret);
    });
};

function waitingScan(callback) {
    log.info("登录 step1: 等待二维码校验结果.");

    checkVcode(function (ret) {
        let retCode = parseInt(ret[0]);
        if (retCode === 0 && ret[2].match(/^http/)) {
            log.info("setp1: 二维码扫描成功.");
            require('child_process').exec('rm -rf ./code.png');
            log.info("登录 step2: cookie 获取 ptwebqq");

            getPtwebqq(ret[2], callback);
        } else if (retCode === 66 || retCode === 67) {
            sleep(1000);
            waitingScan(callback);
        } else {
            log.error("二维码扫描登录失败.", ret);
            return;
        }
    });
};

function getPtwebqq(url, callback) {
    client.url_get(url, function (err, res, data) {
        if (!err) {
            log.info('获取cookie & ptwebqq成功.');
            ptwebqq = client.get_cookies().filter(function (item) {
                return item.match(/ptwebqq/);
            }).pop().replace(/ptwebqq\=(.*?);.*/, '$1');

            getVfwebqq(ptwebqq, function (ret) {
                if (ret.retcode === 0) {
                    vfwebqq = ret.result.vfwebqq;
                    log.info("获取vfwebqq成功.");
                }

                log.info("登录 step4: 获取 uin, psessionid");

                loginToken(ptwebqq, null, function (ret) {
                    if (ret.retcode === 0) {
                        fs.writeFile('./cookie.data', client.get_cookies());

                        log.info('登录成功');

                        global.auth_options = {
                            clientid: global.clientid,
                            ptwebqq: ptwebqq,
                            vfwebqq: vfwebqq,
                            uin: ret.result.uin,
                            psessionid: ret.result.psessionid
                        };
                        callback();
                    } else {
                        log.info("登录失败");
                        return log.error(ret);
                    }
                });
            });
        }
    });
};

function getVfwebqq(ptwebqq, cb) {
    log.info('登录 step3: 获取vfwebqq');

    let options = {
        method: 'GET',
        protocol: 'http:',
        host: 's.web2.qq.com',
        path: '/api/getvfwebqq?ptwebqq=' + ptwebqq + '&clientid=' + global.clientid + '&psessionid=&t=' + Math.random(),
        headers: {
            'Cookie': client.get_cookies_string(),
            'Origin': 'http://s.web2.qq.com',
            'Referer': 'http://s.web2.qq.com/proxy.html?v=20130916001&callback=1&id=1',
        }
    };
    client.url_get(options, function (err, res, data) {
        let ret;
        try {
            ret = JSON.parse(data);
        } catch (err) {
            getVfwebqq(ptwebqq, cb);
            return;
        }
        cb(ret);
    });
}

function loginToken(ptwebqq, psessionid, cb) {
    if (!psessionid) psessionid = null;
    let form = {
        r: JSON.stringify({
            ptwebqq: ptwebqq,
            clientid: global.clientid,
            psessionid: psessionid || "",
            status: "online"
        })
    };
    client.url_post({
        protocol: 'http:',
        host: 'd1.web2.qq.com',
        path: '/channel/login2',
        method: 'POST',
        headers: {
            'Origin': 'http://d1.web2.qq.com',
            'Referer': 'http://d1.web2.qq.com/proxy.html?v=20151105001&callback=1&id=2',
        }
    }, form, function (err, res, data) {
        let ret;
        try {
            ret = JSON.parse(data);
        } catch (err) {
            loginToken(ptwebqq, psessionid, cb);
            return;
        }
        cb(ret);
    });
};

module.exports = {
    Login: Login,
    _Login: _Login,
    getPtwebqq: getPtwebqq,
    getVfwebqq: getVfwebqq,
    loginToken: loginToken
}