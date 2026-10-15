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
	 * Enriches a list of service instances with spaceName and orgName.
	 * Deduplicates space/org GUIDs so each is only fetched once.
	 */
	public static async enrichWithSpaceAndOrg(
		instances: unknown[],
		token: string
	): Promise<unknown[]> {
		// Collect unique space GUIDs → href
		const spaceHrefByGuid = new Map<string, string>();
		for (const inst of instances) {
			const instance = inst as Record<string, unknown>;
			const links = instance.links as Record<string, unknown>;
			const spaceLink = links?.space as Record<string, unknown>;
			const href = spaceLink?.href as string;
			const relationships = instance.relationships as Record<string, unknown>;
			const spaceRel = relationships?.space as Record<string, unknown>;
			const spaceGuid = (spaceRel?.data as Record<string, unknown>)?.guid as string;
			if (spaceGuid && href) spaceHrefByGuid.set(spaceGuid, href);
		}

		// Fetch all unique spaces in parallel
		const spaceResults = await Promise.all(
			Array.from(spaceHrefByGuid.entries()).map(async ([guid, href]) => {
				try {
					const urlObj = new URL(href);
					const res = await fetch(`/proxy/${urlObj.host}${urlObj.pathname}`, {
						headers: { "Authorization": `Bearer ${token}` }
					});
					if (!res.ok) return { guid, name: "", orgHref: "" };
					const data = await res.json() as {
						name: string;
						links: { organization: { href: string } };
					};
					return { guid, name: data.name, orgHref: data.links?.organization?.href ?? "" };
				} catch {
					return { guid, name: "", orgHref: "" };
				}
			})
		);

		// Build space map; collect unique org hrefs
		const spaceMap = new Map<string, { name: string; orgHref: string }>();
		const orgHrefByGuid = new Map<string, string>();
		for (const space of spaceResults) {
			spaceMap.set(space.guid, { name: space.name, orgHref: space.orgHref });
			if (space.orgHref) {
				const urlObj = new URL(space.orgHref);
				const orgGuid = urlObj.pathname.split("/").pop() ?? "";
				if (orgGuid) orgHrefByGuid.set(orgGuid, space.orgHref);
			}
		}

		// Fetch all unique orgs in parallel
		const orgResults = await Promise.all(
			Array.from(orgHrefByGuid.entries()).map(async ([guid, href]) => {
				try {
					const urlObj = new URL(href);
					const res = await fetch(`/proxy/${urlObj.host}${urlObj.pathname}`, {
						headers: { "Authorization": `Bearer ${token}` }
					});
					if (!res.ok) return { guid, name: "" };
					const data = await res.json() as { name: string };
					return { guid, name: data.name };
				} catch {
					return { guid, name: "" };
				}
			})
		);
		const orgMap = new Map<string, string>(orgResults.map(o => [o.guid, o.name]));

		// Enrich each instance with spaceName and orgName
		return instances.map(inst => {
			const instance = inst as Record<string, unknown>;
			const relationships = instance.relationships as Record<string, unknown>;
			const spaceGuid = ((relationships?.space as Record<string, unknown>)?.data as Record<string, unknown>)?.guid as string;
			const space = spaceMap.get(spaceGuid);
			const orgGuid = space?.orgHref ? (new URL(space.orgHref).pathname.split("/").pop() ?? "") : "";
			return {
				...instance,
				spaceName: space?.name ?? "",
				orgName: orgMap.get(orgGuid) ?? "",
				orgGuid: orgGuid
			};
		});
	}

	/**
	 * Groups enriched service instances by subaccount (CF org) and counts them.
	 * Only orgs that actually contain instances appear. Sorted by org name.
	 */
	public static groupBySubaccount(
		instances: unknown[]
	): { orgGuid: string; orgName: string; count: number }[] {
		const map = new Map<string, { orgGuid: string; orgName: string; count: number }>();
		for (const inst of instances) {
			const instance = inst as Record<string, unknown>;
			const orgGuid = (instance.orgGuid as string) || "";
			const orgName = (instance.orgName as string) || "(unknown)";
			const key = orgGuid || orgName;
			const existing = map.get(key);
			if (existing) {
				existing.count++;
			} else {
				map.set(key, { orgGuid, orgName, count: 1 });
			}
		}
		return Array.from(map.values()).sort((a, b) => a.orgName.localeCompare(b.orgName));
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
