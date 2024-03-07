import InvoicerMenu from "./InvoicerMenu";
import MenuStack from "../../MenuStack";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import inquirer from "inquirer";
import fs from "fs/promises";
import { readPdfText } from "pdf-text-reader";

import { DEPARTURES_FILTER, IN_HOUSE_FILTER } from "../../consts";

// shared utils
import {
  getReservationLedgerList,
  getLedgerTransactions,
  getReservationContact,
  getReservationList,
  changeLedgerStatus,
  addNewLegder,
  reservationDataMatcher,
} from "../../utils/reservationUtlis";

import Ledger from "../../types/Ledger";
import Reservation from "../../types/Reservation";
import Scrapper from "../../Scrapper";
import path from "path";

const {
  FRONT_API_RSRV_LIST,
  FRONT_API_RSRV_FOLIOS,
  FRONT_API_RSRV_ADD_NEW_LEDGER,
  FRONT_API_SEARCH_RFC,
  FRONT_API_RFC_INFO,
} = process.env;

const RFCList = [
  {
    generic: "43",
    name: "Generico",
  },
];

export default class Invoicer {
  private frontService: FrontService;
  public departures: Reservation[];
  public pendingToInvoice: Reservation[];

  constructor() {
    this.frontService = new FrontService();
    this.departures = [];
    this.pendingToInvoice = [];
  }

  async performInvoicer(menuStack: MenuStack): Promise<any> {
    menuStack.push(new InvoicerMenu());
    const invoicerMenu = menuStack.peek();

    const invoicerSelection = await invoicerMenu.display();
    if (invoicerSelection === "Return") {
      menuStack.pop();
      return { status: 200 };
    }

    this.departures = await getReservationList(DEPARTURES_FILTER);
    if (this.departures.length === 0) {
      throw new Error("Departures list is empty.");
    }

    let invoicerResponse;
    switch (invoicerSelection) {
      // we send departures array in all methods to avoid multiple requests
      case "Invoice all departures":
        invoicerResponse = await this.invoiceAllDepartures();
        return invoicerResponse;
      case "Invoice by room":
        invoicerResponse = await this.invoiceByRoom();
        break;
      default:
        break;
    }

    return invoicerResponse;
  }

