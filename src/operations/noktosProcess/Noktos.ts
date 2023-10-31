import FrontService from "../../services/FrontService";
import MenuStack from "../../MenuStack";
import TokenStorage from "../../utils/TokenStorage";
import FormData from "form-data";
import { getConfig } from "../../utils/frontSystemUtils";

import Ledger from "../../types/Ledger";

const { FRONT_API_RSRV_LIST } = process.env;

import { IN_HOUSE_FILTER } from "../../consts";
import * as reservationUtils from "../../utils/reservationUtlis";
import Reservation from "../../types/Reservation";

export default class Noktos {
  private frontService: FrontService;
  constructor() {
    this.frontService = new FrontService();
  }

  async performProcess(menuStack: MenuStack) {
    // try {
    //   //TODO: Get reservation list
    //   //TODO: Filter only NOKTOS company
    //   //TODO: For each reservation close the FIRST open sheet available by adding CXC payment method
    //   // & make sure there are 15 room charges.
    //   //TODO: Finally make the invoice via Invoicer
    //   const reservations = await reservationUtils.getReservationList(
    //     IN_HOUSE_FILTER
    //   );
    //   const noktosReservations = reservations
    //     .filter((reservation) => reservation.company === "NOKTOS-C")
    //     .filter((reservation) => reservation.dateOut === "2023/09/30"); //TODO: implement current system date once AUD was completed
    //   let pendings: Reservation[] = [];
    //   let errors: any[] = [];
    //   for (const reservation of noktosReservations) {
    //     console.log(`GUEST: ${reservation.guestName} - ${reservation.room}`);
    //     // Get all reservation ledgers
    //     const ledgers = await reservationUtils.getReservationLedgerList(
    //       reservation.id
    //     );
    //     const currentLedger = ledgers.find(
    //       (ledger) => ledger.status === "OPEN"
    //     );
    //     if (!currentLedger) {
    //       console.log("Skipping...\n\n");
    //       continue;
    //     }
    //     if (currentLedger.balance === 0) {
    //       console.log("Skipping...");
    //       continue;
    //     }
    //     console.log(`Current ledger: ${currentLedger.ledgerNo}`);
    //     console.log(`Balance: ${currentLedger.balance}`);
    //     console.log(`isCredit: ${currentLedger.isBalanceCredit}`);
    //     const roomCharges = currentLedger.transactions.filter(
    //       (movement) => movement.transCode === "HAB"
    //     );
    //     // check if current ledger has 15 charges. That means 15 nights as well.
    //     if (roomCharges && roomCharges.length !== 15) {
    //       pendings.push(reservation);
    //       console.log(`Room: ${reservation.room} was marked as pending.\n`);
    //       continue;
    //     }
    //     console.log(`Total room charges: ${roomCharges?.length} \n`);
    //     // add new ledger
    //     const ledgerAddRes = await reservationUtils.addNewLegder(
    //       reservation.id
    //     );
    //     // add new payment as CXC with current ledger's balance.
    //     const addNewPaymentRes = await reservationUtils.addNewPayment({
    //       type: "CPC",
    //       amount: currentLedger.balance,
    //       reservationId: reservation.id,
    //       reservationCode: `${reservation.id}.${currentLedger.ledgerNo}`,
    //     });
    //     if (addNewPaymentRes.status !== 200) {
    //       errors.push({
    //         message: addNewPaymentRes.message,
    //         ...reservation,
    //       });
    //     }
    //     // close current ledger
    //     // start invoicing
    //     // print invoice
    //   }
    // } catch (err: any) {
    //   console.log(err.message);
    // }
  }
}
