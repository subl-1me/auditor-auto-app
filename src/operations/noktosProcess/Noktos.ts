import FrontService from "../../services/FrontService";
import MenuStack from "../../MenuStack";
import TokenStorage from "../../utils/TokenStorage";
import FormData from "form-data";
import { getConfig } from "../../utils/frontSystemUtils";

import Ledger from "../../types/Ledger";

const { FRONT_API_RSRV_LIST, FRONT_API_INVOICE_DOC_URL } = process.env;

import { IN_HOUSE_FILTER } from "../../consts";
import * as reservationUtils from "../../utils/reservationUtlis";
import Reservation from "../../types/Reservation";

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
      const reservations = await reservationUtils.getReservationList(
        IN_HOUSE_FILTER
      );

      const reservationsToInclude: number[] = [508, 506, 209];
      const reservationsToExclude: number[] = [];
      let noktosReservations = reservations.filter(
        (reservation) => reservation.company === "NOKTOS-C"
      );
      // .filter((reservation) => reservation.dateOut === "2023/11/31"); //TODO: implement current system date once AUD was completed

      reservations.forEach((reservation) => {
        if (reservationsToInclude.includes(reservation.room)) {
          noktosReservations.push(reservation);
        }
      });

      const sortRsrvByRoomNumber = (rsrvA: any, rsrvB: any) => {
        return rsrvA.room - rsrvB.room;
      };

      noktosReservations = noktosReservations
        .sort(sortRsrvByRoomNumber)
        .filter(
          (reservation) => !reservationsToExclude.includes(reservation.room)
        );
      console.log(noktosReservations);

      let pendings: any[] = [];
      let errors: any[] = [];
      let readyInvoices: any[] = [];
      for (const reservation of noktosReservations) {
        console.log(`Room: ${reservation.room}`);
        // Get all reservation ledgers
        const ledgers = await reservationUtils.getReservationLedgerList(
          reservation.id,
          reservation.status
        );
        const currentLedger = ledgers.find(
          (ledger) => ledger.status === "OPEN"
        );
        if (!currentLedger) {
          console.log("Open ledger not found.\n\n");
          continue;
        }

        console.log(`Current ledger: ${currentLedger.ledgerNo}`);
        console.log(`Balance: ${currentLedger.balance}`);
        console.log(`isCredit: ${currentLedger.isBalanceCredit}`);
        const roomCharges = currentLedger.transactions.filter(
          (transaction) => transaction.code === "HAB"
        );

        // check if current ledger has 15 charges. That means 15 nights as well.
        if (roomCharges && roomCharges.length !== 15) {
          pendings.push({
            room: reservation.room,
            reason: `TOTAL_CHARGES_DISMATCH`,
          });
          console.log(`Room: ${reservation.room} was marked as pending.\n`);
          continue;
        }
        console.log(`Total room charges: ${roomCharges?.length} \n`);
        // Add new ledger in case current is last

        const currentLedgerIndex = ledgers.findIndex(
          (ledger) => ledger.ledgerNo === currentLedger.ledgerNo
        );

        if (!ledgers[currentLedgerIndex + 1]) {
          // there is not a next ledger, so open new
          const ledgerAddRes = await reservationUtils.addNewLegder(
            reservation.id
          );
          console.log(`opnening a new ledger...`);
        }

        // add new payment as CXC with current ledger's balance.
        const addNewPaymentRes = await reservationUtils.addNewPayment({
          type: "CPC",
          amount: currentLedger.balance,
          reservationId: reservation.id,
          reservationCode: `${reservation.id}.${currentLedger.ledgerNo}`,
        });
        if (addNewPaymentRes.status !== 200) {
          errors.push({
            message: addNewPaymentRes.message,
            ...reservation,
          });
        }
        // close current ledger
        const changeLedgerStatuesRes =
          await reservationUtils.changeLedgerStatus(
            reservation.id,
            currentLedger.ledgerNo,
            ""
          );
        console.log(changeLedgerStatuesRes.message + "\n");
        //   // start invoicing
        //   // const NoktosRFC = "NAL190807BU2";
        //   // const NoktosEmail = "operaciones.noktos@gmail.com";

        //   // print invoice
        //   // init ledger invoice
        //   // const initResponse = await reservationUtils.initializeLedgerInvoice(
        //   //   reservation.id,
        //   //   currentLedger.ledgerNo
        //   // );
        //   // if (initResponse.status !== 200) {
        //   //   console.log("Error trying to initlize ledger invoice.");
        //   //   pendings.push({
        //   //     room: reservation.room,

        //   //     reason: `ERROR_INIT_LEDGER_INVOICE_NO_${currentLedger.ledgerNo}`,
        //   //   });
        //   //   continue;
        //   // }

        //   // get invoice receptor
        //   // const RFCReceptor = await reservationUtils.getInvoiceReceptor(
        //   //   reservation.id,
        //   //   currentLedger.ledgerNo,
        //   //   NoktosRFC
        //   // );

        //   // const preInvoiceResponse = await reservationUtils.generatePreInvoice(
        //   //   reservation.id,
        //   //   currentLedger.ledgerNo,
        //   //   RFCReceptor
        //   // );

        //   // const preInvoiceId = preInvoiceResponse[2];
        //   // const invoiceResponse = await reservationUtils.generateInvoice(
        //   //   preInvoiceId,
        //   //   reservation.id,
        //   //   currentLedger.ledgerNo
        //   // );

        //   // const invoiceData = invoiceResponse.d;
        //   // const localizator = invoiceData[1];

        //   // let invoiceDownloadUrl = FRONT_API_INVOICE_DOC_URL?.replace(
        //   //   "{localizatorField}",
        //   //   localizator
        //   // ).replace("{invoiceIdField}", preInvoiceId);

        //   // let invoice = {
        //   //   room: reservation.room,
        //   //   invoiceId: preInvoiceId,
        //   //   invoiceDownloadUrl,
        //   // };

        //   // readyInvoices.push(invoice);
      }

      // send invoices to printer
      // console.log(readyInvoices);
    } catch (err: any) {
      console.log(err.message);
    }
  }
}
