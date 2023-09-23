import Axios from "axios";
import { HttpsCookieAgent } from "http-cookie-agent/http";
import { CookieJar } from "tough-cookie";
import * as FormData from "form-data";

export default class FrontService {
  private jar: CookieJar;
  private http: any;
  constructor() {
    this.jar = new CookieJar();
    // setup axios http to save cookies
    this.http = Axios.create({
      httpsAgent: new HttpsCookieAgent({
        cookies: {
          jar: this.jar,
        },
      }),
    });
  }

  /**
   * Creates a new post request
   * @param {object} data Data to send to API
   * @param {string} endpoint API URL
   */
  async postRequest(
    formData: FormData | Object,
    endpoint: string,
    authentication?: any
  ): Promise<any> {
    try {
      if (endpoint === "") {
        throw new Error("API endpoint cannot be an empty string");
      }

      let response;
      if (authentication) {
        response = await this.http({
          method: "POST",
          url: endpoint,
          data: formData,
          headers: {
            Authorization: `Bearer ${authentication.bearerToken}`,
            Cookie: authentication.aspNetTokenCookie,
          },
        });
      } else {
        response = await this.http({
          method: "POST",
          url: endpoint,
          data: formData,
        });
      }

      const { statusCode } = response.request.res;
      if (statusCode !== 200) {
        throw new Error(
          `Invalid status code attemping to login: ${statusCode}.`
        );
      }
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  /**
   *
   * @param endpoint API URL
   * @returns response data as string or object
   */
  async getRequest(endpoint?: string, authentication?: any): Promise<string> {
    //TODO: Fix this error with Typescript, doesn't recognize
    // .ENV variables so endpoint must be optional
    let response;
    console.log(`Generando request a: ${endpoint}`);
    if (authentication) {
      response = await this.http({
        method: "GET",
        url: endpoint,
        headers: {
          Authorization: `Bearer ${authentication.bearerToken}`,
          Cookie: authentication.aspNetTokenCookie,
        },
      });
      const { statusCode } = response.request.res;
      if (statusCode !== 200) {
        throw new Error(
          `Invalid status code at Front Service's response: ${statusCode}`
        );
      }
    } else {
      response = await this.http.get(endpoint);
      const { statusCode } = response.request.res;

      if (statusCode !== 200) {
        throw new Error(
          `Invalid status code at Front Service's response: ${statusCode}`
        );
      }
    }

    return response.data;
  }
}
