/**
 * Service for Cloud Foundry API interactions.
 * @namespace com.sap.mdi.explorer.model
 */
export default class CfApiService {

	private static readonly MDI_SERVICE_PLAN_GUID = "a1d24cab-2c19-4429-90a4-f90b6c96a4bc";

	/**
	 * Fetch all managed service instances, handling pagination.
	 * Filters by the MDI service plan GUID.
	 */
	public static async getMdiServiceInstances(
		apiBaseUrl: string,
		token: string
	): Promise<unknown[]> {
		let allInstances: unknown[] = [];
		let nextUrl: string | null = `/proxy/${apiBaseUrl}/v3/service_instances?type=managed`;

		while (nextUrl) {
			const response = await fetch(nextUrl, {
				headers: { "Authorization": `Bearer ${token}` }
			});
			if (!response.ok) {
				throw new Error(`CF API error (${response.status}): ${await response.text()}`);
			}

			const data = await response.json() as {
				pagination: { next: { href: string } | null };
				resources: unknown[];
			};
			allInstances = allInstances.concat(data.resources);

			if (data.pagination?.next?.href) {
				// Rewrite absolute URL through proxy
				const absUrl = data.pagination.next.href;
				const urlObj = new URL(absUrl);
				nextUrl = `/proxy/${urlObj.host}${urlObj.pathname}${urlObj.search}`;
			} else {
				nextUrl = null;
			}
		}

		// Filter by service plan GUID
		return allInstances.filter((inst: unknown) => {
			const instance = inst as Record<string, unknown>;
			const relationships = instance.relationships as Record<string, unknown>;
			const servicePlan = relationships?.service_plan as Record<string, unknown>;
			const data = servicePlan?.data as Record<string, unknown>;
			return data?.guid === CfApiService.MDI_SERVICE_PLAN_GUID;
		});
	}

	/**
	 * Fetch service credential bindings for a service instance.
	 */
	public static async getServiceBindings(
		bindingsHref: string,
		token: string
	): Promise<unknown[]> {
		// Rewrite absolute URL through proxy
		const urlObj = new URL(bindingsHref);
		const proxyUrl = `/proxy/${urlObj.host}${urlObj.pathname}${urlObj.search}`;

		const response = await fetch(proxyUrl, {
			headers: { "Authorization": `Bearer ${token}` }
		});
		if (!response.ok) {
			throw new Error(`Bindings fetch error (${response.status}): ${await response.text()}`);
		}

		const data = await response.json() as { resources: unknown[] };
		return data.resources;
	}

	/**
	 * Fetch the details (credentials) for a specific service binding.
	 */
	public static async getBindingDetails(
		selfHref: string,
		token: string
	): Promise<Record<string, unknown>> {
		// selfHref is the binding self link; we need /details
		const urlObj = new URL(selfHref);
		const proxyUrl = `/proxy/${urlObj.host}${urlObj.pathname}/details${urlObj.search}`;

		const response = await fetch(proxyUrl, {
			headers: { "Authorization": `Bearer ${token}` }
		});
		if (!response.ok) {
			throw new Error(`Binding details error (${response.status}): ${await response.text()}`);
		}

		return response.json() as Promise<Record<string, unknown>>;
	}
}
