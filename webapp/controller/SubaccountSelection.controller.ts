import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import List from "sap/m/List";
import type { ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import CfApiService from "../model/CfApiService";

interface Subaccount {
	orgGuid: string;
	orgName: string;
	count: number;
}

/**
 * @namespace com.sap.mdi.explorer.controller
 */
export default class SubaccountSelection extends BaseController {

	public onInit(): void {
		this.getRouter().getRoute("subaccountSelection").attachPatternMatched(this._onRouteMatched, this);
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
		const serviceDataModel = this.getOwnerComponent().getModel("serviceData") as JSONModel;
		appView.setProperty("/busy", true);

		try {
			// Load and enrich all MDI instances once; reuse on later visits
			let instances = serviceDataModel.getProperty("/instances") as unknown[];
			if (!instances || instances.length === 0) {
				const fetched = await CfApiService.getMdiServiceInstances(apiBaseUrl, token);
				instances = await CfApiService.enrichWithSpaceAndOrg(fetched, token);
				serviceDataModel.setProperty("/instances", instances);
			}

			const subaccounts = CfApiService.groupBySubaccount(instances);
			serviceDataModel.setProperty("/subaccounts", subaccounts);
			serviceDataModel.setProperty("/filteredSubaccounts", subaccounts);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to load subaccounts.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}

	public onSearchSubaccounts(event: SearchField$LiveChangeEvent): void {
		const query = event.getParameter("newValue")?.toLowerCase() || "";
		const serviceDataModel = this.getOwnerComponent().getModel("serviceData") as JSONModel;
		const all = serviceDataModel.getProperty("/subaccounts") as Subaccount[];
		const filtered = query
			? all.filter(sub => sub.orgName.toLowerCase().includes(query))
			: all;
		serviceDataModel.setProperty("/filteredSubaccounts", filtered);
	}

	public onSubaccountSelect(event: ListBase$SelectionChangeEvent): void {
		const item = event.getParameter("listItem");
		const subaccount = item.getBindingContext("serviceData").getObject() as Subaccount;
		(this.byId("subaccountList") as List).removeSelections(true);
		this.navTo("serviceSelection", { subaccount: subaccount.orgGuid });
	}
}
