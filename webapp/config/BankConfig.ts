import type { MdiObjectConfig } from "./types";

function resolveNestedPath(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split("/");
	let current: unknown = obj;
	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

export const BankConfig: MdiObjectConfig = {
	key: "Bank",
	displayName: "Bank",
	apiPath: "/v0/odm/3.0.0/log/sap.odm.finance.bank.Bank",
	listColumns: [
		{ path: "instance/externalId", label: "External ID", width: "12em" },
		{ path: "instance/name", label: "Name", width: "16em" },
		{ path: "instance/country/code", label: "Country", width: "8em" },
		{ path: "instance/isMarkedForDeletion", label: "Marked for Deletion", width: "10em" },
		{ path: "event", label: "Event", width: "8em" }
	],
	detailSections: [
		{
			title: "General Information",
			fields: [
				{ path: "instance/id", label: "ID" },
				{ path: "instance/externalId", label: "External ID" },
				{ path: "instance/name", label: "Name" },
				{ path: "instance/country/code", label: "Country" },
				{ path: "instance/category/code", label: "Category" },
				{ path: "instance/branchName", label: "Branch Name" },
				{ path: "instance/bankNumber", label: "Bank Number" },
				{ path: "instance/businessIdentifierCode", label: "BIC / SWIFT" },
				{ path: "instance/isMarkedForDeletion", label: "Marked for Deletion", type: "boolean" },
				{ path: "event", label: "Event" },
				{ path: "versionId", label: "Version ID" }
			]
		},
		{
			title: "Address",
			fields: [
				{ path: "instance/address/formattedOrgNameLine1", label: "Org Name Line 1" },
				{ path: "instance/address/formattedOrgNameLine2", label: "Org Name Line 2" },
				{ path: "instance/address/street/name", label: "Street" },
				{ path: "instance/address/houseNumber", label: "House Number" },
				{ path: "instance/address/town/name", label: "Town" },
				{ path: "instance/address/postCode", label: "Post Code" },
				{ path: "instance/address/country/code", label: "Address Country" },
				{ path: "instance/address/timeZone/code", label: "Time Zone" }
			]
		}
	],
	titleExtractor: (record: Record<string, unknown>): string => {
		const name = resolveNestedPath(record, "instance/name") as string;
		const extId = resolveNestedPath(record, "instance/externalId") as string;
		return name ? `${extId} - ${name}` : extId || "Bank";
	}
};
