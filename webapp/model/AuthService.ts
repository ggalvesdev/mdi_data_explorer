/**
 * Authentication service for CF OAuth and UAA client_credentials flows.
 * @namespace com.sap.mdi.explorer.model
 */
export default class AuthService {

	/**
	 * Login to Cloud Foundry via OAuth password grant.
	 * The "cf" literal is base64-encoded as the client secret.
	 */
	public static async loginToCf(
		region: string,
		email: string,
		password: string
	): Promise<{ accessToken: string; apiBaseUrl: string }> {
		const url = `/proxy/${region}/oauth/token`;
		const body = new URLSearchParams({
			username: email,
			password: password,
			client_id: "cf",
			grant_type: "password",
			response_type: "token"
		});

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": "Basic " + btoa("cf:"),
				"Content-Type": "application/x-www-form-urlencoded"
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
		// Strip the scheme so we can route through the proxy
		const host = uaaUrl.replace(/^https?:\/\//, "");
		const url = `/proxy/${host}/oauth/token`;
		const body = new URLSearchParams({
			client_id: clientId,
			grant_type: "client_credentials"
		});

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
				"Content-Type": "application/x-www-form-urlencoded"
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
