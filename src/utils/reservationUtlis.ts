import FrontService from "../services/FrontService";
import TokenStorage from "./TokenStorage";
import Scrapper from "../Scrapper";
import { PdfReader } from "pdfreader";
import Pdfparser from "pdf2json";
import fs from "fs";

// Types
import Ledger from "../types/Ledger";
import Payment from "../types/Payment";
import Invoice from "../types/Invoice";
import Reservation from "../types/Reservation";
import Transaction from "../types/Transaction";
import GuaranteeDoc from "../types/GuaranteeDoc";
import { RateDetails, Rate } from "../types/RateDetails";

import {
  DEPARTURES_FILTER,
  IN_HOUSE_FILTER,
  PRE_INVOICED,
  INVOICED,
  VIRTUAL_CARD_PROVIDERS,
  BANNED_COUPON_CONTENTS,
  EXPEDIA,
  BOOKING,
} from "../consts";

import {
  invoiceEventHTMLElemPattern,
  invoiceReceptorRFCPattern,
  invoiceReceptorNamePattern,
  VCCPatternsList,
} from "../patterns";
import path from "path";
import VCC from "../types/VCC";
import { TempStorage } from "./TempStorage";
import ReservationChecked from "../types/ReservationChecked";

const frontService = new FrontService();
const {
  FRONT_API_RSRV_FOLIOS,
  FRONT_API_RSRV_FOLIOS_MOVS,
  FRONT_API_RSRV_CHANGE_LEDGER_STATUS,
  FRONT_API_RSRV_GUEST_INFO,
  FRONT_API_RSRV_ADD_NEW_LEDGER,
  FRONT_API_RSRV_INVOICES,
  FRONT_API_RSRV_LIST,
  FRONT_API_RSRV_RATES,
  FRONT_API_RSRV_GET_RATE,
  FRONT_API_RSRV_GUARANTEE_DOCS,
  FRONT_API_DOWNLOAD_DOC,
  FRONT_API_RSRV_ROUTINGS,
  FRONT_API_RSRV_CERTIFICATE,
  FRONT_API_INIT_LEDGER_INVOICE,
  FRONT_API_SEARCH_RFC,
  FRONT_API_GENERATE_PRE_INVOICE,
  FRONT_API_GENERATE_INVOICE,
  FRONT_API_RESERVATION_NOTES,
  FRONT_API_ROUTING_SAVE,
  FRONT_API_RATE_DESCRIPTION,
  FRONT_API_APPLY_VCC_PAYMENT,
  FRONT_API_GET_ECOMMERCE_INFO,
  FRONT_API_CREATE_PAYMENT,
  FRONT_API_RSRV_HOME,
} = process.env;

export async function getReservationCertificate(
  reservationId: string
): Promise<string | null> {
  if (!FRONT_API_RSRV_CERTIFICATE) {
    throw new Error("Endpoint cannot be null");
  }

  if (!reservationId) {
    throw new Error("Reservation ID is required.");
  }

  let _FRONT_API_RSRV_CERTIFICATE = FRONT_API_RSRV_CERTIFICATE.replace(
    "{rsrvIdField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_CERTIFICATE,
    authTokens
  );

  const scrapper = new Scrapper(response);
  let certificateId = scrapper.extractCertificateId();

  return certificateId;
}

export async function getReservationById(
  reservationId: string
): Promise<Reservation> {
  let reservation: Reservation = {
    id: "",
    guestName: "",
    room: 0,
    dateIn: "",
    dateOut: "",
    status: "",
    company: "",
    agency: "",
    ledgers: [],
  };

  const getReservationPayload = {
    pc: "KFwHWn911eaVeJhL++adWg==",
    ph: false,
    pn: "",
    ci: "",
    gpi: "",
    ti: "",
    rc: reservationId,
    rm: "",
    fm: "",
    to: "",
    fq: "",
    rs: "CHIN,NOSHOW,POST",
    st: "EC",
    NoPax: "",
    grp: "",
    gs: "",
    sidx: "NameGuest",
    sord: "asc",
    rows: 100,
    page: 1,
    ss: false,
    rcss: "",
    user: "HTJUGALDEA",
    AddGuest: false,
  };

  const authTokens = await TokenStorage.getData();
  const getReservationResponse = await frontService.postRequest(
    getReservationPayload,
    FRONT_API_RSRV_LIST || "",
    authTokens
  );

  const rows = getReservationResponse.data.rows;
  if (rows.length === 0) {
    return reservation;
  }

  const reservationData = rows[0];
  reservation.id = reservationData.reservationId.match(/\d+/)[0] || "";
  reservation.status = reservationData.statusGuest.trim();
  reservation.guestName = reservationData.nameGuest;
  reservation.agency = reservationData.agency;
  reservation.company = reservationData.company;
  reservation.room = Number(reservationData.room);
  reservation.dateIn = reservationData.dateIn;
  reservation.dateOut = reservationData.dateOut;

  const rates = await getReservationRates(reservation.id);
  reservation.totalToPay = rates.total || 0;
  return reservation;
}

export async function createReservationRouting(
  parentReservation: Reservation,
  childs: string[] | number[],
  ledgerNo: Number,
  reservationsToProcess: Reservation[]
): Promise<void> {
  if (!FRONT_API_ROUTING_SAVE) {
    throw new Error("API ENDPOITN NULL");
  }

  const authTokens = await TokenStorage.getData();
  for (const reservation of reservationsToProcess) {
    console.log(`Processing for room: ${reservation.room}`);
    let routingPayload = {
      PropCode: "CECJS",
      RoutingType: "transaction",
      SourceRsrvCode: reservation.id,
      SourceRsrvStatus: "CHIN",
      TargetFolio: `${parentReservation.id}.${ledgerNo}`,
      TargetRsrvCode: parentReservation.id,
      TransCode: "HAB",
    };

    const routingSaveResponse = await frontService.postRequest(
      routingPayload,
      FRONT_API_ROUTING_SAVE,
      authTokens
    );

    const data = routingSaveResponse.data;
    console.log(data);
  }
}

export async function applyPendingPayment(
  reservation: Reservation,
  paymentType: VCC | GuaranteeDoc[] | string | null
): Promise<any> {}

export async function getPendingPaymentType(
  reservationId: string
): Promise<VCC | GuaranteeDoc[] | string | null> {
  const promises = [];
  promises.push(await getReservationCertificate(reservationId));
  promises.push(await getReservationGuaranteeDocs(reservationId));
  promises.push(await getReservationVCC(reservationId));

  const results = await Promise.all(promises);
  for (const data of results) {
    if (
      data &&
      ((data as GuaranteeDoc[]).length > 0 || (data as VCC)?.provider)
    ) {
      return data;
    }
  }
  return null;
}

export async function compareReservationsToBeRouted(
  reservationsToProcess: Reservation[],
  primaryReservation: Reservation,
  ledgerNo: Number
): Promise<any> {
  const parentTargetLedger = (
    await getReservationLedgerList(
      primaryReservation.id,
      primaryReservation.status
    )
  ).find((ledger) => ledger.ledgerNo === ledgerNo);

  if (!parentTargetLedger) {
    console.log(
      "Ledger no was not found in primary reservation ledger list..."
    );
    return;
  }

  const payments = parentTargetLedger.transactions.reduce(
    (accum, transaction) => {
      if (transaction.type === "PAYMENT") {
        return (accum += Math.abs(transaction.amount));
      }
      return accum;
    },
    0
  );

  let allReservationsTotal = 0;
  // get primary reservation total

  if (primaryReservation.status !== "POST") {
    const primaryRsrvRates = await getReservationRates(primaryReservation.id);
    allReservationsTotal += primaryRsrvRates.total;

    // get all rsrv total & compare to primary rsrv's payment
    console.log(`~ Primary reservation total:`);
    console.log(
      `~ ${primaryReservation.guestName} ~ ${primaryReservation.room} ~ ${primaryRsrvRates.total}`
    );
  }

  console.log(`~ Child reservation totals:`);
  for (let reservation of reservationsToProcess) {
    let { total } = await getReservationRates(reservation.id);
    console.log(`${reservation.guestName} ~ ${reservation.room} ~ ${total}`);
    allReservationsTotal += total;
  }

  console.log(
    `~ Total to pay (${
      reservationsToProcess.length + 1
    }): ${allReservationsTotal}`
  );
  console.log(`~ Total payments: ${payments}`);

  const diff = (payments - allReservationsTotal).toFixed(2);
  console.log(`Diff: ${diff}`);
  return diff;
}

