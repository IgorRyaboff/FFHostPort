const httpProxy = require('http-proxy');
const http = require('http');
const https = require('https');
const fs = require('fs');
const stream = require('stream'); //This module is imported for proper JSDoc working
const errorCodes = {
    NO_HOST_HEADER: 1,
    TARGET_HOST_UNAVAILABLE: 2,
    CLIENT_HOST_UNKNOWN: 3
}

/**
 * Print error page to client
 * @param {number} code 
 * @param {http.ServerResponse} response 
 */
function resError(code, response) {
    response.writeHead(500);
    response.end('This website is temporary unavailable. If you are webmaster, see log files or documentation<br/>Code: ' + code);
}

var configPath = process.argv.slice(2).join(' ');
var config = {
    http: 80,
    https: false,
    ws: true,
    map: {
        "localhost": 81
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

/**
 * 
 * @param {http.IncomingMessage} req HTTP request object
 * @param {http.ServerResponse} res HTTP response object
 */
function processRequest(req, res) {
    let host = req.headers.host;
    if (!host) return resError(errorCodes.NO_HOST_HEADER, res);
    if (host.indexOf(':') != -1) host = host.substring(0, host.indexOf(':'));
    if (config.map[host]) {
        let attempts = 0;

        let doAttempt = () => proxy.web(req, res, {
            target: 'http://127.0.0.1:' + config.map[host]
        }, (err) => {
            attempts++;
            if (attempts >= 3) {
                resError(errorCodes.TARGET_HOST_UNAVAILABLE, res);
                console.error(`Cannot proxy request (3 attempts done) from ${host} to port ${config.map[host]}: `, err);
            }
            else {
                console.error(`Failed attempt ${attempts} for request from ${host} to port ${config.map[host]}`);
                setTimeout(() => doAttempt(), 3000);
            }
            
        });

        doAttempt();
    }
    else resError(errorCodes.CLIENT_HOST_UNKNOWN, res);
}

/**
 * 
 * @param {http.IncomingMessage} req 
 * @param {stream.Duplex} socket 
 * @param {Buffer} head 
 */
function wsUpgrade(req, socket, head) {
    let host = req.headers.host;
    if (!host) {
        socket.end();
    }
    if (host.indexOf(':') != -1) host = host.substring(0, host.indexOf(':'));
    if (config.map[host]) {
        proxy.ws(req, socket, head, {
            target: 'http://127.0.0.1:' + config.map[host]
        }, (err) => {});
    }
    else socket.end();
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

console.log('FFHostPort started\nFFHostPort will proxy the following hostnames:\n' + Object.keys(config.map).map(x => x + ' -> ' + config.map[x]).join('\n'));
