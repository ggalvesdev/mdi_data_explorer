import BaseController from "./BaseController";
import MessageBox from "sap/m/MessageBox";
import Input from "sap/m/Input";
import Select from "sap/m/Select";
import JSONModel from "sap/ui/model/json/JSONModel";
import AuthService from "../model/AuthService";
import { URLHelper } from "sap/m/library";

/**
 * @namespace com.sap.mdi.explorer.controller
 */
export default class Login extends BaseController {

	public onInit(): void {
		this.getRouter().getRoute("login").attachPatternMatched(this._onRouteMatched, this);
	}

	private _onRouteMatched(): void {
		// Reset login form if navigating back
	}

	/**
	 * Open the SSO passcode page for the selected region in a new tab.
	 * The user copies the one-time code shown there and pastes it into the form.
	 */
	public onGetPasscode(): void {
		const region = (this.byId("regionSelect") as Select).getSelectedKey();
		URLHelper.redirect(`https://${region}/passcode`, true);
	}

	public async onLogin(): Promise<void> {
		const passcode = (this.byId("passcodeInput") as Input).getValue().trim();
		const region = (this.byId("regionSelect") as Select).getSelectedKey();

		if (!passcode) {
			MessageBox.error("Please enter your one-time passcode.");
			return;
		}

		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const appView = this.getOwnerComponent().getModel("appView") as JSONModel;
		appView.setProperty("/busy", true);

		try {
			const result = await AuthService.loginToCf(region, passcode);
			appModel.setProperty("/cfToken", result.accessToken);
			appModel.setProperty("/apiBaseUrl", result.apiBaseUrl);
			// Clear any data cached from a previous session/account
			const serviceData = this.getOwnerComponent().getModel("serviceData") as JSONModel;
			serviceData.setProperty("/instances", []);
			serviceData.setProperty("/subaccounts", []);
			this.navTo("subaccountSelection");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Login failed. Please check your passcode.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}
}
