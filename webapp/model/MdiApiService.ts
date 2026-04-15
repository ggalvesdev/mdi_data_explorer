/**
 * Service for MDI API interactions.
 * @namespace com.sap.mdi.explorer.model
 */
export default class MdiApiService {

	/**
	 * Fetch MDI log records from the given endpoint.
	 * @param baseUri The MDI service URI from the credentials (e.g. "https://api.mdi.cfapps.eu11.hana.ondemand.com")
	 * @param apiPath The object-specific API path from config
	 * @param token MDI bearer token
	 * @param deltaToken Optional nextDeltaToken for pagination
	 */
	public static async fetchLogRecords(
		baseUri: string,
		apiPath: string,
		token: string,
		deltaToken?: string
	): Promise<{ records: unknown[]; nextDeltaToken: string; hasMoreEvents: boolean }> {
		const host = baseUri.replace(/^https?:\/\//, "");
		let url = `/proxy/${host}${apiPath}`;
		if (deltaToken) {
			url += `?since=${encodeURIComponent(deltaToken)}`;
		}

		const response = await fetch(url, {
			headers: { "Authorization": `Bearer ${token}` }
		});
		if (!response.ok) {
			throw new Error(`MDI API error (${response.status}): ${await response.text()}`);
		}

		const data = await response.json() as {
			log?: unknown[];
			nextDeltaToken?: string;
			hasMoreEvents?: boolean;
		};

		return {
			records: data.log || [],
			nextDeltaToken: data.nextDeltaToken || "",
			hasMoreEvents: data.hasMoreEvents ?? false
		};
	}
}
