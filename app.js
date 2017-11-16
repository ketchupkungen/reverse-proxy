// Requires
const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const tls = require('tls');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

// Read all certs from certbot into an object
let certs = readCerts("/etc/letsencrypt/live");

// Create a new reverse proxy
const proxy = httpProxy.createProxyServer();

// Handle proxy errors - thus not breaking the whole
// reverse-proxy app if an app doesnt answer
proxy.on('error',function(e){
	console.log('Proxy error, bud!', Date.now(), e);
});


// Create a new unencrypted webserver
// with the purpose to answer certbot challenges
// and redirect all other traffic to https
http.createServer((req,res)=>{

  let urlParts = req.url.split('/');

  if(urlParts[1] == '.well-known'){
    // using certbot-helper on port 5000
    proxy.web(req,res,{target:'http://127.0.0.1:5000'});
  }
  else {
    // redirect to https
    let url = 'https://' + req.headers.host + req.url;
    res.writeHead(301, {'Location': url});
    res.end();
  }

}).listen(80);


// Create a new webserver
https.createServer({
  // SNICallback let's us get the correct cert
  // depening on what the domain the user asks for
  SNICallback: (domain, callback) => callback(
    certs[domain] ? null : new Error('No such cert'),
    certs[domain] ? certs[domain].secureContext : null
  ),
  // But we still have the server with a "default" cert
  key: certs['ketchupkungen.se'].key,
  cert: certs['ketchupkungen.se'].cert
},(req,res) => {

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

	// Don't run our main site on both www and non-www.
  	// Choose non-www domain
  	if(subDomain == 'www'){
    // redirect to domain without www
    let url = 'https://' + domain + '.' + topDomain + req.url;
    res.writeHead(301, {'Location': url});
    res.end();

  	}
	else if(subDomain == ''){
		port = 4001; //app: testapp
	}
	else if(subDomain == 'blog') {
		port = 3001; //app: First-blog
	}
	else if(subDomain == 'cooling') {
		port = 3000; //app: example
	}else {
		// Error: Page not found
		res.statusCode = 404;
		res.end('Ouch! Seems I can´t find that url :(');
	}

	if (port) {
		proxy.web(req,res,{target:'http://127.0.0.1:' + port});
	}

}).listen(443); // Listening on port 443



// For example shows this message instead of showing that
// The app is powered by express
function setResponseHeaders(req,res){

  // there is a built in node function called res.writeHead
  // that writes http response headers
  // store that function in another property
  res.oldWriteHead = res.writeHead;

  // and then replace it with our function
  res.writeHead = function(statusCode, headers){

    // set/replace our own headers
    res.setHeader('x-powered-by', 'Bjurns super awesome server');

    // call the original write head function as well
    res.oldWriteHead(statusCode,headers);
  }

}


function readCerts(pathToCerts){

  let certs = {},
      domains = fs.readdirSync(pathToCerts);

  // Read all ssl certs into memory from file
  for(let domain of domains){
    let domainName = domain.split('-0')[0];
    certs[domainName] = {
      key:  fs.readFileSync(path.join(pathToCerts,domain,'privkey.pem')),
      cert: fs.readFileSync(path.join(pathToCerts,domain,'fullchain.pem'))
    };
    certs[domainName].secureContext = tls.createSecureContext(certs[domainName]);
  }

  return certs;

}

function renewCerts(){

  exec('certbot renew',(error,stdOut,stdError)=>{
    console.log('renewing certs',stdOut);
    certs = readCerts('/etc/letsencrypt/live');
  });

}



// Will lagg a bit, however it does not renew too often
// It does not matter.

// Renew certs when needed on on start
renewCerts();

// and then once every day
setInterval(renewCerts, 1000 * 60 * 60 * 24);