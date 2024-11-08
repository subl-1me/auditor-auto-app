import dotenv from "dotenv";
import { readPdfText } from "pdf-text-reader";
import Spinnies from "spinnies";

dotenv.config();

const { FRONT_API_GET_REGISTRATION_CARD, TODAY_DATE } = process.env;

import {
  getReservationList,
  getReservationLedgerList,
  getReservationRates,
  getReservationRoutings,
  getReservationById,
  checkAllRates,
  getReservationInvoiceList,
  getReservationLogs,
} from "../../utils/reservationUtlis";
import {
  CERTIFICATE,
  CHECK_ALL,
  CHECK_NEWER,
  COUPON,
  ERROR,
  EXTRA_PAX,
  FULLY_PAID,
  GENERAL_USE,
  IN_HOUSE_FILTER,
  MARRIOTT_RECEPTOR,
  NO_FISCAL_USE,
  PARTIAL_PAID,
  PENDING,
  PRE_PAID,
  RATE_CHANGE,
  ROUTED,
  ROUTER,
  UNKNOWN_DOCUMENT,
  VIRTUAL_CARD,
  NOT_APPLICABLE,
} from "../../consts";

import Transaction from "../../types/Transaction";
import Reservation from "../../types/Reservation";
import PitCheckerResult from "../../types/PitCheckerResult";
import PrePaid from "../../PrePaid";
import FrontService from "../../services/FrontService";
import { TempStorage } from "../../utils/TempStorage";
import path from "path";
import TokenStorage from "../../utils/TokenStorage";
import { Rate } from "../../types/RateDetails";
import inquirer from "inquirer";

const { STORAGE_TEMP_PATH } = process.env;
const docsTempStoragePath = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");

export default class PITChecker {
  private frontService: FrontService;
  // private tokenStorage: TokenStorage
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

  async handelSaving(check: PitCheckerResult, checkType: string): Promise<any> {
    if (checkType === CHECK_ALL) {
    }
  }

