import InvoicerMenu from "./InvoicerMenu";
import MenuStack from "../../MenuStack";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import inquirer from "inquirer";

import { DEPARTURES_FILTER, IN_HOUSE_FILTER } from "../../consts";

// shared utils
import {
  getReservationLedgerList,
  getLedgerTransactions,
  getReservationContact,
  getReservationList,
  changeLedgerStatus,
  addNewLegder,
} from "../../utils/reservationUtlis";

import Ledger from "../../types/Ledger";
import Reservation from "../../types/Reservation";

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
  constructor() {
    this.frontService = new FrontService();
  }

  async performInvoicer(menuStack: MenuStack): Promise<any> {
    menuStack.push(new InvoicerMenu());
    const invoicerMenu = menuStack.peek();

    const invoicerSelection = await invoicerMenu.display();
    if (invoicerSelection === "Return") {
      menuStack.pop();
      return { status: 200 };
    }

    const departures = await getReservationList(DEPARTURES_FILTER);
    if (departures.length === 0) {
      throw new Error("Departures list is empty.");
    }

    let invoicerResponse;
    switch (invoicerSelection) {
      // we send departures array in all methods to avoid multiple requests
      case "Invoice all departures":
        invoicerResponse = await this.invoiceAllDepartures(departures);
        return invoicerResponse;
      case "Invoice by room":
        invoicerResponse = await this.invoiceByRoom(departures);
        break;
      default:
        break;
    }

    return invoicerResponse;
  }

  async invoiceByRoom(departures: Reservation[]): Promise<any> {
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
      const roomNumber = answer["room-number"];

      const _reservation = departures.find(
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
  }

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

  async createInvoice(
    departure: Reservation,
    currentLedger: Ledger
  ): Promise<any> {}

  async invoiceAllDepartures(departures: Reservation[]): Promise<any> {
    let pendingToInvoice = [];
    let errors = [];
    for (let i = 0; i < departures.length; i++) {
      console.log(
        `PROCESSING: ${departures[i].guestName} - ${departures[i].room} \n`
      );
      const ledgers = await getReservationLedgerList(departures[i].id);
      // const emails = await getReservationContact(reservationId);
      // console.log(ledgers);
      // console.log(emails);

      //TODO: get current ledger
      const currentLedger = ledgers.find((ledger) => ledger.status === "OPEN");
      if (!currentLedger) {
        console.log(
          "Reservation's status is marked as CHECKOUT. Invoicing proccess will stop.\n"
        );
        errors.push(departures[i]);
        continue;
      }

      //TODO: Open a new ledger to close current ledger just in case there's 1 ledger or current is the last
      const lastLedger = ledgers.reverse()[0];
      if (
        ledgers.length === 1 ||
        lastLedger.ledgerNo === currentLedger.ledgerNo
      ) {
        await addNewLegder(departures[i].id);
      }

      if (currentLedger.balance !== 0) {
        console.log(`Balance is not 0. Reservation was marked as pending.`);
        pendingToInvoice.push(departures[i]);
      } else {
        //TODO: set current ledger status to CLOSED
        console.log(`Closing current ledger...`);
        const changeResponse = await changeLedgerStatus(
          departures[i].id,
          currentLedger.ledgerNo,
          departures[i].status
        );

        // continue invoicer proccess
      }

      console.log("\n\n");
    }

    console.log("pendingToInvoice:");
    console.log(pendingToInvoice);
    console.log("\n");

    console.log("ERRORS:");
    console.log(errors);
    console.log("\n");

    return {
      status: 200,
      errors,
      pendingToInvoice,
    };
  }
}
