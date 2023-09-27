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

  /**
   * @description Extracts reservation contact emails
   * @returns An object that contains guest and corporation email
   */
  extractContactEmails(): object {
    const guestEmail = this.extractReservationEmailContact();
    const corpEmail = this.extractReservationEmailCorp();
    return { guestEmail, corpEmail };
  }

  extractReservationEmailContact(): string | null {
    const GuestEmailFieldPattern = new RegExp(
      `<input class="form-control CajaText txtNRequired" id="txtPers_mail" name="txtPers_mail" placeholer="(.*)" type="text" value="(.*)" readonly="readOnly" />`
      // `<input class="(.*)" id="(.*)" name="(.*)" placeholer="(.*)" type="(.*)" value="(.*)" readonly="(.*)">`
    );
    `<input class="form-control CajaText txtNRequired" id="txtPers_mail" name="txtPers_mail" placeholer="@F2goPMS.Recursos.Traducciones.mail" type="text" value="HDSJSN@GDJ.COM" readonly="readOnly">`;
    // `<input class="form-control CajaText txtRequired" id="txtPers_mail" name="txtPers_mail" placeholer="@F2goPMS.Recursos.Traducciones.mail" type="text" value="HDSJSN@GDJ.COM" />`;
    const guestEmailFieldElem = this.htmlBody.match(GuestEmailFieldPattern);
    // console.log(guestEmailFieldElem);
    if (!guestEmailFieldElem) {
      return null;
    }

    // Check the email pattern is not required because Front2Go's API do it for us
    const ValuePattern = /value="([^"]*)"/;
    const emailValue = guestEmailFieldElem[0].match(ValuePattern);
    return emailValue ? emailValue[1] : null;
  }

  extractReservationEmailCorp(): string | null {
    const CorpEmailFieldPattern = new RegExp(
      `<input class="form-control CajaText" id="txtMail" name="txtMail" placeholer="(.*)" type="text" value="(.*)">`
    );

    const corpEmailFieldElem = this.htmlBody.match(CorpEmailFieldPattern);
    if (!corpEmailFieldElem) {
      return null;
    }

    const ValuePattern = /value="([^"]*)"/;
    const emailValue = corpEmailFieldElem[0].match(ValuePattern);
    return emailValue ? emailValue[1] : null;
  }
}
