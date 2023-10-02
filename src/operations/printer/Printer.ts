import MenuStack from "../../MenuStack";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import PrinterMenu from "./PrinterMenu";
import Scrapper from "../../Scrapper";
import decompress from "decompress";
import path from "path";
import fs from "fs";
import { reportsByUser } from "../../utils/reportsUtils";
import { print } from "pdf-to-printer";

const { FRONT_API_LOAD_LAST_REPORTS } = process.env;

export default class Printer {
  private frontService: FrontService;
  constructor() {
    this.frontService = new FrontService();
  }

  async performPrinter(menuStack: MenuStack): Promise<any> {
    menuStack.push(new PrinterMenu());
    const printerMenu = menuStack.peek();

    let printerResponse;
    do {
      const docsSelection = await printerMenu.display();
      if (docsSelection === "Return") {
        menuStack.pop();
        break;
      }

      switch (docsSelection) {
        case "AUD":
          const reportsData = await this.getAudReports();
          printerResponse = await this.printDocs(reportsData.filesFolder);
          break;
      }
    } while (true);

    return printerResponse;
  }

  async printDocs(filesDir: string): Promise<any> {
    const users = Object.getOwnPropertyNames(reportsByUser);
    for (const user of users) {
      const docs = reportsByUser[user as keyof typeof reportsByUser];
      for (const doc of docs) {
        let filePath = path.join(filesDir, doc + ".pdf");
        console.log("Printing: ", filePath);
        await print(filePath, {
          side: "simplex",
          scale: "fit",
          orientation: "portrait",
        });
      }
    }

    return {
      status: 200,
      message: "Docs were printed succesfully.",
    };
  }

  async getAudReports(): Promise<any> {
    try {
      const authTokens = await TokenStorage.getData();
      const response = await this.frontService.getRequest(
        FRONT_API_LOAD_LAST_REPORTS,
        authTokens
      );

      //TODO:: Implement response handling
      if (typeof response !== "string") {
        return;
      }

      const scrapper = new Scrapper(response);
      const lastReportUrl = scrapper.extractAudReportUrl();
      if (!lastReportUrl) {
        throw new Error("Error trying to get last report download URL.");
      }

      const filesDir = path.join(__dirname, "reports");
      const downloaderResponse = await this.frontService.downloadByUrl(
        "23-09-2023.zip",
        filesDir,
        authTokens,
        lastReportUrl
      );
      if (downloaderResponse.status !== 200) {
        throw new Error(downloaderResponse.message);
      }

      // start decompressing process
      console.log("Decompressing...");
      const filesFolder = path.join(filesDir, "26-09-23");
      const files = await decompress(downloaderResponse.filePath, filesFolder);
      if (!files) {
        throw new Error("Error trying to decompress .zip");
      }

      console.log("All reports were saved.");
      return {
        filesFolder,
      };
      // return new Promise((resolve, reject) => {
      //   fs.readdir(filesFolder, (err, files) => {
      //     if (err) {
      //       console.log(err);
      //       reject([]);
      //     }

      //     // filter for .pdf files
      //     const pdfs = files.filter((file) => file.includes(".pdf"));
      //     resolve({
      //       docs: pdfs,
      //       filesFolder,
      //     });
      //   });
      // });
    } catch (err) {
      console.log(err);
    }
  }
}
