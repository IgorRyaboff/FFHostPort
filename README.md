# HostPort

This is a simple light-weight app that allows you to route different hosts to different TCP ports on one server.


For example, you can run several apps with HTTP servers, create several domains and assign all of the domains to your server. HostPort will route all requests from port 80/443 to your applications.

## Installing
To install HostPort, clone this repository using git

## Using
To start HostPort, go to HostPort directory and run command `node app <config_path>`. Now we'll talk about config file.

## Config file
There is an example of config file:
```json
{
    "http": 80,
    "https": 443,
    "ws": true,
    "map": {
        "example.com": 81,
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

`map` - Map rules. A key of this object is hostname and the value is target port

`key` - "key" object for HTTPS server (only required if `https` option is `true`)

`cert` - "cert" object for HTTPS server (only required if `https` option is `true`)

`ca` - "ca" object for HTTPS server (only required if `https` option is `true`)

## Errors
HostPort can return error page with error code instead of expected webpage. It can give you one of the following error codes:
1. Client didn't supply the `host` header
2. There has been some error connecting to target port (details will be in `stderr` console output)
3. Given hostname is not listed in config file
