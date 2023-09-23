import ReservationSheet from "./types/ReservationSheet";
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

  extractReservationSheetData(): ReservationSheet[] {
    // Localize how many sheets are
    const sheetElemPattern = /"FolioItem" id="td_\d"|"FolioClosed" id="td_\d"/g;
    const sheetElemItems = this.htmlBody.match(sheetElemPattern);
    if (!sheetElemItems) {
      throw new Error("Error trying to get reservation sheets");
    }

    const totalSheets = sheetElemItems.length;
    let sheets: ReservationSheet[] = [];
    for (let i = 1; i <= totalSheets; i++) {
      const currentSheet = sheetElemItems.find((sheetItem) =>
        sheetItem.includes(`td_${i}`)
      );
      if (currentSheet?.includes("FolioItem")) {
        // If current sheet is open search its datagrid
        let dataGridElemPattern = new RegExp(
          `<div class="datagrid" id='tab${i}'>([\\s\\S\\t.]*?)<\/div>`
        );
        const datagrid = this.htmlBody.match(dataGridElemPattern);
        if (!datagrid) {
          throw new Error("data grid not found");
        }
        // on each datagrid search for balance
        const sheetBalancePattern = new RegExp(
          `<span id="rptFoliosContent_ctl\\d+_lblfolio_balance">([\\s\\S\\t.]*?)<\/span>`
        );
        const result = datagrid[0].match(sheetBalancePattern);
        if (result) {
          const sheetBalanceSpan = result[0];
          const balance = sheetBalanceSpan.match(BalanceAmountPattern);
          if (balance) {
            const isBalanceCredit = !balance.includes("-");
            // Clean balance string
            const balanceAmount = Number(balance[0].replace(/[$,-]/g, ""));
            const isBalanceZero = balanceAmount === 0;

            console.log({ isBalanceCredit, isBalanceZero, balanceAmount });
          } else {
            throw new Error("SCRAPPER: Error trying to extract balance");
          }
        } else {
          throw new Error(`Error trying to get sheet #${i} balance`);
        }
        // console.log(result);
        // if (result && result[1]) {
        //   let isCredit = !result[1].includes("-");
        //   const balance = Number(
        //     result[1]
        //       .replace("-", "")
        //       .replace(" ", "")
        //       .replace("$", "")
        //       .replace(",", "")
        //   );
        //   sheets.push({
        //     sheetNo: i,
        //     isOpen: true,
        //     balance: { isCredit, amount: balance },
        //     invoices: [],
        //   });
        // } else {
        //   throw new Error("fuck");
        // }
      } else {
        // otherwise put default data
        sheets.push({
          sheetNo: i,
          isOpen: false,
          balance: { isCredit: false, amount: 0 },
          invoices: [],
        });
      }

      // console.log(datagrid + "\n--------\n");
    }

    // Get sheet balance from data-grid
    // in this case we should start at 1 position because reservation's sheets
    // handles only numbers between [1-8]
    // for (let i = 1; i < closedSheets.length - 1; i++) {

    //   const matchResults = this.htmlBody.match(dataGridElemPattern);
    //   if (!matchResults) {
    //     console.log(`Error loading sheet no. ${i} data.`);
    //   } else {
    //     // get sheet balance
    //     console.log(closedSheets);
    //     const sheetBalancePattern = new RegExp(
    //       `<span id="rptFoliosContent_ctl00_lblfolio_balance">(.*)
    //       <\/span>`
    //     );
    //     const balanceMatchResult = matchResults[0].match(sheetBalancePattern);
    //     console.log(balanceMatchResult);
    //   }
    // }

    return sheets;
  }
}
