import InvoicerMenu from "./InvoicerMenu";
import MenuStack from "../../MenuStack";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import inquirer from "inquirer";
import fs from "fs/promises";
import { print } from "pdf-to-printer";
import { readPdfText } from "pdf-text-reader";
import { TempStorage } from "../../utils/TempStorage";
import DocAnalyzer from "../../DocumentAnalyzer";
import InvoiceResponse from "../../types/InvoiceResponse";

// Promisify

import { COUPON, DEPARTURES_FILTER } from "../../consts";

// shared utils
import {
  getReservationLedgerList,
  getReservationList,
  changeLedgerStatus,
  addNewLegder,
  addNewPayment,
  getReservationCertificate,
  getInvoiceReceptor,
  getReservationInvoiceList,
} from "../../utils/reservationUtlis";

import Ledger from "../../types/Ledger";
import Reservation from "../../types/Reservation";
import path from "path";
import RFCReceptor from "../../types/RFCReceptor";
import PrePaid from "../../PrePaid";
import PITChecker from "../pit-checker/PitChecker";

const {
  FRONT_API_SEARCH_RFC,
  FRONT_API_RFC_INFO,
  FRONT_API_SEND_INVOICE_EMAIL,
  INVOICES_TO_PRINT_PATH,
  PENDING_RESERVATIONS,
  STORAGE_TEMP_PATH,
  FRONT_API_RSRV_DOWNLOAD_INVOICE,
} = process.env;

export default class Invoicer {
  private frontService: FrontService;
  public departures: Reservation[];
  public pendingToInvoice: String[];
  private tempStorage = new TempStorage();

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

    // const { invoicesQueue } = await tempStorage.readInvoicesQueue();
    // // const queueRes = await this.startPrintInvoiceQueue(invoicesQueue);
    // // return;
    this.departures = await getReservationList(DEPARTURES_FILTER);
    if (this.departures.length === 0) {
      throw new Error("Departures list is empty.");
    }

    // this.departures = this.departures.filter(
    //   (departure) => departure.status === "CHIN"
    // );

