import { IN_HOUSE_FILTER } from "../../consts";
import Reservation from "../../types/Reservation";
import * as ReservationUtils from "../../utils/reservationUtlis";
import inquirer from "inquirer";

export default class Utils {
  constructor() {}

  async performUtil(util: string): Promise<void> {
    switch (util) {
      case "Create routing":
        const routingData = await this.handleRoutingCreation();
        const { parent, childs, ledgerNoTarget, reservationToProcess } =
          routingData;
        const res = await ReservationUtils.createReservationRouting(
          parent,
          childs,
          ledgerNoTarget,
          reservationToProcess
        );

        console.log(reservationToProcess);
        break;
      case "Get reservation details":
        const reservationIdentifier = await this.getReservationInput();
        const reservationToCheck = await this.reservationExists(
          reservationIdentifier
        );
        if (!reservationToCheck) {
          console.log("This reservation does not exist");
          return;
        }

        // const { rates, total } = await ReservationUtils.getReservationRates(
        //   reservationToCheck.id
        // );
        console.log(reservationToCheck);
        const docs = await ReservationUtils.getReservationGuaranteeDocs(
          reservationToCheck.id
        );
        console.log(docs);

        break;
      default:
        console.log("Invalid util operation");
        break;
    }
  }

  async getReservationInput(): Promise<string> {
    const questions = [
      {
        type: "input",
        name: "reservation",
        message: "Type reservation room or ID to start checking:",
      },
    ];

    const response = await inquirer.prompt(questions);
    return response.reservation;
  }

  async reservationExists(
    reservationIdentifier: string
  ): Promise<Reservation | null> {
    const reservationsInHouse = await ReservationUtils.getReservationList(
      IN_HOUSE_FILTER
    );

    const reservationToCheck = reservationsInHouse.find(
      (_reservation) =>
        _reservation.id === reservationIdentifier ||
        _reservation.room === Number(reservationIdentifier)
    );

    return reservationToCheck || null;
  }

  async handleRoutingCreation(): Promise<any> {
    const questions = [
      {
        type: "input",
        name: "parent",
        message: "Type parent reservation (room|reservationId)",
      },
      {
        type: "input",
        name: "childs",
        message: "Type child reservations (200,190283,506,190329)",
      },
    ];

    const responses = await inquirer.prompt(questions);
    const childs = responses.childs.split(" ");
    const parent = responses.parent;

    const ledgerList = await ReservationUtils.getReservationLedgerList(parent);
    if (!ledgerList || ledgerList.length === 0) {
      console.log(`Ledger list not found for parent: ${parent}`);
      throw new Error("No ledgers found");
    }

    let showLedgerList = [
      {
        type: "list",
        name: "selectedLedger",
        message: "Select a ledger no. target",
        choices: ledgerList.map((ledger) => ledger.ledgerNo),
      },
    ];

    const ledgerSelectRes = await inquirer.prompt(showLedgerList);
    const ledgerNoTarget = ledgerSelectRes.selectedLedger;

    console.log("Validating all childs reservations...");
    const reservationsInHome = await ReservationUtils.getReservationList(
      IN_HOUSE_FILTER
    );
    let reservationToProcess = reservationsInHome.filter((reservation) =>
      childs.includes(reservation.room.toString())
    );

    return { parent, childs, ledgerNoTarget, reservationToProcess };
  }
}