/**
 *
 * @param doc It could be guaranteeDoc object or file path
 */
// export async function classifyDoc(doc: GuaranteeDoc | string): Promise<any> {
//   // read doc and concatenate all texts
//   const pdfParser = new Pdfparser();
//   pdfParser.on("pdfParser_dataError", (errData) => {
//     console.log(errData);
//   });
//   let content = "";
//   pdfParser.on("pdfParser_dataReady", (pdfData) => {
//     pdfData.Pages.forEach((page, index) => {
//       page.Texts.forEach((text) => {
//         // console.log(text);
//         content += text.R.reduce(
//           (prev, current) =>
//             prev + decodeURIComponent(current.T.toLowerCase()) + " ",
//           ""
//         );
//         // text.R.forEach((value) => {
//         //   const valueText = decodeURIComponent(value.T);
//         // });
//       });
//     });
//     for (const BANNED of BANNED_COUPON_CONTENTS) {
//       if (content.includes(BANNED)) {
//         console.log("---------");
//         console.log("Banned coupon.");
//         console.log("---------\n");
//         return;
//       }
//     }

//     // console.log(content);
//     // console.log("----\n");
//     for (const entry in guaranteeDocPatterns) {
//       if (content.includes(guaranteeDocPatterns[entry].primaryIdentificator)) {
//         const provider = guaranteeDocPatterns[entry].provider;
//         const confirmationPattern =
//           guaranteeDocPatterns[entry].confirmationIdPattern;
//         const dateInPattern = guaranteeDocPatterns[entry].dateInPattern;
//         const totalPattern = guaranteeDocPatterns[entry].totalPattern;
//         const hotelNamePattern = guaranteeDocPatterns[entry].hotelName;
//         const guestNamePattern = guaranteeDocPatterns[entry].guestName;

//         // if (provider != NOKTS_PROVIDER) {
//         //   return;
//         // }
//         console.log(content);
//         console.log(`Analyzing: ${doc}`);
//         let couponDetails = {
//           hotelName: "",
//           hotelConfirmation: "",
//           guestName: "",
//           total: 0,
//           dateIn: "",
//           dateOut: "",
//         };
//         switch (provider) {
//           case ACCESS_PROVIDER:
//             console.log("This is an access coupon.");
//             const confirmationIdMatch = content.match(confirmationPattern);
//             if (confirmationIdMatch) {
//               const confirmationId = confirmationIdMatch[0].match(/\d+/);
//               couponDetails.hotelConfirmation = confirmationId
//                 ? confirmationId[0]
//                 : "";
//             }

//             const totalPatternMatch = content.match(totalPattern);
//             if (totalPatternMatch) {
//               const totalStringSanitized = totalPatternMatch[0]
//                 .replace("$", "")
//                 .replace(",", "")
//                 .trim();
//               couponDetails.total = Number(totalStringSanitized);
//             }

//             const dateInMatch = content.match(dateInPattern);
//             if (dateInMatch) {
//               // replace - to / for better handling to comparing with reservation date format
//               couponDetails.dateIn = dateInMatch[0].replaceAll("-", "/");
//               couponDetails.dateOut = dateInMatch[1].replaceAll("-", "/");
//             }

//             const hotelNameMatch = content.match(hotelNamePattern);
//             if (hotelNameMatch) {
//               couponDetails.hotelName = hotelNameMatch[0];
//             }

//             const guestNameMatch = content.match(guestNamePattern);
//             const unwishChars = /[.,]/g;
//             if (guestNameMatch) {
//               const guestNameDirty = guestNameMatch[1];
//               const guestNameSerialized = guestNameDirty.replace(
//                 unwishChars,
//                 ""
//               );
//               const guestNameSegments = guestNameSerialized
//                 .split(" ")
//                 .filter((segment) => segment !== "");

//               // This should capitalize guest name
//               // const capitalizedNameSegments = guestNameSegments.map(
//               //   (segment) => {
//               //     return segment.charAt(0).toUpperCase() + segment.slice(1);
//               //   }
//               // );
//               // const guestName = capitalizedNameSegments.join(" ");
//               const guestName = guestNameSegments.join(" ");
//               couponDetails.guestName = guestName;
//             }

//             console.log(couponDetails);
//             console.log("----\n");
//             break;
//           case NOKTS_PROVIDER:
//             console.log("This is a noktos coupon");
//             console.log("----\n");
//             break;
//           case VECI_PROVIDER:
//             console.log("This is a Corte Ingles coupon");
//             break;
//           case CTS_PROVIDER:
//             console.log("This is a Corporate Travel Services coupon");
//             break;
//           case GBT_PROVIDER:
//             console.log("This is a GBT Travel Services coupon");
//             break;
//           default:
//             console.log("Unkown doc");
//         }
//       }
//     }
//   });

//   if (typeof doc === "string") {
//     await pdfParser.loadPDF(doc);
//   }
// }

export async function reservationDataMatcher(
  doc: GuaranteeDoc | string,
  reservation: any
): Promise<any> {
  // read doc and concatenate all texts
  const pdfParser = new Pdfparser();
  pdfParser.on("pdfParser_dataError", (errData) => {
    console.log(errData);
  });
  let content = "";
  const hotelCommonTags = [
    "City Express Ciudad Juárez",
    "City Express by Marriott Juárez",
    "City Express by Marriott",
  ];
  pdfParser.on("pdfParser_dataReady", (pdfData) => {
    pdfData.Pages.forEach((page, index) => {
      page.Texts.forEach((text) => {
        // console.log(text);
        content += text.R.reduce(
          (prev, current) =>
            prev + decodeURIComponent(current.T.toLowerCase()) + " ",
          ""
        );
        // text.R.forEach((value) => {
        //   const valueText = decodeURIComponent(value.T);
        // });
      });
    });
    for (const BANNED of BANNED_COUPON_CONTENTS) {
      if (content.includes(BANNED)) {
        console.log("---------");
        console.log("Banned coupon.");
        console.log("---------\n");
        return;
      }
    }

    // console.log(content);
    // console.log("----\n");
    // let result = {
    //   reservationId1: false
    //   reservationId2: false
    //   guestName: false
    //   dateIn:
    //   dateOut: "2923/11/30",
    //   totalString: "$29,568.00",
    // };
    for (let key in reservation) {
      if (key === "dateIn" || key === "dateOut") {
        continue;
        //TODO: Check in other part of code
      }

      if (content.includes(reservation[key])) {
        console.log(`${key}was found in text\n`);
        console.log(content);
      }
    }

    console.log("----\n");
  });

  if (typeof doc === "string") {
    await pdfParser.loadPDF(doc);
  }
}

export async function analyzeDoc(doc: GuaranteeDoc): Promise<any> {
  //download file and save it to read
  const docDir = path.join(__dirname, "docsTemp");
  const authTokens = await TokenStorage.getData();
  const downloadedDoc = await frontService.downloadByUrl(
    doc.id + ".pdf",
    docDir,
    authTokens,
    doc.downloadUrl
  );
}

