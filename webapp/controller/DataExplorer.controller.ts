import BaseController from "./BaseController";
import JSONModel from "sap/ui/model/json/JSONModel";
import MessageBox from "sap/m/MessageBox";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import Table from "sap/m/Table";
import Column from "sap/m/Column";
import ColumnListItem from "sap/m/ColumnListItem";
import Text from "sap/m/Text";
import Title from "sap/m/Title";
import VBox from "sap/m/VBox";
import CheckBox from "sap/m/CheckBox";
import Form from "sap/ui/layout/form/Form";
import FormContainer from "sap/ui/layout/form/FormContainer";
import FormElement from "sap/ui/layout/form/FormElement";
import ColumnLayout from "sap/ui/layout/form/ColumnLayout";
import Label from "sap/m/Label";
import type { ListBase$SelectionChangeEvent } from "sap/m/ListBase";
import type { SearchField$LiveChangeEvent } from "sap/m/SearchField";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";
import MdiApiService from "../model/MdiApiService";
import { getObjectConfig } from "../config/MdiObjectRegistry";
import type { MdiObjectConfig, DetailSectionConfig } from "../config/types";

/**
 * @namespace com.sap.mdi.explorer.controller
 */
export default class DataExplorer extends BaseController {

	private _currentConfig: MdiObjectConfig;
	private _detailDialog: Dialog;
	private _allRecords: unknown[] = [];

	public onInit(): void {
		this.getRouter().getRoute("dataExplorer").attachPatternMatched(this._onRouteMatched, this);
	}

	private async _onRouteMatched(event: Route$PatternMatchedEvent): Promise<void> {
		const args = event.getParameter("arguments") as Record<string, string>;
		const objectType = args.objectType;

		const config = getObjectConfig(objectType);
		if (!config) {
			MessageBox.error(`Unknown object type: ${objectType}`);
			return;
		}

		this._currentConfig = config;
		this._allRecords = [];

		// Update page title
		(this.byId("pageTitle") as Title).setText(`Data Explorer - ${config.displayName}`);
		(this.byId("tableTitle") as Title).setText(config.displayName);

		// Build dynamic table
		this._buildTableColumns(config);
		this._buildColumnListItemTemplate(config);

		// Reset MDI data model
		const mdiModel = this.getOwnerComponent().getModel("mdiData") as JSONModel;
		mdiModel.setProperty("/records", []);
		mdiModel.setProperty("/displayedRecords", []);
		mdiModel.setProperty("/nextDeltaToken", "");
		mdiModel.setProperty("/hasMoreEvents", false);
		mdiModel.setProperty("/recordCount", 0);

		// Load initial data
		await this._loadData();
	}

	private _buildTableColumns(config: MdiObjectConfig): void {
		const table = this.byId("dataTable") as Table;
		table.destroyColumns();

		for (const col of config.listColumns) {
			table.addColumn(new Column({
				header: new Text({ text: col.label }),
				width: col.width || "auto"
			}));
		}
	}

	private _buildColumnListItemTemplate(config: MdiObjectConfig): void {
		const table = this.byId("dataTable") as Table;

		const cells = config.listColumns.map(col => {
			const cell = new Text({ wrapping: false });
			cell.bindProperty("text", {
				model: "mdiData",
				path: col.path,
				formatter: (val: unknown) => (val != null ? String(val) : "")
			});
			return cell;
		});

		const template = new ColumnListItem({
			type: "Navigation",
			cells: cells
		});

		table.bindItems({
			path: "mdiData>/displayedRecords",
			template: template,
			templateShareable: false
		});
	}

