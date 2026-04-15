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

export const CostCenterConfig: MdiObjectConfig = {
	key: "CostCenter",
	displayName: "Cost Center",
	apiPath: "/v0/odm/3.7.0/log/sap.odm.finance.costobject.CostCenter",
	listColumns: [
		{ path: "instance/displayName", label: "Display Name", width: "16em" },
		{ path: "instance/localIdS4/costCenterId", label: "Cost Center ID", width: "12em" },
		{ path: "instance/localIdS4/companyCode", label: "Company Code", width: "10em" },
		{ path: "instance/localIdS4/controllingArea", label: "Controlling Area", width: "10em" },
		{ path: "event", label: "Event", width: "8em" }
	],
	detailSections: [
		{
			title: "General Information",
			fields: [
				{ path: "instance/id", label: "ID" },
				{ path: "instance/displayName", label: "Display Name" },
				{ path: "event", label: "Event" },
				{ path: "versionId", label: "Version ID" }
			]
		},
		{
			title: "S/4 Local ID",
			fields: [
				{ path: "instance/localIdS4/logicalSystem", label: "Logical System" },
				{ path: "instance/localIdS4/companyCode", label: "Company Code" },
				{ path: "instance/localIdS4/costCenterId", label: "Cost Center ID" },
				{ path: "instance/localIdS4/costCenterExternalId", label: "External ID" },
				{ path: "instance/localIdS4/controllingArea", label: "Controlling Area" }
			]
		},
		{
			title: "Validity",
			fields: [
				{ path: "instance/isValid/0/valid_from", label: "Valid From", type: "date" },
				{ path: "instance/isValid/0/valid_to", label: "Valid To", type: "date" },
				{ path: "instance/isValid/0/content", label: "Is Valid", type: "boolean" }
			]
		},
		{
			title: "Attributes",
			fields: [
				{ path: "instance/attributes/0/content/isBlockedForPrimaryPosting", label: "Blocked Primary Posting", type: "boolean" },
				{ path: "instance/attributes/0/content/isBlockedForSecondaryPosting", label: "Blocked Secondary Posting", type: "boolean" },
				{ path: "instance/attributes/0/content/name", label: "Name", type: "json" },
				{ path: "instance/attributes/0/content/description", label: "Description", type: "json" }
			]
		}
	],
	titleExtractor: (record: Record<string, unknown>): string => {
		return (resolveNestedPath(record, "instance/displayName") as string) ||
			(resolveNestedPath(record, "instance/localIdS4/costCenterId") as string) ||
			"Cost Center";
	}
};