export async function getReservationLedgerList(
  reservationId: string,
  status: string
): Promise<Ledger[]> {
  if (!FRONT_API_RSRV_FOLIOS) {
    throw new Error("Endpoint cannot be undefined");
  }

  const _FRONT_API_RSRV_FOLIOS = FRONT_API_RSRV_FOLIOS?.replace(
    "{idField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_FOLIOS,
    authTokens
  );

  // if response is a string it means the server returns Login Page as a response;
  if (typeof response === "string") {
    throw new Error("Error trying to get ledger list. Please log in again.");
  }

  // map items
  // const reservations = await getReservationList(IN_HOUSE_FILTER);
  // const currentReservation = reservations.find(
  //   (reservation) => reservation.id === reservationId
  // );

  // if (!currentReservation) {
  //   console.log("Error trying to find reservation data");
  //   return ledgerList;
  // }

  let ledgerList: Ledger[] = [];
  // const activeInvoices = await getReservationInvoiceList(reservationId, status);
  for (const ledger of response) {
    const transactions = await getLedgerTransactions(
      `${reservationId}.${ledger.numFolio}`
    );
    if (transactions.error) {
      console.log(
        `There was an error trying to get ledger ${ledger.numFolio} transactions...`
      );
      continue;
    }
    let balance = ledger.folioBalance
      ? parseFloat(ledger.folioBalance.toString()).toFixed(2)
      : 0;

    // let invoice = activeInvoices.find(
    //   (invoice) => invoice.ledgerNo === ledger.numFolio
    // );

    // const prwincipalLedger = ledgers.find((ledger) => {
    //   const isEmpty = ledger.transactions.length > 0;
    //   if (ledger && !isEmpty && ledger.status === "OPEN") {
    //     ledger.isPrincipal = true;
    //     return ledger;
    //   }
    // });

    ledger.transactions = transactions;
    const isEmpty = ledger.transactions && ledger.transactions.length === 0;
    const isPrincipal =
      ledger && !isEmpty && ledger.folioStatus === "OPEN" ? true : false;
    ledgerList.push({
      reservationId,
      ledgerNo: ledger.numFolio,
      status: ledger.folioStatus,
      balance: balance ? Number(balance) : 0,
      isBalanceCredit: balance ? ledger.folioBalance < 0 : false,
      isPrincipal: ledgerList.length === 1 ? true : isPrincipal,
      transactions,
      // isInvoiced: invoice ? true : false,
      // invoice: invoice
      //   ? {
      //       ledgerNo: ledger.numFolio,
      //       RFC: invoice.RFC,
      //       RFCName: invoice.RFCName,
      //       status: invoice.status,
      //     }
      //   : null,
    });
  }

  return ledgerList;
}

/**
 * @description It gets all the charges and payments sums
 * @param transactions
 * @returns An array with { chargesSum, PaymentsSum }
 */
function getTransactionsSum(transactions: Transaction[]): any {
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

function getRemainingNights(
  ratesDetails: RateDetails,
  balance: number,
  todayDate: string
): any {
  console.log("calculating remianing nights...");
  const { rates } = ratesDetails;
  const todayRateIndex = rates.findIndex(
    (rate) => rate.dateToApply === todayDate
  );
  const remainingRates = rates.slice(todayRateIndex, rates.length);
  let nightsLeft = 0;
  let tempBalance = balance;
  let diff = 0;
  for (const rate of remainingRates) {
    console.log(`Comparing: ${tempBalance} with ${rate.totalWTax}`);
    if (tempBalance >= rate.totalWTax) {
      nightsLeft++;
      tempBalance = Number((tempBalance - rate.totalWTax).toFixed(2));
      continue;
    }

    if (tempBalance === 0) {
      break;
    }

    console.log("Current balance: ");
    console.log(tempBalance);
    // otherwise there are differences in payments
    diff = Number(
      parseFloat((rate.totalWTax - tempBalance).toString()).toFixed(2)
    );
    console.log(
      `A future balance was caught on rate rate applied on: ${rate.dateToApply} of diff: ${diff}`
    );
    return {
      nightsLeft,
      error: true,
      errDetail: {
        diff,
        rate: rate.dateToApply,
      },
    };
  }

  return {
    nightsLeft,
    error: false,
  };
}

function getTotalNightsPaid(rateDetail: RateDetails, balance: number): any {
  console.log("calcuating nights paid...");
  const { rates, total } = rateDetail;
  let tempTotalBalance = total;
  let nights = 0;
  let diff = 0;
  for (const rate of rates) {
    if (tempTotalBalance === 0) {
      return {
        nights,
        error: false,
      };
    }

    if (tempTotalBalance >= rate.totalWTax) {
      nights++;
      tempTotalBalance = Number((tempTotalBalance - rate.totalWTax).toFixed(2));
      continue;
    }

    console.log(
      `An error was caught on rate date (${rate.dateToApply}). Balance is minor than rate amount (${rate.totalWTax}). Please check.`
    );
    diff = Number(
      parseFloat((rate.totalWTax - tempTotalBalance).toString()).toFixed(2)
    );
    return {
      nights,
      error: true,
      errDetail: {
        diff,
        rate: rate.dateToApply,
      },
    };
  }
}

function roomRentTracer(
  ledgerClassification: any,
  reservationRates: RateDetails
): any {
  const { invoiced, invoicable, active } = ledgerClassification;
  // TODO: Search for NO ROOM CHARGES to skip it

  // TODO: Search for room charges to compare with rates
  // console.log("Reservation rates: ");
  // console.log(rates);
  // console.log("\n");
  const invoicedRentTracer: any = [];
  const invoicableRentTracer: any = [];
  const activeRentTracer: any = [];
  // TODO: Categorize each charge to handle complex movements inside each ledger
  invoiced.forEach((ledger: Ledger) => {
    console.log(`For invoiced ledger ${ledger.ledgerNo}:`);
    const charges = ledger.transactions.filter(
      (transaction) =>
        transaction.type === "CHARGE" && transaction.code === "HAB"
    );
    if (charges.length > 0) {
      const chargesComparission = compareReservationRatesWithCharges(
        ledger.ledgerNo,
        charges,
        reservationRates
      );

      invoicedRentTracer.push(chargesComparission);

      // console.log(chargesComparission);
      // const lastCharge = charges[charges.length];
      // const lastChargeDate = new Date(lastCharge.date);
      // const lastChargeDateString = `${lastChargeDate.getFullYear()}/${lastChargeDate.getMonth()}/${lastChargeDate.getDay()}`;
      // console.log(rates);
      // console.log(lastChargeDate);
      // console.log(lastChargeDateString);
      // // console.log(charges);

      // const lastChargeIndex = rates.findIndex(
      //   (rate) => rate.dateToApply === lastChargeDateString
      // );
      // if (!lastChargeIndex || lastChargeIndex === -1) {
      //   console.log(`${lastCharge.date} is last rate.`);
      // } else {
      //   const nextRateToCharge = rates[lastChargeIndex + 1];
      //   console.log(
      //     `Next rate to apply: ${nextRateToCharge.dateToApply} - ${nextRateToCharge.totalNoTax}`
      //   );
      // }
    } else {
      console.log(
        `No charges found in ledger no. ${ledger.ledgerNo} - status: ${ledger.status}`
      );
    }

    // const lastChargeDate = new Date(lastCharge.date);
    console.log("\n---");
  });

  invoicable.forEach((ledger: Ledger) => {
    console.log(`For invoicable ledger ${ledger.ledgerNo}:`);
    const charges = ledger.transactions.filter(
      (transaction) =>
        transaction.type === "CHARGE" && transaction.code === "HAB"
    );
    // console.log(charges);
    if (charges.length > 0) {
      const chargesComparission = compareReservationRatesWithCharges(
        ledger.ledgerNo,
        charges,
        reservationRates
      );

      invoicableRentTracer.push(chargesComparission);

      // console.log(chargesComparission);
      // const lastCharge = charges[charges.length];
      // const lastChargeDate = new Date(lastCharge.date);
      // const lastChargeDateString = `${lastChargeDate.getFullYear()}/${lastChargeDate.getMonth()}/${lastChargeDate.getDay()}`;
      // console.log(rates);
      // console.log(lastChargeDate);
      // console.log(lastChargeDateString);

      // const lastChargeIndex = rates.findIndex(
      //   (rate) => rate.dateToApply === lastChargeDateString
      // );
      // if (!lastChargeIndex || lastChargeIndex === -1) {
      //   console.log(`${lastCharge.date} is last rate.`);
      // } else {
      //   const nextRateToCharge = rates[lastChargeIndex + 1];
      //   console.log(
      //     `Next rate to apply: ${nextRateToCharge.dateToApply} - ${nextRateToCharge.totalNoTax}`
      //   );
      // }
    } else {
      console.log(
        `No charges found in ledger no. ${ledger.ledgerNo} - status: ${ledger.status}`
      );
    }
    console.log("\n---");
  });

  active.forEach((ledger: Ledger) => {
    console.log(`For active ledger ${ledger.ledgerNo}:`);
    const charges = ledger.transactions.filter(
      (transaction) =>
        transaction.type === "CHARGE" && transaction.code === "HAB"
    );
    if (charges.length > 0) {
      // const lastChargeDateString = `${lastChargeDate.getFullYear()}/${lastChargeDate.getMonth()}/${lastChargeDate.getDay()}`;
      const chargesComparission = compareReservationRatesWithCharges(
        ledger.ledgerNo,
        charges,
        reservationRates
      );

      activeRentTracer.push(chargesComparission);

      // console.log(chargesComparission);

      // console.log(lastChargeDateString);
      // const lastChargeIndex = rates.findIndex(
      //   (rate) => rate.dateToApply === lastChargeDateString
      // );
      // if (!lastChargeIndex || lastChargeIndex === -1) {
      //   console.log(`${lastCharge} is last rate.`);
      // } else {
      //   const nextRateToCharge = rates[lastChargeIndex + 1];
      //   console.log(
      //     `Next rate to apply: ${nextRateToCharge.dateToApply} - ${nextRateToCharge.totalNoTax}`
      //   );
      // }
    } else {
      console.log(
        `No charges found in ledger no. ${ledger.ledgerNo} - status: ${ledger.status}`
      );
    }
    // console.log(charges);
    console.log("\n---");
  });

  return {
    invoicedRentTracer,
    invoicableRentTracer,
    activeRentTracer,
  };
}

export function compareReservationRatesWithCharges(
  ledgerNo: number,
  charges: Transaction[],
  reservationRates: RateDetails
): any {
  const { rates } = reservationRates;
  const lastCharge = charges[charges.length - 1];
  // const lastChargeDate = new Date(lastCharge.date);

  const ratesTracing: any = {
    ledgerNo,
    appliedRates: [],
    pendingRates: [],
  };

  for (const charge of charges) {
    // console.log("---");
    // console.log(`Checking charge:`);
    // console.log(charge);
    // console.log("---");
    const rateMatch = rates.find((rate) => {
      const rateDate = new Date(rate.dateToApply.replace(/-/g, "/"));
      const chargeDate = new Date(charge.date);
      // console.log(charge);

      const rateDateDay = rateDate.getDate();
      const rateDateMonth = rateDate.getMonth();
      const rateDateYear = rateDate.getFullYear();

      const chargeDay = chargeDate.getDate();
      const chargeMonth = chargeDate.getMonth();
      const chargeYear = chargeDate.getFullYear();

      // console.log("Comparing...");
      // console.log(`${rateDateYear}/${rateDateMonth}/${rateDateDay}`);
      // console.log(`${chargeYear}/${chargeMonth}/${chargeDay}`);

      if (
        rateDateDay === chargeDay &&
        rateDateMonth === chargeMonth &&
        rateDateYear === chargeYear
      ) {
        return rate;
      }
    });

    if (rateMatch) {
      ratesTracing.appliedRates.push(rateMatch);
    }

    // rates.forEach((rate) => {
    //   if (
    //     rateDateDay === chargeDay &&
    //     rateDateMonth === chargeMonth &&
    //     rateDateYear === chargeYear
    //   ) {
    //     console.log("An applied rate was found:");
    //     console.log(rate);
    //     ratesTracing.appliedRates.push(rate);
    //   } else {
    //     console.log("Pending rate was found:");
    //     console.log(rate);
    //     ratesTracing.pendingRates.push(rate);
    //   }
    // });
  }

  const lastAppliedRate =
    ratesTracing.appliedRates[ratesTracing.appliedRates.length - 1];
  const lastAppliedRateIndex = rates.findIndex(
    (rate) => rate.dateToApply === lastAppliedRate.dateToApply
  );

  const pendingRates = rates.slice(lastAppliedRateIndex + 1, rates.length);
  ratesTracing.pendingRates = pendingRates;
  ratesTracing.nextRateExpected = rates[lastAppliedRateIndex + 1]; // ratesTracing.expectedNextRateOn = // console.log(lastAppliedRate);
  //   ratesTracing.pendingRates[0] ||
  //   "There is not next rate on this reservation.";
  // console.log(ratesTracing);
  return ratesTracing;
}

export async function checkAllRates(
  reservationId: string,
  dateIn: Date,
  dateOut: Date
): Promise<any> {
  const rates = await getReservationRates(reservationId);
  if (rates.error) {
    return {
      error: true,
      type: "RATE_CODE",
      detail: "Main rate not found.",
    };
  }

  if (rates.rates.length === 1) {
    return [];
  }
  const dateInms = dateIn.getTime();
  const dateOutms = dateOut.getTime();

  const msDiff = dateOutms - dateInms;
  // const dayDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

  const missingRates: string[] = [];
  // console.log("Looking for missing rates...");
  rates.rates.forEach((rate: Rate, index: number) => {
    const currentDate = new Date(rate.dateToApply);
    // console.log(rate.dateToApply);
    if (rates.rates[index + 1]) {
      // const nextDateTemp = new Date(rates.rates[index + 1].dateToApply);
      const nextDate = new Date(rates.rates[index + 1].dateToApply);
      currentDate.setDate(currentDate.getDate() + 1);
      const currentDateMs = currentDate.getTime();
      const nextDateMs = nextDate.getTime();
      const msDiff = nextDateMs - currentDateMs;
      const dayDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        missingRates.push(
          `${currentDate.getFullYear()}/${currentDate.getMonth()}/${currentDate.getDate()}`
        );
      }
    }
  });

  return missingRates;
}

