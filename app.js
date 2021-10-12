#!/usr/bin/env node

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
function resError(reason, response, code = 500) {
    response.setHeader('Content-type', 'text/html');
    response.writeHead(code);
    response.end(`
    <h2>Request failed</h2>
    <div>${reason}</div>
    <hr/>
    <div style="text-size:smaller"><i>FFHostPort on ${require('os').hostname()}</i></div>
    `);
}

var configPath = process.argv.slice(2).join(' ');

/**
 * @type { {http : number, https : number|boolean, ws : boolean, map: Object<string, { port : number, redirectUnsecure : boolean }>} }
 */
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
    for (let i in data.map) {
        if (typeof data.map[i] == 'number') data.map[i] = {
            port: data.map[i],
            redirectUnsecure: false
        };
    }
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
 * @param {boolean} isSecure Is connection secure
 */
function processRequest(req, res, isSecure) {
    let host = req.headers.host;
    if (!host) return resError('There is no "host" header in request. Looks like the app from which you are trying to access this resource is not working correctly', res, 401);
    if (host.indexOf(':') != -1) host = host.substring(0, host.indexOf(':'));
    if (config.map[host]) {
        if (config.map[host].redirectUnsecure && !isSecure) {
            res.setHeader('Location', `https://${host}${req.url}`);
            res.statusCode = 301;
            res.end();
            return;
        }
        let attempts = 0;
        let doAttempt = () => proxy.web(req, res, {
            target: `http${config.map[host].isHTTPS ? 's' : ''}://127.0.0.1:${config.map[host].port}`
        }, (err) => {
            resError('Target host is unavailable. Please contact administrator of this resource', res, 502);
            console.error(`Cannot proxy request from ${host} to ${config.map[host]}: `, err);
        });

        doAttempt();
    }
    else resError(`Host "${host}" is unknown. Please contact administrator of this resource`, res, 404);
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
            target: `http${config.map[host].isHTTPS ? 's' : ''}://127.0.0.1:${config.map[host].port}`
        }, (err) => {});
    }
    else socket.end();
}

for (let i in config.map) {
    proxys[i] = new httpProxy.createProxyServer({
        target: config.map[i].port,
        ws: config.ws
    });

    if (config.https) sproxys[i] = new httpProxy.createProxyServer({
        target: config.map[i].port,
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
    }, (rq, rp) => processRequest(rq, rp, true)).listen(config.https).on('upgrade', wsUpgrade);
}

console.log(config.map);
console.log('FFHostPort started\nFFHostPort will proxy the following hostnames:\n' + Object.keys(config.map).map(x => x + ' -> ' + config.map[x].port + (config.map[x].redirectUnsecure ? ' (secure only)' : ' (unsecure allowed)')).join('\n'));
