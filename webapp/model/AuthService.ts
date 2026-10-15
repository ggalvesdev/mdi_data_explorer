/**
 * Authentication service for CF OAuth and UAA client_credentials flows.
 * @namespace com.sap.mdi.explorer.model
 */
export default class AuthService {

	/**
	 * Fetch a CSRF token from the approuter.
	 *
	 * The approuter protects every modifying request (POST/PUT/DELETE) — including
	 * the proxied OAuth token calls — and rejects them with a plain 403 Forbidden
	 * unless a valid `x-csrf-token` is supplied. We obtain one with a safe GET
	 * carrying the `x-csrf-token: fetch` header; the token is bound to the current
	 * approuter session (sent via the session cookie).
	 */
	private static async fetchCsrfToken(): Promise<string> {
		const response = await fetch("/index.html", {
			method: "GET",
			headers: { "x-csrf-token": "fetch" },
			cache: "no-store"
		});
		const token = response.headers.get("x-csrf-token");
		if (!token) {
			throw new Error(`Could not obtain a CSRF token from the server (status ${response.status}).`);
		}
		return token;
	}

	/**
	 * Login to Cloud Foundry via the SSO one-time passcode grant.
	 *
	 * This is the flow used by `cf login --sso`: the user obtains a temporary
	 * passcode from `https://{region}/passcode` and exchanges it for a token.
	 * It works even when the resource-owner password grant (plain email/password)
	 * is disabled for the subaccount, or when a custom IdP / MFA is in use.
	 *
	 * The "cf" public client is used with an empty secret, i.e. Basic "cf:".
	 */
	public static async loginToCf(
		region: string,
		passcode: string
	): Promise<{ accessToken: string; apiBaseUrl: string }> {
		const csrfToken = await this.fetchCsrfToken();
		const url = `/proxy/${region}/oauth/token`;
		// Client ("cf") is authenticated via the Basic header only. Do NOT also put
		// client_id in the body — UAA rejects dual client-auth methods (invalid_client).
		const body = new URLSearchParams({
			passcode: passcode,
			grant_type: "password",
			response_type: "token"
		});

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": "Basic " + btoa("cf:"),
				"Content-Type": "application/x-www-form-urlencoded",
				"Accept": "application/json",
				"x-csrf-token": csrfToken
			},
			body: body.toString()
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Login failed (${response.status}): ${text}`);
		}

		const data = await response.json() as { access_token: string };
		const apiBaseUrl = region.replace("login.", "api.");
		return { accessToken: data.access_token, apiBaseUrl };
	}

	/**
	 * Get MDI bearer token via client_credentials grant against the UAA.
	 */
	public static async getMdiToken(
		uaaUrl: string,
		clientId: string,
		clientSecret: string
	): Promise<string> {
		const csrfToken = await this.fetchCsrfToken();
		// Strip the scheme so we can route through the proxy
		const host = uaaUrl.replace(/^https?:\/\//, "");
		const url = `/proxy/${host}/oauth/token`;
		// Client is authenticated via the Basic header only (see loginToCf).
		const body = new URLSearchParams({
			grant_type: "client_credentials"
		});

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
				"Content-Type": "application/x-www-form-urlencoded",
				"Accept": "application/json",
				"x-csrf-token": csrfToken
			},
			body: body.toString()
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`MDI token fetch failed (${response.status}): ${text}`);
		}

		const data = await response.json() as { access_token: string };
		return data.access_token;
	}
}