export async function analyzeLedgers(
  ledgerClassification: any,
  reservationId: string
): Promise<any> {
  const todayDate = "2024/05/06";
  const ledgerResults: any = [];
  const reservationRates = await getReservationRates(reservationId);
  // TODO: Check if there's only one payment to all reservation.
  // if (active.length === 0) {
  //   const defaultLedger = empty.find(
  //     (ledger: Ledger) => ledger.status === "OPEN"
  //   );
  //   console.log(
  //     `Ledger No. ${defaultLedger.ledgerNo || 1} was setted as default .`
  //   );

  //   // TODO: Analyze previous ledgers
  //   return ledgerResults;
  // }

  const rentTracer = await roomRentTracer(
    ledgerClassification,
    reservationRates
  );

  const { invoicedRentTracer, invoicableRentTracer, activeRentTracer } =
    rentTracer;

  // start checking from previous invoiced ledgers
  // by following rates timeline
  console.log("Invoicable:");
  console.log(invoicableRentTracer);
  console.log("Invoiced");
  console.log(invoicedRentTracer);
  console.log("active:");
  console.log(activeRentTracer);
  let nextRate: any = null;
  let pendingRateToApply: any = null;
  if (invoicedRentTracer.length > 0) {
    invoicedRentTracer.forEach((rentTracing: any, index: number) => {
      console.log("\nRent tracing:");
      console.log(rentTracer);
      if (!nextRate) {
        nextRate = rentTracing.nextRateExpected;
      } else {
        const firstRateApplied = rentTracing.appliedRates[0];
        if (
          rentTracing &&
          nextRate.dateToApply === firstRateApplied.dateToApply
        ) {
          console.log("Next rates match...");
          console.log(
            `Ledger no. ${rentTracing.ledgerNo} follows correctly ledger.no ${
              rentTracing.ledgerNo - 1
            }`
          );
          nextRate = rentTracing.nextRateExpected;
        } else {
          console.log(`Pending rate to charge on active ledger:`);
          console.log(firstRateApplied);
          pendingRateToApply = firstRateApplied;
        }
      }
    });
  }

  console.log("--------");
  console.log("Next rate");
  console.log(nextRate);
  console.log("--------");

  activeRentTracer.forEach((rentTracing: any) => {
    if (nextRate) {
      // Check balance from active ledger no determinate if it pays next rate
    }
  });

  // console.log(rentTracer);
  //wTODO: Analyze room rent tracing in order to determinate reservation's payments behaviour

  // console.log(rentTracer);

  // active.forEach((ledger: Ledger) => {
  //   const balance = Math.abs(ledger.balance);
  //   const sums = getTransactionsSum(ledger.transactions);
  //   const paymentsSum = Number(parseFloat(sums.paymentsSum).toFixed(2));

  //   // pending balance - payment required
  //   if (ledger.balance > 0) {
  //     console.log("----");
  //     console.log(`Pending to pay: ${balance}`);
  //     console.log(`Total reservation: ${total}`);
  //     console.log("----");
  //     ledgerResults.push({
  //       hasEntirePayment: false,
  //       pendingToPay: true,
  //       ledger,
  //     });
  //   }

  //   if (balance === total) {
  //     console.log("----");
  //     console.log(`Total payment was found on ledger no. ${ledger.ledgerNo}`);
  //     console.log(`Total reservation: ${total}`);
  //     console.log(`Total payments: ${paymentsSum}`);
  //     console.log("----");
  //     ledgerResults.push({
  //       hasEntirePayment: true,
  //       ledger,
  //     });
  //   }

  //   if (balance !== total && ledger.balance < 0) {
  //     const nightsPaid = getRemainingNights(
  //       reservationRates,
  //       balance,
  //       todayDate
  //     );
  //     // console.log(nightsPaid);
  //     console.log(`Nights left: ${nightsPaid.nightsLeft}`);
  //     ledgerResults.push({
  //       ledger,
  //       hasEntirePayment: false,
  //       nightsPaid: nightsPaid.nightsLeft,
  //       // nextPaymentOn: rates[nightsPaid.nightsLeft].dateToApply,
  //     });
  //   }
  // });

  return ledgerResults;

  // if (active.length === 1) {
  //   if (total === paymentsSum) {
  //     ledgerResults.push({
  //       isMain: true,
  //       isFullyPaid: true,
  //       nightsPaid: rates.length,
  //       nightsLeft: 0,
  //       paidUntil: rates[rates.length].dateToApply,
  //       nextPaymentOn: "",
  //     });
  //     return ledgerResults;
  //   }

  //   if (total === todayRate.totalWTax) {
  //   }
  // }

  // active.forEach((ledger: Ledger) => {});

  // TODO: Check every ledger in order to search a complex payment tracing to know the next rate to pay.

  // const balanceAbs = Math.abs(ledger.balance);
  // const sums = getTransactionsSum(ledger.transactions);
  // const paymentsSum = Number(parseFloat(sums.paymentsSum).toFixed(2));

  // const remainingNightsPaid = getRemainingNights(
  //   reservationRates,
  //   balanceAbs,
  //   todayDate
  // );
  // const totalNightsPaid = getTotalNightsPaid(reservationRates, balanceAbs);

  // console.log(remainingNightsPaid);
  // console.log(totalNightsPaid);

  // const { total } = reservationRates;
  // if (balanceAbs === 0) {
  //   return result;
  // }

  // if (balanceAbs === total || paymentsSum === total) {
  //   result.isPrincipal = true;
  //   result.hasCompletePaid = true;
  //   return result;
  // }
}

