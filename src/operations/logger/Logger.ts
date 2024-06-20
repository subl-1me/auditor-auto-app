import MenuStack from "../../MenuStack";
import Login from "./LoginMenu";
import User from "./types/User";
import FrontService from "../../services/FrontService";
import FormData from "form-data";
import Scrapper from "../../Scrapper";
import { write, getConfig } from "../../utils/frontSystemUtils";

import dotenv from "dotenv";
import Spinnies from "spinnies";
dotenv.config();

const { FRONT_API_LOGIN_PAGE, FRONT_API_SEARCH_RSRV } = process.env;

export default class Logger {
  private frontService: FrontService;
  constructor() {
    this.frontService = new FrontService();
  }

  /**
   * @description It makes an http request to any Front's endpoint by sending
   * request-verification-token to get ASP.NET auth token
   * @returns Authentication token or throws an error
   */
  async getAspNetToken(verificationToken: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("_hdn001", "KFwHWn911eaVeJhL++adWg==");
      formData.append("_hdn002", "");
      formData.append("_hdnPropName", "City Express Ciudad Juarez");
      formData.append("_hdnRoleName", "RecepcionT");
      formData.append("_hdnAppDate", "2023/10/09");
      formData.append("__RequestVerificationToken", verificationToken);

      // I'll use API search endpoint to get ASP token at first request
      const response = await this.frontService.postRequest(
        formData,
        FRONT_API_SEARCH_RSRV || ""
      );

      const { headers } = response;
      const aspNetToken = headers["set-cookie"] || null;

      const scrapper = new Scrapper(response.data);
      const systemAppDate = scrapper.extractSystemAppDate();
      await write({ appDate: systemAppDate });

      if (!aspNetToken) {
        throw new Error(
          `Error trying to recieve asp-net token from server. Try again.`
        );
      }
      return aspNetToken[0];
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  async performLogin(menuStack: MenuStack): Promise<any> {
    menuStack.push(new Login());
    const loginMenu = menuStack.peek();

    // get user
    const user: User = await loginMenu.display();
    const spinnies = new Spinnies();
    spinnies.add("spinner-1", { text: "Login..." });
    const verificationToken = await this.getRequestVerificationToken();
    const data = this.setupLoginFormData(user, verificationToken);

    const response = await this.frontService.postRequest(
      data,
      FRONT_API_LOGIN_PAGE || ""
    );

    // If login success we should extract all remaining auth tokens
    const scrapper = new Scrapper(response.data);
    const bearerToken = scrapper.extractBearerToken();

    // Get .net session
    const { _header } = response.request;
    const mAutSessionPattern = /mAutSession=(\S+)/;

    try {
      // mAuSessionLocal storages the entire cookie string to save it in local and use it
      // in future requests.
      const mAutSessionCookie = _header.match(mAutSessionPattern)[0];
      const aspNetToken = await this.getAspNetToken(verificationToken);

      // mAutSessionValue contains only token
      const mAutSession = mAutSessionCookie.split("=")[1];

      // get front system app and save it in local
      spinnies.succeed("spinner-1", { text: "You're on." });
      menuStack.pop();
      return {
        status: 200,
        message: "",
        tokens: {
          mAutSession,
          verificationToken,
          aspNetTokenCookie: aspNetToken,
          bearerToken,
        },
      };
    } catch (err: any) {
      return {
        status: 400,
        message: "An unexpected error ocurred trying to login.",
        err,
      };
    }
  }

  async getRequestVerificationToken(): Promise<string> {
    const htmlBody = await this.frontService.getRequest(FRONT_API_LOGIN_PAGE);
    if (typeof htmlBody !== "string") {
      throw new Error(
        "Error trying to get HTML body. Expected string as as response;"
      );
    }
    const scrapper = new Scrapper(htmlBody);
    const verificationToken = scrapper.extractVerificationToken();

    return verificationToken;
  }

  setupLoginFormData(user: User, verificationToken: string): FormData {
    const formData = new FormData();
    formData.append("Input.UseName", user.username);
    formData.append("Input.Password", user.password);
    formData.append("__RequestVerificationToken", verificationToken);
    formData.append("input.RememberMe", "false");
    return formData;
  }
}
