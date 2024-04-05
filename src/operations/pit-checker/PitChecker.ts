import dotenv from "dotenv";
dotenv.config();

import {
  getReservationList,
  getReservationLedgerList,
  getReservationRateCode,
  getReservationRates,
  getReservationGuaranteeDocs,
  getReservationRoutings,
  getReservationCertificate,
  getVirtualCard,
  getReservationVCC,
} from "../../utils/reservationUtlis";
import { IN_HOUSE_FILTER } from "../../consts";

import Reservation from "../../types/Reservation";
import Transaction from "../../types/Transaction";
import { Rate } from "../../types/RateDetails";
import Ledger from "../../types/Ledger";
import Router from "../../types/Router";
import DocAnalyzer from "../../DocAnalyzer";
import FrontService from "../../services/FrontService";
import TokenStorage from "../../utils/TokenStorage";
import { TempStorage } from "../../utils/TempStorage";
import path from "path";

const { STORAGE_TEMP_PATH } = process.env;

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

  async analyzeLedgers(
    ledgers: Ledger[],
    rates: Rate[],
    total: number
  ): Promise<any> {
    // active ledgers mean they have charges or payments to analyze
    // const activeLedgers = ledgers.filter(
    //   (ledger) =>
    //     ledger.transactions.find(
    //       (transaction) => transaction.type === "PAYMENT"
    //     ) ||
    //     ledger.transactions.find((transaction) => transaction.type === "CHARGE")
    // );
    const todayDate = "2023/10/24";
  }

  async performChecker(): Promise<any> {
    const items = await getReservationList(IN_HOUSE_FILTER);
    const todayDate = "2024/04/04";
    const authTokens = await TokenStorage.getData();
    const tempStorage = new TempStorage();
    // get rsrv and filter today departures for better performing
    const reservations: Reservation[] = items
      .filter((reservation) => !reservation.company.includes("NOKTOS"))
      .filter((reservation) => reservation.dateOut !== todayDate)
      .filter((reservation) => !isNaN(reservation.room));

    let rsrvComplete: any[] = [];
    let rsrvPaidNights: any[] = [];
    let rsrvPendingToCheck: any[] = [];
    let rsrvPendingToPay: any[] = [];
    let rsrvErrors: any[] = [];
    let rsrvWithRoutings: any[] = [];
    let rsrvWithCertificate: any[] = [];
    let rsrvWithVirtualCard: any[] = [];

    for (const reservation of reservations) {
      console.log(`Checking room: ${reservation.room}...`);
      // if (reservation.room !== 623) continue;
      const certificateId = await getReservationCertificate(reservation.id);
      if (certificateId) {
        console.log("This reservation has a certificate.");
        rsrvWithCertificate.push({
          room: reservation.room,
          certificateId,
        });
        await tempStorage.writeChecked({
          id: reservation.id,
          hasCoupon: false,
          hasCertificate: true,
          hasVCC: false,
          checkAgain: false,
          dateOut: reservation.dateOut,
        });
        console.log("\n");
        continue;
      }

      const guaranteeDocs = await getReservationGuaranteeDocs(reservation.id);
      if (guaranteeDocs.length > 0) {
        const document = guaranteeDocs[0];
        console.log("This reservation has guarantee docs.");
        const fileName = `doc-${reservation.id}.pdf`;
        const fileDir = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");
        const fileDownloader = await this.frontService.downloadByUrl(
          fileName,
          fileDir,
          authTokens,
          document.downloadUrl
        );
        if (fileDownloader.status !== 200) {
          console.log("Error trying to download document file.");
          continue;
        }
        const analyzerResult = await DocAnalyzer.init(
          fileDownloader.filePath,
          reservation
        );
        if (analyzerResult.error) {
          console.log(analyzerResult.message);
          rsrvPendingToCheck.push({
            room: reservation.room,
            error: analyzerResult.message,
          });
          const deleteFileRes = await tempStorage.deleteTempDoc(
            fileDownloader.filePath
          );
          continue;
        }

        await tempStorage.writeChecked({
          id: reservation.id,
          hasCoupon: true,
          hasCertificate: false,
          hasVCC: false,
          checkAgain: false,
          dateOut: reservation.dateOut,
        });

        console.log("Coupon approved.");
        console.log(analyzerResult.data);
        rsrvComplete.push({
          room: reservation.room,
          data: analyzerResult.data,
        });

        console.log("\n");
        const deleteFileRes = await tempStorage.deleteTempDoc(
          fileDownloader.filePath
        );
        // const deleteFileRes = await tempStorage.deleteTempDoc(filePath);
        continue;
      }

      const VCC = await getReservationVCC(reservation.id);
      if (VCC.provider) {
        console.log("This reservation is already paid by Credit Virtual Card.");
        console.log(VCC);
        rsrvWithVirtualCard.push({
          room: reservation.room,
          VCC,
        });
        await tempStorage.writeChecked({
          id: reservation.id,
          hasCoupon: false,
          hasCertificate: false,
          hasVCC: true,
          checkAgain: false,
          dateOut: reservation.dateOut,
        });
        console.log("\n");
        continue;
      }

      const ledgers = await getReservationLedgerList(
        reservation.id,
        reservation.status
      );

      // search a open ledger with transactions in
      const activeLedger = ledgers.find((ledger) => ledger.status === "OPEN");
      if (!activeLedger) {
        console.log("No open ledgers for this reservation were found.\n");
        rsrvErrors.push({
          room: reservation.room,
          reason: "NO_OPEN_LEDGER_FOUND",
        });
        continue;
      }

      const balanceAbs = Math.abs(activeLedger.balance);
      const balance = activeLedger.balance;
      const { rates, total } = await getReservationRates(reservation.id);
      const todayRate = rates.find((rate) => rate.dateToApply === todayDate);
      if (!todayRate) {
        console.log("TODAY RATE NOT FOUND");
        rsrvErrors.push({
          room: reservation.room,
          reason: "TODAY_RATE_NOT_FOUND",
        });
        continue;
      }

      const sums = this.getTransactionsSum(activeLedger.transactions);
      const paymentsSum = Number(parseFloat(sums.paymentsSum).toFixed(2));
      const routings = await getReservationRoutings(reservation.id);
      if (routings.length !== 0) {
        if (routings.isParent) {
          console.log("This reservation pays anothers.");
          rsrvWithRoutings.push({
            room: reservation.room,
            routings,
          });
          console.log("Checking payment & rates...");
          // const childReservations = reservations.filter(
          //   (reservation, index) => reservation.room !== routings.childs[index]
          // );
          // console.log(routings);
          console.log("\n");
          continue;
        }

        if (!routings.isParent) {
          console.log(
            "This reservation is already paid by a parent reservation."
          );
          console.log("\n");
          rsrvWithRoutings.push({
            room: reservation.room,
            routings,
          });
          continue;
        }
      }

      if (balance >= 0) {
        console.log("Payment status: required");
        rsrvPendingToPay.push({
          room: reservation.room,
        });
        console.log("\n");
        continue;

        //TODO: Search in another ledger
      }

      if (balanceAbs === total || paymentsSum === total) {
        console.log("Payment status: complete");
        rsrvComplete.push({
          room: reservation.room,
        });
        console.log("\n");
        continue;
      }

      if (balanceAbs > total || paymentsSum > total) {
        console.log("Balance is greater than total. Check payments manually.");
        console.log("\n");
        const diff = Number(
          parseFloat((total - paymentsSum).toString()).toFixed(2)
        );
        rsrvPendingToCheck.push({
          room: reservation.room,
          diff,
        });
        continue;
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
        rsrvErrors.push({
          room: reservation.room,
          reason: "RATE_PAYMENT_ERROR",
          rate,
          comparationBalance: tempBalance,
          diff: Number(
            parseFloat((rate.totalWTax - tempBalance).toString()).toFixed(2)
          ),
        });
        break;
      }

      // case rsrv errors
      if (rsrvErrors.find((rsrv) => rsrv.id === reservation.id)) {
        continue;
      }

      if (nights > 0) {
        console.log(`Total nights paid: ${nights}`);
        rsrvComplete.push({
          room: reservation.room,
          nightsPaid: nights,
        });
      }

      console.log("\n");
    }

    console.log(`PAID:`);
    console.log(rsrvComplete);
    console.log(`\nPending:`);
    console.log(rsrvPendingToCheck);
    console.log(`\nPayment required;`);
    console.log(rsrvPendingToPay);
    console.log(`\nErrors:`);
    console.log(rsrvErrors);
    console.log(`\nRoutings:`);
    console.log(rsrvWithRoutings);
    console.log("Certificated");
    console.log(rsrvWithCertificate);
    console.log("Virtual cards");
    console.log(rsrvWithVirtualCard);
  }
}
