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
import InvoicePayload from "./types/InvoicePayload";
import InvoicingTypeResponse from "./types/InvoicingTypeResponse";

import {
  ASSISTED,
  CERTIFICATE,
  COUPON,
  DEPARTURES_FILTER,
  GENERAL_USE,
  GENERIC_RECEPTOR,
  GENERIC_RECEPTOR_ID,
  GENERIC_RECEPTOR_NAME,
  GENERIC_RECEPTOR_RFC,
  INVOICED,
  MANUAL,
  MARRIOTT_RECEPTOR_ID,
  MARRIOTT_RECEPTOR_NAME,
  MARRIOTT_RECEPTOR_RFC,
  NO_FISCAL_USE,
  PRE_INVOICED,
  PREPARE_MAIN_LEDGER_VALIDATOR,
  RECEPTOR_VALIDATOR,
} from "../../consts";

import {
  getReservationLedgerList,
  getReservationList,
  addNewLegder,
  classifyLedgers,
  toggleLedgerStatus,
  getReservationContact,
} from "../../utils/reservationUtlis";

import Ledger from "../../types/Ledger";
import Reservation from "../../types/Reservation";
import path from "path";
import RFCReceptor from "../../types/RFCReceptor";
import PrePaid from "../../PrePaid";
import LedgerClassification from "../../types/LedgerClassification";
import Invoice from "../../types/Invoice";

const {
  FRONT_API_GET_RECEPTOR_DETAILS,
  FRONT_API_GET_RFC_RECEPTOR,
  FRONT_API_SEND_INVOICE_EMAIL,
  INVOICES_TO_PRINT_PATH,
  STORAGE_TEMP_PATH,
  FRONT_API_RSRV_DOWNLOAD_INVOICE,
  FRONT_API_PRE_INVOICE,
  FRONT_API_CONFIRM_INVOICE,
} = process.env;

