import InvoicerMenu from "./InvoicerMenu";
import MenuStack from "../../MenuStack";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import inquirer from "inquirer";

// shared utils
import {
  getReservationLedgerList,
  getLedgerMovements,
  getReservationContact,
  changeLedgerStatus,
} from "../../utils/reservationUtlis";
import Ledger from "../../types/Ledger";

const {
  FRONT_API_RSRV_LIST,
  FRONT_API_RSRV_FOLIOS,
  FRONT_API_RSRV_ADD_NEW_LEDGER,
} = process.env;

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

    // A list of filters to use while fetching for departures list
    const listOptions = {
      pc: "KFwHWn911eaVeJhL++adWg==",
      ph: false,
      pn: "",
      ci: "",
      gpi: "",
      ti: "",
      rc: "",
      rm: "",
      fm: "",
      to: "",
      fq: "",
      rs: "",
      st: "LS",
      grp: "",
      gs: "CHOUT,CHIN,NOSHOW,POST",
      sidx: "NameGuest",
      sord: "asc",
      rows: 100,
      page: 1,
      ss: false,
      rcss: "",
      user: "HTJUGALDEA",
    };

    // const listOptions = {
    //   pc: "KFwHWn911eaVeJhL++adWg==",
    //   ph: false,
    //   pn: "",
    //   ci: "",
    //   gpi: "",
    //   ti: "",
    //   rc: "",
    //   rm: "",
    //   fm: "",
    //   to: "",
    //   fq: "",
    //   rs: "CHIN,NOSHOW,POST",
    //   st: "EC",
    //   grp: "",
    //   gs: "",
    //   sidx: "NameGuest",
    //   sord: "asc",
    //   rows: 100,
    //   page: 1,
    //   ss: false,
    //   rcss: "",
    //   user: "HTJUGALDEA",
    // };

    const authTokens = await TokenStorage.getData();
    const response = await this.frontService.postRequest(
      listOptions,
      FRONT_API_RSRV_LIST || "",
      authTokens
    );
    if (response.status !== 200) {
      throw new Error("Error trying to fetch departures.");
    }

    const sortRsrvByRoomNumber = (rsrvA: any, rsrvB: any) => {
      return rsrvA.room - rsrvB.room;
    };
    const departures = response.data.rows.sort(sortRsrvByRoomNumber);

    let invoicerResponse;
    switch (invoicerSelection) {
      // we send departures array in all methods to avoid multiple requests
      case "Invoice all departures":
        invoicerResponse = await this.invoiceAllDepartures(departures);
        break;
      case "Invoice by room":
        invoicerResponse = await this.invoiceByRoom(departures);
        break;
      default:
        break;
    }
  }

  async invoiceByRoom(departures: any): Promise<any> {
    // ask for room number
    const request = [
      {
        type: "input",
        name: "room-number",
        message: "Type room number",
      },
    ];

    let reservation;
    do {
      const answer = await inquirer.prompt(request);
      const roomNumber = answer["room-number"];

      const _reservation = departures.find(
        (reservation: any) => reservation.room === roomNumber
      );

      if (!_reservation) {
        console.clear();
        console.log("No reservation found. Try again \n");
      } else {
        reservation = _reservation;
      }
    } while (!reservation);

    console.clear();
    console.log(
      `Currently invoicing: \n${reservation.nameGuest} - ${reservation.room}\n`
    );

    const reservationId = reservation.reservationId.match(/\d+/)[0];
    const sheets = await getReservationLedgerList(reservationId);
    const emails = await getReservationContact(reservationId);
    console.log(sheets);
    console.log(emails);
    // await this.closeCurrentSheet(sheets);
  }

  // private async closeCurrentSheet(sheets: ReservationSheet[]): Promise<void> {
  //   const currentSheet = sheets.find((sheet) => sheet.isOpen);
  //   console.log(currentSheet);
  // }

  async invoiceAllDepartures(departures: any): Promise<any> {
    for (let i = 0; i < departures.length; i++) {
      const reservationId = departures[i].reservationId.match(/\d+/)[0];
      console.log(
        `PROCESSING: ${departures[i].nameGuest} - ${departures[i].room}`
      );
      const ledgers = await getReservationLedgerList(reservationId);
      const emails = await getReservationContact(reservationId);
      console.log(ledgers);
      console.log(emails);
      //TODO: get current ledger
      const currentLedger = ledgers.find((ledger) => ledger.status === "OPEN");

      //TODO: Open a new ledger to close current ledger just in case there's 1 ledger or current is the last
      const lastLedger = ledgers.reverse()[0];
      if (
        ledgers.length === 1 ||
        lastLedger.ledgerNo === currentLedger?.ledgerNo
      ) {
        console.log("Openning a new ledger...");
        if (!FRONT_API_RSRV_ADD_NEW_LEDGER) {
          throw new Error(
            "FRONT_API_RSRV_ADD_NEW_LEDGER endpoint cannot be empty"
          );
        }

        const authTokens = await TokenStorage.getData();
        const _FRONT_API_RSRV_ADD_NEW_LEDGER =
          FRONT_API_RSRV_ADD_NEW_LEDGER.replace("{idField}", reservationId);
        const response = await this.frontService.postRequest(
          {},
          _FRONT_API_RSRV_ADD_NEW_LEDGER,
          authTokens
        );

        console.log(response.data);
      }

      //TODO: set ledger status to CLOSED
      //TODO: start invoicer process :)
      console.log("\n\n");
    }
  }
}
