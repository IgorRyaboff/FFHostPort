const httpProxy = require('http-proxy');
const http = require('http');
const https = require('https');
const fs = require('fs');
var configPath = process.argv.slice(2).join(' ');
var config = {
    http: 81,
    https: false,
    ws: true,
    map: {
        "localhost": "http://localhost:80"
    }
};
var proxys = {};
var sproxys = {};
var proxy = httpProxy.createProxyServer();

function verifyConfig(data) {
    if (data.key) data.key = fs.readFileSync(data.key).toString();
    if (data.cert) data.cert = fs.readFileSync(data.cert).toString();
    if (data.ca) data.ca = fs.readFileSync(data.ca).toString();
    return data;
}

if (configPath) {
    try {
        config = verifyConfig(JSON.parse(fs.readFileSync(configPath).toString()));
    }
    catch (e) {
        console.log('Cannot load config file: ' + e.message);
    }
}

function processRequest(req, res, isSecure) {
    let host = req.headers.host;
    if (host.indexOf(':') != -1) host = host.substring(0, host.indexOf(':'));
    if (config.map[host]) {
        proxy.web(req, res, {
            target: config.map[host]
        });
    }
    else {
        res.writeHead(500);
        res.end('Cannot route this hostname because it is not listed in proxy map');
        console.log(`${host} is unknown`);
    }
}

function wsUpgrade(req, socket, head, isSecure) {
    let host = req.headers.host;
    if (host.indexOf(':') != -1) host = host.substring(0, host.indexOf(':'));
    if (config.map[host]) {
        proxy.ws(req, socket, head, {
            target: config.map[host]
        });
    }
    else {
        res.writeHead(500);
        res.end('Cannot route this hostname because it is not listed in proxy map');
        console.log(`${host} is unknown`);
    }
}

for (let i in config.map) {
    proxys[i] = new httpProxy.createProxyServer({
        target: config.map[i],
        ws: config.ws
    });

    if (config.https) sproxys[i] = new httpProxy.createProxyServer({
        target: config.map[i],
        ws: config.ws,
        ssl: {
            key: config.key,
            cert: config.cert,
            ca: config.ca
        }
    });
}

var httpServer;
if (config.http) {
    httpServer = http.createServer(processRequest).listen(config.http).on('upgrade', wsUpgrade);
}
var httpsServer;
if (config.https) {
    httpsServer = https.createServer({
        key: config.key,
        cert: config.cert,
        ca: config.ca
    }, processRequest).listen(config.https).on('upgrade', wsUpgrade);
}

console.log('FFRoute started\nFFRoute will proxy the following hostnames:\n' + Object.keys(config.map).map(x => x + ' -> ' + config.map[x]).join('\n'));