    let invoicerResponse;
    switch (invoicerSelection) {
      // we send departures array in all methods to avoid multiple requests
      case "Invoice all departures":
        const lastRsrvIndex = this.departures.findIndex(
          (reservation) => reservation.room === 604
        );

        invoicerResponse = await this.invoiceAllDepartures(
          // this.departures
          this.departures.slice(lastRsrvIndex, this.departures.length)
        );
        console.log(invoicerResponse);
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
    formData.append("GuestCode", reservationId);
    formData.append("Historico", "false");
    formData.append("correo", email);

    const authTokens = await TokenStorage.getData();
    const sendInvoiceResponse = await this.frontService.postRequest(
      formData,
      FRONT_API_SEND_INVOICE_EMAIL || "",
      authTokens
    );

    const { success, error } = sendInvoiceResponse.data;
    console.log(sendInvoiceResponse);
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

    console.log("Generating generic pre-invoice");
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

    console.log("Generating generic invoice...");
    const generateInvoiceAPI =
      "https://front2go.cityexpress.com/F2goPMS/CFDI/GeneraFactura";
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

  async getInvoicingData(reservation: Reservation): Promise<any> {
    // console.log("Loading reservation ledgers...");
    let results = {
      reservation,
      RS: "",
      RFC: "",
    };

    // search for coupons
    console.log("\n----");
    console.log(
      `Searching invoicing data for: ${reservation.guestName} - ${reservation.room}`
    );
    const prePaidMethod = await PrePaid.getPrePaidMethod(reservation);
    if (prePaidMethod) {
      //TODO: Look for last checker result for perform

      if (prePaidMethod.data.type === COUPON) {
        console.log(`${prePaidMethod.data.providerName} coupon was found:`);
        console.log("Checking...");
        const analyzer = await DocAnalyzer.compare(
          prePaidMethod.data.filePath,
          reservation,
          prePaidMethod.data.providerName
        );

        if (analyzer.comparission.pass) {
          console.log("\n--------");
          console.log("Coupon pass. Invoicing data was found:");
          console.log(`RS: ${analyzer.patternMatches.provider}`);
          console.log(`RFC: ${analyzer.patternMatches.RFC}`);
          console.log("--------\n");

          results.RFC = analyzer.patternMatches.RFC;
          results.RS = analyzer.patternMatches.provider;
        }
      }
    }

    // suggest from reservation card
    const registerCardAnalyzer = await this.registrationCardAnalyzer(
      reservation.id
    );
    if (
      registerCardAnalyzer &&
      registerCardAnalyzer.RFC !== "" &&
      registerCardAnalyzer.RFC
    ) {
      //TODO: if active ledger balance === 0 continue with invoice & suggest
      // Confirm existing data
      const receptorInfo = await this.getReceptorInfo(registerCardAnalyzer.RFC);
      if (receptorInfo)
        if (receptorInfo.status === 200) {
          console.log("\n--------");
          console.log("Invoicing data was found:");
          console.log(receptorInfo);
          console.log("--------\n");

          console.log(receptorInfo);
          results.RFC = "Results in receptor";
          results.RS = "Results in receptor";
        }
    }

    // console.log("\nNo invocing data was found. Moved to manually section.\n");
    return results;
  }

  async loadPreview(departures: Reservation[]): Promise<any> {
    // Load previous checked reservations to improve perform
    const tempStorage = new TempStorage();
    const pitChecker = new PITChecker();
    const { checkedList } = await tempStorage.readChecked();

    const getInvoicingDataPromises: any = [];
    for (const reservation of departures) {
      getInvoicingDataPromises.push(await this.getInvoicingData(reservation));
    }

    const invoicingDataResults = await Promise.all(getInvoicingDataPromises);
    const prePaidReservations = invoicingDataResults.filter((results) => {
      if (results.RFC !== "") {
        results.reservation.invocingData.RFC = results.RFC;
        results.reservation.invocingData.RS = results.RS;
        results.reservation.invocingData.sendToEmail = "";
        return results.reservation;
      }
    });

    const readyToInvoice: any = [];
    const notReady: any = [];
    const notAvailable: any = [];

    const genericList = await this.tempStorage.readGenericList();

    // get previous invoicing data:

    for (const departure of departures) {
      const checked = checkedList.find(
        (checked: any) => checked.room === departure.room
      );
      const isGeneric = genericList.find((room) => departure.room === room);
      if (isGeneric) {
        readyToInvoice.push({
          departure,
          isGeneric: true,
        });
        continue;
      }

      const invoices = await getReservationInvoiceList(
        departure.id,
        departure.status
      );

      if (invoices.length > 0) {
        const { RFC, RFCName } = invoices[0];
        console.log("--------------\n");
        console.log(
          `Reservation: ${departure.guestName} - ${departure.room} previous invoicing data found.`
        );
        console.log(`${RFCName}`);
        console.log(`${RFC}`);
        console.log("--------------\n");
        readyToInvoice.push({
          departure,
          data: {
            RFC,
            RFCName,
          },
        });

        continue;
      }

      // console.log(checked);
      if (!checked || checked.invoiceSettings.RFC === "") {
        console.log("--------------\n");
        console.log(
          `Reservation: ${departure.guestName} - ${departure.room} has no invoicing data.`
        );
        const checked = await pitChecker.check(departure);
        if (checked.error) {
          console.log(checked.message);
          notAvailable.push(departure);
          continue;
        }
        if (checked.invoiceSettings.RFC !== "") {
          const { RFC, companyName, repeat } = checked.invoiceSettings;
          console.log("--------------\n");
          console.log(
            `Reservation: ${departure.guestName} - ${departure.room} invoicing data found.`
          );
          console.log(`${companyName}`);
          console.log(`${RFC}`);
          console.log("--------------\n");
          readyToInvoice.push({
            departure,
            data: {
              RFC,
              companyName,
            },
          });
        }
        console.log("No invoicing data found. It was marked as manual.");
        console.log("--------------\n");
        notReady.push(departure);
        continue;
      }

      const { RFC, companyName, repeat } = checked.invoiceSettings;
      console.log("--------------\n");
      console.log(
        `Reservation: ${departure.guestName} - ${departure.room} invoicing data found.`
      );
      console.log(`${companyName}`);
      console.log(`${RFC}`);
      console.log("--------------\n");
      readyToInvoice.push({
        departure,
        data: {
          RFC,
          companyName,
        },
      });
    }
    return {
      readyToInvoice,
      notReady,
    };
  }

  async invoiceAllDepartures(
    customList: Reservation[] = this.departures
  ): Promise<any> {
    // const previewList = await this.loadPreview(customList);
    // const confirmPrompt = [
    //   {
    //     type: "confirm",
    //     name: "confirm",
    //     message: "Continue with automatic invoicing?",
    //   },
    // ];
    // const answer = await inquirer.prompt(confirmPrompt);
    // const confirm = answer.confirm;
    // if (!confirm) {
    //   console.log("Skipped.\n");
    //   return;
    // }
    // console.log("\n Creating invoices...\n");
    // const readyToInvoicePromises: any = [];
    // const pendingToInvoicePromises: any = [];
    // for (const departureInvoiceData of previewList.readyToInvoice) {
    //   if (departureInvoiceData.isGeneric) {
    //     const activeLedger = departureInvoiceData.departure.ledgers.find(
    //       (ledger: Ledger) => ledger.isPrincipal
    //     );
    //     readyToInvoicePromises.push(
    //       await this.createGenericInvoice(
    //         departureInvoiceData.departure.id,
    //         activeLedger.ledgerNo
    //       )
    //     );
    //     continue;
    //   }
    //   const { RFC } = departureInvoiceData.data;
    //   const receptorInfo = await this.getReceptorInfo(RFC);
    //   await readyToInvoicePromises.push(
    //     await this.createInvoice(
    //       departureInvoiceData.departure.id,
    //       false,
    //       receptorInfo
    //     )
    //   );
    // }
    // const getInvoicingDataPromises: any = [];
    // for (const reservation of customList) {
    //   getInvoicingDataPromises.push(await this.getInvoicingData(reservation));
    // }
    // const invoicingDataResults = await Promise.all(getInvoicingDataPromises);
    // const prePaidReservations = invoicingDataResults.filter((results) => {
    //   if (results.RFC !== "") {
    //     results.reservation.invocingData.RFC = results.RFC;
    //     results.reservation.invocingData.RS = results.RS;
    //     results.reservation.invocingData.sendToEmail = "";
    //     return results.reservation;
    //   }
    // });
    // const getLedgerPromises: any = [];
    for (const reservation of customList) {
      console.log(
        `Invocing to: ${reservation.guestName} - ${reservation.room}`
      );
      // if (
      //   prePaidReservations.find((departure) => departure.id === reservation.id)
      // ) {
      //   if (reservation.invocingData) {
      //     const receptorInfo = await this.getReceptorInfo(
      //       reservation.invocingData.RFC || ""
      //     );
      //     const invoicerResponse = await this.createInvoice(
      //       reservation.id,
      //       false,
      //       receptorInfo
      //     );
      //     console.log(invoicerResponse);
      //     continue;
      //   }
      // }
      const ledgers = await getReservationLedgerList(reservation.id, "CHIN");
      reservation.ledgers = ledgers;
      const currentLedger = reservation.ledgers.find(
        (ledger) => ledger.transactions.length > 0 && ledger.status == "OPEN"
      );
      const invoiceTypeList = [
        {
          type: "list",
          name: "typeSelection",
          choices: ["System suggestion", "Generic", "Input custom RFC", "Skip"],
        },
      ];
      const certificate = await getReservationCertificate(reservation.id);
      if (certificate) {
        const certificateInvoiceResponse =
          await this.createInvoiceWithCertificate(reservation.id, certificate);
        console.log(certificateInvoiceResponse);
        continue;
      }
      const answer = await inquirer.prompt(invoiceTypeList);
      const invoiceType = answer.typeSelection;
      let selectionResponse;
      switch (invoiceType) {
        case "System suggestion":
          selectionResponse = await this.initSystemInvoiceSuggest(reservation);
          break;
        case "Generic":
          const ledgerNo = await this.askForLedger(reservation.ledgers);
          selectionResponse = await this.createGenericInvoice(
            reservation.id,
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
          selectionResponse = await this.handleCustomInvoice(reservation.id);
          console.log(selectionResponse);
          // if (selectionResponse.status === 200) {
          //   printerInvoicesQueue.push(selectionResponse);
          //   // await this.writeInvoicesToPrint(selectionResponse);
          //   await tempStorage.writeInvoicesQueue(selectionResponse);
          // }
          break;
        case "Skip":
          console.log("Skipped");
          await this.tempStorage.writePendingReservations(reservation.id);
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
    }
    // const prePaidMethod = await PrePaid.getPrePaidMethod(reservation);
    // if (prePaidMethod) {
    //   if (prePaidMethod.type === COUPON) {
    //     console.log("Invoicing to...");
    //     // console.log(prePaidMethod.data);
    //   }
    // }
    // console.log(" Invoice list:");
    // reservation.ledgers.forEach((ledger) => {
    //   if (ledger.isInvoiced) {
    //     console.log(ledger.invoice);
    //   }
    // });
    // console.log(" Avaialble:");
    // reservation.ledgers.forEach((ledger) => {
    //   if (!ledger.isInvoiced) {
    //     console.log("- " + ledger.ledgerNo);
    //   }
    // });
    // console.log("\n");
    //   let selectionResponse;
    //   switch (invoiceType) {
    //     case "System suggestion":
    //       selectionResponse = await this.initSystemInvoiceSuggest(reservation);
    //       break;
    //     case "Generic":
    //       const ledgerNo = await this.askForLedger(reservation.ledgers);
    //       selectionResponse = await this.createGenericInvoice(
    //         reservation.id,
    //         ledgerNo
    //       );
    //       console.log(selectionResponse);
    //       // if (selectionResponse.status === 200) {
    //       //   printerInvoicesQueue.push(selectionResponse);
    //       //   // await this.writeInvoicesToPrint(selectionResponse);
    //       //   await tempStorage.writeInvoicesQueue(selectionResponse);
    //       // }
    //       break;
    //     case "Input custom RFC":
    //       selectionResponse = await this.handleCustomInvoice(reservation.id);
    //       console.log(selectionResponse);
    //       // if (selectionResponse.status === 200) {
    //       //   printerInvoicesQueue.push(selectionResponse);
    //       //   // await this.writeInvoicesToPrint(selectionResponse);
    //       //   await tempStorage.writeInvoicesQueue(selectionResponse);
    //       // }
    //       break;
    //     case "Skip":
    //       console.log("Skipped");
    //       await this.tempStorage.writePendingReservations(reservation.id);
    //       // this.pendingToInvoice.push(this.departures[i].id);
    //       // const fileName = "pendingToInvoice.json";
    //       // const filePath = path.join(__dirname, fileName);
    //       // get data & update
    //       // const currentData = await fs.readFile(filePath, {
    //       //   encoding: "utf-8",
    //       // });
    //       // const data = JSON.stringify({ pending: this.pendingToInvoice });
    //       // await fs.writeFile(filePath, data, { encoding: "utf8" });
    //       // const skipperRes = await this.skipReservationInvoice(
    //       //   this.departures[i]
    //       // );
    //       // console.log(skipperRes);
    //       break;
    //     default:
    //       break;
    //   }
    // }
    // if (customList && customList.length > 0) {
    //   this.departures = customList;
    // }
  }
}
