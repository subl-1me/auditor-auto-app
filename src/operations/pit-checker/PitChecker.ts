import dotenv from "dotenv";
dotenv.config();

import {
  getReservationList,
  getReservationLedgerList,
  getReservationRates,
  getReservationRoutings,
  getReservationById,
  classifyLedgers,
  analyzeLedgers,
  checkAllRates,
} from "../../utils/reservationUtlis";
import {
  COUPON,
  FULLY_PAID,
  IN_HOUSE_FILTER,
  PARTIAL_PAID,
  PENDING,
  PRE_PAID,
  ROUTED,
  ROUTER,
  UNKNOWN,
  VIRTUAL_CARD,
} from "../../consts";

import Transaction from "../../types/Transaction";
import Reservation from "../../types/Reservation";
import PitCheckerResult from "../../types/PitCheckerResult";
import { Rate } from "../../types/RateDetails";
import Ledger from "../../types/Ledger";
import PrePaid from "../../PrePaid";
import FrontService from "../../services/FrontService";
import { TempStorage } from "../../utils/TempStorage";
import path from "path";

const { STORAGE_TEMP_PATH } = process.env;
const docsTempStoragePath = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");

export default class PITChecker {
  private frontService: FrontService;
  constructor() {
    this.frontService = new FrontService();
  }

  /**
   * @description It gets all the charges and payments sums
   * @param transactions
   * @returns An array with { chargesSum, PaymentsSum }
   */
  private getTransactionsSum(transactions: Transaction[]): any {
    const chargesSum = transactions.reduce((accum, value) => {
      if (value.type === "CHARGE" || value.isRefund) {
        return (accum += value.amount);
      }

      return accum;
    }, 0);

    const paymentsSum = transactions.reduce((accum, transaction) => {
      if (transaction.type === "PAYMENT" && !transaction.isRefund) {
        return (accum += Math.abs(transaction.amount));
      }

      return accum;
    }, 0);

    return { chargesSum, paymentsSum };
  }

  async checkRouting(routing: any): Promise<any> {
    console.log("Checking routing...");

    if (!routing) {
      return null;
    }

    const router: Reservation = await getReservationById(routing.routedId);
    if (!routing.isRouter) {
      console.log(
        `This reservation is routed to: ${router.guestName} -  ${router.room}`
      );
      return routing;
    }

    const routed: Reservation[] = [];
    for (const reservationId of routing.routed) {
      let rsrv = await getReservationById(reservationId);
      rsrv.ledgers = await getReservationLedgerList(reservationId, "CHIN");
      routed.push(rsrv);
    }

    router.ledgers = await getReservationLedgerList(router.id, "CHIN");
    // get router total payment recieved:
    const activeLedger = router.ledgers.find((ledger) => ledger.isPrincipal);
    // console.log("Active ledger for router: \n");
    // console.log(activeLedger);
    // console.log(activeLedger?.transactions);

    let routingCheck = {
      routing,
      isRoutingOk: false,
      diff: 9,
      totalPaid: 0,
      totalForAll: 0,
    };

    const sums = this.getTransactionsSum(activeLedger?.transactions || []);
    const paymentsSum = Number(parseFloat(sums.paymentsSum).toFixed(2));
    routingCheck.totalPaid = paymentsSum;

    // console.log(`Payment sum: ${paymentsSum}`);

    // const routerId: routing.parentId;
    // if (routings) {
    //   if (routings.isParent) {
    //     console.log("This reservation is ROUTER.");
    //     result.routing.isParent = true;
    //     result.routing.parentId = reservation.id;
    //     result.paymentStatus = ROUTER;
    //     result.routing.childs = routings.childs;
    //     // console.log("Checking payment & rates...");
    //     // const childReservations = reservations.filter(
    //     //   (reservation, index) => reservation.room !== routings.childs[index]
    //     // );
    //     // console.log(routings);
    //     console.log("\n");
    //     await tempStorage.writeChecked(result); // save on local
    //     return result;
    //   }
    //   console.log(
    //     `This reservation is ROUTED to reservation ${routings.parent} `
    //   );
    //   result.routing.parentId = routings.parent;
    //   result.paymentStatus = ROUTED;
    //   return result;
    // }
  }

