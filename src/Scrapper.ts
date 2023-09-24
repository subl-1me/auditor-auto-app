import ReservationSheet from "./types/Ledger";
import {
  BalanceAmountPattern,
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

  extractBearerToken(): string {
    const bearerVarDeclaration = this.htmlBody.match(
      BearerVarDeclarationPattern
    );
    const BearerVar = bearerVarDeclaration ? bearerVarDeclaration[0] : "";
    if (BearerVar === "") {
      throw new Error("Bearer token was not found in request response.");
    }

    const bearerResult = BearerVar.match(BearerValuePattern);
    if (!bearerResult) {
      throw new Error("Invalid bearer token generation.");
    }

    return bearerResult[1];
  }

  extractSystemAppDate(): string {
    const result = this.htmlBody.match(SystemDatePattern);
    if (!result) return "";
    return result[0];
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

  // extractSheetBalance(): string | null {
  //   const sheetBalancePattern = new RegExp(
  //     `<span id="rptFoliosContent_ctl\\d+_lblfolio_balance">([\\s\\S\\t.]*?)<\/span>`
  //   );
  //   return null;
  // }

  //   extractSheetBasicData(): ReservationSheet[] {
  //     return [];
  //   //   // Localize how many sheets are
  //   //   let sheets: ReservationSheet[] = [];
  //   //   const sheetElemItems = this.extractAllSheet();
  //   //   if (!sheetElemItems) {
  //   //     throw new Error(
  //   //       "No matches were found for HTML sheet elements. Verify the pattern."
  //   //     );
  //   //   }

  //   //   sheetElemItems.forEach((sheetElem, index) => {
  //   //     if (sheetElem.includes("FolioItem")) {
  //   //       // It means sheet is open
  //   //       const dataGridElem = this.extractDataGridElem(index);
  //   //       if (!dataGridElem) {
  //   //         throw new Error(
  //   //           "No matches were found for HTML data-grid element. Verify the pattern."
  //   //         );
  //   //       }

  //   //       const result = dataGridElem[0].match(sheetBalancePattern);
  //   //       if (result) {
  //   //         const sheetBalanceSpan = result[0];
  //   //         const balance = sheetBalanceSpan.match(BalanceAmountPattern);
  //   //         if (balance) {
  //   //           const isCredit = balance[0].includes("-");
  //   //           // Clean balance string
  //   //           const balanceAmount = Number(balance[0].replace(/[$,-]/g, ""));
  //   //           sheets.push({
  //   //             sheetNo: index,
  //   //             isOpen: true,
  //   //             balance: { isCredit, amount: balanceAmount },
  //   //           });
  //   //         } else {
  //   //           throw new Error("SCRAPPER: Error trying to extract balance");
  //   //         }
  //   //       } else {
  //   //         throw new Error(`Error trying to get sheet #${index} balance`);
  //   //       }
  //   //     } else {
  //   //       // otherwise put default data
  //   //       sheets.push({
  //   //         sheetNo: index,
  //   //         isOpen: false,
  //   //         balance: { isCredit: false, amount: 0 },
  //   //       });
  //   //     }
  //   //   });
  //   //   return sheets;
  //   // }
}
