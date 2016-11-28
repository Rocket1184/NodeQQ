const fs = require('fs');
const url = require('url');
const path = require('path');
const http = require('http');

const QQ = require('./src/QQ');
const ContentType = require('./libs/contentType');
const serverPort = process.env.PORT || 8080;
const regexs = {
    extName: /\.(\w+)$/
};

let qq = new QQ();
let root = path.resolve('.');
let server = http.createServer((request, response) => {
    let pathName = url.parse(request.url).pathname;
    let filePath = path.join(root, pathName);
    if (request.method === 'GET') {
        // try to find and read local file
        fs.stat(filePath, (err, stats) => {
            // no error occured, read file
            if (!err && stats.isFile()) {
                let extName;
                try {
                    extName = regexs.extName.exec(pathName)[1];
                } catch (e) {}
                response.writeHead(200, { 'content-Type': ContentType.get(extName) });
                fs.createReadStream(filePath).pipe(response);
                // cannot find file, but received index request
            } else {
                response.writeHead(200, { 'content-Type': 'text/html' });
                response.end('Nothing Here :(');
            }
        });
    }
});

server.listen(serverPort);

qq.Login();