  async performChecker(): Promise<any> {
    // Setup initial configuration
    const spinnies = new Spinnies();
    const tempStorage = new TempStorage();
    spinnies.add("spinner-1", { text: "Loading reservations data..." });
    const reservations = await getReservationList(IN_HOUSE_FILTER);
    spinnies.succeed("spinner-1", { text: "Loading reservations data..." });
    // const sliceIndex = reservations.findIndex(
    //   (reservation) => reservation.room === 305
    // );
    // const probReserv = reservations.slice(sliceIndex, reservations.length);

    const optionPrompt = [
      {
        type: "list",
        name: "checkType",
        message: "Select an option",
        choices: ["All", "Newer"],
      },
    ];

    const promptResponse = await inquirer.prompt(optionPrompt);
    const { checkType } = promptResponse;

    let rsrvComplete: any[] = [];
    let rsrvPaidNights: any[] = [];
    let rsrvPendingToCheck: any[] = [];
    let rsrvPendingToPay: any[] = [];
    let rsrvErrors: any[] = [];
    let routings: any = {
      routers: [],
      routed: [],
    };
    let rsrvCourtesy: any[] = [];
    let rsrvWithCertificate: any[] = [];
    let rsrvWithCoupon: any[] = [];
    let rsrvWithDocs: any[] = [];
    let rsrvWithVirtualCard: any[] = [];
    const { checkedList } = await tempStorage.readChecked();

    // console.log(`Checking all reservations...`);
    spinnies.add("spinner-2", { text: "Checking reservations..." });
    const checkPromises: any = [];
    for (const reservation of reservations) {
      if (checkType === CHECK_NEWER) {
        if (
          checkedList.find(
            (result: PitCheckerResult) =>
              result.reservationId === reservation.id
          )
        )
          //skip
          console.log(`Skipping: ${reservation.room} - Already checked`);
        continue;
      } else {
        checkPromises.push(await this.check(reservation, { checkType }));
        spinnies.update("spinner-2", {
          text: `Checking ${reservation.guestName} - ${reservation.room}`,
        });
      }
    }

    const results = await Promise.all(checkPromises);
    for (const result of results) {
      // console.log(result);
      switch (result.paymentStatus) {
        case ROUTER: {
          routings.routers.push({
            room: result.room,
            routingData: result.routing,
          });
          await tempStorage.writeCheckedOn(ROUTER, {
            room: result.room,
            routingData: result.routing,
          });
          break;
        }
        case ROUTED: {
          routings.routed.push({
            room: result.room,
            routingData: result.routing,
          });
          await tempStorage.writeCheckedOn(ROUTED, {
            room: result.room,
            routingData: result.routing,
          });
          break;
        }
        case ERROR: {
          rsrvErrors.push({
            room: result.room,
            details: result.errorDetail,
          });
          await tempStorage.writeCheckedOn("ERROR", {
            room: result.room,
            error: result.errorDetail,
          });
          break;
        }
        case PENDING: {
          rsrvPendingToPay.push(result.room);
          await tempStorage.writeCheckedOn(PENDING, result.room);
          break;
        }
        case NOT_APPLICABLE: {
          rsrvCourtesy.push({ room: result.room });
          await tempStorage.writeCheckedOn(NOT_APPLICABLE, result.room);
          break;
        }
        case PRE_PAID: {
          // Virtual card case
          if (
            result.prePaidMethod &&
            result.prePaidMethod.type === VIRTUAL_CARD
          ) {
            rsrvWithVirtualCard.push({
              room: result.room,
              virtualCard: result.prePaidMethod.data.provider,
              readyToCharge: result.prePaidMethod.data.readyToCharge,
            });
            await tempStorage.writeCheckedOn(PRE_PAID, {
              room: result.room,
              prePaidMethod: result.prePaidMethod,
              totalReservation: result.totalReservation,
            });
          }

          // Coupon case
          if (result.prePaidMethod && result.prePaidMethod.type === COUPON) {
            rsrvWithCoupon.push({
              room: result.room,
              coupon: result.prePaidMethod.data.coupons[0].providerName,
              pass: result.prePaidMethod.data.coupons[0].analyzerResult
                .comparission.pass,
            });
            await tempStorage.writeCheckedOn(PRE_PAID, {
              room: result.room,
              prePaidMethod: result.prePaidMethod,
            });
          }

          // Certificate case
          if (
            result.prePaidMethod &&
            result.prePaidMethod.type === CERTIFICATE
          ) {
            rsrvWithCertificate.push({
              room: result.room,
              certificate: result.prePaidMethod.data,
            });
            await tempStorage.writeCheckedOn(PRE_PAID, {
              room: result.room,
              prePaidMethod: result.prePaidMethod,
            });
          }

          // Unkown document
          if (
            result.prePaidMethod &&
            result.prePaidMethod.type === UNKNOWN_DOCUMENT
          )
            rsrvWithDocs.push({
              room: result.room,
            });
          await tempStorage.writeCheckedOn(PRE_PAID, {
            room: result.room,
            prePaidMethod: result.prePaidMethod,
          });
          break;
        }
        case FULLY_PAID: {
          rsrvComplete.push(result.room);
          await tempStorage.writeCheckedOn(FULLY_PAID, {
            room: result.room,
          });
          break;
        }
        case PARTIAL_PAID: {
          rsrvPaidNights.push(result.room);
          await tempStorage.writeCheckedOn(PARTIAL_PAID, {
            room: result.room,
          });
          break;
        }
      }
    }

    console.log(`------`);
    console.log(`Total in house: ${reservations.length}`);
    console.log(`------`);
    spinnies.succeed("spinner-2", { text: "All reservations were checked." });
    console.log("pending:");
    console.log(rsrvPendingToPay);
    console.log("completed");
    console.log(rsrvComplete);
    console.log("partial");
    console.log(rsrvPaidNights);
    console.log("VCC");
    console.log(rsrvWithVirtualCard);
    console.log("Coupon");
    console.log(rsrvWithCoupon);
    console.log("Courtesy");
    console.log(rsrvCourtesy);
    console.log("Unkown documents");
    console.log(rsrvWithDocs);
    console.log("Certificate");
    console.log(rsrvWithCertificate);
    console.log("error");
    console.log(rsrvErrors);
  }