export default class Invoicer {
  private frontService: FrontService;
  public departures: Reservation[];
  public pendingToInvoice: String[];
  public invoices: InvoiceResponse[] = [];
  public preInvoices: InvoiceResponse[] = [];
  public errors: InvoiceResponse[] = [];
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
        const invoicingResponse = await this.handleInvoiceMode();
        // const lastRsrvIndex = this.departures.findIndex(
        //   (reservation) => reservation.room === 521
        // );
        // invoicerResponse = await this.invoiceAllDepartures(
        //   this.departures
        //   // this.departures.slice(lastRsrvIndex, this.departures.length)
        // );
        // console.log(invoicerResponse);
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
        break;
      case "Set generic list":
        invoicerResponse = await this.setGenericList();
        break;
      default:
        break;
    }

    return invoicerResponse;
  }

  private async handleInvoiceMode(): Promise<any> {
    const invoiceModeQuestion = [
      {
        type: "list",
        message: "Select invoice mode:",
        choices: ["MANUAL", "ASSISTED"],
        name: "mode",
      },
    ];

    const invoiceModePrompt = await inquirer.prompt(invoiceModeQuestion);
    const { mode } = invoiceModePrompt;

    const startAtQuestion = [
      {
        type: "input",
        name: "startAt",
        message: "Type room to start invoicing:",
      },
    ];

    const startAtPrompt = await inquirer.prompt(startAtQuestion);
    const { startAt } = startAtPrompt;

    let departuresToInvoice = this.departures;
    if (startAtPrompt) {
      const rsrvTargetSlice = this.departures.find(
        (reservation) => reservation.room === Number(startAt)
      );
      departuresToInvoice.slice(
        rsrvTargetSlice?.room || 0,
        this.departures.length
      );
    }

    // Load ledgers & invoices for better results
    const ledgerClassificationPromises: any = [];
    const reservationLedgerListPomises: any = [];
    console.log("Loading departures ledgers...");
    for (const departure of departuresToInvoice) {
      reservationLedgerListPomises.push(
        await getReservationLedgerList(departure.id, departure.status)
      );
    }

    const ledgerListResults = await Promise.all(reservationLedgerListPomises);
    departuresToInvoice.forEach((departure) => {
      ledgerListResults.forEach((results) => {
        const reservationTarget = results.find(
          (result: any) => result.reservationId === departure.id
        );
        if (reservationTarget) {
          const reservationLedgers = results.filter(
            (result: any) => result.reservationId === departure.id
          );
          departure.ledgers = reservationLedgers;
        }
      });
    });

    console.log("Searching for departures availables to invoice...");
    for (const departure of departuresToInvoice) {
      ledgerClassificationPromises.push(
        await classifyLedgers(departure.id, departure.ledgers)
      );
    }

    const ledgerListClassification = await Promise.all(
      ledgerClassificationPromises
    );

    // const availableToInvoice = ledgerListClassification.filter(
    //   (classification) => classification.invoicable.length > 0
    // );

    // if (availableToInvoice.length === 0) {
    //   console.log("There are no reservations available to invoice.");
    //   return;
    // }

    // let departuresToInvoiceTemp = [...departuresToInvoice];
    ledgerListClassification.forEach((classification) => {
      departuresToInvoice.find((departure, index) => {
        if (departure.id === classification.reservationId) {
          departuresToInvoice[index].ledgerClassification = classification;
        }
        return;
      });
    });

    departuresToInvoice = departuresToInvoice.filter(
      (departure) =>
        departure.ledgerClassification &&
        departure.ledgerClassification.invoicable.length > 0
    );

    console.clear();
    console.log("------------");
    console.log("Departures availables to invoice:");
    console.log("------------\n");
    console.log(departuresToInvoice);
    console.log("\n------------\n");

    let invoicingResult;
    if (mode === ASSISTED) {
      invoicingResult = await this.performAssistedInvoicing(
        departuresToInvoice
      );
    }

    if (mode === MANUAL) {
      invoicingResult = await this.performManualInvoicing(departuresToInvoice);
    }
  }

  private async performAssistedInvoicing(
    departures: Reservation[]
  ): Promise<any> {
    const invoicingPreview = await this.showInvoicingPreview(departures);
    console.log("\n--------------------");
    console.log("Automatic Invoicing preview:");
    console.log("--------------------\n");
    console.log(invoicingPreview);
    console.log("--------------------\n");

    const skipped = await this.askForSkipped();
    departures = departures.filter(
      (departure) => !skipped.includes(departure.room)
    );

    const notGenericDepartures = invoicingPreview.filter(
      (preview: any) =>
        preview.RFC !== GENERIC_RECEPTOR_RFC && preview.RFC !== ""
    );
    const genericDepartures = invoicingPreview.filter(
      (preview: any) => preview.RFC === GENERIC_RECEPTOR_RFC
    );
    const unkownDepartures = invoicingPreview.filter(
      (preview: any) => preview.RFC === ""
    );

    const invoicingPromises: any = [];
    for (const departure of departures) {
      const isUnkown = unkownDepartures.find(
        (data: any) => data.room === departure.room
      );
      if (isUnkown) {
        // pending
        continue;
      }

      const fiscalData = notGenericDepartures.find(
        (data: any) => data.room === departure.room
      );
      const isGeneric = genericDepartures.find(
        (data: any) => data.room === departure.room
      );

      if (fiscalData) {
        console.log(
          `Invoicing ${departure.guestName} - ${departure.room} - ${fiscalData.RFC} - On ledger ${fiscalData.suggestedLedgers[0]}`
        );
        invoicingPromises.push(
          await this.handleInvoicingType(
            "System Suggestion",
            departure,
            fiscalData,
            fiscalData.suggestedLedgers[0]
          )
        );
        continue;
      }

      console.log(
        `Invoicing ${departure.guestName} - ${departure.room} - ${fiscalData.RFC} - On ledger ${fiscalData.suggestedLedgers[0]}`
      );
      invoicingPromises.push(
        await this.handleInvoicingType(
          "System Suggestion",
          departure,
          fiscalData,
          fiscalData.suggestedLedgers[0]
        )
      );
    }

    const invoices = await Promise.all(invoicingPromises);
  }

  private async askForSkipped(): Promise<Number[]> {
    const skipPromptQuestion = [
      {
        type: "input",
        message: "Type rooms to skip",
        name: "roomsToSkip",
      },
    ];

    const skipPrompt = await inquirer.prompt(skipPromptQuestion);
    let skipList: Number[] = [];
    if (skipPrompt.roomsToSkip) {
      skipList = skipPrompt.roomsToSkip
        .split(" ")
        .map((room: string) => Number(room));
    }

    return skipList;
  }

  private regroupInvoice(createInvoiceResponse: InvoiceResponse): void {
    const { invoice, error } = createInvoiceResponse;
    if (error) {
      this.errors.push(createInvoiceResponse);
    } else {
      invoice?.status === INVOICED
        ? this.invoices.push(createInvoiceResponse)
        : this.preInvoices.push(createInvoiceResponse);
    }
  }

  private async handleInvoicingType(
    invoiceType: string,
    departure: Reservation,
    fiscalData: any,
    ledgerTarget: Number
  ): Promise<any> {
    let invoicingResponse: InvoicingTypeResponse = {
      reservationId: departure.id,
      invoiceType,
      hasError: false,
      errors: [],
      success: false,
    };

    const handleReceptorValidator = async (RFC: string) => {
      if (!RFC || RFC === "") {
        return null;
      }

      const receptorResponse = await this.getReceptorInfo(RFC);
      if (receptorResponse.error) {
        invoicingResponse.hasError = true;
        invoicingResponse.errors.push({
          type: RECEPTOR_VALIDATOR,
          detail: `Error validating RFC: ${receptorResponse.message}`,
        });
      }

      return receptorResponse;
    };

    const handleMainLedgerPreparation = async (ledgerTarget: Number) => {
      const preparationResponse = await this.prepareReservationMainLedger(
        departure,
        ledgerTarget
      );

      if (!preparationResponse.readyToInvoice) {
        invoicingResponse.hasError = true;
        invoicingResponse.errors.push({
          type: PREPARE_MAIN_LEDGER_VALIDATOR,
          detail: `Error preparing main ledger: ${preparationResponse.message}`,
        });
      }
    };

    await handleMainLedgerPreparation(ledgerTarget);
    if (invoicingResponse.hasError) {
      console.log("The invoice cannot be done due the following error:");
      invoicingResponse.errors.forEach((error) => {
        console.log(`* ${error.type} - ${error.detail}`);
      });
      console.log("\n");
    }

    let RFCReceptor;
    if (fiscalData && fiscalData.RFC) {
      const receptorResponse = await handleReceptorValidator(fiscalData.RFC);
      RFCReceptor = receptorResponse.receptorInfo;
    }

    let createInvoiceResponse;
    try {
      switch (invoiceType) {
        case "System suggestion":
          if (!RFCReceptor) {
            console.log("No system suggest data was found.");
            break;
          }

          createInvoiceResponse = await this.createInvoice(
            departure,
            ledgerTarget,
            RFCReceptor
          );

          // invoicingResponse.invoice = createInvoiceResponse.invoice;

          break;
        case "Generic":
          // const genericReceptor = await handleReceptorValidator(
          //   GENERIC_RECEPTOR_RFC
          // );
          // if (genericReceptor.error) {
          //   console.log(
          //     `Error trying to validate RFC receptor (${GENERIC_RECEPTOR_RFC}).`
          //   );
          //   break;
          // }
          if (!(await this.confirmFiscalData(GENERIC_RECEPTOR))) {
            break;
          }

          createInvoiceResponse = await this.createInvoice(
            departure,
            ledgerTarget,
            GENERIC_RECEPTOR
          );
          break;
        case "Input custom RFC":
          let receptorInfo;
          do {
            const RFC = await this.askForRFC();
            if (RFC === "EXIT") {
              break;
            }

            console.clear();
            console.log("Validating RFC...");
            const receptorValidator = await handleReceptorValidator(RFC);
            if (!receptorValidator.error) {
              receptorInfo = receptorValidator.receptorInfo;
              break;
            }

            console.log(`\nError trying to search RFC:`);
            console.log(receptorValidator.message);
          } while (true);

          if (!(await this.confirmFiscalData(receptorInfo))) {
            break;
          }

          createInvoiceResponse = await this.createInvoice(
            departure,
            ledgerTarget,
            receptorInfo
          );
          break;
        case "Skip":
          await this.tempStorage.writePendingReservations(departure.id);
          break;
        default:
          break;
      }

      if (createInvoiceResponse && createInvoiceResponse.invoice) {
        const invoice = createInvoiceResponse.invoice;

        this.regroupInvoice(createInvoiceResponse);
        await this.printInvoiceDoc(createInvoiceResponse);
        if (invoice.RFC !== GENERIC_RECEPTOR_RFC) {
          await this.handleSendingInvoice(invoice, departure);
        }
      }
      return invoicingResponse;
    } catch (err) {
      console.log(err);
      return {
        status: 400,
        err,
      };
    }
  }

  // TODO: Add skip when generic
  async handleSendingInvoice(
    invoice: Invoice,
    reservation: Reservation
  ): Promise<void> {
    // Get emails from reservations's contact form
    const reservationEmails = await getReservationContact(reservation.id);
    const { guestEmail, corpEmail } = reservationEmails;

    // send to guest email
    if (
      guestEmail &&
      guestEmail !== "" &&
      !guestEmail.includes("FRONT2GO") &&
      !guestEmail.includes("GENERICPROFILE")
    ) {
      console.log(`Sending invoice to: ${guestEmail}`);
      const sendToGuestRes = await this.sendInvoiceByEmail(
        invoice?.receiptId || "",
        reservation.id,
        guestEmail
      );
      console.log(sendToGuestRes);
    }

    if (corpEmail && corpEmail !== "") {
      console.log(`Sending invoice to: ${corpEmail}`);
      const sendToCorpRes = await this.sendInvoiceByEmail(
        invoice?.receiptId || "",
        reservation.id,
        corpEmail
      );
      console.log(sendToCorpRes);
    }

    const email = await this.askForEmail();
    if (email && email !== "") {
      console.log(`Sending invoice to: ${email}`);
      const sendEmailResponse = await this.sendInvoiceByEmail(
        invoice.receiptId || "",
        reservation.id,
        email
      );
      console.log(sendEmailResponse);
    }

    return;
  }

  async confirmFiscalData(fiscalData: any): Promise<boolean> {
    console.log("\n--------------");
    console.log(`CONFIRM INVOICE DATA:`);
    console.log("----------------\n");
    console.log(`RFC: ${fiscalData.receptorRfc}`);
    console.log(`Name: ${fiscalData.receptorNombre}`);
    console.log(`Postal code: ${fiscalData.receptorCpostal}`);
    console.log(`Regimen: ${fiscalData.receptorRegimen}`);
    console.log("----------\n");
    const confirmPrompt = [
      {
        type: "confirm",
        name: "confirm",
        message: "Is data correct?",
      },
    ];

    const confirmPrompAns = await inquirer.prompt(confirmPrompt);
    const confirm = confirmPrompAns.confirm;
    return confirm;
  }

  private async performManualInvoicing(
    departures: Reservation[]
  ): Promise<any> {
    const invoicingPreview = await this.showInvoicingPreview(departures);
    console.log("--------------------");
    console.log("\nManual Invoicing preview:");
    console.log("--------------------");
    console.log(invoicingPreview);
    console.log("--------------------\n");

    const skipped = await this.askForSkipped();
    departures = departures.filter(
      (departure) => !skipped.includes(departure.room)
    );

    const notGenericDepartures = invoicingPreview.filter(
      (preview: any) =>
        preview.RFC !== GENERIC_RECEPTOR_RFC && preview.RFC !== ""
    );
    const genericDepartures = invoicingPreview.filter(
      (preview: any) => preview.RFC === GENERIC_RECEPTOR_RFC
    );
    const unkownDepartures = invoicingPreview.filter(
      (preview: any) => preview.RFC === ""
    );

    for (const departure of departures) {
      console.log("\n----------------------------------------------------");
      console.log(`Invoicing: ${departure.guestName} - ${departure.room}`);
      console.log("------------------------------------------------------\n");

      let fiscalData = notGenericDepartures.find(
        (invocingData: any) => invocingData.room === departure.room
      );

      const isGeneric = genericDepartures.find(
        (invocingData: any) => invocingData.room === departure.room
      );

      console.log("------------------------------");
      console.log("System suggestion: ");
      if (fiscalData) {
        console.log(`RFC: ${fiscalData.RFC}`);
        console.log(`Company: ${fiscalData.companyName}`);
        console.log("------------------------@-----");
      } else {
        fiscalData = await this.initSystemInvoiceSuggest(departure);
      }

      if (isGeneric) {
        console.log("Generic");
        fiscalData = GENERIC_RECEPTOR;
        console.log("----------------------------");
      }

      let ledgerTarget: Number = 0;
      if (departure.ledgerClassification) {
        const ledgerTargetSuggest = await this.getSuggestedLedger(departure);
        console.log(`Suggested ledger: ${ledgerTargetSuggest}`);
        ledgerTarget = await this.askForLedger(departure.ledgerClassification);
      }

      if (fiscalData) {
        if (await this.confirmFiscalData(fiscalData)) {
          const suggestInvoicingResponse = await this.createInvoice(
            departure,
            ledgerTarget,
            fiscalData
          );
          console.log(suggestInvoicingResponse);
          continue;
        }
      }

      console.log("\n\n");
      const invoiceTypeList = [
        {
          type: "list",
          name: "typeSelection",
          choices: ["System suggestion", "Generic", "Input custom RFC", "Skip"],
        },
      ];

      const invoceTypePrompt = await inquirer.prompt(invoiceTypeList);
      const invoiceType = invoceTypePrompt.typeSelection;

      const invoicingResponse = await this.handleInvoicingType(
        invoiceType,
        departure,
        fiscalData,
        ledgerTarget
      );

      console.log(invoicingResponse);
    }

    // for (const invoiceResponse of this.invoices) {
    //   const printerResponse = await this.printInvoiceDoc(invoiceResponse);
    // }
  }

  private async askForRFC(): Promise<any> {
    console.log("\n--------------------------------");
    const RFCInputQuestion = [
      {
        type: "input",
        name: "RFC",
        message: "Input RFC to invoice:",
      },
    ];

    const input = await inquirer.prompt(RFCInputQuestion);
    const RFC = input.RFC;
    console.log("-------------------------------------\n");

    return RFC;
  }

  private async printInvoiceDoc(
    invoiceResponse: InvoiceResponse
  ): Promise<any> {
    const filesDir = path.join(STORAGE_TEMP_PATH || "", "invoices");
    const authTokens = await TokenStorage.getData();
    const fileName = `invoice-${invoiceResponse.reservationId}.pdf`;

    if (!invoiceResponse.invoice) {
      console.log(`No invoice exists for this reservation.`);
      return {
        status: 400,
        message: "No invoice was found.",
      };
    }

    const downloaderPayload = {
      comprobanteId: invoiceResponse.invoice.receiptId,
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

    console.log(`Printing invoice-${invoiceResponse.reservationId}...`);
    await print(downloaderResponse.filePath, {
      side: "simplex",
      scale: "fit",
      orientation: "portrait",
    });

    return {
      status: 200,
      message: "File printed successfully.",
    };
  }

  private async startPrintInvoiceQueue(invoicesQueue: any): Promise<void> {
    const filesDir = path.join(STORAGE_TEMP_PATH || "", "invoices");
    const authTokens = await TokenStorage.getData();
    const invoiceDownloadUrl =
      "https://front2go.whs-saas.com/F2GoServicesEngine/Invoice/CfdiOpenFile";

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
  }

  private async prepareReservationMainLedger(
    reservation: Reservation,
    ledgerTarget: Number
  ): Promise<any> {
    let ledgerPreparation = {
      readyToInvoice: false,
      message: "",
      ledgerTarget,
    };

    const mainLedger = reservation.ledgers.find(
      (ledger) => ledger.ledgerNo === Number(ledgerTarget)
    );
    if (!mainLedger) {
      ledgerPreparation.message = "Main ledger not found.";
      return ledgerPreparation;
    }

    if (ledgerTarget === 8) {
      ledgerPreparation.message = "This reservation has max. ledgers (8).";
      return ledgerPreparation;
    }

    if (mainLedger.status === "CLOSED" && !mainLedger.isInvoiced) {
      ledgerPreparation.readyToInvoice = true;
      return ledgerPreparation;
    }

    const addLedgerResponse = await addNewLegder(reservation.id);
    const toggleResponse = await toggleLedgerStatus(
      reservation.id,
      mainLedger.ledgerNo,
      reservation.status
    );
    ledgerPreparation.readyToInvoice = true;
    return ledgerPreparation;
  }

  private setupInvoicePayload(
    reservation: Reservation,
    fiscalData: any,
    ledgerTarget: Number
  ): InvoicePayload {
    let invoicePayload: InvoicePayload = {
      username: "HTJUGALDEA",
      propCode: "CECJS",
      folioCode: `${reservation.id}.${ledgerTarget}`,
      guestCode: reservation.id,
      receptorId: fiscalData.receptorId,
      tipoDetalle: "D",
      currency: "MXN",
      notas: "",
      doctype: GENERAL_USE,
      receptorNameModified: fiscalData.receptorNombre,
      receptorCP_Modified: "",
      historico: false,
      impuestopais: "",
    };

    // Special use cases
    if (
      fiscalData.receptorId === MARRIOTT_RECEPTOR_ID ||
      fiscalData.receptorId === GENERIC_RECEPTOR_ID
    ) {
      invoicePayload.doctype = NO_FISCAL_USE;
    }

    if (fiscalData.receptorId === MARRIOTT_RECEPTOR_ID) {
      invoicePayload.notas = fiscalData.certificateId;
    }

    return invoicePayload;
  }

  private async createInvoice(
    reservation: Reservation,
    ledgerTarget: Number,
    fiscalData: any
  ): Promise<InvoiceResponse> {
    let invoicerResponse: InvoiceResponse = {
      status: 200,
      error: "",
      reservationId: reservation.id,
    };

    const currentReservation = this.departures.find(
      (reservation) => reservation.id === reservation.id
    );

    if (!currentReservation) {
      console.log("Error trying to get reservation data");
      invoicerResponse.status = 400;
      invoicerResponse.error = "Reservation data not found.";
      return invoicerResponse;
    }

    let invoicePayload = this.setupInvoicePayload(
      reservation,
      fiscalData,
      ledgerTarget
    );

    console.log(
      `CREATING INVOICE FOR: ${reservation.room} - ${reservation.guestName}...`
    );
    let invoiceCreationResponse;
    const authTokens = await TokenStorage.getData();
    invoiceCreationResponse = await this.frontService.postRequest(
      invoicePayload,
      FRONT_API_PRE_INVOICE || "",
      authTokens
    );

    if (invoiceCreationResponse.data.errormessage !== "") {
      console.log("\n---------------------------------------------------");
      console.log("The pre-invoice cannot be done due the following error:");
      console.log(invoiceCreationResponse.data.errormessage);
      console.log("---------------------------------------------------\n");
      invoicerResponse.error = invoiceCreationResponse.data.errormessage;
      invoicerResponse.status = 400;
      return invoicerResponse;
    }

    let invoice: Invoice = {
      ledgerNo: ledgerTarget,
      RFC: fiscalData.receptorRfc,
      RFCName: fiscalData.receptorNombre,
      status: PRE_INVOICED,
    };

    const invoiceReceiptId = invoiceCreationResponse.data.comprobanteId;
    invoice.receiptId = invoiceReceiptId;
    invoicePayload.comprobanteid = invoiceReceiptId;
    invoicePayload.receptorNameModified = "";

    invoiceCreationResponse = await this.frontService.postRequest(
      invoicePayload,
      FRONT_API_CONFIRM_INVOICE || "",
      authTokens
    );

    if (invoiceCreationResponse.data.errormessage !== "") {
      console.log("\n---------------------------------------------------");
      console.log("The invoice cannot be done due the following error:");
      console.log(invoiceCreationResponse.data.errormessage);
      console.log(`Pre-invoice was marked as pending.`);
      console.log("---------------------------------------------------\n");
      invoicerResponse.error = invoiceCreationResponse.data.errormessage;
      invoicerResponse.status = 400;
      return invoicerResponse;
    }

    console.log(`Invoice was created successfully. ${fiscalData.receptorRfc}`);
    invoice.status = INVOICED;
    invoicerResponse.invoice = invoice;
    return invoicerResponse;
  }

  private async askForEmail(): Promise<string | null> {
    const emailInputPrompt = [
      {
        type: "input",
        name: "email",
        message: "Type guest email:",
      },
    ];
    const answer = await inquirer.prompt(emailInputPrompt);
    const email = answer.email;

    return email || null;
  }

  async sendInvoiceByEmail(
    invoiceId: string,
    reservationId: string,
    emailTarget: string
  ): Promise<any> {
    const formData = new FormData();
    formData.append("nComprobante", invoiceId);
    formData.append("GuestCode", reservationId);
    formData.append("Historico", "false");
    formData.append("EmailIdiom", "1");
    formData.append("correo", emailTarget);

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

    return sendInvoiceResponse.data;
  }

  private async getSuggestedLedger(reservation: Reservation): Promise<any> {
    const { ledgerClassification, prePaidMethod } = reservation;
    const invoicables = ledgerClassification?.invoicable || [];

    const mainLedger = invoicables.find((ledger) => ledger.isPrincipal);
    return mainLedger?.ledgerNo || 0;
  }

  private async askForLedger(
    ledgerClassification: LedgerClassification
  ): Promise<Number> {
    const invoicable = ledgerClassification.invoicable;
    const ledgerTargetChoicesListPrompt = [
      {
        type: "list",
        name: "ledgerTarget",
        choices: invoicable?.map((ledger) => {
          if (ledger.isPrincipal) {
            return `${ledger.ledgerNo} - Balance: ${ledger.balance} - MAIN`;
          }
          return `${ledger.ledgerNo} - Balance: ${ledger.balance}`;
        }),
      },
    ];

    const ledgerTargetChoices = await inquirer.prompt(
      ledgerTargetChoicesListPrompt
    );
    const ledgerTargetText = ledgerTargetChoices.ledgerTarget;
    const ledgerTargetSegments = ledgerTargetText.split("-");
    const ledgerTarget = ledgerTargetSegments[0].trim();

    return Number(ledgerTarget || 0);
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
      "https://front2go.whs-saas.com/F2goPMS/Portada/GetPdfRegistrationForm";
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

    const authTokens = await TokenStorage.getData();
    const getReceptorResponse = await this.frontService.postRequest(
      getReceptorPayload,
      FRONT_API_GET_RFC_RECEPTOR || "",
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
        error: true,
        message: "RFC not found.",
      };
    }
    const RFCReceptor = receptorList.find((receptor) => receptor.RFC === RFC);
    if (!RFCReceptor) {
      return {
        error: true,
        message: "Invalid RFC Receptor",
      };
    }

    const FRONT_API_GET_RECEPTOR_DETAILS_MODF =
      FRONT_API_GET_RECEPTOR_DETAILS?.replace("{receptorId}", RFCReceptor.id);
    const getReceptorInfoResponse = await this.frontService.postRequest(
      undefined,
      FRONT_API_GET_RECEPTOR_DETAILS_MODF || "",
      authTokens
    );

    const receptorInfo = getReceptorInfoResponse.data;
    if (!receptorInfo) {
      return {
        error: true,
        message: "Empty receptor info.",
      };
    }
    return {
      error: false,
      receptorInfo,
    };
  }

  async initSystemInvoiceSuggest(reservation: Reservation): Promise<any> {
    //TODO: Search for reservation's register card content to found attached RFC.
    const registerCardAnalyzer = await this.registrationCardAnalyzer(
      reservation.id
    );
    if (registerCardAnalyzer && registerCardAnalyzer.RFC !== "") {
      return registerCardAnalyzer;
    }

    return null;
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

  async deleteInvoicesToPrint(): Promise<void> {
    try {
      await fs.unlink(INVOICES_TO_PRINT_PATH || "");
    } catch (err) {
      console.log(err);
    }
  }

  // async createInvoiceWithCertificate(
  //   reservationId: string,
  //   certificateId: string
  // ): Promise<any> {
  //   if (!certificateId) {
  //     return {
  //       status: 400,
  //       message: "Empty certificate ID",
  //     };
  //   }

  //   const currrentReservation = this.departures.find(
  //     (reservation) => reservation.id === reservationId
  //   );

  //   if (!currrentReservation) {
  //     return {
  //       status: 400,
  //       message: "Reservation not found.",
  //     };
  //   }
  //   const ledgerNumber = await this.askForLedger(currrentReservation.ledgers);
  //   const currentLedger = currrentReservation.ledgers.find(
  //     (ledger) => ledger.ledgerNo === ledgerNumber
  //   );
  //   if (!currentLedger) {
  //     return {
  //       status: 400,
  //       message: "Ledger not found.",
  //     };
  //   }

  //   console.log("Adding new ledger...");
  //   await addNewLegder(reservationId);
  //   console.log("Clossing current ledger...");
  //   const changeStatusRes = await toggleLedgerStatus(
  //     reservationId,
  //     ledgerNumber,
  //     "CLOSE"
  //   );

  //   if (changeStatusRes.status !== 200) {
  //     console.log(
  //       `Something went wrong trying to change selected ledger status (${changeStatusRes.message})`
  //     );
  //     return {
  //       status: changeStatusRes.status,
  //       message: changeStatusRes.message,
  //     };
  //   }

  //   const certificateDataPayload = {
  //     username: "HTJUGALDEA",
  //     propCode: "CECJS",
  //     folioCode: `${reservationId}.${ledgerNumber}`,
  //     guestCode: reservationId,
  //     receptorId: "810829",
  //     tipoDetalle: "D",
  //     currency: "MXN",
  //     notas: certificateId,
  //     doctype: "S01",
  //     receptorNameModified: "MARRIOTT SWITZERLAND LICENSING COMPANY",
  //     receptorCP_Modified: "",
  //     historico: false,
  //     impuestopais: "",
  //   };

  //   console.log("Generating pre-invoice");
  //   const authTokens = await TokenStorage.getData();
  //   const generatePreInvoiceAPI =
  //     "https://front2go.whs-saas.com/F2goPMS/CFDI/PreFactura";
  //   const preInvoiceResponse = await this.frontService.postRequest(
  //     certificateDataPayload,
  //     generatePreInvoiceAPI,
  //     authTokens
  //   );

  //   if (preInvoiceResponse.data.errormessage !== "") {
  //     console.log("Error trying to create pre-invoice.");
  //     throw new Error(preInvoiceResponse.data.errormessage);
  //   }

  //   const invoiceReceiptId = preInvoiceResponse.data.comprobanteId;
  //   let invoicePayloadConfirmation = {
  //     username: "HTJUGALDEA",
  //     propCode: "CECJS",
  //     folioCode: `${reservationId}.${ledgerNumber}`,
  //     guestCode: reservationId,
  //     receptorId: "810829",
  //     tipoDetalle: "D",
  //     currency: "MXN",
  //     notas: certificateId,
  //     doctype: "S01",
  //     comprobanteid: invoiceReceiptId,
  //     receptorNameModified: "",
  //     receptorCP_Modified: "",
  //     historico: false,
  //     impuestopais: "",
  //   };

  //   console.log("Generating Invoice");
  //   const generateInvoiceAPI =
  //     "https://front2go.whs-saas.com/F2goPMS/CFDI/GeneraFactura";
  //   const res2 = await this.frontService.postRequest(
  //     invoicePayloadConfirmation,
  //     generateInvoiceAPI,
  //     authTokens
  //   );

  //   if (res2.data.errormessage !== "") {
  //     console.log("Error trying to create invoice.");
  //     throw new Error(res2.data.errormessage);
  //   }

  //   const invoicerResponse: InvoiceResponse = {
  //     status: 200,
  //     reservationId,
  //     invoiceReceiptId,
  //     invoiceStatus: "TIMBRADO",
  //     RFC: "XXX",
  //   };
  //   const printerResponse = await this.printInvoiceDoc(invoicerResponse);
  //   console.log(printerResponse);
  //   return {
  //     status: 200,
  //     invoiceStatus: "TIMBRADO",
  //     reservationId,
  //     invoiceReceiptId,
  //     // downloadUrldownloadUrl: `https://front2go.cityexpress.com/WHS-PMS/CFDI/OpenFile.aspx?pName='${preInvoiceResponse.data.d[1]}'&Type=PDF&comprobante=${invoiceReceiptId}`,
  //   };
  // }

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

  async showInvoicingPreview(departures: Reservation[]): Promise<any> {
    // Load previous checked reservations to improve perform
    const tempStorage = new TempStorage();
    const { checkedList } = await tempStorage.readChecked();
    const genericList = await tempStorage.readGenericList();

    const previews: any = [];
    for (const departure of departures) {
      // Check if invoice was setted as generic
      const suggestedLedgers = departure.ledgerClassification?.invoicable;
      if (genericList.find((room) => room === departure.room)) {
        console.log(`------------------\n`);
        console.log(`${departure.guestName} - ${departure.room}`);
        console.log(`GENERIC`);
        console.log(`------------------`);
        previews.push({
          reservationId: departure.id,
          room: departure.room,
          RFC: GENERIC_RECEPTOR_RFC,
          companyName: GENERIC_RECEPTOR_NAME,
          suggestedLedgers,
          confirm: true, // the system will set this configuration by default, it could be changed later
        });
      } else {
        const isChecked = checkedList.find(
          (checked: any) => checked.reservationId === departure.id
        );
        if (isChecked) {
          if (
            isChecked.prePaidMethod &&
            isChecked.prePaidMethod.type === CERTIFICATE
          ) {
            previews.push({
              reservationId: departure.id,
              room: departure.room,
              RFC: MARRIOTT_RECEPTOR_RFC,
              companyName: MARRIOTT_RECEPTOR_NAME,
              certificateId: isChecked.prePaidMethod.data,
              suggestedLedgers,
              confirm: true,
            });
          } else {
            const { invoiceSettings } = isChecked;
            const { RFC, companyName } = invoiceSettings;
            previews.push({
              reservationId: departure.id,
              room: departure.room,
              RFC,
              companyName,
              suggestedLedgers,
              confirm: true, // the system will set this configuration by default, it could be changed later
            });
          }
        }
      }
    }
    return previews;
  }
}