export async function classifyLedgers(
  reservationId: string,
  ledgers: Ledger[]
): Promise<any> {
  const invoices = await getReservationInvoiceList(reservationId, "CHIN");

  ledgers.forEach((ledger) => {
    const invoice = invoices.find(
      (invoice) => invoice.ledgerNo === ledger.ledgerNo
    );

    if (invoice) {
      ledger.invoice = invoice;
    }
  });

  const invoicable = ledgers.filter(
    (ledger) =>
      ledger.transactions.length > 0 &&
      ledger.transactions.find(
        (transaction) => transaction.type === "CHARGE"
      ) &&
      ledger.balance === 0 &&
      !ledger.invoice
  );

  const active = ledgers.filter(
    (ledgers) =>
      ledgers.status === "OPEN" &&
      ledgers.transactions.find(
        (transaction) =>
          transaction.type === "CHARGE" || transaction.type === "PAYMENT"
      ) &&
      !ledgers.invoice
  );

  const invoiced = ledgers.filter((ledger) => ledger.invoice);
  const empty = ledgers.filter(
    (ledgers) => ledgers.balance == 0 && ledgers.transactions.length == 0
  );

  // const active = ledgers.filter((ledgers) => {
  //   const hasPayments = ledgers.transactions.find(
  //     (transaction) => transaction.type === "PAYMENT"
  //   );
  //   const hasCharges = ledgers.transactions.find(
  //     (transaction) => transaction.type === "CHARGE"
  //   );

  //   if (hasCharges) {
  //     return hasCharges;
  //   }

  //   if (hasPayments) {
  //     return hasPayments;
  //   }
  // });

  return {
    // ledgers,
    reservationId,
    active,
    invoicable,
    invoiced,
    empty,
  };
}

export async function getVirtualPostList(): Promise<Reservation[]> {
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
    rs: "CHIN,NOSHOW,POST",
    st: "EC",
    grp: "",
    gs: "",
    sidx: "NameGuest",
    sord: "asc",
    rows: 120,
    page: 1,
    ss: false,
    rcss: "",
    user: "HTJUGALDEA",
  };
  ``;

  const authTokens = TokenStorage.getData();
  const response = await frontService.postRequest(
    listOptions,
    FRONT_API_RSRV_LIST || "",
    authTokens
  );

  const { rows } = response.data;
  const rowsFiltered = rows.filter(
    (reservation: Reservation) => reservation.status === "POST      "
  );
  // map response items to Reservation interface
  // let reservations: Reservation[] = [];
  // for (const item of items) {
  //   // console.log(item);
  //   let id = item.reservationId.match(/\d+/)[0] || ""; // parse id for better handling
  //   let status = item.statusGuest.trim();
  //   // const ledgers = await getReservationLedgerList(id, status);
  //   reservations.push({
  //     id, // in this use case id must be an string because of API's requirements
  //     guestName: item.nameGuest,
  //     room: Number(item.room),
  //     dateIn: item.dateIn,
  //     dateOut: item.dateOut,
  //     status,
  //     company: item.company,
  //     agency: item.agency,
  //     ledgers: [],
  //   });
  // }
  // reservations = reservations.sort(sortRsrvByRoomNumber);

  return rowsFiltered;
}

export async function getReservationByFilter(filter: string): Promise<any> {
  const authTokens = await TokenStorage.getData();
  let searchPayload = {
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
    rs: "CHIN,NOSHOW,POST",
    st: "EC",
    NoPax: "",
    grp: "",
    gs: "",
    sidx: "NameGuest",
    sord: "asc",
    rows: 100,
    page: 1,
    ss: false,
    rcss: "",
    user: "HTJUGALDEA",
    AddGuest: false,
  };

  let httpResponse;
  // it means the input is number room
  if (filter.length === 3) {
    searchPayload.rm = filter;
    httpResponse = await frontService.postRequest(
      searchPayload,
      FRONT_API_RSRV_LIST || "",
      authTokens
    );
  } else {
    // it means it is reservation id
    searchPayload.rc = filter;
    httpResponse = await frontService.postRequest(
      searchPayload,
      FRONT_API_RSRV_LIST || "",
      authTokens
    );
  }

  if (!httpResponse) {
    return {
      error: true,
      message: "Error trying to get reservation data. Check input filter.",
    };
  }

  const items = httpResponse.data.rows;
  if (!items[0]) {
    return null;
  }

  const reservation: Reservation = {
    id: items[0].rsrvCode,
    guestName: items[0].nameGuest,
    room: Number(items[0].room),
    dateIn: items[0].dateIn,
    dateOut: items[0].dateOut,
    status: items[0].statusGuest,
    company: items[0].company,
    agency: items[0].agency,
    ledgers: [],
  };

  const rates = await getReservationRates(reservation.id);
  reservation.totalToPay = rates.total || 0;
  return reservation;
}
/**
 * @description Gets reservation list by following a status filter.
 * @param {string} status Condition to fetch list of reservation. See consts file to see usable filters.
 * @returns {Reservation}
 */
export async function getReservationList(
  status: string
): Promise<Reservation[]> {
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
    rs: status === IN_HOUSE_FILTER ? "CHIN,NOSHOW" : "",
    st: status === DEPARTURES_FILTER ? "LS" : "EC",
    grp: "",
    gs: status === DEPARTURES_FILTER ? "CHOUT,CHIN,NOSHOW" : "",
    sidx: "NameGuest",
    sord: "asc",
    rows: 120,
    page: 1,
    ss: false,
    rcss: "",
    user: "HTJUGALDEA",
    AddGuest: false,
  };

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    listOptions,
    FRONT_API_RSRV_LIST || "",
    authTokens
  );

  // sort by room
  const items = response.data.rows;
  const sortRsrvByRoomNumber = (rsrvA: any, rsrvB: any) => {
    return rsrvA.room - rsrvB.room;
  };

  // map response items to Reservation interface
  // const alreadyChecked = await tempStorage.readChecked();
  let reservations: Reservation[] = [];
  for (const item of items) {
    // console.log(item);
    // console.log(
    //   `Loading ${item.nameGuest} - ${Number(item.room)} reservation info...`
    // );
    const id = item.reservationId.match(/\d+/)[0] || ""; // parse id for better handling
    const status = item.statusGuest.trim();
    // const ledgers = await getReservationLedgerList(id, status);
    // const principalLedger = ledgers.find((ledger) => {
    //   const isEmpty = ledger.transactions.length > 0;
    //   if (ledger && !isEmpty && ledger.status === "OPEN") {
    //     ledger.isPrincipal = true;
    //     return ledger;
    //   }
    // });
    const reservation: Reservation = {
      id,
      guestName: item.nameGuest,
      room: Number(item.room),
      dateIn: item.dateIn,
      dateOut: item.dateOut,
      status,
      company: item.company,
      agency: item.agency,
      ledgers: [],
    };
    reservations.push(reservation);
    //save on local only if it doesnt appear
    // await tempStorage.writeChecked({
    //   id: reservation.id,
    //   hasCertificate: false,
    //   hasCoupon: false,
    //   hasVCC: false,
    //   checkAgain: false,
    //   dateOut: "",
    // });
  }
  reservations = reservations.sort(sortRsrvByRoomNumber);

  // reservations = items
  //   .map(async (item: any) => {
  //     let id = item.reservationId.match(/\d+/)[0] || ""; // parse id for better handling
  //     let status = item.statusGuest.trim();
  //     const ledgers = await getReservationLedgerList(id);
  //     return {
  //       id, // in this use case id must be an string because of API's requirements
  //       guestName: item.nameGuest,
  //       room: Number(item.room),
  //       dateIn: item.dateIn,
  //       dateOut: item.dateOut,
  //       status,
  //       company: item.company,
  //       agency: item.agency,
  //       ledgers,
  //     };
  //   })
  //   .sort(sortRsrvByRoomNumber);

  return reservations;
}

