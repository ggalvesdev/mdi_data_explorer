const express = require("express");
const https = require("https");
const path = require("path");
const url = require("url");

const app = express();

// ── Static UI5 app ────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "dist")));

// ── Dynamic CORS proxy ────────────────────────────────────────────────────────
// Forwards /proxy/{targetHost}/path?query  →  https://{targetHost}/path?query
// Reuses the same routing convention as the local UI5 dev middleware.
app.use("/proxy", (req, res) => {
	// req.url = /{host}/path?query  (Express strips the /proxy prefix)
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

	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		res.set({
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
		});
		res.status(204).end();
		return;
	}

	// Forward headers, fixing host
	const headers = Object.assign({}, req.headers, { host: targetHost });
	delete headers["origin"];
	delete headers["referer"];

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
			res.set({
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
			});
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

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get("*", (_req, res) => {
	res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "8080", 10);
app.listen(port, () => {
	console.log(`MDI Data Explorer running on port ${port}`);
});