	private async _loadData(append?: boolean): Promise<void> {
		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const mdiModel = this.getOwnerComponent().getModel("mdiData") as JSONModel;
		const appView = this.getOwnerComponent().getModel("appView") as JSONModel;

		const mdiToken = appModel.getProperty("/mdiToken") as string;
		const uri = appModel.getProperty("/credentials/uri") as string;

		if (!mdiToken || !uri) {
			MessageBox.error("Missing MDI credentials. Please go back and select a service key.");
			return;
		}

		const deltaToken = append ? mdiModel.getProperty("/nextDeltaToken") as string : undefined;
		appView.setProperty("/busy", true);

		try {
			const result = await MdiApiService.fetchLogRecords(
				uri,
				this._currentConfig.apiPath,
				mdiToken,
				deltaToken
			);

			if (append) {
				this._allRecords = this._allRecords.concat(result.records);
			} else {
				this._allRecords = result.records;
			}

			mdiModel.setProperty("/records", this._allRecords);
			mdiModel.setProperty("/displayedRecords", this._allRecords);
			mdiModel.setProperty("/nextDeltaToken", result.nextDeltaToken);
			mdiModel.setProperty("/hasMoreEvents", result.hasMoreEvents);
			mdiModel.setProperty("/recordCount", this._allRecords.length);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Failed to load MDI data.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}

	public async onLoadMore(): Promise<void> {
		await this._loadData(true);
	}

	public async onRefresh(): Promise<void> {
		this._allRecords = [];
		await this._loadData(false);
	}

	public onSearchRecords(event: SearchField$LiveChangeEvent): void {
		const query = (event.getParameter("newValue") || "").toLowerCase();
		const mdiModel = this.getOwnerComponent().getModel("mdiData") as JSONModel;

		if (!query) {
			mdiModel.setProperty("/displayedRecords", this._allRecords);
			mdiModel.setProperty("/recordCount", this._allRecords.length);
			return;
		}

		const filtered = this._allRecords.filter(record => {
			return JSON.stringify(record).toLowerCase().includes(query);
		});
		mdiModel.setProperty("/displayedRecords", filtered);
		mdiModel.setProperty("/recordCount", filtered.length);
	}

	public async onRecordSelect(event: ListBase$SelectionChangeEvent): Promise<void> {
		const item = event.getParameter("listItem");
		const context = item.getBindingContext("mdiData");
		const record = context.getObject() as Record<string, unknown>;

		if (!this._detailDialog) {
			this._detailDialog = await Fragment.load({
				id: this.getView().getId(),
				name: "com.sap.mdi.explorer.fragment.ObjectDetailDialog",
				controller: this
			}) as Dialog;
			this.getView().addDependent(this._detailDialog);
		}

		// Set dialog title
		const title = this._currentConfig.titleExtractor(record);
		this._detailDialog.setTitle(title);

		// Build dynamic form
		const container = this.byId("detailFormContainer") as VBox;
		container.destroyItems();

		const form = this._buildDetailForm(this._currentConfig.detailSections, record);
		container.addItem(form);

		// Also add a "Raw JSON" section
		// Use setText() instead of constructor arg — JSON starts with '{' which
		// UI5 applySettings() would try to parse as a binding expression.
		const jsonText = new Text({ renderWhitespace: true }).addStyleClass("sapUiSmallMarginTop");
		jsonText.setText(JSON.stringify(record, null, 2));
		const rawJson = new VBox({
			items: [
				new Title({ text: "Raw JSON", level: "H4" }),
				jsonText
			]
		}).addStyleClass("sapUiMediumMarginTop");
		container.addItem(rawJson);

		this._detailDialog.open();

		// Deselect
		(this.byId("dataTable") as Table).removeSelections(true);
	}

	private _buildDetailForm(
		sections: DetailSectionConfig[],
		record: Record<string, unknown>
	): Form {
		const form = new Form({
			editable: false,
			layout: new ColumnLayout({
				columnsM: 2,
				columnsL: 3,
				columnsXL: 4
			})
		});

		for (const section of sections) {
			const formContainer = new FormContainer({
				title: section.title
			});

			for (const field of section.fields) {
				const value = this._resolveNestedPath(record, field.path);
				let control: Text | CheckBox;

				switch (field.type) {
					case "boolean":
						control = new CheckBox({
							selected: !!value,
							editable: false
						});
						break;
					case "date":
						control = new Text({
							text: value ? String(value) : ""
						});
						break;
					case "json":
					case "array": {
						// Use setText() — JSON.stringify produces strings starting with '{' or '['
						// which UI5 applySettings() would misinterpret as binding expressions.
						const jsonStr = (value != null && typeof value === "object")
							? JSON.stringify(value, null, 2)
							: String(value ?? "");
						control = new Text({ renderWhitespace: true });
						(control as Text).setText(jsonStr);
						break;
					}
					default:
						control = new Text({
							text: String(value ?? "")
						});
				}

				formContainer.addFormElement(new FormElement({
					label: new Label({ text: field.label }),
					fields: [control]
				}));
			}

			form.addFormContainer(formContainer);
		}

		return form;
	}

	private _resolveNestedPath(obj: unknown, path: string): unknown {
		const parts = path.split("/");
		let current: unknown = obj;
		for (const part of parts) {
			if (current == null || typeof current !== "object") return undefined;
			current = (current as Record<string, unknown>)[part];
		}
		return current;
	}

	public onDetailClose(): void {
		this._detailDialog.close();
	}

	public onNavBack(): void {
		const serviceModel = this.getOwnerComponent().getModel("serviceData") as JSONModel;
		const subaccountGuid = serviceModel.getProperty("/currentSubaccountGuid") as string;
		if (subaccountGuid) {
			this.navTo("serviceSelection", { subaccount: subaccountGuid });
		} else {
			this.navTo("subaccountSelection");
		}
	}

	public onLogout(): void {
		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const mdiModel = this.getOwnerComponent().getModel("mdiData") as JSONModel;
		const serviceModel = this.getOwnerComponent().getModel("serviceData") as JSONModel;

		// Clear all tokens and credentials
		appModel.setData({
			cfToken: "",
			mdiToken: "",
			apiBaseUrl: "",
			credentials: { uri: "", uaaUrl: "", clientId: "", clientSecret: "" },
			selectedObjectType: "",
			selectedInstanceName: ""
		});
		mdiModel.setData({ records: [], displayedRecords: [], nextDeltaToken: "", hasMoreEvents: false, recordCount: 0 });
		serviceModel.setData({ instances: [], filteredInstances: [], subaccounts: [], filteredSubaccounts: [], currentSubaccountName: "", currentSubaccountGuid: "" });

		this.navTo("login", {}, true);
	}
}