  private async registrationCardAnalyzer(
    reservation: Reservation
  ): Promise<any> {
    // console.log(`Reading reservation's register card...`);
    if (reservation.company === "") {
      // console.log(`Reservation has no attached company data.
      // `);
      return null;
    }

    const rsrvRegisterCardPayload = {
      propCode: "CECJS",
      sReservation: reservation.id,
      userIdiom: "Spa",
    };

    const authTokens = await TokenStorage.getData();
    const fileName = `${reservation.id}-register-card.pdf`;
    const fileFir = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");
    const rsrvRegisterCardDownloadURL = FRONT_API_GET_REGISTRATION_CARD || "";
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

  async setRepeatInvoice(
    reservation: Reservation,
    result: PitCheckerResult
  ): Promise<any> {
    const invoices = await getReservationInvoiceList(
      reservation.id,
      reservation.status
    );
    if (invoices.length > 0) {
      // return reference
      result.invoiceSettings.RFC = invoices[0].RFC;
      result.invoiceSettings.repeat = true;
      result.invoiceSettings.companyName = invoices[0].RFCName;
    }

    return result;
  }

  async check(
    reservation: Reservation,
    options = { checkType: CHECK_ALL }
  ): Promise<any> {
    const tempStorage = new TempStorage();
    // await tempStorage.createDefaultCheckedList();

    // console.log("\n");
    // console.log(`Checking ${reservation.guestName} - ${reservation.room}...`);
    let result: PitCheckerResult = {
      guest: reservation.guestName,
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
        fiscalUse: GENERAL_USE,
        receptor: {
          receptorId: "", // default
        },
      },
      remarks: [],
      checkDate: new Date(),
    };

    // if (rateChangeLogs.length > 0) {
    // console.log("Rate changes:");
    // console.log(rateChangeLogs);
    // }

    // console.log(rateChecker);
    reservation.ledgers = await getReservationLedgerList(
      reservation.id,
      "CHIN"
    );

    if (reservation.paxNo >= 3) {
      result.remarks.push({
        type: EXTRA_PAX,
        description: `This reservation has ${reservation.paxNo} pax(s). An additional amount could be applied.`,
      });
    }

    const activeLedger = reservation.ledgers.find(
      (ledger) => ledger.status === "OPEN"
    );
    if (!activeLedger) {
      // console.log("No open ledgers for this reservation were found.\n");
      result.paymentStatus = ERROR;
      result.hasErrors = true;
      result.errorDetail.type = "";
      result.errorDetail.detail = "No open ledger found.";
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    // const ledgerClassification = await classifyLedgers(
    //   reservation.id,
    //   reservation.ledgers
    // );

    // TODO: Add an implemetation of a "RATE CHECKER" to avoid problems with future rates
    // console.log("Searching for pre-paid methods...");
    const prePaidMethod = await PrePaid.getPrePaidMethod(reservation);
    if (prePaidMethod) {
      // if (ledgerClassification.active.length > 0) {
      //   ledgerClassification.active[0].isPrincipal = true;
      // }
      const rateChangeLogs = await getReservationLogs(reservation.id);
      if (rateChangeLogs.length > 1) {
        result.remarks.push({
          type: RATE_CHANGE,
          description: `Rate was changed (${rateChangeLogs.length}) times. Please verify.`,
        });
      }

      result.paymentStatus = PRE_PAID;
      result.prePaidMethod = prePaidMethod;
      // console.log(`This is a prepaid reservation by ${prePaidMethod.type}...`);
      // console.log(prePaidMethod);

      if (result.prePaidMethod.type === VIRTUAL_CARD) {
        const reservationRates = await getReservationRates(reservation.id);
        if (reservationRates.error) {
          result.hasErrors = true;
          result.errorDetail.type = reservationRates.type;
          result.errorDetail.detail = reservationRates.detail;
          // await tempStorage.writeChecked(result); // save on local
          // return result;
        }
        result.totalReservation = reservationRates.total;
        // console.log(`Total reservation: ${reservationRates.total}`);
      }

      if (result.prePaidMethod.type === COUPON) {
        const primaryCoupons = result.prePaidMethod.data.coupons.filter(
          (coupon: any) => coupon.isPrimary
        );
        for (const coupon of primaryCoupons) {
          const { comparission, patternMatches } = coupon.analyzerResult;

          if (comparission.pass) {
            // get invoice data
            if (coupon.providerName === "couponACCESS") {
              const registerCardAnalyzer = await this.registrationCardAnalyzer(
                reservation
              );
              if (
                registerCardAnalyzer &&
                registerCardAnalyzer.RFC !== "" &&
                registerCardAnalyzer.RFC
              ) {
                // save invoice data
                result.invoiceSettings.RFC = registerCardAnalyzer.RFC;
                result.invoiceSettings.companyName =
                  registerCardAnalyzer.fiscalName;

                // await tempStorage.writeChecked(result); // save on local
                // return result;
              }
            }

            result.invoiceSettings.RFC = patternMatches.RFC;
            result.invoiceSettings.companyName = patternMatches.provider;
          }
        }
      }

      // if (result.prePaidMethod.type === UNKNOWN_DOCUMENT) {
      //   result.errorDetail.type = "UNKNOWN DOCUMENT";
      //   result.errorDetail.detail = "Document is not supported.";
      // }

      if (result.prePaidMethod.type === CERTIFICATE) {
        result.invoiceSettings.receptor = MARRIOTT_RECEPTOR;
        result.invoiceSettings.companyName = MARRIOTT_RECEPTOR.receptorNombre;
        result.invoiceSettings.RFC = MARRIOTT_RECEPTOR.receptorNombre;
        result.invoiceSettings.note = prePaidMethod.data.code || "";
        result.invoiceSettings.fiscalUse = NO_FISCAL_USE;
      }

      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    if (result.invoiceSettings.RFC === "") {
      // read register card
      const registerCardAnalyzer = await this.registrationCardAnalyzer(
        reservation
      );
      if (
        registerCardAnalyzer &&
        registerCardAnalyzer.RFC !== "" &&
        registerCardAnalyzer.RFC
      ) {
        // save invoice data
        result.invoiceSettings.RFC = registerCardAnalyzer.RFC;
        result.invoiceSettings.companyName = registerCardAnalyzer.fiscalName;
      }

      // result.deleteRegisterOn = reservation.dateOut;
      // await tempStorage.writeChecked(result); // save on local
    }

    // if (reservation.status === "CHOUT") {
    //   return {
    //     error: true,
    //     message: "Reservation on checkout.",
    //   };
    // }

    const rateChecker = await checkAllRates(
      reservation.id,
      new Date(reservation.dateIn),
      new Date(reservation.dateOut)
    );

    if (rateChecker.length > 0) {
      result.paymentStatus = ERROR;
      result.hasErrors = true;
      result.errorDetail.type = "Missing rates";
      result.errorDetail.detail = rateChecker[0];
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    const routings = await getReservationRoutings(reservation.id);
    if (routings) {
      if (routings.isRouter) {
        // console.log("This reservation pays anothers.");
        result.paymentStatus = ROUTER;
        result.routing.isParent = true;
        result.routing.childs = routings.routed;
        result.routing.parentId = reservation.id;
        // console.log("Checking payment & rates...");
        // const childReservations = reservations.filter(
        //   (reservation, index) => reservation.room !== routings.childs[index]
        // );
        // console.log(routings);
        await tempStorage.writeChecked(result); // save on local
        return result;
      }

      // console.log("This reservation is already paid by a parent reservation.");
      result.routing.isParent = false;
      result.paymentStatus = ROUTED;
      result.routing.parentId = routings.routerId;
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    result = await this.setRepeatInvoice(reservation, result);
    const balanceAbs = Math.abs(activeLedger.balance);
    const balance = activeLedger.balance;
    const ratesDetail = await getReservationRates(reservation.id);
    if (ratesDetail.error) {
      result.hasErrors = true;
      result.errorDetail.type = ratesDetail.type;
      result.errorDetail.detail = ratesDetail.detail;
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    const { rates, total } = ratesDetail;
    if (total === 0) {
      result.checkAgainOn = reservation.dateOut;
      result.deleteRegisterOn = reservation.dateOut;
      result.paymentStatus = NOT_APPLICABLE;
      await tempStorage.writeChecked(result);
      return result;
    }

    const sums = this.getTransactionsSum(activeLedger.transactions);
    const paymentsSum = Number(parseFloat(sums.paymentsSum).toFixed(2));
    const todayDate = TODAY_DATE || "";

    if (balance >= 0) {
      // console.log("Payment status: required");
      // console.log("\n");
      await tempStorage.writeChecked(result); // save on local
      return result;
      //TODO: Search in another ledger
    }

    if (balanceAbs === total || paymentsSum === total) {
      // console.log("Payment status: complete");
      result.paymentStatus = FULLY_PAID;
      // console.log("\n");
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    if (balanceAbs > total || paymentsSum > total) {
      // console.log("Balance is greater than total. Check payments manually.");
      console.log("\n");
      const diff = Number(
        parseFloat((total - paymentsSum).toString()).toFixed(2)
      );

      result.paymentStatus = ERROR;
      result.hasErrors = true;
      result.errorDetail.type = "";
      result.errorDetail.detail = `Balance is greater than total. (${diff})`;
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    // console.log("calculating nights paid...");
    // const nightsPaid = await this.calculateNightsPaid(rates.)
    const todayRateIndex = rates.findIndex(
      (rate: Rate) => rate.dateToApply === todayDate
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
      // console.log(`There's a diff in rates.`);
      // console.log("\n");

      //TODO: Add a message that contains remaining balance that cannot pay the next night rate
      const diff = Number(
        parseFloat((total - paymentsSum).toString()).toFixed(2)
      );

      // Extra things
      result.paymentStatus = ERROR;
      result.hasErrors = true;
      result.errorDetail.type = "Diff rates";
      result.errorDetail.detail = diff;
      await tempStorage.writeChecked(result); // save on local
      return result;
    }

    // case rsrv errors
    // if (rsrvErrors.find((rsrv) => rsrv.id === reservation.id)) {
    //   continue;
    // }

    if (nights > 0) {
      // console.log(`Total nights paid: ${nights}`);
      result.nightsPaid = nights;
      result.paymentStatus = PARTIAL_PAID;
      await tempStorage.writeChecked(result); // save on local
      result = await this.setRepeatInvoice(reservation, result);
      return result;
    }

    // // console.log("\n");
    await tempStorage.writeChecked(result); // save on local
    return result;
  }
}