  async invoiceByRoom(): Promise<any> {
    // to create expedia com payment:
    // https://front2go.cityexpress.com/F2GoServicesEngine/Payment/Create
    // {"transCode":"TVIRT","cardNum":"","month":0,"year":0,"secNum":"","titular":"","auth":"","notes":"","guestCode":"21448508","requerido":"","folio":"21448508.1","amount":"396.72","currency":"MXN","propCode":"CECJS","user":"HTJUGALDEA","postID":0,"savePayment":false,"binId":"","ledgerX1":"","ledgerX7":"","ledgerX8":"","refSmart":"","depTercero":"","depBoveda":false,"depSmart":false,"pinPad":"","pinParam":"","signature":"","smartId":"0"}
    // res: {"errors":null,"warnings":null,"sucess":true}

    // ask for room number
    const request = [
      {
        type: "input",
        name: "room-number",
        message: "Type room number",
      },
    ];

    let reservation: Reservation = {
      id: "",
      guestName: "",
      company: "",
      agency: "",
      room: 0,
      dateIn: "",
      dateOut: "",
      status: "",
    };

    do {
      const answer = await inquirer.prompt(request);
      const roomNumber = Number(answer["room-number"]);

      const _reservation = this.departures.find(
        (reservation: Reservation) => reservation.room === roomNumber
      );

      if (!_reservation) {
        console.clear();
        console.log("No reservation found. Try again \n");
      } else {
        reservation = _reservation;
      }
    } while (reservation.id === "");

    console.clear();
    console.log(
      `Currently invoicing: \n${reservation.guestName} - ${reservation.room}\n`
    );

    const ledgers = await getReservationLedgerList(reservation.id);
    const currentLedger = ledgers.find((ledger) => {
      ledger.status === "OPEN";
    });

    // Case 1: RFC is attached inside reservations data.
    //TODO: Extract information about reservation's origin. Ex. C1ty Access
    //TODO: If 'company' is not empty inside reservation data, we should extract information about
    // company's data attached into Reservation's register card.
    // https://front2go.cityexpress.com/F2goPMS/Portada/GetPdfRegistrationForm
    //TODO: Once the data is recopield, it should suggest to user about the data & ask if he want to use it to
    // create invoice.

    // console.log(
    //   `Searching data to create invoice, please confirm at finish:\n`
    // );
    // if (reservation.company === "") {
    //   console.log("No company data found. Searching inside invoice history...");
    //   return;
    // }

    // console.log(`Company: ${reservation.company}`);
    // console.log(`Reading reservation's register card...`);

    // const rsrvRegisterCardPayload = {
    //   propCode: "CECJS",
    //   sReservation: reservation.id,
    //   userIdiom: "Spa",
    // };

    // let invoiceData = {
    //   fiscalName: "",
    //   RFC: "",
    // };

    // const authTokens = await TokenStorage.getData();
    // const rsrvRegisterCardDownloadURL =
    //   "https://front2go.cityexpress.com/F2goPMS/Portada/GetPdfRegistrationForm";
    // const response = await this.frontService.downloadByUrl(
    //   `${reservation.id}-registerCard.pdf`,
    //   __dirname,
    //   authTokens,
    //   rsrvRegisterCardDownloadURL,
    //   rsrvRegisterCardPayload
    // );
    // if (
    //   response.status === 200 &&
    //   response.message === "Report downloaded successfully"
    // ) {
    //   const docPath = path.join(
    //     __dirname,
    //     reservation.id + "-registerCard.pdf"
    //   );

    //   const pdfText = await readPdfText({ url: docPath });

    //   //TODO: Search for matches to found RFC
    //   const RFCPattern = /.{3}\d{7}.{1}\d{1}/g;
    //   const RFCMatch = pdfText.match(RFCPattern);
    //   if (RFCMatch) {
    //     invoiceData.RFC = RFCMatch[1];
    //     invoiceData.fiscalName = reservation.company;
    //   }
    // }

    // console.log("Data found to invoice:");
    // console.log(invoiceData);

    // Case 2:
    //TODO: Search inside history data to found a possible coincidence of old reservations and its invoices.
    //TODO: Once data is recopiled, it should suggets to user about the data & ask if he want to use it
    // to create invoice.

    // Case 3:
    //TODO: Create a generic invoice.
    //TODO: Search for generic value ( generic value: 43)
    // {"context":{"Text":"generico","NumberOfItems":0,"PropCode":"CECJS","TargetFolio":"21453957.1","FiscalID":"","RAnticipo":""}}
    // https://front2go.cityexpress.com/WHS-PMS/AutoComplete.asmx/GetReceptor
    //TODO: Set generic data into form:
    // https://front2go.cityexpress.com/WHS-PMS/ajaxpro/Reserva_Facturacion,WHSPMS.ashx
    // {"pReceptor_id":"43"}
    //TODO: Generate pre invoice
    // 	https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraPreFacturaV2
    // {'pGuest_code':'21453957','pProp_Code':'CECJS','pFolio_code':'21453957.1','pReceptorId':'43','pFormat':'D','pNotas':'','pCurrency':'MXN','pUsoCFDI':'S01','pReceptorNameModified':'Generico','pIdiom':'Spa','pUser':'','pReceptorCP_Modified':''}
    // res: {"d":["","G:\\CFDI\\IPJ030829QDA\\17162851.pdf","17162851"]}
    //TODO: Ask for confirmation to user & proceed with invoice finalization.
    // https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraFacturaV2
    // {'pComprobante':'17162851','pProp_Code':'CECJS','pFolio_code':'21453957.1','pGuest_code':'21453957','pFormat':'D','pNotas':'','pCurrency':'MXN','pUsoCFDI':'S01','pReceptorNameModified':'','pIdiom':'Spa' ,'pUser':''}
    // res:

    console.log(`Generating generic invoice...`);
    let genericDataPayload = {
      pGuest_code: `${reservation.id}`,
      pProp_Code: "CECJS",
      pFolio_code: `${reservation.id}.1`,
      pReceptorId: "43",
      pFormat: "D",
      pNotas: "",
      pCurrency: "MXN",
      pUsoCFDI: "S01",
      pReceptorNameModified: "Generico",
      pIdiom: "Spa",
      pUser: "",
      pReceptorCP_Modified: "",
    };

    const authTokens = await TokenStorage.getData();
    const generatePreInvoiceAPI =
      "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraPreFacturaV2";
    const res = await this.frontService.postRequest(
      genericDataPayload,
      generatePreInvoiceAPI,
      authTokens
    );

    console.log("Pre invoiced.");

    const genericDataConfirmationPayload = {
      pComprobante: res.data.d[2],
      pProp_Code: "CECJS",
      pFolio_code: `${reservation.id}.1`,
      pGuest_code: `${reservation.id}`,
      pFormat: "D",
      pNotas: "",
      pCurrency: "MXN",
      pUsoCFDI: "S01",
      pReceptorNameModified: "",
      pIdiom: "Spa",
      pUser: "",
    };

    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraFacturaV2";
    const res2 = await this.frontService.postRequest(
      genericDataConfirmationPayload,
      generateInvoiceAPI,
      authTokens
    );

    console.log("Invoiced.");
  }
  private async createInvoice(
    reservationId: string,
    isGeneric: boolean,
    RFCData?: any
  ): Promise<any> {
    const ledgers = await getReservationLedgerList(reservationId);
    const activeLedger = ledgers.find((ledger) => ledger.status === "OPEN");
    const ledgerTargetNo = await this.askForLedger(ledgers);
    const ledgerTarget = ledgers.find(
      (ledger) => ledger.ledgerNo === Number(ledgerTargetNo)
    );

    if (!ledgerTarget) {
      console.log(`Ledger not found.`);
      return;
    }

    console.log(`Ledger no. ${ledgerTarget.ledgerNo}`);
    console.log(`Balance. ${ledgerTarget.balance}`);
    console.log(`Status. ${ledgerTarget.status}`);

    if (ledgerTarget.status === "OPEN" && ledgerTarget.balance === 0) {
      console.log("Closing current ledger...");

      const changeStatusRes = await changeLedgerStatus(
        reservationId,
        ledgerTarget.ledgerNo,
        "CLOSE"
      );

      if (changeStatusRes.status == 200) {
        // create invoice

        console.clear();

        if (isGeneric) {
          const genericInvoiceRes = await this.createGenericInvoice(
            reservationId,
            ledgerTargetNo
          );
          console.log(genericInvoiceRes);
          return genericInvoiceRes;
        }

        console.log(`Invocing data:`);
        console.log(`RFC: ${RFCData.RFC}`);
        console.log(`FiscalName: ${RFCData.fiscalName}`);
        console.log(`Invocing data:`);
        const confirmPrompt = [
          {
            type: "confirm",
            name: "confirm",
            message: "Confirm if data is correct",
          },
        ];

        const answer = await inquirer.prompt(confirmPrompt);
        const confirm = answer.confirm;

        if (!confirm) {
          console.log("Skipped.\n");
          return;
        }

        console.log("Generating pre-invoice...");
      }
    } else {
      console.log(`Ledger's balance must be 0 to create a invoice.`);
    }
  }

