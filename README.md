# FFHostPort

This is a simple light-weight app that allows you to route requests from different domains to different ports on one server.


For example, you can run several apps with HTTP servers, create several domains and assign all of the domains to your server. FFHostPort will route all requests from port 80/443 to your applications.

## Installing
To install FFHostPort, use npm:

`npm i ffhostport -g`

## Using
To start FFHostPort, run command `ffhostport <config_path>`. Now we'll talk about config file.

## Config file
There is an example of config file:
```json
{
    "http": 80,
    "https": 443,
    "ws": true,
    "map": {
        "example.com": {
            "host": "192.168.0.101",
            "port": 81,
            "redirectUnsecure": true
        },
        "shop.example.com": 82
    },
    "key": "/etc/letsencrypt/live/example.com/privkey.pem",
    "cert": "/etc/letsencrypt/live/example.com/fullchain.pem",
    "ca": "/etc/letsencrypt/live/example.com/chain.pem"
}
```
`http` - HTTP port (80 recommended)

`https` - HTTPS port (443 recommended)

`ws` - Allow WebSocket proxying

`map` - Map rules. A key of this object is source hostname. The value can be:
- Object with properties `host` (IP or domain of target, `127.0.0.1` by default) `port` (which is target port) and boolean `redirectUnsecure` (if `true`, FFHostPort will redirect all HTTP requests to HTTPS first, `false` by default),
- Just target port. In this case, `redirectUnsecure` is `false` and `host` is `127.0.0.1` by default.

`key` - "key" object for HTTPS server (only required if `https` option is `true`)

`cert` - "cert" object for HTTPS server (only required if `https` option is `true`)

`ca` - "ca" object for HTTPS server (only required if `https` option is `true`)