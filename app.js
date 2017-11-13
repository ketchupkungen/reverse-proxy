// Requires
const http = require('http');
const httpProxy = require('http-proxy');
const proxy = httpProxy();

// Create a new reverse proxy
const proxy = httpProxy.createProxyServer();

// Create a new webserver
http.createServer((req,res)=> {
	// Can we read the incoming url?
	res.end(res.url);
}).listen(80);