  private async askForLedger(ledgers: Ledger[]): Promise<Number> {
    const showLedgerList = [
      {
        type: "list",
        name: "selectedLedger",
        message: "Select a ledger target:",
        choices: ledgers.map((ledger) => ledger.ledgerNo),
      },
    ];

    const ledgerSelection = await inquirer.prompt(showLedgerList);
    return ledgerSelection.selectedLedger || 1;
  }

  private async askForRFCData(): Promise<any> {}

  // private async closeCurrentSheet(sheets: ReservationSheet[]): Promise<void> {
  //   const currentSheet = sheets.find((sheet) => sheet.isOpen);
  //   console.log(currentSheet);
  // }

  async searchForRFC(RFC: string): Promise<any> {
    if (!FRONT_API_SEARCH_RFC) {
      throw new Error("API endpoint cannot be undefined");
    }

    // const question = [
    //   {
    //     type: "input",
    //     name: "RFC",
    //     message: "Type RFC code:",
    //   },
    // ];

    // const answer = await inquirer.prompt(question);

    const data = {
      context: {
        Text: RFC,
        NumberOfItems: 0,
        PropCode: "CECJS",
        TargetFolio: "20418163.",
        FiscalID: "",
        RAnticipo: "",
      },
    };

    const authTokens = await TokenStorage.getData();
    const response = await this.frontService.postRequest(
      data,
      FRONT_API_SEARCH_RFC,
      authTokens
    );

    return response;
  }