export async function getReservationRateCode(
  reservationId: string
): Promise<string | null> {
  const authTokens = await TokenStorage.getData();
  if (!FRONT_API_RSRV_GET_RATE) {
    throw new Error("Endpoint cannot be null");
  }

  const _FRONT_API_RSRV_GET_RATE = FRONT_API_RSRV_GET_RATE.replace(
    "{rsrvIdField}",
    reservationId
  );

  const response = await frontService.getRequest(
    _FRONT_API_RSRV_GET_RATE,
    authTokens
  );

  if (typeof response !== "string") {
    throw new Error("Expected a STRING response. Try login again");
  }

  const scrapper = new Scrapper(response);
  const rateCode = scrapper.extractReservationRateCode();

  return rateCode;
}

export async function getReservationNotes(
  reservationId: string
): Promise<any[]> {
  if (!FRONT_API_RESERVATION_NOTES) {
    throw new Error("Endpoing cannot be null");
  }

  const _FRONT_API_RESERVATION_NOTES = FRONT_API_RESERVATION_NOTES.replace(
    "{rsrvIdField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RESERVATION_NOTES,
    authTokens
  );

  if (!response.rows) {
    console.log("Error trying to get reservation notes.");
    return [];
  }

  if (response.rows.length === 0) {
    return [];
  }

  const notes = JSON.parse(response.rows[0].guenoNotes);
  return notes;
}

export async function applyVCCPayment(
  reservationId: string,
  VCC: VCC,
  ledger: Ledger
): Promise<any> {
  // get VCC trans code
  console.log(`Applying payment on ledger no. ${ledger.ledgerNo}`);

  if (!VCC || !VCC.provider) {
    return {
      status: 400,
      message: "No VCC found.",
    };
  }

  if (VCC.amount === 0 || !VCC.amount) {
    return {
      error: true,
      message: `Invalid VCC amount (${VCC.amount})`,
    };
  }

  // post
  let ecommercePaymentPayload = {
    transCode: VCC.type,
    cardNum: "",
    month: 0,
    year: 0,
    secNum: "",
    titular: "",
    auth: "",
    notes: "",
    guestCode: reservationId,
    requerido: "",
    folio: `${reservationId}.${ledger.ledgerNo}`,
    amount: VCC.amount.toString(),
    currency: "MXN",
    propCode: "CECJS",
    user: "HTJUGALDEA",
    postID: 0,
    savePayment: false,
    binId: "",
    ledgerX1: "",
    ledgerX7: "",
    ledgerX8: "",
    refSmart: "",
    depTercero: "",
    depBoveda: false,
    depSmart: false,
    pinPad: "",
    pinParam: "",
    signature: "",
    smartId: "0",
  };

  const authTokens = await TokenStorage.getData();
  const applyPaymentRes = await frontService.postRequest(
    ecommercePaymentPayload,
    FRONT_API_APPLY_VCC_PAYMENT || "",
    authTokens
  );
  if (!applyPaymentRes.data.sucess) {
    console.log(
      `Error applying VCC eccomerce payment: ${applyPaymentRes.data.message}`
    );
    return {
      error: true,
      message: applyPaymentRes.data.errors,
    };
  }

  if (VCC.provider === EXPEDIA) {
    // apply provider's tax
    const pendingBalance = Number(ledger.balance) - Number(VCC.amount);
    const payment: Payment = {
      type: "TVIRT",
      amount: Number(pendingBalance.toFixed(2)),
      reservationId: reservationId,
      reservationCode: `${reservationId}.${ledger.ledgerNo}`,
    };

    const taxPaymentRes = await addNewPayment(payment);
    if (!taxPaymentRes.data.sucess) {
      console.log("Error applying provider TAX payment");
      return {
        error: true,
        message: "Error trying to apply provider TAX payment.",
      };
    }
  }

  return {
    error: false,
    mesage: "VCC payment created.",
  };
}

export async function getEcommerceInfo(reservationId: string): Promise<any> {
  const ecommercePayload = {
    propCode: "CECJS",
    esAnticipo: false,
    esPMRES: false,
    showCXC: "true",
    mode: "E",
    rsrvCode: reservationId,
    excluyeVirtuales: true,
  };

  const authTokens = await TokenStorage.getData();
  const ecommerceResponse = await frontService.postRequest(
    ecommercePayload,
    FRONT_API_GET_ECOMMERCE_INFO || "",
    authTokens
  );

  if (ecommerceResponse.data.length === 0) {
    return null;
  }

  return ecommerceResponse.data.length > 1
    ? ecommerceResponse.data[1]
    : ecommerceResponse.data[0];
}

export async function getReservationVCC(reservationId: string): Promise<VCC> {
  // read notes to know what type of VCC it is
  const notes = await getReservationNotes(reservationId);
  const concatenatedNote = notes
    .reduce((accum, current) => {
      return (accum += current.text + " ");
    }, "")
    .toUpperCase();

  const VCCProvidersNames = Object.keys(VCCPatternsList);
  let VCC: VCC = {
    provider: null,
    amount: 0,
    readyToCharge: false,
  };

  for (const provider of VCCProvidersNames) {
    const providerPatterns = VCCPatternsList[provider];
    const match = concatenatedNote.match(providerPatterns.amountPattern);
    if (match) {
      const VCCAmount = match[0].match(/\d+\.\d+/)
        ? Number(match[0].match(/\d+\.\d+/)[0])
        : 0;

      VCC.amount = VCCAmount;
      VCC.provider = provider;

      // Get commerce info to complete payment payload
      const ecommerceInfo = await getEcommerceInfo(reservationId);
      if (!ecommerceInfo) {
        // console.log("Error trying to get VCC ecommerce data.");
        return VCC;
      }
      VCC.type = ecommerceInfo.transCode;
      VCC.readyToCharge = true;
    }
  }

  return VCC;
}

