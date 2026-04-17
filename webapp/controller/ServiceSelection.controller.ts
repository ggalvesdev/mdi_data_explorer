import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import List from "sap/m/List";
import StandardListItem from "sap/m/StandardListItem";
import NavContainer from "sap/m/NavContainer";
import Page from "sap/m/Page";
import SearchField from "sap/m/SearchField";
import type { ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import CfApiService from "../model/CfApiService";
import AuthService from "../model/AuthService";
import { getAllObjectConfigs } from "../config/MdiObjectRegistry";

interface ServiceInstance {
	guid: string;
	name: string;
	spaceName?: string;
	orgName?: string;
	last_operation: { state: string };
	links: {
		self: { href: string };
		service_credential_bindings: { href: string };
	};
}

interface ServiceBinding {
	guid: string;
	name: string;
	links: {
		self: { href: string };
		details: { href: string };
	};
}

interface BindingCredentials {
	credentials: {
		uri: string;
		uaa: {
			url: string;
			clientid: string;
			clientsecret: string;
		};
	};
}

/**
 * @namespace com.sap.mdi.explorer.controller
 */
export default class ServiceSelection extends BaseController {

	private _dialog: Dialog;
	private _selectedInstance: ServiceInstance;

	public onInit(): void {
		this.getRouter().getRoute("serviceSelection").attachPatternMatched(this._onRouteMatched, this);
	}

	private async _onRouteMatched(): Promise<void> {
		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const token = appModel.getProperty("/cfToken") as string;
		const apiBaseUrl = appModel.getProperty("/apiBaseUrl") as string;

		if (!token) {
			this.navTo("login", {}, true);
			return;
		}

		const appView = this.getOwnerComponent().getModel("appView") as JSONModel;
		appView.setProperty("/busy", true);

		try {
			const instances = await CfApiService.getMdiServiceInstances(apiBaseUrl, token);
			const enriched = await CfApiService.enrichWithSpaceAndOrg(instances, token);
			const serviceDataModel = this.getOwnerComponent().getModel("serviceData") as JSONModel;
			serviceDataModel.setProperty("/instances", enriched);
			serviceDataModel.setProperty("/filteredInstances", enriched);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to load service instances.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}

	public onSearchInstances(event: SearchField$LiveChangeEvent): void {
		const query = event.getParameter("newValue")?.toLowerCase() || "";
		const serviceDataModel = this.getOwnerComponent().getModel("serviceData") as JSONModel;
		const all = serviceDataModel.getProperty("/instances") as ServiceInstance[];
		const filtered = query
			? all.filter(inst =>
				inst.name.toLowerCase().includes(query) ||
				(inst.spaceName ?? "").toLowerCase().includes(query) ||
				(inst.orgName ?? "").toLowerCase().includes(query)
			)
			: all;
		serviceDataModel.setProperty("/filteredInstances", filtered);
	}

	public async onInstanceSelect(event: ListBase$SelectionChangeEvent): Promise<void> {
		const item = event.getParameter("listItem");
		const context = item.getBindingContext("serviceData");
		this._selectedInstance = context.getObject() as ServiceInstance;

		// Load the dialog fragment
		if (!this._dialog) {
			this._dialog = await Fragment.load({
				id: this.getView().getId(),
				name: "com.sap.mdi.explorer.fragment.ServiceKeyDialog",
				controller: this
			}) as Dialog;
			this.getView().addDependent(this._dialog);
		}

		// Reset nav container to first page
		const navContainer = this.byId("dialogNavContainer") as NavContainer;
		const keyPage = this.byId("keySelectionPage") as Page;
		navContainer.to(keyPage);

		// Load bindings
		await this._loadBindings();

		this._dialog.open();

		// Deselect the list item
		(this.byId("instanceList") as List).removeSelections(true);
	}

	private async _loadBindings(): Promise<void> {
		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const token = appModel.getProperty("/cfToken") as string;
		const bindingsHref = this._selectedInstance.links.service_credential_bindings.href;

		try {
			const bindings = await CfApiService.getServiceBindings(bindingsHref, token) as ServiceBinding[];
			const keyList = this.byId("keyList") as List;
			keyList.destroyItems();

			for (const binding of bindings) {
				keyList.addItem(new StandardListItem({
					title: binding.name,
					description: `GUID: ${binding.guid}`,
					type: "Navigation"
				}).data("binding", binding));
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to load service keys.";
			MessageBox.error(message);
		}
	}

	public async onKeySelect(event: ListBase$SelectionChangeEvent): Promise<void> {
		const item = event.getParameter("listItem");
		const binding = item.data("binding") as ServiceBinding;

		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const appView = this.getOwnerComponent().getModel("appView") as JSONModel;
		const token = appModel.getProperty("/cfToken") as string;

		appView.setProperty("/busy", true);

		try {
			const details = await CfApiService.getBindingDetails(
				binding.links.self.href, token
			) as unknown as BindingCredentials;

			const creds = details.credentials;
			appModel.setProperty("/credentials/uri", creds.uri);
			appModel.setProperty("/credentials/uaaUrl", creds.uaa.url);
			appModel.setProperty("/credentials/clientId", creds.uaa.clientid);
			appModel.setProperty("/credentials/clientSecret", creds.uaa.clientsecret);
			appModel.setProperty("/selectedInstanceName", this._selectedInstance.name);

			// Move to object type selection step
			this._populateObjectTypeList();
			const navContainer = this.byId("dialogNavContainer") as NavContainer;
			const objectPage = this.byId("objectTypeSelectionPage") as Page;
			navContainer.to(objectPage);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to load key details.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}

	private _populateObjectTypeList(): void {
		const objectTypeList = this.byId("objectTypeList") as List;
		objectTypeList.destroyItems();

		const configs = getAllObjectConfigs();
		for (const config of configs) {
			objectTypeList.addItem(new StandardListItem({
				title: config.displayName,
				description: config.apiPath,
				type: "Navigation"
			}).data("objectKey", config.key));
		}
	}

	public async onObjectTypeSelect(event: ListBase$SelectionChangeEvent): Promise<void> {
		const item = event.getParameter("listItem");
		const objectKey = item.data("objectKey") as string;

		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const appView = this.getOwnerComponent().getModel("appView") as JSONModel;

		appModel.setProperty("/selectedObjectType", objectKey);
		appView.setProperty("/busy", true);

		try {
			// Get MDI token
			const uaaUrl = appModel.getProperty("/credentials/uaaUrl") as string;
			const clientId = appModel.getProperty("/credentials/clientId") as string;
			const clientSecret = appModel.getProperty("/credentials/clientSecret") as string;

			const mdiToken = await AuthService.getMdiToken(uaaUrl, clientId, clientSecret);
			appModel.setProperty("/mdiToken", mdiToken);

			this._dialog.close();
			this.navTo("dataExplorer", { objectType: objectKey });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to get MDI token.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}

	public onDialogNavBack(): void {
		const navContainer = this.byId("dialogNavContainer") as NavContainer;
		navContainer.back();
	}

	public onDialogCancel(): void {
		this._dialog.close();
	}
}
