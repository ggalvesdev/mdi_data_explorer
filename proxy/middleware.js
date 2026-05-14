const https = require("https");
const http = require("http");
const url = require("url");

/**
 * Custom UI5 middleware that proxies requests from /proxy/{host}/... to https://{host}/...
 * This handles the dynamic CORS issue where the target host is determined at runtime.
 */
module.exports = function ({ resources, options }) {
	return function proxyMiddleware(req, res, next) {
		// Only intercept /proxy/ requests
		if (!req.url.startsWith("/proxy/")) {
			return next();
		}

		// Parse: /proxy/{host}/{path}
		const withoutPrefix = req.url.substring("/proxy/".length);
		const slashIndex = withoutPrefix.indexOf("/");
		if (slashIndex === -1) {
			res.writeHead(400, { "Content-Type": "text/plain" });
			res.end("Invalid proxy URL format. Expected /proxy/{host}/{path}");
			return;
		}

		const targetHost = withoutPrefix.substring(0, slashIndex);
		const targetPath = withoutPrefix.substring(slashIndex);
		const targetUrl = `https://${targetHost}${targetPath}`;

		const parsedUrl = url.parse(targetUrl);

		// Build headers — forward most headers, fix host
		const headers = Object.assign({}, req.headers);
		headers.host = targetHost;
		delete headers["origin"];
		delete headers["referer"];

		const options = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || 443,
			path: parsedUrl.path,
			method: req.method,
			headers: headers,
			rejectUnauthorized: false
		};

		const proxyReq = https.request(options, function (proxyRes) {
			// Set CORS headers for the browser
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

			res.writeHead(proxyRes.statusCode, proxyRes.headers);
			proxyRes.pipe(res, { end: true });
		});

		proxyReq.on("error", function (err) {
			console.error("Proxy error:", err.message);
			res.writeHead(502, { "Content-Type": "text/plain" });
			res.end("Proxy error: " + err.message);
		});

		// Handle OPTIONS preflight
		if (req.method === "OPTIONS") {
			res.setHeader("Access-Control-Allow-Origin", "*");
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
			res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
			res.writeHead(204);
			res.end();
			return;
		}

		// Pipe request body to the proxy request
		req.pipe(proxyReq, { end: true });
	};
};
