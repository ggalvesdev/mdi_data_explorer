const approuter = require("@sap/approuter");
const https = require("https");
const url = require("url");

const ar = approuter();

// ── Authenticated proxy ───────────────────────────────────────────────────────
// Runs after approuter session middleware (req.user is populated for authenticated users).
// Forwards /proxy/{targetHost}/path?query  →  https://{targetHost}/path?query
ar.beforeRequestHandler.use("/proxy", (req, res) => {
	if (!req.user) {
		res.status(401).json({ error: "Unauthorized" });
		return;
	}

	// req.url = /{host}/path?query  (approuter strips the /proxy mount prefix)
	const withoutLeadingSlash = req.url.slice(1);
	const slashIndex = withoutLeadingSlash.indexOf("/");

	if (slashIndex === -1) {
		res.status(400).send("Invalid proxy URL. Expected /proxy/{host}/path");
		return;
	}

	const targetHost = withoutLeadingSlash.slice(0, slashIndex);
	const targetPath = withoutLeadingSlash.slice(slashIndex);
	const targetUrl = `https://${targetHost}${targetPath}`;
	const parsed = url.parse(targetUrl);

	// Forward headers, fixing host; strip session cookie so it never leaks to external APIs
	const headers = Object.assign({}, req.headers, { host: targetHost });
	delete headers["origin"];
	delete headers["referer"];
	delete headers["cookie"];

	const proxyReq = https.request(
		{
			hostname: parsed.hostname,
			port: parsed.port || 443,
			path: parsed.path,
			method: req.method,
			headers,
			rejectUnauthorized: true
		},
		(proxyRes) => {
			res.writeHead(proxyRes.statusCode, proxyRes.headers);
			proxyRes.pipe(res, { end: true });
		}
	);

	proxyReq.on("error", (err) => {
		console.error(`Proxy error → ${targetHost}:`, err.message);
		if (!res.headersSent) {
			res.status(502).json({ error: "Proxy error", message: err.message });
		}
	});

	req.pipe(proxyReq, { end: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
ar.start({
	port: process.env.PORT || 5000,
	workingDir: __dirname
});
