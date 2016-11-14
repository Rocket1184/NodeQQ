'use strict';

const client = require('../libs/httpclient');

const baseURL = 'http://www.tuling123.com/openapi/api?key='
const tulingAPIKey = '873ba8257f7835dfc537090fa4120d14';
const baseURLTail = '&info='
const tulingURL = baseURL + tulingAPIKey + baseURLTail;

function get(str, callback) {
    client.url_get(tulingURL + encodeURI(str), (err, res, info) => {
        callback && callback(JSON.parse(info).text);
    });
}

module.exports = {
    getMsg: get
}