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

export const CompanyCodeConfig: MdiObjectConfig = {
	key: "CompanyCode",
	displayName: "Company Code",
	apiPath: "/v0/odm/4.0.0/log/sap.odm.orgunit.CompanyCode",
	listColumns: [
		{ path: "instance/displayId", label: "Display ID", width: "10em" },
		{ path: "instance/id", label: "ID", width: "8em" },
		{ path: "instance/country/code", label: "Country", width: "8em" },
		{ path: "instance/currency/code", label: "Currency", width: "8em" },
		{ path: "event", label: "Event", width: "8em" }
	],
	detailSections: [
		{
			title: "General Information",
			fields: [
				{ path: "instance/id", label: "ID" },
				{ path: "instance/displayId", label: "Display ID" },
				{ path: "instance/company", label: "Company" },
				{ path: "instance/isMainForCompany", label: "Main for Company", type: "boolean" },
				{ path: "instance/validFrom", label: "Valid From", type: "date" },
				{ path: "event", label: "Event" },
				{ path: "versionId", label: "Version ID" }
			]
		},
		{
			title: "Name",
			fields: [
				{ path: "instance/name/0/content/name", label: "Name" },
				{ path: "instance/name/0/valid_from", label: "Valid From", type: "date" },
				{ path: "instance/name/0/valid_to", label: "Valid To", type: "date" }
			]
		},
		{
			title: "Regional Settings",
			fields: [
				{ path: "instance/country/code", label: "Country" },
				{ path: "instance/language/code", label: "Language" },
				{ path: "instance/currency/code", label: "Currency" },
				{ path: "instance/vatRegistrationId", label: "VAT Registration ID" }
			]
		},
		{
			title: "Address",
			fields: [
				{ path: "instance/address/town/name", label: "Town" },
				{ path: "instance/address/street/name", label: "Street" },
				{ path: "instance/address/houseNumber", label: "House Number" },
				{ path: "instance/address/postCode", label: "Post Code" },
				{ path: "instance/address/country/code", label: "Address Country" },
				{ path: "instance/address/timeZone/code", label: "Time Zone" }
			]
		}
	],
	titleExtractor: (record: Record<string, unknown>): string => {
		const name = resolveNestedPath(record, "instance/name/0/content/name") as string;
		const displayId = resolveNestedPath(record, "instance/displayId") as string;
		return name ? `${displayId} - ${name}` : displayId || "Company Code";
	}
};
