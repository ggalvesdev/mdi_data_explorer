import type {SuiteConfiguration} from "sap/ui/test/starter/config";
export default {
	name: "QUnit test suite for the UI5 Application: com.sap.mdi.explorer",
	defaults: {
		page: "ui5://test-resources/com/sap/mdi/explorer/Test.qunit.html?testsuite={suite}&test={name}",
		qunit: {
			version: 2
		},
		sinon: {
			version: 4
		},
		ui5: {
			language: "EN",
			theme: "sap_horizon"
		},
		coverage: {
			only: ["com/sap/mdi/explorer/"],
			never: ["test-resources/com/sap/mdi/explorer/"]
		},
		loader: {
			paths: {
				"com/sap/mdi/explorer": "../"
			}
		}
	},
	tests: {
		"unit/unitTests": {
			title: "Unit tests for com.sap.mdi.explorer"
		},
		"integration/opaTests": {
			title: "Integration tests for com.sap.mdi.explorer"
		}
	}
} satisfies SuiteConfiguration;
