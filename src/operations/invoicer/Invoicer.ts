import InvoicerMenu from "./InvoicerMenu";
import MenuStack from "../../MenuStack";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import inquirer from "inquirer";
import fs from "fs/promises";
import { print } from "pdf-to-printer";
import { readPdfPages, readPdfText } from "pdf-text-reader";
import { TempStorage } from "../../utils/TempStorage";
import DocAnalyzer from "../../DocAnalyzer";
import InvoiceResponse from "../../types/InvoiceResponse";

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
  getReservationInvoiceList,
  addNewPayment,
  getReservationCertificate,
  getReservationRoutings,
  getReservationRates,
  getReservationVCC,
  applyVCCPayment,
  getReservationGuaranteeDocs,
} from "../../utils/reservationUtlis";

import Ledger from "../../types/Ledger";
import Reservation from "../../types/Reservation";
import Scrapper from "../../Scrapper";
import path from "path";
import VCC from "../../types/VCC";
import RFCReceptor from "../../types/RFCReceptor";
import { Cipher } from "crypto";
import GuaranteeDoc from "../../types/GuaranteeDoc";

const {
  FRONT_API_RSRV_LIST,
  FRONT_API_RSRV_FOLIOS,
  FRONT_API_RSRV_ADD_NEW_LEDGER,
  FRONT_API_SEARCH_RFC,
  FRONT_API_RFC_INFO,
  FRONT_API_SEND_INVOICE_EMAIL,
  INVOICES_TO_PRINT_PATH,
  PENDING_RESERVATIONS,
  STORAGE_TEMP_PATH,
  FRONT_API_RSRV_DOWNLOAD_INVOICE,
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
  public pendingToInvoice: String[];

  constructor() {
    this.frontService = new FrontService();
    this.departures = [];
    this.pendingToInvoice = [];
  }

  async performInvoicer(menuStack: MenuStack): Promise<any> {
    menuStack.push(new InvoicerMenu());
    const invoicerMenu = menuStack.peek();
    const tempStorage = new TempStorage();

    const invoicerSelection = await invoicerMenu.display();
    if (invoicerSelection === "Return") {
      menuStack.pop();
      return { status: 200 };
    }

    // const { invoicesQueue } = await tempStorage.readInvoicesQueue();
    // // const queueRes = await this.startPrintInvoiceQueue(invoicesQueue);
    // // return;

    console.log("performing...");
    this.departures = await getReservationList(DEPARTURES_FILTER);
    if (this.departures.length === 0) {
      throw new Error("Departures list is empty.");
    }

    this.departures = this.departures.filter(
      (departure) => departure.status === "CHIN"
    );

    let invoicerResponse;
    switch (invoicerSelection) {
      // we send departures array in all methods to avoid multiple requests
      case "Invoice all departures":
        const lastRsrvIndex = this.departures.findIndex(
          (reservation) => reservation.room === 523
        );

        invoicerResponse = await this.invoiceAllDepartures(
          this.departures.slice(lastRsrvIndex, this.departures.length)
        );
        // if (invoicerResponse.status === 200) {
        //   console.log("Printing previous invoices...");
        //   const invoicesQueue = await tempStorage.readInvoicesQueue();
        //   const queueRes = await this.startPrintInvoiceQueue(
        //     invoicesQueue.invoicesQueue
        //   );
        // }
        break;
      case "Invoice by room":
        invoicerResponse = await this.invoiceByRoom();
        // const queueRes = await this.startPrintInvoiceQueue([invoicerResponse]);
        break;
      case "Resume skipped":
        const pendingReservations = JSON.parse(
          await fs.readFile(PENDING_RESERVATIONS || "", "utf8")
        );
        invoicerResponse = await this.invoiceAllDepartures(pendingReservations);
        break;
      case "Set generic list":
        invoicerResponse = await this.setGenericList();
        break;
      default:
        break;
    }

    return invoicerResponse;
  }

  private async printInvoiceDoc(
    invoiceResponse: InvoiceResponse
  ): Promise<any> {
    const filesDir = path.join(STORAGE_TEMP_PATH || "", "invoices");
    const authTokens = await TokenStorage.getData();
    const fileName = `invoice-${invoiceResponse.reservationId}.pdf`;

    const downloaderPayload = {
      comprobanteId: invoiceResponse.invoiceReceiptId,
      type: "PDF",
      user: "HTJUGALDEA",
    };

    const downloaderResponse = await this.frontService.downloadByUrl(
      fileName,
      filesDir,
      authTokens,
      FRONT_API_RSRV_DOWNLOAD_INVOICE || "",
      downloaderPayload
    );

    if (downloaderResponse.status !== 200) {
      console.log("Error trying to download invoice document.");
      return downloaderResponse;
    }

    console.log(`Printing... ${downloaderResponse.filePath}`);
    await print(downloaderResponse.filePath, {
      side: "simplex",
      scale: "fit",
      orientation: "portrait",
    });

    return {
      status: 200,
      message: "File printed successfully.",
      file: downloaderResponse.filePath,
    };
  }

  private async startPrintInvoiceQueue(invoicesQueue: any): Promise<void> {
    const filesDir = path.join(STORAGE_TEMP_PATH || "", "invoices");
    const authTokens = await TokenStorage.getData();
    const invoiceDownloadUrl =
      "https://front2go.cityexpress.com/F2GoServicesEngine/Invoice/CfdiOpenFile";

    for (const invoice of invoicesQueue) {
      let fileName = `invoice-${invoice.reservationId}.pdf`;
      const downloaderPayload = {
        comprobanteId: invoice.invoiceReceiptId,
        type: "PDF",
        user: "HTJUGALDEA",
      };
      const downloader = await this.frontService.downloadByUrl(
        fileName,
        filesDir,
        authTokens,
        invoiceDownloadUrl,
        downloaderPayload
      );

      if (downloader.status !== 200) {
        console.log(
          `Something went wrong trying to save invoice file (invoice-${invoice.reservationId})`
        );
        continue;
      }

      console.log(`Printing: ${downloader.filePath}`);
      await print(downloader.filePath, {
        side: "simplex",
        scale: "fit",
        orientation: "portrait",
      });
    }

    // delete
  }

  async setGenericList(): Promise<void> {
    const question = [
      {
        type: "input",
        name: "roomList",
        message: "Type rooms:",
      },
    ];

    const response = await inquirer.prompt(question);
    const textRooms = response.roomList.split(" ");

    const data = {
      genericList: textRooms,
    };
    const tempStorage = new TempStorage();
    await tempStorage.writeGenericList(data);

    return;
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
      ledgers: [],
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

    console.log("\n ------------- \n");
    console.log(
      `Currently invoicing: \n${reservation.guestName} - ${reservation.room}\n`
    );

    // const ledgers = await getReservationLedgerList(
    //   reservation.id,
    //   reservation.status
    // );

    // const currentLedger = ledgers.find((ledger) => {
    //   ledger.status === "OPEN";
    // });

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
    // };p

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

    // const systemSuggestionRes = await this.initSystemInvoiceSuggest(
    //   reservation
    // );
    // return;

    const invoiceTypeList = [
      {
        type: "list",
        name: "typeSelection",
        choices: ["System suggestion", "Generic", "Skip"],
      },
    ];

    const answer = await inquirer.prompt(invoiceTypeList);
    const invoiceType = answer.typeSelection;

    // console.log(`Getting reservation's invoice data...`);
    switch (invoiceType) {
      case "System suggestion":
        const systemSuggestionRes = await this.initSystemInvoiceSuggest(
          reservation
        );
        break;
      case "Generic":
        const genericInvoiceRes = await this.createInvoice(
          reservation.id,
          true
        );
        console.log(genericInvoiceRes);
        break;
      case "Skip":
        console.log("Skipped");
        this.pendingToInvoice.push(reservation.id);
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

    // console.log(`Generating generic invoice...`);
    // let genericDataPayload = {
    //   pGuest_code: `${reservation.id}`,
    //   pProp_Code: "CECJS",
    //   pFolio_code: `${reservation.id}.1`,
    //   pReceptorId: "43",
    //   pFormat: "D",
    //   pNotas: "",
    //   pCurrency: "MXN",
    //   pUsoCFDI: "S01",
    //   pReceptorNameModified: "Generico",
    //   pIdiom: "Spa",
    //   pUser: "",
    //   pReceptorCP_Modified: "",
    // };

    // const authTokens = await TokenStorage.getData();
    // const generatePreInvoiceAPI =
    //   "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraPreFacturaV2";
    // const res = await this.frontService.postRequest(
    //   genericDataPayload,
    //   generatePreInvoiceAPI,
    //   authTokens
    // );

    // console.log(res);

    // console.log("Pre invoiced.");

    // const genericDataConfirmationPayload = {
    //   pComprobante: res.data.d[2],
    //   pProp_Code: "CECJS",
    //   pFolio_code: `${reservation.id}.1`,
    //   pGuest_code: `${reservation.id}`,
    //   pFormat: "D",
    //   pNotas: "",
    //   pCurrency: "MXN",
    //   pUsoCFDI: "S01",
    //   pReceptorNameModified: "",
    //   pIdiom: "Spa",
    //   pUser: "",
    // };

    // const generateInvoiceAPI =
    //   "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraFacturaV2";
    // const res2 = await this.frontService.postRequest(
    //   genericDataConfirmationPayload,
    //   generateInvoiceAPI,
    //   authTokens
    // );

    // console.log(res2);

    // console.log("Invoiced.");
  }

  private async createInvoiceWithCoupon(
    reservationId: string,
    RFCData: any
  ): Promise<any> {
    const currentReservation = this.departures.find(
      (reservation) => reservation.id === reservationId
    );

    if (!currentReservation) {
      console.log("Error trying to get reservation data");
      return;
    }

    // console.log("Getting current invoices..");
    // const activeInvoices = await getReservationInvoiceList(
    //   currentReservation.id,
    //   currentReservation.status
    // );
    const ledgers = await getReservationLedgerList(
      reservationId,
      currentReservation.status
    );
    // const activeLedger = ledgers.find((ledger) => ledger.status === "OPEN");
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

    console.log(
      `Are you sure to continue with the following invoice information?`
    );
    console.log("----------");
    console.log(`RFC: ${RFCData.receptorRfc}`);
    console.log(`Name: ${RFCData.receptorNombre}`);
    console.log(`Postal code: ${RFCData.receptorCpostal}`);
    console.log(`Regimen: ${RFCData.receptorRegimen}`);
    console.log("----------\n");
    const confirmPrompt = [
      {
        type: "confirm",
        name: "confirm",
        message: "Is data correct?",
      },
    ];

    const answer = await inquirer.prompt(confirmPrompt);
    const confirm = answer.confirm;

    if (!confirm) {
      console.log("Skipped.\n");
      return;
    }

    console.log("Applying CXC payment...");
    const addPaymentRes = await addNewPayment({
      type: "CPC",
      amount: ledgerTarget.balance,
      reservationId,
      reservationCode: `${reservationId}.${ledgerTargetNo}`,
    });
    console.log(addPaymentRes);
    if (addPaymentRes.status !== 200) {
      return addPaymentRes;
    }

    console.log("Closing current ledger...");
    console.log("Adding new ledger...");
    await addNewLegder(reservationId);
    // if (ledgers.length === 1) {
    // }

    // if (ledgerTargetNo === ledgers.length + 1) {
    //   const addingRes = await addNewLegder(reservationId);
    //   console.log(addingRes);
    // }

    console.log("Clossing current ledger...");
    const changeStatusRes = await changeLedgerStatus(
      reservationId,
      ledgerTarget.ledgerNo,
      "CLOSE"
    );

    if (changeStatusRes.status !== 200) {
      console.log(
        `Something went wrong trying to change selected ledger status (${changeStatusRes.message})`
      );

      return {
        status: changeStatusRes.status,
        message: changeStatusRes.message,
      };
    }

    let payloadPreInvoice = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerTargetNo}`,
      guestCode: reservationId,
      receptorId: RFCData.receptorId,
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: "G03",
      receptorNameModified: RFCData.receptorNombre,
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating pre-invoice");
    const authTokens = await TokenStorage.getData();
    const generatePreInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/PreFactura";
    const res = await this.frontService.postRequest(
      payloadPreInvoice,
      generatePreInvoiceAPI,
      authTokens
    );

    if (res.data.errormessage !== "") {
      console.log("Error trying to create pre-invoice.");
      throw new Error(res.data.errormessage);
    }

    const invoiceReceiptId = res.data.comprobanteId;
    let invoicePayloadConfirmation = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerTargetNo}`,
      guestCode: reservationId,
      receptorId: RFCData.receptorId,
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: "G03",
      comprobanteid: invoiceReceiptId,
      receptorNameModified: "",
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating Invoice");
    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/GeneraFactura";
    const res2 = await this.frontService.postRequest(
      invoicePayloadConfirmation,
      generateInvoiceAPI,
      authTokens
    );

    if (res2.data.errormessage !== "") {
      console.log("Error trying to create invoice.");
      throw new Error(res2.data.errormessage);
    }

    // https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='G:\CFDI\IPJ030829QDA\17217442.pdf'&Type=PDF&comprobante=17217442

    const senderResponse = await this.sendInvoiceByEmail(
      invoiceReceiptId,
      reservationId
    );
    console.log(senderResponse);

    const invoicerResponse: InvoiceResponse = {
      status: 200,
      reservationId,
      invoiceReceiptId,
      invoiceStatus: "TIMBRADO",
      RFC: RFCData.receptorRfc,
    };
    const printerResponse = await this.printInvoiceDoc(invoicerResponse);
    console.log(printerResponse);
    return {
      status: 200,
      reservationId,
      invoiceStatus: "TIMBRADO",
      RFC: RFCData.receptorRfc,
      invoiceReceiptId,
      // downloadUrl: `https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='${res.data.d[1]}'&Type=PDF&comprobante=${invoiceReceiptId}`,
    };
  }

  private async createInvoice(
    reservationId: string,
    isGeneric: boolean,
    RFCData?: any
  ): Promise<any> {
    const currentReservation = this.departures.find(
      (reservation) => reservation.id === reservationId
    );

    if (!currentReservation) {
      console.log("Error trying to get reservation data");
      return;
    }

    // console.log("Getting current invoices..");
    // const activeInvoices = await getReservationInvoiceList(
    //   currentReservation.id,
    //   currentReservation.status
    // );
    const ledgers = await getReservationLedgerList(
      reservationId,
      currentReservation.status
    );
    // const activeLedger = ledgers.find((ledger) => ledger.status === "OPEN");
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

    console.log(
      `Are you sure to continue with the following invoice information?`
    );
    console.log("----------");
    console.log(`RFC: ${RFCData.receptorRfc}`);
    console.log(`Name: ${RFCData.receptorNombre}`);
    console.log(`Postal code: ${RFCData.receptorCpostal}`);
    console.log(`Regimen: ${RFCData.receptorRegimen}`);
    console.log("----------\n");
    const confirmPrompt = [
      {
        type: "confirm",
        name: "confirm",
        message: "Is data correct?",
      },
    ];

    const answer = await inquirer.prompt(confirmPrompt);
    const confirm = answer.confirm;

    if (!confirm) {
      console.log("Skipped.\n");
      return;
    }

    if (ledgerTarget.transactions.length === 0) {
      console.log("Ledger is empty.");
      return;
    }

    if (ledgerTarget.balance !== 0) {
      console.log(`Ledger balance is not zero.`);
      const confirmPrompt = [
        {
          type: "confirm",
          name: "confirm",
          message: `Wanna extract balance (${ledgerTarget.balance})?`,
        },
      ];

      const answer = await inquirer.prompt(confirmPrompt);
      const confirm = answer.confirm;

      if (!confirm) {
        console.log("Skipped");
        return;
      }

      const addPaymentRes = await addNewPayment({
        type: "EFCPO",
        amount: ledgerTarget.balance,
        reservationId,
        reservationCode: `${reservationId}.${ledgerTargetNo}`,
      });

      console.log(addPaymentRes);
    }

    console.log("Closing current ledger...");
    console.log("Adding new ledger...");
    await addNewLegder(reservationId);
    // if (ledgers.length === 1) {
    // }

    // if (ledgerTargetNo === ledgers.length + 1) {
    //   const addingRes = await addNewLegder(reservationId);
    //   console.log(addingRes);
    // }

    console.log("Clossing current ledger...");
    const changeStatusRes = await changeLedgerStatus(
      reservationId,
      ledgerTarget.ledgerNo,
      "CLOSE"
    );

    if (changeStatusRes.status !== 200) {
      console.log(
        `Something went wrong trying to change selected ledger status (${changeStatusRes.message})`
      );

      return {
        status: changeStatusRes.status,
        message: changeStatusRes.message,
      };
    }

    if (isGeneric) {
      const genericInvoiceRes = await this.createGenericInvoice(
        reservationId,
        ledgerTargetNo
      );
      // console.log(genericInvoiceRes);

      return genericInvoiceRes;
    }

    // const RFCTextSegments = RFCData.Text.split("-");
    // console.log(RFCTextSegments);
    // let RFCFiscalName = "";
    // if (RFCTextSegments.length === 3) {
    //   RFCFiscalName = RFCTextSegments[2].trim();
    // } else {
    //   RFCFiscalName = RFCTextSegments[1].trim();
    // }

    //https://front2go.cityexpress.com/F2goPMS/CFDI/PreFactura
    let payloadPreInvoice = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerTargetNo}`,
      guestCode: reservationId,
      receptorId: RFCData.receptorId,
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: "G03",
      receptorNameModified: RFCData.receptorNombre,
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating pre-invoice");
    const authTokens = await TokenStorage.getData();
    const generatePreInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/PreFactura";
    const res = await this.frontService.postRequest(
      payloadPreInvoice,
      generatePreInvoiceAPI,
      authTokens
    );

    if (res.data.errormessage !== "") {
      console.log("Error trying to create pre-invoice.");
      throw new Error(res.data.errormessage);
    }

    const invoiceReceiptId = res.data.comprobanteId;
    let invoicePayloadConfirmation = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerTargetNo}`,
      guestCode: reservationId,
      receptorId: RFCData.receptorId,
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: "G03",
      comprobanteid: invoiceReceiptId,
      receptorNameModified: "",
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating Invoice");
    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/GeneraFactura";
    const res2 = await this.frontService.postRequest(
      invoicePayloadConfirmation,
      generateInvoiceAPI,
      authTokens
    );

    if (res2.data.errormessage !== "") {
      console.log("Error trying to create invoice.");
      throw new Error(res2.data.errormessage);
    }

    // https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='G:\CFDI\IPJ030829QDA\17217442.pdf'&Type=PDF&comprobante=17217442

    const confirmPrompt2 = [
      {
        type: "confirm",
        name: "confirm",
        message: "Send to email?",
      },
    ];

    const answer2 = await inquirer.prompt(confirmPrompt2);
    const confirm2 = answer2.confirm;

    if (confirm2) {
      const senderResponse = await this.sendInvoiceByEmail(
        invoiceReceiptId,
        reservationId
      );
      console.log(senderResponse);
    }
    const invoicerResponse: InvoiceResponse = {
      status: 200,
      reservationId,
      invoiceReceiptId,
      invoiceStatus: "TIMBRADO",
      RFC: RFCData.receptorRfc,
    };
    const printerResponse = await this.printInvoiceDoc(invoicerResponse);
    console.log(printerResponse);
    return {
      status: 200,
      reservationId,
      invoiceStatus: "TIMBRADO",
      RFC: RFCData.receptorRfc,
      invoiceReceiptId,
      // downloadUrl: `https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='${res.data.d[1]}'&Type=PDF&comprobante=${invoiceReceiptId}`,
    };
  }

  private async sendInvoiceByEmail(
    invoiceId: string,
    reservationId: string
  ): Promise<any> {
    const emailInputPrompt = [
      {
        type: "input",
        name: "email",
        message: "Type guest email:",
      },
    ];

    const answer = await inquirer.prompt(emailInputPrompt);
    const email = answer.email;

    const formData = new FormData();
    formData.append("nComprobante", invoiceId);
    formData.append("guestCode", reservationId);
    formData.append("Historico", "false");
    formData.append("correo", email);

    const authTokens = await TokenStorage.getData();
    const sendInvoiceResponse = await this.frontService.postRequest(
      formData,
      FRONT_API_SEND_INVOICE_EMAIL || "",
      authTokens
    );

    const { success, error } = sendInvoiceResponse.data;
    if (!success) {
      console.log("Error trying to send invoice by email: " + error);
      return sendInvoiceResponse.data;
    }

    return sendInvoiceResponse;
  }

  private async askForLedger(ledgers: Ledger[]): Promise<Number> {
    const showLedgerList = [
      {
        type: "list",
        name: "selectedLedger",
        message: "Select a ledger target:",
        choices: ledgers.map((ledger) => {
          if (ledger.isInvoiced) {
            return `${
              ledger.ledgerNo
            } - ${ledger.invoice?.status.toUpperCase()} - ${
              ledger.invoice?.RFCName
            } - ${ledger.invoice?.RFC} - Balance: ${ledger.balance}`;
          }

          if (ledger.transactions.length === 0) {
            return `${ledger.ledgerNo} - EMPTY`;
          }

          return ledger.ledgerNo;
        }),
      },
    ];

    const ledgerSelection = await inquirer.prompt(showLedgerList);
    // console.log(typeof ledgerSelection.selectedLedger);
    // console.log(ledgerSelection.selectedLedger);
    if (typeof ledgerSelection.selectedLedger === "string") {
      const ledgerNo = Number(
        ledgerSelection.selectedLedger.trim("-")[0].trim()
      );
      return ledgerNo || 1; // 1 as default
    }

    return ledgerSelection.selectedLedger;
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
      return null;
    }

    console.log(`Company: ${reservation.company}`);

    const rsrvRegisterCardPayload = {
      propCode: "CECJS",
      sReservation: reservation.id,
      userIdiom: "Spa",
    };

    const authTokens = await TokenStorage.getData();
    const fileName = `${reservation.id}-register-card.pdf`;
    const fileFir = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");
    const rsrvRegisterCardDownloadURL =
      "https://front2go.cityexpress.com/F2goPMS/Portada/GetPdfRegistrationForm";
    const response = await this.frontService.downloadByUrl(
      fileName,
      fileFir,
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
    const pdfText = await readPdfText({ url: response.filePath });

    //TODO: Search for matches to found RFC
    const RFCPattern =
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g;
    const RFCMatch = pdfText.match(RFCPattern);
    if (RFCMatch) {
      analyzerData.RFC = RFCMatch[1];
      analyzerData.fiscalName = reservation.company;
    }

    return analyzerData;
  }

  async getReceptorInfo(RFC: string): Promise<any> {
    const getReceptorPayload = {
      sparam: RFC,
      facturacion: true,
      propcode: "CECJS",
      targetfolio: "",
      ranticipo: "",
      fiscalname: "",
      fiscalid: "",
    };

    const getReceptorUrl =
      "https://front2go.cityexpress.com/F2GoServicesEngine/Autocomplete/GetReceptor";
    const authTokens = await TokenStorage.getData();
    const getReceptorResponse = await this.frontService.postRequest(
      getReceptorPayload,
      getReceptorUrl,
      authTokens
    );
    const receptorList: RFCReceptor[] = getReceptorResponse.data.map(
      (data: any) => {
        return {
          id: data.receptorId,
          RFC: data.receptorRfc,
          name: data.receptorNombre,
        };
      }
    );
    if (receptorList.length === 0) {
      return {
        status: 400,
        message: "RFC not found.",
      };
    }
    const RFCReceptor = receptorList.find((receptor) => receptor.RFC === RFC);
    if (!RFCReceptor) {
      console.log("Invalid RFC receptor");
      return {
        error: true,
        message: "Invalid RFC Receptor",
      };
    }
    const getReceptorInfoUrl = `https://front2go.cityexpress.com/F2goPMS/CFDI/GetReceptor?receptorid=${RFCReceptor.id}`;
    const getReceptorInfoResponse = await this.frontService.postRequest(
      undefined,
      getReceptorInfoUrl,
      authTokens
    );
    const receptorInfo = getReceptorInfoResponse.data;
    if (!receptorInfo) {
      return {
        error: true,
        message: "Empty receptor info.",
      };
    }
    // console.log(receptorInfo);
    // const itemsCollection = getReceptorResponse.data.d.Items;
    // const RFCMatch = itemsCollection.find((item: any) =>
    //   item.Text.includes(registerCardAnalyzer.RFC)
    // );
    // if (!RFCMatch) {
    //   console.log("No RFC matches.");
    //   return null;
    // }
    return receptorInfo;
  }

  async initSystemInvoiceSuggest(reservation: Reservation): Promise<any> {
    //TODO: Search for reservation's register card content to found attached RFC.
    const registerCardAnalyzer = await this.registrationCardAnalyzer(
      reservation.id
    );
    if (registerCardAnalyzer && registerCardAnalyzer.RFC !== "") {
      console.log("Data found:");
      console.log(registerCardAnalyzer);
      //TODO: if active ledger balance === 0 continue with invoice & suggest
      // Confirm existing data
      const receptorInfo = await this.getReceptorInfo(registerCardAnalyzer.RFC);
      const createInvoiceRes = await this.createInvoice(
        reservation.id,
        false,
        receptorInfo
      );
      return createInvoiceRes;
    }
    if (!registerCardAnalyzer) {
      return null;
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

    console.log("Closing current ledger...");
    console.log("Adding new ledger...");
    await addNewLegder(reservationId);
    console.log("Clossing current ledger...");
    const changeStatusRes = await changeLedgerStatus(
      reservationId,
      ledgerTargetNo,
      "CLOSE"
    );

    if (changeStatusRes.status !== 200) {
      console.log(
        `Something went wrong trying to change selected ledger status (${changeStatusRes.message})`
      );

      return {
        status: changeStatusRes.status,
        message: changeStatusRes.message,
      };
    }

    // new payload
    // pre invoice

    //https://front2go.cityexpress.com/F2goPMS/CFDI/PreFactura
    const newPayloadInvoice = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerTargetNo}`,
      guestCode: reservationId,
      receptorId: "43",
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: "S01",
      receptorNameModified: "Generico",
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating pre-invoice");
    const authTokens = await TokenStorage.getData();
    const generatePreInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/PreFactura";
    const res = await this.frontService.postRequest(
      newPayloadInvoice,
      generatePreInvoiceAPI,
      authTokens
    );

    const invoiceReceiptId = res.data.comprobanteId;
    const defPayload = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerTargetNo}`,
      guestCode: reservationId,
      receptorId: "43",
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: "S01",
      comprobanteid: invoiceReceiptId,
      receptorNameModified: "",
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };
    console.log("Generating Invoice");
    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/whs-pms/ws_Facturacion.asmx/GeneraFacturaV2";
    const res2 = await this.frontService.postRequest(
      defPayload,
      generateInvoiceAPI,
      authTokens
    );

    const invoiceResponse: InvoiceResponse = {
      reservationId,
      invoiceReceiptId,
      RFC: "XXX",
      status: 200,
      invoiceStatus: "TIMBRADO",
    };

    const printerResponse = await this.printInvoiceDoc(invoiceResponse);
    console.log(printerResponse);

    return {
      status: 200,
      reservationId,
      invoiceStatus: "TIMBRADO",
      invoiceReceiptId,
      // downloadUrl: `https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='${res.data.d[1]}'&Type=PDF&comprobante=${invoiceReceiptId}`,
    };
  }

  async writeInvoicesToPrint(invoiceResult: any): Promise<void> {
    try {
      // read file
      const data = await fs.readFile(INVOICES_TO_PRINT_PATH || "", {
        encoding: "utf8",
      });

      const jsonData = JSON.parse(data);
      jsonData.invoicesToPrint.push(invoiceResult);

      // write
      const newData = JSON.stringify(data);
      await fs.writeFile(INVOICES_TO_PRINT_PATH || "", newData, {
        encoding: "utf8",
      });
    } catch (err) {
      console.log(err);
    }
  }

  async handleCustomInvoice(reservationId: string): Promise<any> {
    const RFCInputQuestion = [
      {
        type: "input",
        name: "RFC",
        message: "Input RFC to invoice:",
      },
    ];

    const input = await inquirer.prompt(RFCInputQuestion);
    const answer = input.RFC;

    // validate RFC
    console.log("Validating input...");
    const receptorResponse = await this.getReceptorInfo(answer);
    if (receptorResponse.error) {
      console.log(receptorResponse.message);
      return receptorResponse;
    }

    console.log("Match found. Please confirm to start invocing:");
    // console.log("----");
    // console.log(`RFC: ${receptorResponse.receptorRfc}`);
    // console.log(`Name: ${receptorResponse.receptorName}`);
    // console.log(`Regimen: ${receptorResponse.receptorRegimen}`);
    // console.log(`CP: ${receptorResponse.receptorCpostal}`);
    console.log("----");

    // const confirmPrompt = [
    //   {
    //     type: "confirm",
    //     message: "Confirm invoicing data?",
    //   },
    // ];

    // const confirmAns = await inquirer.prompt(confirmPrompt);
    // if (!confirmAns.confirm) {
    //   console.log("Skipped...");
    //   return {
    //     error: true,
    //     message: "SKIPPED",
    //   };
    // }

    // init invoicing
    const createinvoiceRes = await this.createInvoice(
      reservationId,
      false,
      receptorResponse
    );

    console.log(createinvoiceRes);

    return createinvoiceRes;
  }

  async deleteInvoicesToPrint(): Promise<void> {
    try {
      await fs.unlink(INVOICES_TO_PRINT_PATH || "");
    } catch (err) {
      console.log(err);
    }
  }

  async createInvoiceWithCertificate(
    reservationId: string,
    certificateId: string
  ): Promise<any> {
    if (!certificateId) {
      return {
        status: 400,
        message: "Empty certificate ID",
      };
    }

    const currrentReservation = this.departures.find(
      (reservation) => reservation.id === reservationId
    );

    if (!currrentReservation) {
      return {
        status: 400,
        message: "Reservation not found.",
      };
    }
    const ledgerNumber = await this.askForLedger(currrentReservation.ledgers);
    const currentLedger = currrentReservation.ledgers.find(
      (ledger) => ledger.ledgerNo === ledgerNumber
    );
    if (!currentLedger) {
      return {
        status: 400,
        message: "Ledger not found.",
      };
    }

    // Add certificate payment first
    await addNewLegder(reservationId);
    const addPaymentRes = await addNewPayment({
      type: "CB",
      amount: currentLedger?.balance || 0,
      reservationId,
      reservationCode: `${reservationId}.${ledgerNumber}`,
    });

    if (addPaymentRes.status === 400) {
      return {
        status: addPaymentRes.status,
        message: `Error trying to add CB Payment to reservation: ${currrentReservation.guestName} - ${currrentReservation.room}`,
      };
    }

    console.log("Closing current ledger...");
    console.log("Adding new ledger...");
    await addNewLegder(reservationId);
    console.log("Clossing current ledger...");
    const changeStatusRes = await changeLedgerStatus(
      reservationId,
      ledgerNumber,
      "CLOSE"
    );

    if (changeStatusRes.status !== 200) {
      console.log(
        `Something went wrong trying to change selected ledger status (${changeStatusRes.message})`
      );
      return {
        status: changeStatusRes.status,
        message: changeStatusRes.message,
      };
    }

    const certificateDataPayload = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerNumber}`,
      guestCode: reservationId,
      receptorId: "810829",
      tipoDetalle: "D",
      currency: "MXN",
      notas: certificateId,
      doctype: "S01",
      receptorNameModified: "MARRIOTT SWITZERLAND LICENSING COMPANY",
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating pre-invoice");
    const authTokens = await TokenStorage.getData();
    const generatePreInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/PreFactura";
    const preInvoiceResponse = await this.frontService.postRequest(
      certificateDataPayload,
      generatePreInvoiceAPI,
      authTokens
    );

    if (preInvoiceResponse.data.errormessage !== "") {
      console.log("Error trying to create pre-invoice.");
      throw new Error(preInvoiceResponse.data.errormessage);
    }

    const invoiceReceiptId = preInvoiceResponse.data.comprobanteId;
    let invoicePayloadConfirmation = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservationId}.${ledgerNumber}`,
      guestCode: reservationId,
      receptorId: "810829",
      tipoDetalle: "D",
      currency: "MXN",
      notas: certificateId,
      doctype: "S01",
      comprobanteid: invoiceReceiptId,
      receptorNameModified: "",
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    console.log("Generating Invoice");
    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/GeneraFactura";
    const res2 = await this.frontService.postRequest(
      invoicePayloadConfirmation,
      generateInvoiceAPI,
      authTokens
    );

    if (res2.data.errormessage !== "") {
      console.log("Error trying to create invoice.");
      throw new Error(res2.data.errormessage);
    }

    const invoicerResponse: InvoiceResponse = {
      status: 200,
      reservationId,
      invoiceReceiptId,
      invoiceStatus: "TIMBRADO",
      RFC: "XXX",
    };
    const printerResponse = await this.printInvoiceDoc(invoicerResponse);
    console.log(printerResponse);
    return {
      status: 200,
      invoiceStatus: "TIMBRADO",
      reservationId,
      invoiceReceiptId,
      // downloadUrldownloadUrl: `https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='${preInvoiceResponse.data.d[1]}'&Type=PDF&comprobante=${invoiceReceiptId}`,
    };
  }

  async invoiceAllDepartures(customList?: Reservation[]): Promise<any> {
    //TODO: Search for pending reservations to invoice at first
    let printerInvoicesQueue = [];
    const tempStorage = new TempStorage();

    if (customList && customList.length > 0) {
      this.departures = customList;
    }

    // get generic list
    const genericList = await tempStorage.readGenericList();
    const genericListMatches = this.departures.filter((departure) =>
      genericList.includes(departure.room)
    );

    // for (const reservation of genericListMatches) {
    //   console.log(`Looking for VCC: ${reservation.room}`);
    //   const VCC = await getReservationVCC(reservation.id);

    //   if (VCC.provider === "") {
    //     continue;
    //   }

    //   const chargeVCCResponse = await applyVCCPayment(reservation.id, VCC);
    // }

    for (let i = 0; i < this.departures.length; i++) {
      console.log(
        `\nInvoicing: ${this.departures[i].guestName} - ${this.departures[i].room} \n`
      );

      this.departures[i].ledgers = await getReservationLedgerList(
        this.departures[i].id,
        this.departures[i].status
      );

      const certificate = await getReservationCertificate(
        this.departures[i].id
      );
      if (certificate) {
        console.log(`This reservation has a certificate: ${certificate}`);
        const certificateInvoiceRes = await this.createInvoiceWithCertificate(
          this.departures[i].id,
          certificate
        );
        console.log(certificateInvoiceRes);
        continue;
      }

      const VCC = await getReservationVCC(this.departures[i].id);
      if (VCC.provider !== null) {
        console.log("This reservation has a Virtua Credit Card:");
        console.log(VCC);
        const ledgerTargetNo = await this.askForLedger(
          this.departures[i].ledgers
        );
        const ledgerTarget = this.departures[i].ledgers.find(
          (ledger) => ledger.ledgerNo === ledgerTargetNo
        );
        if (ledgerTarget?.balance === 0) {
          console.log("this reservation is already paid.");
          continue;
        }

        if (!ledgerTarget) {
          console.log("Ledger not found");
          continue;
        }

        // if (ledgerTarget.status === "CLOSED") {
        //   if(ledgerTarget)
        // }

        console.log(`VCC Amount to charge ${VCC.amount}`);
        if (VCC.provider === "EXPEDIA") {
          const rates = await getReservationRates(this.departures[i].id);
          console.log(`Total tax: ${rates.total - Number(VCC.amount)}`);
        }
        const confirmPrompt = [
          {
            type: "confirm",
            name: "confirm",
            message: `Please, confirm the amounts showed above?`,
          },
        ];

        const answer = await inquirer.prompt(confirmPrompt);
        const confirm = answer.confirm;

        if (!confirm) {
          console.log("Skipped");
          continue;
        }

        console.log("Applying VCC payment");
        const ecommerceResponse = await applyVCCPayment(
          this.departures[i].id,
          VCC,
          ledgerTarget
        );

        console.log(ecommerceResponse);
        const genericAskPrompt = [
          {
            type: "confirm",
            name: "confirm2",
            message: "Create invoice generic?",
          },
        ];

        const inq = await inquirer.prompt(genericAskPrompt);
        const answer2 = inq.confirm2;
        if (answer2) {
          try {
            const ledgerTargetNo = await this.askForLedger(
              this.departures[i].ledgers
            );
            const createGenericInvoiceRes = await this.createGenericInvoice(
              this.departures[i].id,
              ledgerTargetNo
            );

            console.log(createGenericInvoiceRes);
            continue;
          } catch (err: any) {
            console.log(err.message);
            continue;
          }
        } else {
          const createCustomInvoiceRes = await this.handleCustomInvoice(
            this.departures[i].id
          );
          console.log(createCustomInvoiceRes);
          continue;
        }
      }

      const reservationDocuments = await getReservationGuaranteeDocs(
        this.departures[i].id
      );
      const authTokens = await TokenStorage.getData();
      if (reservationDocuments.length > 0) {
        // Download file to start reading
        const fileName = `doc-${this.departures[i].id}.pdf`;
        const fileDir = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");
        const fileDownloader = await this.frontService.downloadByUrl(
          fileName,
          fileDir,
          authTokens,
          reservationDocuments[0].downloadUrl,
          {}
        );

        if (fileDownloader.status !== 200) {
          return {
            error: true,
            message: "Error trying to download document file.",
          };
        }

        const analyzerResult = await DocAnalyzer.init(
          fileDownloader.filePath,
          this.departures[i]
        );

        console.log(analyzerResult);
        if (analyzerResult.error) {
          // await tempStorage.deleteTempDoc(fileDownloader.filePath);
          continue;
        }

        if (analyzerResult.comparisionMatches.pass) {
          // create invoice with recopiled information
          // await tempStorage.deleteTempDoc(fileDownloader.filePath);
          const { RFC } = analyzerResult.data.result;

          // Search for RFC, confirm & make invoice
          const receptorInfo = await this.getReceptorInfo(RFC);
          if (receptorInfo.status !== 200) {
            console.log(receptorInfo.message);
            continue;
          }

          const invoiceResponse = await this.createInvoiceWithCoupon(
            this.departures[i].id,
            receptorInfo
          );

          console.log(invoiceResponse);
        }
      }

      //   // const routings = await getReservationRoutings(this.departures[i].id);
      //   // if (routings && !routings.isParent) {
      //   //   console.log("This reservation is routed to another.");
      //   //   continue;
      //   // }

      // const hasInvoice = this.departures[i].ledgers.find(
      //   (ledger) => ledger.isInvoiced
      // );

      // if (hasInvoice) {
      //   console.log("Reservation already invoiced.");
      //   console.log(hasInvoice.invoice?.RFC);
      //   console.log(hasInvoice.invoice?.RFCName + "\n");
      //   continue;
      // }

      console.log(" Invoice list:");
      this.departures[i].ledgers.forEach((ledger) => {
        if (ledger.isInvoiced) {
          console.log(ledger.invoice);
        }
      });
      console.log(" Avaialble:");
      this.departures[i].ledgers.forEach((ledger) => {
        if (!ledger.isInvoiced) {
          console.log("- " + ledger.ledgerNo);
        }
      });
      console.log("\n");

      const invoiceTypeList = [
        {
          type: "list",
          name: "typeSelection",
          choices: ["System suggestion", "Generic", "Input custom RFC", "Skip"],
        },
      ];

      const answer = await inquirer.prompt(invoiceTypeList);
      const invoiceType = answer.typeSelection;

      // First init system suggest
      // const suggestRes = await this.initSystemInvoiceSuggest(
      //   this.departures[i]
      // );

      // if (suggestRes) {
      //   printerInvoicesQueue.push(suggestRes);
      //   await this.writeInvoicesToPrint(suggestRes);
      //   continue;
      // }

      // console.log(`Getting reservation's invoice data...`);
      let selectionResponse;
      switch (invoiceType) {
        case "System suggestion":
          selectionResponse = await this.initSystemInvoiceSuggest(
            this.departures[i]
          );

          if (!selectionResponse.error) {
            printerInvoicesQueue.push(selectionResponse);
            // await this.writeInvoicesToPrint(selectionResponse);
            await tempStorage.writeInvoicesQueue(selectionResponse);
          } else {
            console.log(`No data found inside reservation's register card.`);
          }
          break;
        case "Generic":
          const ledgerNo = await this.askForLedger(this.departures[i].ledgers);
          selectionResponse = await this.createGenericInvoice(
            this.departures[i].id,
            ledgerNo
          );

          console.log(selectionResponse);

          // if (selectionResponse.status === 200) {
          //   printerInvoicesQueue.push(selectionResponse);
          //   // await this.writeInvoicesToPrint(selectionResponse);
          //   await tempStorage.writeInvoicesQueue(selectionResponse);
          // }
          break;
        case "Input custom RFC":
          selectionResponse = await this.handleCustomInvoice(
            this.departures[i].id
          );
          console.log(selectionResponse);
          // if (selectionResponse.status === 200) {
          //   printerInvoicesQueue.push(selectionResponse);
          //   // await this.writeInvoicesToPrint(selectionResponse);
          //   await tempStorage.writeInvoicesQueue(selectionResponse);
          // }
          break;
        case "Skip":
          console.log("Skipped");
          await tempStorage.writePendingReservations(this.departures[i].id);

          // this.pendingToInvoice.push(this.departures[i].id);
          // const fileName = "pendingToInvoice.json";
          // const filePath = path.join(__dirname, fileName);

          // get data & update
          // const currentData = await fs.readFile(filePath, {
          //   encoding: "utf-8",
          // });

          // const data = JSON.stringify({ pending: this.pendingToInvoice });
          // await fs.writeFile(filePath, data, { encoding: "utf8" });
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

    return {
      status: 200,
      // printerInvoicesQueue,
    };
  }
}