  async recoverRFCInfo(rfcId: string) {
    if (!FRONT_API_RFC_INFO) {
      throw new Error("Endpont cannot be undefined");
    }

    const authTokens = TokenStorage.getData();
    const response = await this.frontService.postRequest(
      {
        pReceptor_id: rfcId,
      },
      FRONT_API_RFC_INFO,
      authTokens
    );

    return response.data;
  }

  private async registrationCardAnalyzer(reservationId: string): Promise<any> {
    const reservation = this.departures.find(
      (reservation) => reservation.id === reservationId
    );
    if (!reservation) {
      console.log(
        `Reservation was not found. Please check reservation ID (${reservationId}).`
      );
      return;
    }

    console.log(`Reading reservation's register card...`);
    if (reservation.company === "") {
      console.log(`Reservation has no attached company data.
      `);
      return;
    }

    console.log(`Company: ${reservation.company}`);

    const rsrvRegisterCardPayload = {
      propCode: "CECJS",
      sReservation: reservation.id,
      userIdiom: "Spa",
    };

    const authTokens = await TokenStorage.getData();
    const rsrvRegisterCardDownloadURL =
      "https://front2go.cityexpress.com/F2goPMS/Portada/GetPdfRegistrationForm";
    const response = await this.frontService.downloadByUrl(
      `${reservation.id}-registerCard.pdf`,
      __dirname,
      authTokens,
      rsrvRegisterCardDownloadURL,
      rsrvRegisterCardPayload
    );

    let analyzerData = {
      RFC: "",
      fiscalName: "",
      originalAmount: 0,
    };

    if (
      response.status !== 200 &&
      response.message !== "Report downloaded successfully"
    ) {
      console.log("Error downloading register card.");
      return analyzerData;
    }

    const docPath = path.join(__dirname, reservation.id + "-registerCard.pdf");
    const pdfText = await readPdfText({ url: docPath });

    //TODO: Search for matches to found RFC
    const RFCPattern =
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}/g;
    const RFCMatch = pdfText.match(RFCPattern);
    if (RFCMatch) {
      analyzerData.RFC = RFCMatch[1];
      analyzerData.fiscalName = reservation.company;
    }