  async performChecker(): Promise<any> {
    const reservations = await getReservationList(IN_HOUSE_FILTER);

    let rsrvComplete: any[] = [];
    let rsrvPaidNights: any[] = [];
    let rsrvPendingToCheck: any[] = [];
    let rsrvPendingToPay: any[] = [];
    let rsrvErrors: any[] = [];
    let rsrvWithRoutings: any[] = [];
    let rsrvWithCertificate: any[] = [];
    let rsrvWithVirtualCard: any[] = [];

    const checkPromises: any = [];
    for (const reservation of reservations) {
      checkPromises.push(await this.check(reservation));
    }

    const results = await Promise.all(checkPromises);
    for (const result of results) {
      console.log(result);
      switch (result.paymentStatus) {
        case PENDING: {
          rsrvPendingToPay.push(result.room);

          if (result.hasErrors) {
            rsrvErrors.push({
              room: result.room,
              details: result.errorDetail,
            });
          }
          break;
        }
        case FULLY_PAID: {
          rsrvComplete.push(result.room);
          break;
        }
        case PARTIAL_PAID: {
          rsrvPaidNights.push(result.room);
          break;
        }
      }
    }

    console.log("pending:");
    console.log(rsrvPendingToPay);
    console.log("completed");
    console.log(rsrvComplete);
    console.log("partial");
    console.log(rsrvPaidNights);
    console.log("error");
    console.log(rsrvErrors);
  }

