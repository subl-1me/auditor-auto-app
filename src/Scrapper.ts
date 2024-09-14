import path from "path";
import dotenv, { configDotenv } from "dotenv";
dotenv.config();
const { FRONT_API_URL } = process.env;

import {
  InputTokenContainerPattern,
  BearerVarDeclarationPattern,
  BearerValuePattern,
  SystemDatePattern,
} from "./patterns";

export default class Scrapper {
  constructor(private readonly htmlBody: string) {}

  extractVerificationToken(): string {
    // Scrapper
    const inputTokenContainerResult = this.htmlBody.match(
      InputTokenContainerPattern
    );
    if (!inputTokenContainerResult) {
      throw new Error("INPUT TOKEN NOT FOUND");
    }

    const inputTokenContainer = inputTokenContainerResult[0];

    // Extract value
    const inputTokenSegments = inputTokenContainer.split("=");
    const verificationToken = inputTokenSegments[3];
    return this.tokenCleaner(verificationToken);
  }

  private tokenCleaner(token: string): string {
    const bannedCharacters = `/ "" >`;
    const bannedCharactersPattern = new RegExp(
      "[" + bannedCharacters + "]",
      "g"
    );

    const cleanToken = token.replace(bannedCharactersPattern, "");
    return cleanToken;
  }

  extractCertificateId(): string | null {
    let certificate = null;
    const certificateElementPattern = new RegExp(
      `<label id="sCertificated"([\\s\\S\\t.]*?)>(.*)<\/label>`
    );

    const certificateMatch = this.htmlBody.match(certificateElementPattern);
    if (certificateMatch) {
      let elemResult = certificateMatch[0].match(/\d+/);
      certificate = elemResult ? elemResult[0] : null;
    }

    return certificate;
  }

  extractExtraFee(): any {
    const extraFreePattern = /<a> id="aExtraFee"([\s\S\t.]*?)<\/a>/;
    const extraFeeMatch = this.htmlBody.match(extraFreePattern);

    console.log(extraFeeMatch);
  }

  extractRoutings(): any {
    let routings: any = [];
    const varName = "itemArray";
    const itemsPattern = new RegExp(`\\b${varName}\\s*=\\s*"(.*?)"`);
    const itemMatch = this.htmlBody.match(itemsPattern);
    if (!itemMatch) {
      return routings;
    }

    // console.log(this.htmlBody);
    const itemArrayParsed = itemMatch[1].replace(/\\u0022/g, `"`);
    routings = JSON.parse(itemArrayParsed);

    return routings;
  }

  extractBearerToken(): string {
    const bearerVarDeclaration = this.htmlBody.match(
      BearerVarDeclarationPattern
    );
    const BearerVar = bearerVarDeclaration ? bearerVarDeclaration[0] : "";
    if (BearerVar === "") {
      throw new Error("Bearer token not found.");
    }

    const bearerResult = BearerVar.match(BearerValuePattern);
    if (!bearerResult) {
      throw new Error("Invalid bearer token generation.");
    }
    return bearerResult[1];
  }

