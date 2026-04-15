import BaseController from "./BaseController";
import MessageBox from "sap/m/MessageBox";
import Input from "sap/m/Input";
import Select from "sap/m/Select";
import JSONModel from "sap/ui/model/json/JSONModel";
import AuthService from "../model/AuthService";

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

	public async onLogin(): Promise<void> {
		const email = (this.byId("emailInput") as Input).getValue().trim();
		const password = (this.byId("passwordInput") as Input).getValue();
		const region = (this.byId("regionSelect") as Select).getSelectedKey();

		if (!email || !password) {
			MessageBox.error("Please enter your email and password.");
			return;
		}

		const appModel = this.getOwnerComponent().getModel() as JSONModel;
		const appView = this.getOwnerComponent().getModel("appView") as JSONModel;
		appView.setProperty("/busy", true);

		try {
			const result = await AuthService.loginToCf(region, email, password);
			appModel.setProperty("/cfToken", result.accessToken);
			appModel.setProperty("/apiBaseUrl", result.apiBaseUrl);
			this.navTo("serviceSelection");
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
			MessageBox.error(message);
		} finally {
			appView.setProperty("/busy", false);
		}
	}
}