export async function getReservationInvoiceList(
  reservationId: string,
  reservationStatus: string
): Promise<Invoice[]> {
  if (!FRONT_API_RSRV_INVOICES) {
    throw new Error("Endpoint cannot be undefined");
  }

  const _FRONT_API_RSRV_INVOICES = FRONT_API_RSRV_INVOICES.replace(
    "{rsrvIdField}",
    reservationId
  ).replace("{rsrvStatusField}", reservationStatus);

  const authTokens = await TokenStorage.getData();
  if (!authTokens) {
    throw new Error("Error trying to get authentication tokens.");
  }
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_INVOICES,
    authTokens
  );

  const invoicesTableHTMLElemPattern = new RegExp(
    `<table cellspacing="0" cellpadding="0" width="100%" border="0">([\\s\\S\\t.]*)<\/table>`,
    "i"
  );
  const invoicesTableMatch = response
    .toString()
    .match(invoicesTableHTMLElemPattern);
  if (!invoicesTableMatch) {
    throw new Error(
      "Error trying to read main invoices table. Try login again."
    );
  }

  const invoiceEventMatch = invoicesTableMatch[0].match(
    invoiceEventHTMLElemPattern
  );

  if (!invoiceEventMatch || invoiceEventMatch.length === 0) {
    return [];
  }

  let invoices: Invoice[] = [];
  invoiceEventMatch.forEach((result: string) => {
    const eventNoMatch = result.match(/\d+/);

    const invoiceReceptorMatch = invoicesTableMatch[0].match(
      invoiceReceptorRFCPattern
    );

    const eventNo = eventNoMatch ? eventNoMatch[0] : 0;
    const receptorRFC = invoiceReceptorMatch ? invoiceReceptorMatch[0] : "";

    let ledgerNo = 0;
    let status = "";
    let RFC = "";
    let RFCName = "";
    if (eventNo !== 0) {
      // it match with a ledger number
      ledgerNo = Number(eventNo);
      status = result.includes(INVOICED) ? INVOICED : PRE_INVOICED;
    }

    if (receptorRFC) {
      const rfcResult = receptorRFC.match(
        /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g
      );
      RFC = rfcResult ? rfcResult[0] : "";
    }

    const receptorRFCNameResult = invoicesTableMatch[0].match(
      invoiceReceptorNamePattern
    );
    const receptorRFCName = receptorRFCNameResult
      ? receptorRFCNameResult[0]
      : null;

    const RFCNameMatch = receptorRFCName.match(/>(.*)</);
    if (RFCNameMatch) {
      RFCName = RFCNameMatch[0].replaceAll(">", "").replaceAll("<", "");
    }

    invoices.push({
      ledgerNo,
      status,
      RFC,
      RFCName,
    });
    // console.log(receptorRFCName);
    // if (receptorRFCName) {
    // }
  });
  return invoices;
}

export async function GetReservationRateDescription(
  reservationId: string,
  appDate: string,
  rateCode: string
): Promise<any> {
  if (!FRONT_API_RATE_DESCRIPTION) {
    throw new Error("API ENDPOINT NULL");
  }

  const _FRONT_API_RATE_DESCRIPTION = FRONT_API_RATE_DESCRIPTION.replace(
    "{rsrvIdField}",
    reservationId
  )
    .replace("{rateCodeField}", rateCode)
    .replace("{appDateField}", appDate);

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RATE_DESCRIPTION,
    authTokens
  );

  const scrapper = new Scrapper(response);
  const rateDescription = scrapper.extractReservationRateDescription();
  if (!rateDescription) {
    return "";
  }

  return rateDescription;
}

export async function getReservationRates(
  reservationId: string
): Promise<RateDetails | any> {
  if (!FRONT_API_RSRV_RATES) {
    throw new Error("Endpoint cannot be null");
  }

  // first get rate code
  const rateCode = await getReservationRateCode(reservationId);
  if (!rateCode) {
    return {
      error: true,
      type: "RATE_CODE",
      detail: "Main rate not found",
    };
  }

  const FRONT_API_RSRV_RATES_MODF = FRONT_API_RSRV_RATES.replace(
    "{rsrvIdField}",
    reservationId
  )
    .replace("{appDateField}", "2024/07/24")
    .replace("{rateCodeField}", rateCode);

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    FRONT_API_RSRV_RATES_MODF,
    authTokens
  );

  if (typeof response === "string") {
    return {
      error: true,
      type: "SERVER_RATE_LIST",
      detail: "Server rate list response is not a string.",
    };
  }

  const { rows } = response;
  const { TotalAmount } = response.userdata;
  // map items
  let rates: Rate[] = [];
  rates = rows.map((item: any) => {
    return {
      code: item.cell[1].trim(),
      dateToApply: item.cell[2].trim(),
      totalNoTax: Number(parseFloat(item.cell[3].trim()).toFixed(2)),
      totalWTax: Number(parseFloat(item.cell[5].trim()).toFixed(2)),
      currency: item.cell[6].trim(),
    };
  });

  return {
    total: Number(parseFloat(TotalAmount).toFixed(2)),
    rates,
  };
}

export async function getReservationExtraFee(
  reservationId: string
): Promise<boolean> {
  const authTokens = await TokenStorage.getData();
  let formData = new FormData();
  formData.append("_hdn001", "KFwHWn911eaVeJhL++adWg==");
  formData.append("_hdn002", "false");
  formData.append("_hdn003", "KFwHWn911eaVeJhL++adWg==");
  formData.append("_hdnSelPropName", "");
  formData.append("_hdnPropName", "City+Express+Ciudad+Juarez");
  formData.append("_hdnRoleName", "RecepcionT");
  formData.append("_hdnAppDate", "2024/04/22");
  formData.append("_hdnMessage", "");
  formData.append("_hdnIdiom", "Spa");
  formData.append("_hdnRSRV", `${reservationId}`);
  formData.append(
    "__RequestVerificationToken",
    authTokens.verificationToken || ""
  );

  // get reservation home
  const reservationHomeRes = await frontService.testRequest(
    authTokens,
    FRONT_API_RSRV_HOME || "",
    formData
  );

  console.log(reservationHomeRes);

  if (typeof reservationHomeRes !== "string") {
    console.log("Error trying to read reservation home.");
    return false;
  }

  const scrapper = new Scrapper(reservationHomeRes);

  return false;
}

export async function getReservationGuaranteeDocs(
  reservationId: string
): Promise<GuaranteeDoc[]> {
  let docs: GuaranteeDoc[] = [];

  if (!FRONT_API_RSRV_GUARANTEE_DOCS) {
    throw new Error("ENDPOINT NULL");
  }

  let _FRONT_API_RSRV_GUARANTEE_DOCS = FRONT_API_RSRV_GUARANTEE_DOCS?.replace(
    "{rsrvIdField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_GUARANTEE_DOCS,
    authTokens
  );

  const scrapper = new Scrapper(response);
  const scrappedDocs = scrapper.extractGuaranteeDocs();
  if (scrappedDocs.length > 0) {
    docs = scrappedDocs.map((doc) => {
      let _FRONT_API_DOWNLOAD_DOC =
        FRONT_API_DOWNLOAD_DOC?.replace("{docIdField}", doc.id).replace(
          "{rsrvIdField}",
          reservationId
        ) || "INVALID_URL";
      return {
        id: doc.id,
        type: doc.type,
        downloadUrl: _FRONT_API_DOWNLOAD_DOC,
      };
    });
  }

  return docs;
}

export async function getReservationRoutings(
  reservationId: string
): Promise<any> {
  if (!FRONT_API_RSRV_ROUTINGS) {
    throw new Error("Routings endpoint cannot be null.");
  }

  const authTokens = await TokenStorage.getData();
  let formData = new FormData();
  formData.append("_hdn001", "KFwHWn911eaVeJhL++adWg==");
  formData.append("_hdn002", "false");
  formData.append("_hdn003", "KFwHWn911eaVeJhL++adWg==");
  formData.append("_hdnPropName", "City Express Ciudad Juarez");
  formData.append("_hdnRoleName", "RecepcionT");
  formData.append("hdnGuestCode", `${reservationId}`);
  formData.append("hdnGuestStatus", "CHIN");
  formData.append("hdnSafePeople", "");
  formData.append("hdnGuestFolio", "1");
  formData.append("__RequestVerificationToken", authTokens.verificationToken);

  const response = await frontService.postRequest(
    formData,
    FRONT_API_RSRV_ROUTINGS,
    authTokens
  );

  const scrapper = new Scrapper(response.data);
  let routings: any;
  routings = scrapper.extractRoutings();

  if (routings.length === 0) {
    return null;
  }

  const reference = routings[0];
  const routerId = reference.RsrvTarget;

  if (routerId !== reservationId) {
    return {
      isRouter: false,
      routerId,
    };
  }

  const routed: string[] = [];
  routings.forEach((routing: any) => {
    routed.push(routing.RsrvSource);
  });

  return {
    isRouter: true,
    routerId,
    routed,
  };

  // const parentId = routings.RsrvTarget;
  // if (parentId ===)

  // if (routings.length === 1) {
  //   // if only 1, means this reservation is routed.
  //   const routingData = routings.pop();
  //   const parent = routingData.RsrvTarget || "";
  //   if (parent === reservationId) {
  //     const child = routingData.RsrvSource;
  //     return {
  //       isParent: true,
  //       child,
  //     };
  //   }

  //   return {
  //     isParent: false,
  //     parent,
  //   };
  // }

  // // it means it is a parent router.
  // if (routings.length > 1) {
  //   const childReservations: string[] = routings.map((routing) => {
  //     if (routing.RsrvSource !== reservationId) {
  //       return routing.RsrvSource;
  //     }
  //   });

  //   return {
  //     isParent: true,
  //     childs: childReservations,
  //   };
  // }

  // return [];
}

