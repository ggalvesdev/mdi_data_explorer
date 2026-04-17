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

export const WorkforcePersonConfig: MdiObjectConfig = {
	key: "WorkforcePerson",
	displayName: "Workforce Person",
	apiPath: "/v0/odm/3.8.0/log/sap.odm.workforce.WorkforcePerson",
	listColumns: [
		{ path: "instance/externalId", label: "Employee ID", width: "10em" },
		{ path: "instance/profileDetail/0/content/scriptedProfileDetails/0/firstName", label: "First Name", width: "12em" },
		{ path: "instance/profileDetail/0/content/scriptedProfileDetails/0/lastName", label: "Last Name", width: "12em" },
		{ path: "instance/emails/0/address", label: "Email", width: "18em" },
		{ path: "instance/workAssignments/0/jobDetails/0/content/0/jobTitle", label: "Job Title", width: "16em" },
		{ path: "event", label: "Event", width: "8em" }
	],
	detailSections: [
		{
			title: "Personal Information",
			fields: [
				{ path: "instance/id",                                                                    label: "ID"              },
				{ path: "instance/externalId",                                                            label: "Employee ID"     },
				{ path: "instance/profileDetail/0/content/scriptedProfileDetails/0/firstName",            label: "First Name"      },
				{ path: "instance/profileDetail/0/content/scriptedProfileDetails/0/lastName",             label: "Last Name"       },
				{ path: "instance/profileDetail/0/content/scriptedProfileDetails/0/formalName",           label: "Formal Name"     },
				{ path: "instance/profileDetail/0/content/scriptedProfileDetails/0/preferredName",        label: "Preferred Name"  },
				{ path: "instance/biographicalDetails/dateOfBirth",                                       label: "Date of Birth", type: "date" },
				{ path: "instance/personalDetail/0/content/gender/code",                                  label: "Gender"          },
				{ path: "instance/personalDetail/0/content/formOfAddress/code",                           label: "Form of Address" },
				{ path: "instance/userAccount/userName",                                                   label: "User Name"       },
				{ path: "event",                                                                           label: "Event"           },
				{ path: "versionId",                                                                       label: "Version ID"      }
			]
		},
		{
			title: "Contact",
			fields: [
				{ path: "instance/emails/0/address",     label: "Email Address"   },
				{ path: "instance/emails/0/usage/code",  label: "Usage"           },
				{ path: "instance/emails/0/isDefault",   label: "Default Email", type: "boolean" }
			]
		},
		{
			title: "Work Assignment",
			fields: [
				{ path: "instance/workAssignments/0/id",                   label: "Assignment ID"       },
				{ path: "instance/workAssignments/0/externalId",           label: "External ID"         },
				{ path: "instance/workAssignments/0/assignmentId",         label: "Assignment UUID"     },
				{ path: "instance/workAssignments/0/startDate",            label: "Start Date", type: "date" },
				{ path: "instance/workAssignments/0/isContingentWorker",   label: "Contingent Worker", type: "boolean" },
				{ path: "instance/workAssignments/0/detail/0/content/isPrimary", label: "Primary Assignment", type: "boolean" }
			]
		},
		{
			title: "Job Details",
			fields: [
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/jobTitle",                        label: "Job Title"           },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/employeeClass/code",               label: "Employee Class"      },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/status/code",                     label: "Status"              },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/country/code",                    label: "Country"             },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/legalEntity/externalId",          label: "Legal Entity"        },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/orgUnit/externalId",              label: "Org Unit"            },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/costCenterRef/externalId",        label: "Cost Center"         },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/position/externalId",             label: "Position"            },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/job/externalId",                  label: "Job"                 },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/location/externalId",             label: "Location"            },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/workingHoursPerWeek",             label: "Working Hours/Week"  },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/workingDaysPerWeek",              label: "Working Days/Week"   },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/fte",                             label: "FTE"                 },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/superOrdinateOrgUnit1/externalId", label: "Org Unit Level 1"   },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/superOrdinateOrgUnit2/externalId", label: "Org Unit Level 2"   },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/eventReason/code",                label: "Event Reason"        },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/event/code",                      label: "Job Event"           }
			]
		},
		{
			title: "Supervisor",
			fields: [
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/supervisorWorkAssignment/externalId",        label: "Supervisor ID"      },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/supervisorWorkAssignment/workforcePerson/id", label: "Supervisor Person ID" },
				{ path: "instance/workAssignments/0/jobDetails/0/content/0/supervisorWorkAssignment/assignmentId",      label: "Supervisor Assignment UUID" }
			]
		},
		{
			title: "System of Record",
			fields: [
				{ path: "instance/systemOfRecordKeys/0/systemOfRecordId",              label: "System of Record ID"      },
				{ path: "instance/systemOfRecordKeys/0/isCurrentSystemOfRecord",        label: "Current System of Record", type: "boolean" },
				{ path: "instance/systemOfRecordKeys/0/systemOfRecordWorkAssignmentId", label: "SOR Assignment ID"         },
				{ path: "instance/systemOfRecordKeys/0/workAssignmentExternalId",       label: "SOR Assignment Ext. ID"    }
			]
		}
	],
	titleExtractor: (record: Record<string, unknown>): string => {
		const firstName = resolveNestedPath(record, "instance/profileDetail/0/content/scriptedProfileDetails/0/firstName") as string;
		const lastName  = resolveNestedPath(record, "instance/profileDetail/0/content/scriptedProfileDetails/0/lastName") as string;
		const extId     = resolveNestedPath(record, "instance/externalId") as string;
		if (firstName || lastName) return `${firstName ?? ""} ${lastName ?? ""}`.trim();
		return extId || "Workforce Person";
	}
};
