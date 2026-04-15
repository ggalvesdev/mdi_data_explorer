import UIComponent from "sap/ui/core/UIComponent";
import JSONModel from "sap/ui/model/json/JSONModel";
import Device from "sap/ui/Device";

/**
 * @namespace com.sap.mdi.explorer
 */
export default class Component extends UIComponent {
	public static metadata = {
		manifest: "json",
		interfaces: ["sap.ui.core.IAsyncContentCreation"]
	};

	private contentDensityClass: string;

	public init(): void {
		super.init();

		// Device model
		const deviceModel = new JSONModel(Device);
		deviceModel.setDefaultBindingMode("OneWay");
		this.setModel(deviceModel, "device");

		// App view model (busy state)
		this.setModel(new JSONModel({ busy: false }), "appView");

		// App state model — tokens, credentials, etc.
		this.setModel(new JSONModel({
			cfToken: "",
			mdiToken: "",
			apiBaseUrl: "",
			credentials: {
				uri: "",
				uaaUrl: "",
				clientId: "",
				clientSecret: ""
			},
			selectedObjectType: "",
			selectedInstanceName: ""
		}));

		// Service data model
		this.setModel(new JSONModel({
			instances: [],
			filteredInstances: []
		}), "serviceData");

		// MDI data model
		this.setModel(new JSONModel({
			records: [],
			nextDeltaToken: "",
			hasMoreEvents: false
		}), "mdiData");

		this.getRouter().initialize();
	}

	public getContentDensityClass(): string {
		if (this.contentDensityClass === undefined) {
			if (document.body.classList.contains("sapUiSizeCozy") || document.body.classList.contains("sapUiSizeCompact")) {
				this.contentDensityClass = "";
			} else if (!Device.support.touch) {
				this.contentDensityClass = "sapUiSizeCompact";
			} else {
				this.contentDensityClass = "sapUiSizeCozy";
			}
		}
		return this.contentDensityClass;
	}
}