export async function addNewPayment(payment: Payment): Promise<any> {
  if (payment.amount === 0) {
    return {
      status: 400,
      message: "Payment amount cannot be 0",
    };
  }

  let newPaymentPayload = {
    transCode: payment.type,
    cardNum: "",
    month: 0,
    year: 0,
    secNum: "",
    titular: "",
    auth: "",
    notes: "",
    guestCode: payment.reservationId,
    requerido: "",
    folio: payment.reservationCode,
    amount: payment.amount.toString(),
    currency: "MXN",
    propCode: "CECJS",
    user: "HTJUGALDEA",
    postID: 0,
    savePayment: false,
    binId: "",
    ledgerX1: "",
    ledgerX7: "",
    ledgerX8: "",
    refSmart: "",
    depTercero: "",
    depBoveda: false,
    depSmart: false,
    pinPad: "",
    pinParam: "",
    signature: "",
    smartId: "0",
  };

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    newPaymentPayload,
    FRONT_API_CREATE_PAYMENT || "",
    authTokens
  );

  return response;
}

export async function getLedgerTransactions(ledgerCode: string): Promise<any> {
  if (!FRONT_API_RSRV_FOLIOS_MOVS) {
    throw new Error("FRONT_API_RSRV_FOLIOS endpoint cannot be undefined");
  }

  try {
    const _FRONT_API_RSRV_FOLIOS_MOVS = FRONT_API_RSRV_FOLIOS_MOVS?.replace(
      "{ledgerCode}",
      ledgerCode
    );
    const authTokens = await TokenStorage.getData();
    const response = await frontService.postRequest(
      {},
      _FRONT_API_RSRV_FOLIOS_MOVS,
      authTokens
    );

    if (typeof response.data === "string") {
      throw new Error(
        `Error trying to get ledger's movements. Please try again.`
      );
    }

    // map to Transaction type
    let transactions: Transaction[] = [];
    transactions = response.data.map((item: any) => {
      let transType = item.transType.includes("P ") ? "PAYMENT" : "CHARGE";
      let amount = item.postAmount;
      return {
        // Front2Go API uses payments with minus (-) signal to show that is a payment instead a charge
        type: transType,
        isRefund: transType === "PAYMENT" && amount > 0 ? true : false,
        code: item.transCode,
        amount,
        date: item.postDate,
      };
    });

    return transactions;
  } catch (err) {
    return {
      error: true,
      errMessage: err,
    };
  }
}

export async function getInvoiceReceptor(
  reservationId: string,
  ledgerNo: number,
  RFC: string
): Promise<any> {
  const context = {
    context: {
      FiscalID: "",
      NumberOfItems: 0,
      PropCode: "CECJS",
      RAnticipo: "",
      TargetFolio: reservationId + "." + ledgerNo.toString(),
      Text: RFC,
    },
  };

  if (!FRONT_API_SEARCH_RFC) {
    throw new Error("RFC SEARCH ENDPOINT CANNOT BE NULL");
  }

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    context,
    FRONT_API_SEARCH_RFC,
    authTokens
  );

  const { data } = response;

  return data.d.Items[0];
}

export async function generatePreInvoice(
  reservationId: string,
  ledgerNo: number,
  receptor: any
): Promise<any> {
  const receptorNameSegments = receptor.Text.split("-");
  const receptorName = receptorNameSegments[2].trim();
  const receptorId = receptor.value;
  console.log("----");
  console.log(`Currently invoicing to: ${receptorName}`);
  console.log(receptorName);
  console.log("---- \n\n");

  const invoiceData = {
    pGuest_code: reservationId,
    pProp_Code: "CECJS",
    pFolio_code: reservationId + "." + ledgerNo.toString(),
    pReceptorId: receptorId,
    pFormat: "D",
    pNotas: "",
    pCurrency: "MXN",
    pUsoCFDI: "G03",
    pReceptorNameModified: receptorName,
    pIdiom: "Spa",
    pUser: "",
    pReceptorCP_Modified: "",
  };

  if (!FRONT_API_GENERATE_PRE_INVOICE) {
    throw new Error("INVOICE GENERATOR ENDPOINT CANNOT BE NULL");
  }

  const authTokens = await TokenStorage.getData();
  const preInvoiceRes = await frontService.postRequest(
    invoiceData,
    FRONT_API_GENERATE_PRE_INVOICE,
    authTokens
  );

  console.log(preInvoiceRes.data.d);
  return preInvoiceRes.data.d;
}

export async function generateInvoice(
  preInvoiceId: string,
  reservationId: string,
  ledgerNo: number
) {
  const body = {
    pComprobante: preInvoiceId,
    pProp_Code: "CECJS",
    pFolio_code: reservationId + "." + ledgerNo.toString(),
    pGuest_code: reservationId,
    pFormat: "D",
    pNotas: "",
    pCurrency: "MXN",
    pUsoCFDI: "G03",
    pReceptorNameModified: "",
    pIdiom: "Spa",
    pUser: "",
  };

  if (!FRONT_API_GENERATE_INVOICE) {
    throw new Error("FRONT_API_GENERATE_INVOICE null");
  }

  const authTokens = await TokenStorage.getData();
  const invoiceResponse = await frontService.postRequest(
    body,
    FRONT_API_GENERATE_INVOICE,
    authTokens
  );

  const { data } = invoiceResponse;
  return data;
}

export async function initializeLedgerInvoice(
  reservationId: string,
  ledgerNo: number
): Promise<any> {
  const body = {
    pFolioCode: reservationId + "." + ledgerNo,
    pPropCode: "CECJS",
  };

  if (!FRONT_API_INIT_LEDGER_INVOICE) {
    throw new Error("INIT LEDGER API CANNOT BE NULL");
  }

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    body,
    FRONT_API_INIT_LEDGER_INVOICE,
    authTokens
  );

  const { data } = response;
  if (data.value === "|") {
    return {
      status: 200,
    };
  }

  return {
    status: 400,
  };
}

export async function toggleLedgerStatus(
  reservationId: string,
  ledgerNo: Number | number,
  reservationStatus: string
): Promise<any> {
  if (!FRONT_API_RSRV_CHANGE_LEDGER_STATUS) {
    throw new Error(
      "FRONT_API_RSRV_CHANGE_LEDGER_STATUS endpoint cannot be undefined"
    );
  }

  const payload = {
    folio_code: `${reservationId}.${ledgerNo}`,
    guest_code: reservationId,
    guest_status: reservationStatus,
    max_folios: 8,
    prop_code: "CECJS",
  };

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    payload,
    FRONT_API_RSRV_CHANGE_LEDGER_STATUS,
    authTokens
  );

  if (response.data !== "ok") {
    return {
      status: 400,
      message: `Error trying to change ledger status: ${response.data}`,
    };
  }

  return {
    status: 200,
    message: "OK",
    ledgerNo: Number(response.data || 1),
  };
}

export async function addNewLegder(reservationId: string): Promise<string> {
  if (!FRONT_API_RSRV_ADD_NEW_LEDGER) {
    throw new Error("FRONT_API_RSRV_ADD_NEW_LEDGER endpoint cannot be empty");
  }

  const authTokens = await TokenStorage.getData();
  const _FRONT_API_RSRV_ADD_NEW_LEDGER = FRONT_API_RSRV_ADD_NEW_LEDGER.replace(
    "{idField}",
    reservationId
  );
  const response = await frontService.postRequest(
    {},
    _FRONT_API_RSRV_ADD_NEW_LEDGER,
    authTokens
  );

  return response;
}

export async function getReservationContact(
  reservationId: string
): Promise<any> {
  if (!FRONT_API_RSRV_GUEST_INFO) {
    throw new Error("FRONT_API_RSRV_GUEST_INFO endpoint cannot be undefined.");
  }

  const _FRONT_API_RSRV_GUEST_INFO = FRONT_API_RSRV_GUEST_INFO.replace(
    "{idField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const htmlBody = await frontService.getRequest(
    _FRONT_API_RSRV_GUEST_INFO,
    authTokens
  );
  if (typeof htmlBody !== "string") {
    throw new Error(
      "Error trying to get guest info contact. Expected string as response"
    );
  }
  const scrapper = new Scrapper(htmlBody);
  const emails = scrapper.extractContactEmails();
  return emails;
}