  extractAudReportUrl(): string | null {
    const pattern = new RegExp(`<a id="lnkLastRPT" (.*)>(.*)<\/a>`);
    const match = this.htmlBody.match(pattern);

    if (match) {
      const result = match[0];
      const hrefContent = result.match(/href="([^"]*)"/i);
      if (hrefContent) {
        const pathSegment = hrefContent[1].slice(2, hrefContent[1].length);
        const reportPath = path
          .join(FRONT_API_URL || "null", pathSegment)
          .replaceAll("&#39", "%27")
          .replaceAll(";", "");

        return reportPath;
      }
    }
    return null;
  }

  extractSystemAppDate(): string {
    const result = this.htmlBody.match(SystemDatePattern);
    // console.log(result);
    return result ? result[0] : "";
  }

  // extractDataGridElem(tabNumber: number): string | null {
  //   let dataGridElemPattern = new RegExp(
  //     `<div class="datagrid" id='tab${tabNumber}'>([\\s\\S\\t.]*?)<\/div>`
  //   );
  //   const datagrid = this.htmlBody.match(dataGridElemPattern);
  //   return datagrid ? datagrid[0] : null;
  // }

  extractTotalSheets(): string[] | null {
    const sheetElemPattern = /"FolioItem" id="td_\d"|"FolioClosed" id="td_\d"/g;
    const sheetElemItems = this.htmlBody.match(sheetElemPattern);
    return sheetElemItems ? sheetElemItems : null;
  }

  /**
   * @description Extracts reservation contact emails
   * @returns An object that contains guest and corporation email
   */
  extractContactEmails(): object {
    const guestEmail = this.extractReservationEmailContact();
    const corpEmail = this.extractReservationEmailCorp();
    return { guestEmail, corpEmail };
  }

  extractReservationEmailCorp(): string | null {
    const CorpEmailFieldPattern = /<input[^>]*id="txtMail"[^>]*>/;

    const corpEmailFieldElem = this.htmlBody.match(CorpEmailFieldPattern);
    if (!corpEmailFieldElem) {
      return null;
    }

    const ValuePattern = /value="([^"]*)"/;
    const emailValue = corpEmailFieldElem[0].match(ValuePattern);
    return emailValue ? emailValue[1] : null;
  }

  extractReservationEmailContact(): string | null {
    // const GuestEmailFieldPattern = new RegExp(
    //   `<input(.*)id="txtPers_mail"(.*)>`
    // );
    const guestEmailFieldPattern = /<input[^>]*id="txtPers_mail"[^>]*>/;
    const guestEmailFieldElem = this.htmlBody.match(guestEmailFieldPattern);
    // console.log(guestEmailFieldElem);
    if (!guestEmailFieldElem) {
      return null;
    }

    // Check the email pattern is not required because Front2Go's API do it for us
    const ValuePattern = /value="([^"]*)"/;
    const emailValue = guestEmailFieldElem[0].match(ValuePattern);
    return emailValue ? emailValue[1] : null;
  }

  extractReservationRateCode(): string | null {
    const rateCodeVarPattern = new RegExp(`var rate_code = "(.*)";`);
    const rateCodeMatch = this.htmlBody.match(rateCodeVarPattern);
    if (rateCodeMatch) {
      return rateCodeMatch[1]; // rate code always match at position 2
    }

    console.log(this.htmlBody);
    return null;
  }

  // Only use if there's a Virtual Card attached
  extractReservationRateDescription(): string {
    const spanDescPattern = new RegExp(
      `<span id="lblRateDesc"([\\s\\S\\t.]*?)>(.*)<\/span>`
    );
    const spanDescMatch = this.htmlBody.match(spanDescPattern);
    if (!spanDescMatch) {
      return "Failed to match";
    }

    const spanDesc = spanDescMatch[0];
    return spanDesc;
  }

  extractReservationLogs(): any {
    const logsTableRegExp = /<tbody>([\s\S\t.]*?)<\/tbody>/;
    const table = this.htmlBody.match(logsTableRegExp);
    if (!table) {
      console.log("No log matches.");
      return [];
    }

    const tableRowRegExp = /<tr>([\s\S\t/]*?)<\/tr>/g;
    const tableRows = table[0].match(tableRowRegExp);
    if (!tableRows || tableRows.length === 0) {
      console.log("No table rows found.");
      return [];
    }

    return tableRows;
  }

  extractGuaranteeDocs(): any[] {
    const validItems = [
      "Cupón agencia de viajes",
      "Carta garantía, cargo a tarjeta de crédito",
      "Carta garantía de empresa",
    ];

    const tableDataPattern =
      /<tr class="datosTabla">([\s\S\t.]*?)<\/tr>|<tr class="datosTablaAlter">([\s\S\t.]*?)<\/tr>/g;
    const dataTables = this.htmlBody.match(tableDataPattern);
    if (!dataTables) {
      return [];
    }

    let docs: any[] = [];
    dataTables.forEach((table) => {
      const type = validItems.filter((item) => table.includes(item)).shift();
      const docIdPattern = /fjsOpenDoc\('\d+'\)/;
      const docIdMatch = table.match(docIdPattern);
      if (docIdMatch) {
        const id = (docIdMatch[0].match(/\d+/) || [null])[0];
        docs.push({
          id,
          type,
        });
      }
    });

    return docs;
  }
}