  async check(reservation: Reservation): Promise<any> {
    const tempStorage = new TempStorage();
    console.log("\n");
    console.log(`Checking ${reservation.guestName} - ${reservation.room}...`);

    let result: PitCheckerResult = {
      reservationId: reservation.id,
      room: reservation.room,
      routing: {
        isParent: false,
        parentId: "",
        ledgerTarget: 1,
        routingCheckDetails: [],
        childs: [],
      },
      ledgers: [],
      prePaidMethod: null,
      paymentStatus: PENDING,
      nightsPaid: 0,
      pendingBalance: 0,
      futurePaymentErrors: [],
      checkAgainOn: "",
      deleteRegisterOn: "",
      hasErrors: false,
      errorDetail: {
        type: "",
        detail: "",
      },
      invoiceSettings: {
        repeat: false,
        RFC: "",
        companyName: "",
        emails: [],
      },
    };

    // console.log(rateChecker);

    reservation.ledgers = await getReservationLedgerList(
      reservation.id,
      "CHIN"
    );

    const activeLedger = reservation.ledgers.find(
      (ledger) => ledger.status === "OPEN"
    );
    if (!activeLedger) {
      console.log("No open ledgers for this reservation were found.\n");
      result.hasErrors = true;
      result.errorDetail.type = "";
      result.errorDetail.detail = "No open ledger found.";
      return result;
    }
    // const ledgerClassification = await classifyLedgers(
    //   reservation.id,
    //   reservation.ledgers
    // );

    //TODO: Add an implemetation of a "RATE CHECKER" to avoid problems with future rates
    console.log("Searching for pre-paid methods...");
    const prePaidMethod = await PrePaid.getPrePaidMethod(reservation);
    if (prePaidMethod) {
      // if (ledgerClassification.active.length > 0) {
      //   ledgerClassification.active[0].isPrincipal = true;
      // }
      result.paymentStatus = PRE_PAID;
      result.prePaidMethod = prePaidMethod;
      if (result.prePaidMethod.type === UNKNOWN) {
        console.log(
          "This reservation has unknown attached documents. Please, check it manually."
        );
        await tempStorage.writeChecked(result); // save on local
        return result;
      }

      if (result.prePaidMethod.type === COUPON) {
        const { comparission, patternMatches } =
          result.prePaidMethod.data.result;

        if (comparission.pass) {
          // save invoice data
          result.invoiceSettings.RFC = patternMatches.RFC;
          result.invoiceSettings.companyName = patternMatches.provider;
        }
      }

      console.log(`This is a prepaid reservation by ${prePaidMethod.type}...`);
      console.log(prePaidMethod);
      result.deleteRegisterOn = reservation.dateOut;
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    if (reservation.status === "CHOUT") {
      return {
        error: true,
        message: "Reservation on checkout.",
      };
    }

    const rateChecker = await checkAllRates(
      reservation.id,
      new Date(reservation.dateIn),
      new Date(reservation.dateOut)
    );

    const routings = await getReservationRoutings(reservation.id);
    if (routings) {
      if (routings.isRouter) {
        console.log("This reservation pays anothers.");
        result.routing.isParent = true;
        result.routing.childs = routings.routed;
        result.routing.parentId = reservation.id;
        // console.log("Checking payment & rates...");
        // const childReservations = reservations.filter(
        //   (reservation, index) => reservation.room !== routings.childs[index]
        // );
        // console.log(routings);
        return result;
      }

      console.log("This reservation is already paid by a parent reservation.");
      result.routing.isParent = false;
      result.routing.parentId = routings.routerId;
      return result;
    }

    const balanceAbs = Math.abs(activeLedger.balance);
    const balance = activeLedger.balance;
    const ratesDetail = await getReservationRates(reservation.id);
    const { rates, total } = ratesDetail;
    const sums = this.getTransactionsSum(activeLedger.transactions);
    const paymentsSum = Number(parseFloat(sums.paymentsSum).toFixed(2));
    const todayDate = "2024/05/04";

    if (balance >= 0) {
      console.log("Payment status: required");
      console.log("\n");
      return result;
      //TODO: Search in another ledger
    }

    if (balanceAbs === total || paymentsSum === total) {
      console.log("Payment status: complete");
      result.paymentStatus = FULLY_PAID;
      console.log("\n");
      return result;
    }

    if (balanceAbs > total || paymentsSum > total) {
      console.log("Balance is greater than total. Check payments manually.");
      console.log("\n");
      const diff = Number(
        parseFloat((total - paymentsSum).toString()).toFixed(2)
      );

      result.hasErrors = true;
      result.errorDetail.type = "";
      result.errorDetail.detail = `Balance is greate than total. (${diff})`;
      return result;
    }

    console.log("calculating nights paid...");
    // const nightsPaid = await this.calculateNightsPaid(rates.)
    const todayRateIndex = rates.findIndex(
      (rate) => rate.dateToApply === todayDate
    );
    const remainingRates = rates.slice(todayRateIndex, rates.length);
    let nights = 0;
    let tempBalance = balanceAbs;
    for (const rate of remainingRates) {
      if (tempBalance >= rate.totalWTax) {
        nights++;
        tempBalance = Number((tempBalance - rate.totalWTax).toFixed(2));
        continue;
      }

      if (tempBalance === 0) {
        break;
      }

      // otherwise there are differences in payments
      console.log(`There's a diff in rates.`);
      console.log("\n");
      const diff = Number(
        parseFloat((total - paymentsSum).toString()).toFixed(2)
      );
      result.hasErrors = true;
      result.errorDetail.type = "Diff rates";
      result.errorDetail.detail = diff;
      return result;
    }

    // case rsrv errors
    // if (rsrvErrors.find((rsrv) => rsrv.id === reservation.id)) {
    //   continue;
    // }

    if (nights > 0) {
      console.log(`Total nights paid: ${nights}`);
      result.nightsPaid = nights;
      result.paymentStatus = PARTIAL_PAID;
      return result;
    }

    console.log("\n");
    return result;
  }

  // only get ledgers that should be scanned to avoid useless requests
  // reservation.ledgers = await getReservationLedgerList(
  //   reservation.id,
  //   "CHIN"
  // );

  // for each active ledger check if is has entire payment
  // if (active.length === 0) {
  //   // set default ledger no 1.
  //   // analyzer
  // }

  // const rates = await getReservationRates(reservation.id);
  // const analyzer = await analyzeLedgers(ledgerClassification, rates);
  // console.log(analyzer);
  // console.log("-------\n");

  // const paidLedgers = reservation.ledgers.filter(
  //   (ledger: Ledger) =>
  //     ledger.status === "CLOSED" && ledger.transactions.length > 0
  // );

  // console.log("\n-- PAID LEDGERS");
  // console.log(paidLedgers);
  // console.log("---");

  // const routings = await getReservationRoutings(reservation.id);
  // if (routings) {
  //   const routingCheckResult = await this.checkRouting(routings);
  //   if (!routings.isRouter) {
  //     result.paymentStatus = ROUTED;
  //     result.routing.childs = routings.routed;
  //     result.routing.parentId = routings.routerId;
  //   } else {
  //     result.paymentStatus = ROUTER;
  //     result.routing.isParent = true;
  //     result.routing.parentId = routings.routerId;
  //   }
  //   await tempStorage.writeChecked(result); // save on local
  //   return result;
  // }

  // const activeLedger = reservation.ledgers.find(
  //   (ledger) => ledger.isPrincipal
  // );

  // if (!activeLedger) {
  //   console.log("No active ledger found.");
  //   return {
  //     error: true,
  //     message: "No active ledger found.",
  //   };
  // }

  // default
}
