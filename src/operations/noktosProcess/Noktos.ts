import FrontService from "../../services/FrontService";
import MenuStack from "../../MenuStack";
import TokenStorage from "../../utils/TokenStorage";
import FormData from "form-data";
import { getConfig } from "../../utils/frontSystemUtils";

import Ledger from "../../types/Ledger";

const { FRONT_API_RSRV_LIST } = process.env;

import * as reservationUtils from "../../utils/reservationUtlis";

export default class Noktos {
  private frontService: FrontService;
  constructor() {
    this.frontService = new FrontService();
  }

  async performProcess(menuStack: MenuStack) {
    try {
      //TODO: Get reservation list
      //TODO: Filter only NOKTOS company
      //TODO: For each reservation close the FIRST open sheet available by adding CXC payment method
      // & make sure there are 15 room charges.
      //TODO: Finally make the invoice via Invoicer

      const data = {
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

      // const data = {
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
        data,
        FRONT_API_RSRV_LIST || "",
        authTokens
      );

      const reservations: any[] = response.data.rows;
      const sortRsrvByRoomNumber = (rsrvA: any, rsrvB: any) => {
        return rsrvA.room - rsrvB.room;
      };
      const noktosReservations = reservations
        .filter((reservation) => reservation.company === "NOKTOS-C")
        .filter((reservation) => reservation.dateOut === "2023/09/30")
        .sort(sortRsrvByRoomNumber);

      let pendings: any = [];
      for (const reservation of noktosReservations) {
        console.log(`GUEST: ${reservation.nameGuest} - ${reservation.room}`);
        // Get all reservation ledgers
        const reservationId = reservation.reservationId.match(/\d+/)[0];
        const ledgers = await reservationUtils.getReservationLedgerList(
          reservationId
        );
        const currentLedger = ledgers.find(
          (ledger) => ledger.status === "OPEN"
        );
        if (!currentLedger) {
          console.log("Skipping...\n\n");
          continue;
        }

        if (currentLedger.balance === 0) {
          console.log("Skipping...");
          continue;
        }

        console.log(`Current ledger: ${currentLedger.ledgerNo}`);
        console.log(`Balance: ${currentLedger.balance}`);
        console.log(`isCredit: ${currentLedger.isBalanceCredit}`);
        const roomCharges = currentLedger.movements.filter(
          (movement) => movement.transCode === "HAB"
        );

        // check if current ledger has 15 charges. That means 15 nights as well.
        if (roomCharges && roomCharges.length !== 15) {
          pendings.push(reservation);
          console.log(`Room: ${reservation.room} was marked as pending.\n`);
          continue;
        }
        console.log(`Total room charges: ${roomCharges?.length} \n`);

        // add new ledger
        const ledgerAddRes = await reservationUtils.addNewLegder(reservationId);

        // add new payment as CXC with current ledger's balance.
        const addNewPaymentRes = await reservationUtils.addNewPayment({
          type: "CPC",
          amount: currentLedger.balance,
          reservationId: reservationId,
          reservationCode: `${reservationId}.${currentLedger.ledgerNo}`,
        });

        // close current ledger
        // start invoicing
        // print invoice
      }
    } catch (err: any) {
      console.log(err.message);
    }
  }
}
