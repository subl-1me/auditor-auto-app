import Axios from "axios";
import { HttpsCookieAgent } from "http-cookie-agent/http";
import { CookieJar } from "tough-cookie";
import * as FormData from "form-data";
import * as fsSync from "fs";
import fs from "fs/promises";
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
    formData: FormData | Object | JSON | undefined,
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
            // 'Content-Type': 'application/x-www-form-urlencoded',
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
      return {
        message: err.message,
        status: 500,
      };
    }
  }

  async testRequest(tokens: any, url: string, data: any): Promise<any> {
    const response = await this.http({
      method: "POST",
      url,
      data,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie:
          tokens.aspNetTokenCookie +
          `; mAutSession=${tokens.mAutSession}; .AspNetCore.Antiforgery.2csuwK8zOzQ=CfDJ8KL1KKJTSCJKowGapKsReu-Ui_P3ysG061ob-ghk4yJYGPFEGhUCn_YR23fggsCeu9R_C5qz2Nf8mZGjk2d9bnLQrUi1XiHFU9cIfpU-3ps_Q7t035f2Rnc0gZUGZ_Zp2UwDJiCOjnxntnFX3eu1oD4; `,
      },
    });

    console.log(response);
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
