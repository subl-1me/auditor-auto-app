import {
  getReservationList,
  getReservationLedgerList,
  getReservationRateCode,
  getReservationRates,
  getReservationGuaranteeDocs,
  getReservationRoutings,
  getReservationCertificate,
  getVirtualCard,
} from "../../utils/reservationUtlis";
import { IN_HOUSE_FILTER } from "../../consts";

import Reservation from "../../types/Reservation";
import Transaction from "../../types/Transaction";
import { Rate } from "../../types/RateDetails";
import Ledger from "../../types/Ledger";
import Router from "../../types/Router";

export default class PITChecker {
  constructor() {}

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

  /**
   * @description It checks if tonight rate is covered by the payments sum
   * @param todayRateAmount Today rate with tax
   * @param paymentsSum Guest's payments sum
   */
  private isTonightPaid(todayRateAmount: number, paymentsSum: number): boolean {
    return paymentsSum >= todayRateAmount;
  }

  /**
   * @description Compares payments sum to reservation total amount
   * @param totalToPay Reservation's total amount
   * @param paymentsSum Guest's payments sum
   * @returns
   */
  private isTotalPaid(totalToPay: number, paymentsSum: number): boolean {
    return totalToPay === paymentsSum;
  }

  /**
   * @description It calculates the total of nights that the payment sum covers.
   * @param rates
   * @param transactions
   * @returns Total nights paid
   */
  private calculateNightsPaid(rates: Rate, transactions: Transaction): number {
    return 0;
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
    const todayDate = "2024/03/06";
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
      // if (reservation.room !== 623) continue;
      const ledgers = await getReservationLedgerList(reservation.id);
      console.log(`Checking room: ${reservation.room}...`);

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
      const certificateId = await getReservationCertificate(reservation.id);
      if (certificateId) {
        console.log("This reservation has a certificate.");
        console.log("\n");
        rsrvWithCertificate.push({
          room: reservation.room,
          certificateId,
        });
        continue;
      }

      const guaranteeDocs = await getReservationGuaranteeDocs(reservation.id);
      if (guaranteeDocs.length > 0) {
        console.log("This reservation has guarantee docs.");
        console.log("\n");
        rsrvComplete.push({
          room: reservation.room,
          docs: guaranteeDocs,
        });
        continue;
      }

      const virtualCard = await getVirtualCard(
        reservation.id,
        todayRate.code,
        todayDate
      );
      if (virtualCard) {
        const { amount } = virtualCard;
        if (amount !== 0 || amount !== null) {
          console.log(
            `This reservation has a Virtual Credit Card - $${amount}\n`
          );

          if (total !== amount) {
            console.log(
              "Virtual Card balance doesnt match with reservation total.\n"
            );
          } else {
            console.log("OK!\n");
          }

          rsrvWithVirtualCard.push({
            room: reservation.room,
            type: virtualCard.type,
            balanceMatch: total === amount,
            reservationTotal: total,
            virtualCardBalance: amount,
            diff: Number(total - amount),
          });
          continue;
        }
      }

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
