import Axios from "axios";
import { HttpsCookieAgent } from "http-cookie-agent/http";
import { CookieJar } from "tough-cookie";
import * as FormData from "form-data";
import * as fsSync from "fs";
import fs from "fs/promises";
import Ledger from "../types/Ledger";
import path from "path";

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
   * @param {object} formData Data to send to API
   * @param {string} endpoint API URL
   */
  async postRequest(
    formData: FormData | Object | JSON,
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
            Cookie:
              authentication.aspNetTokenCookie +
              `; mAutSession=${authentication.mAutSession}; `,
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
      console.log(err);
      throw new Error(err.message);
    }
  }

  async downloadByUrl(
    fileName: string,
    fileDir: string,
    authentication: any,
    endpoint?: string,
    data?: any
  ): Promise<any> {
    if (!endpoint) {
      throw new Error("Endpoint cannot be null.");
    }

    // console.log("Downloading reports file...");
    const response = await this.http({
      method: data ? "POST" : "GET",
      url: endpoint,
      responseType: "stream",
      data,
      headers: {
        Authorization: `Bearer ${authentication.bearerToken}`,
        Cookie:
          authentication.aspNetTokenCookie +
          ` mAutSession=${authentication.mAutSession}`,
      },
    });

    const stream = response.data;
    const filePath = path.join(fileDir, fileName);

    if (!fsSync.existsSync(fileDir)) {
      console.log("Creating docs directory...");
      await fs.mkdir(fileDir);
    }

    const fileStream = fsSync.createWriteStream(filePath);
    stream.pipe(fileStream);

    return new Promise((resolve, reject) => {
      fileStream.on("finish", () => {
        resolve({
          status: 200,
          message: "Report downloaded successfully",
          filePath,
        });
      });

      fileStream.on("error", (err) => {
        reject({
          status: 400,
          message: err.message,
        });
      });
    });
  }

  /**
   *
   * @param endpoint API URL
   * @returns response data as string or object
   */
  async getRequest(endpoint?: string, authentication?: any): Promise<any> {
    try {
      //TODO: Fix this error with Typescript, doesn't recognize
      // .ENV variables so endpoint must be optional
      let response;
      if (authentication) {
        response = await this.http({
          method: "GET",
          url: endpoint,
          headers: {
            Authorization: `Bearer ${authentication.bearerToken}`,
            // "X-Requested-With": "XMLHttpRequest",
            Cookie:
              authentication.aspNetTokenCookie +
              ` mAutSession=${authentication.mAutSession};`,
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
      // console.log(response);
      return response.data;
    } catch (err: any) {
      // console.log(err);
      return err.message;
    }
  }
}