    return analyzerData;
  }

  async initSystemInvoiceSuggest(reservation: Reservation): Promise<void> {
    //TODO: Search for reservation's register card content to found attached RFC.
    const registerCardAnalyzer = await this.registrationCardAnalyzer(
      reservation.id
    );
    if (registerCardAnalyzer) {
      console.log("Data found:");
      console.log(registerCardAnalyzer);
      //TODO: if active ledger balance === 0 continue with invoice & suggest
      const createInvoiceRes = await this.createInvoice(
        reservation.id,
        false,
        registerCardAnalyzer
      );

      //TODO: if active ledger balance !== 0 search for expected payment & suggest
    }
  }

  private async createGenericInvoice(
    reservationId: string,
    ledgerTargetNo: Number
  ): Promise<any> {
    const confirmPrompt = [
      {
        type: "confirm",
        name: "confirm",
        message: "Confirm create generic invoice?",
      },
    ];

    const answer = await inquirer.prompt(confirmPrompt);
    const confirm = answer.confirm;

    if (!confirm) {
      console.log("skipped");
      return;
    }

    // set generic data
    let genericDataPayload = {
      pGuest_code: `${reservationId}`,
      pProp_Code: "CECJS",
      pReceptorId: "43",
      pFolio_code: `${reservationId}.${ledgerTargetNo}`,
      pFormat: "D",
      pNotas: "",
      pCurrency: "MXN",
      pUsoCFDI: "S01",
      pReceptorNameModified: "Generico",
      pIdiom: "Spa",
      pUser: "",
      pReceptorCP_Modified: "",
    };

    console.log("Generating pre-invoice");
    const authTokens = await TokenStorage.getData();
    const generatePreInvoiceAPI =
      "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraPreFacturaV2";
    const res = await this.frontService.postRequest(
      genericDataPayload,
      generatePreInvoiceAPI,
      authTokens
    );

    const genericDataConfirmationPayload = {
      pComprobante: res.data.d[2],
      pProp_Code: "CECJS",
      pFolio_code: `${reservationId}.${ledgerTargetNo}`,
      pGuest_code: `${reservationId}`,
      pFormat: "D",
      pNotas: "",
      pCurrency: "MXN",
      pUsoCFDI: "S01",
      pReceptorNameModified: "",
      pIdiom: "Spa",
      pUser: "",
    };

    console.log("Generating Invoice");
    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraFacturaV2";
    const res2 = await this.frontService.postRequest(
      genericDataConfirmationPayload,
      generateInvoiceAPI,
      authTokens
    );

    return {
      status: 200,
      invoiceStatus: "TIMBRADO",
    };
  }

  private async skipReservationInvoice(reservation: Reservation): Promise<any> {
    this.pendingToInvoice.push(reservation);

    //save on local
    const pendingReservationDir = path.join(__dirname, "pendingToInvoice.json");
    const data = JSON.stringify(this.pendingToInvoice);
    console.log(data);
  }

  async invoiceAllDepartures(): Promise<any> {
    //TODO: Search for pending reservations to invoice at first
    let pendingToInvoice = [];
    let errors = [];

    for (let i = 0; i < this.departures.length; i++) {
      console.log(
        `\nInitializing invoice process: ${this.departures[i].guestName} - ${this.departures[i].room} \n`
      );

      const invoiceTypeList = [
        {
          type: "list",
          name: "typeSelection",
          choices: ["System suggestion", "Generic", "Skip"],
        },
      ];

      const answer = await inquirer.prompt(invoiceTypeList);
      const invoiceType = answer.typeSelection;

      switch (invoiceType) {
        case "System suggestion":
          const systemSuggestionRes = await this.initSystemInvoiceSuggest(
            this.departures[i]
          );
          break;
        case "Generic":
          const genericInvoiceRes = await this.createInvoice(
            this.departures[i].id,
            true
          );
          console.log(genericInvoiceRes);
          break;
        case "Skip":
          console.log("Skipped");
          this.pendingToInvoice.push(this.departures[i]);
          const fileName = "pendingToInvoice.json";
          const filePath = path.join(__dirname, fileName);

          // get data & update
          // const currentData = await fs.readFile(filePath, {
          //   encoding: "utf-8",
          // });

          const data = JSON.stringify(this.pendingToInvoice);
          await fs.writeFile(filePath, data, { encoding: "utf8" });
          // const skipperRes = await this.skipReservationInvoice(
          //   this.departures[i]
          // );
          // console.log(skipperRes);
          break;
        default:
          break;
      }

      //TODO: Search for certificate & create invoce to certificate company.

      //TODO: Search for RFC inside reservation's notes.

      //TODO: Search for RFC manually via user input.

      //TODO: SKIP

      // const ledgers = await getReservationLedgerList(departures[i].id);
      // const emails = await getReservationContact(reservationId);
      // console.log(ledgers);
      // console.log(emails);

      //TODO: get current ledger
      // const currentLedger = ledgers.find((ledger) => ledger.status === "OPEN");
      // if (!currentLedger) {
      //   console.log(
      //     "Reservation's status is marked as CHECKOUT. Invoicing proccess will stop.\n"
      //   );
      //   errors.push(departures[i]);
      //   continue;
      // }

      //TODO: Open a new ledger to close current ledger just in case there's 1 ledger or current is the last
      // const lastLedger = ledgers.reverse()[0];
      // if (
      //   ledgers.length === 1 ||
      //   lastLedger.ledgerNo === currentLedger.ledgerNo
      // ) {
      //   await addNewLegder(departures[i].id);
      // }

      // if (currentLedger.balance !== 0) {
      //   console.log(`Balance is not 0. Reservation was marked as pending.`);
      //   pendingToInvoice.push(departures[i]);
      // } else {
      //   //TODO: set current ledger status to CLOSED
      //   console.log(`Closing current ledger...`);
      //   const changeResponse = await changeLedgerStatus(
      //     departures[i].id,
      //     currentLedger.ledgerNo,
      //     departures[i].status
      //   );

      // continue invoicer proccess
    }

    console.log("\n\n");
  }
}
