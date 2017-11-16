// Requires
const http = require('http');
const httpProxy = require('http-proxy');

// Create a new reverse proxy
const proxy = httpProxy.createProxyServer();

// Handle proxy errors - thus not breaking the whole
// reverse-proxy app if an app doesnt answer
proxy.on('error',function(e){
	console.log('Proxy error, bud!', Date.now(), e);
});

// Create a new webserver
http.createServer((req,res)=> {

	// Set/replace response headers
	setResponseHeaders(req,res);



	// Can we read the incoming url?
	let host = req.headers.host;
	let hostParts = host.split('.');
	let topDomain = hostParts.pop();
	let domain = hostParts.pop();
	let subDomain = hostParts.join('.');
	let urlParts = req.url.split('/');

	let port;
	if(urlParts[1] == '.well-known') {
		port = 5000; //app: certbot-helper
	}
	else if(subDomain == '' || subDomain == 'www'){
		port = 4001; //app: testapp
	}
	/*else if(subDomain == 'blogg') {
		port = 3001;
	}*/
	else if(subDomain == 'cooling') {
		port = 3000;
	}else {
		// Error: Page not found
		res.statusCode = 404;
		res.end('Ouch! Seems we can´t find your app :(');
	}

	if (port) {
		proxy.web(req,res,{target:'http://127.0.0.1:' + port});
	}

}).listen(80); // Listening on port 80



// For example shows this message instead of showing that
// The app is powered by express
function setResponseHeaders(req,res){
	// there is a built in node function called res.writeHead
	// that writes http response headers
	// store that function in another property
	res.oldWriteHead = res.writeHead;

	// and the replace it with our funcuton
	res.writeHead = funciton(statusCode, headers){

		// set/replace our own headers
		res.setHeader('x-powered-by', 'Bjurns super awesome server');

		// call the original wirte head function as well
		res.oldWriteHead(statusCode,headers);
	}
}