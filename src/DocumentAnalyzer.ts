import { readPdfText } from "pdf-text-reader";
import * as Patterns from "./patterns";
import { couponPatterns, IPatternKeys } from "./types/couponPatterns";
import { DocAnalyzerResult } from "./types/DocAnalyzerResult";
import { ACCESS, GTB, CTS, UNSUPPORTED, COUPON, VCI_RFC } from "./consts";
import Comparission from "./types/Comparission";
import Reservation from "./types/Reservation";
import path from "path";
import { getReservationRates } from "./utils/reservationUtlis";
import { Rate } from "./types/RateDetails";

// Auxiliar interface to handle months inside documents's text
interface IMonths {
  ene: string;
  feb: string;
  mar: string;
  abr: string;
  may: string;
  jun: string;
  jul: string;
  ago: string;
  sep: string;
  oct: string;
  nov: string;
  dic: string;
}

const months: IMonths = {
  ene: "01",
  feb: "02",
  mar: "03",
  abr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  ago: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dic: "12",
};

const monthsSpanish: any = {
  enero: months.ene,
  febrero: months.feb,
  marzo: months.mar,
  abril: months.abr,
  mayo: months.may,
  junio: months.jun,
  julio: months.jul,
  agosto: months.ago,
  septiembre: months.sep,
  octube: months.oct,
  noviembre: months.nov,
  diciembre: months.dic,
};

const couponPatternsList: couponPatterns = Patterns.couponPatternsList;
const couponPatternsNames = Object.keys(couponPatternsList);

export default class DocumentAnalyzer {
  constructor() {}

  static async isCoupon(documentPath: string): Promise<any> {
    try {
      const pdfText = (await readPdfText({ url: documentPath })).toLowerCase();

      for (const couponProviderName of couponPatternsNames) {
        const couponPatterns =
          couponPatternsList[couponProviderName as keyof couponPatterns];

        const primaryIdentificatorMatcher = pdfText.match(
          couponPatterns.primaryIdentificator
        );
        if (primaryIdentificatorMatcher) {
          // const coupon = this.improveCouponPatternMatches(
          //   couponPatterns,
          //   pdfText,
          //   couponName
          // );

          // return {
          //   error: false,
          //   result: coupon,
          // };

          return {
            isCoupon: true,
            couponProviderName,
          };
        }
      }

      return {
        isCoupon: false,
      };
    } catch (err: any) {
      return {
        error: true,
        message: err.message,
      };
    }
  }

  public static async classifyDocument(documentPath: string): Promise<any> {
    const checker = await this.isCoupon(documentPath);
    if (!checker.isCoupon) {
      return {
        error: false,
        classification: UNSUPPORTED,
      };
    }

    if (checker.error) {
      return {
        error: true,
        message: `Error trying to read document. ${checker.message}`,
      };
    }

    return {
      error: false,
      classification: COUPON,
      providerName: checker.couponProviderName,
    };
  }

  // static async init(filePath: string, reservation: Reservation): Promise<any> {
  //   // read doc & extract data by following patterns
  //   const extractedData = await this.extractData(filePath);
  //   if (extractedData.error) {
  //     return extractedData;
  //   }
  //   const comparisonResult = await this.compare(reservation, extractedData);
  //   return comparisonResult;
  // }

  public static async compare(
    documentPath: string,
    reservation: Reservation,
    couponProviderName: string
  ): Promise<any> {
    const pdfText = (await readPdfText({ url: documentPath })).toLowerCase();
    const couponPatterns =
      couponPatternsList[couponProviderName as keyof couponPatterns];
    const patternMatches = this.improveCouponPatternMatches(
      couponPatterns,
      pdfText,
      couponProviderName
    );

    const reservationTotalToPay = reservation.totalToPay;
    const { id, dateIn, dateOut } = reservation;
    let comparission: Comparission = {
      pass: false,
      id: {
        match: false,
        toCompare: [],
      },
      dateInMatches: {
        match: false,
        toCompare: [],
      },
      dateOutMatches: {
        match: false,
        toCompare: [],
      },
      totalToPay: {
        match: false,
        toCompare: [],
      },
      ratePerDay: {
        match: false,
        toCompare: [],
      },
    };

    const { reservationTarget, dates, totalToPay, ratePerDay } = patternMatches;
    comparission.id.toCompare.push(id);
    comparission.id.toCompare.push(reservationTarget);
    if (id === reservationTarget) {
      comparission.id.match = true;
    }

    comparission.dateInMatches.toCompare.push(dateIn);
    comparission.dateInMatches.toCompare.push(dates.dateIn);
    if (dateIn === dates.dateIn) {
      comparission.dateInMatches.match = true;
    }

    comparission.dateOutMatches.toCompare.push(dateOut);
    comparission.dateOutMatches.toCompare.push(dates.dateOut);
    if (dateOut === dates.dateOut) {
      comparission.dateOutMatches.match = true;
    }

    if (comparission.totalToPay && totalToPay == reservationTotalToPay) {
      comparission.totalToPay.toCompare.push(totalToPay);
      comparission.totalToPay.toCompare.push(reservationTotalToPay);
      comparission.totalToPay.match = true;
    }

    if (comparission.ratePerDay) {
      const ratesDetail = await getReservationRates(reservation.id);
      const { rates } = ratesDetail;

      const ratesSet = new Set();
      rates.forEach((rate: Rate) => {
        ratesSet.add(rate.totalNoTax);
      });

      if (ratesSet.size > 1) {
        comparission.ratePerDay.match = false;
        comparission.ratePerDay.toCompare.push(ratePerDay);
      }

      if (ratesSet.size === 1) {
        comparission.ratePerDay.match = true;
        comparission.ratePerDay.toCompare.push(ratePerDay);
        comparission.ratePerDay.toCompare.push(ratePerDay);
      }
    }

    const idMatches = comparission.id.match;
    const dateInMatches = comparission.dateInMatches.match;
    const dateOutMatches = comparission.dateOutMatches.match;

    comparission.pass = true;
    // if (idMatches && dateInMatches && dateOutMatches) {
    //   comparission.pass = true;
    // }

    // if (
    //   comparission.id &&
    //   comparission.dateInMatches &&
    //   comparission.dateOutMatches
    // ) {
    //   comparission.pass = true;
    // }

    return {
      comparission,
      patternMatches,
    };
  }

  private static improveCouponPatternMatches(
    patterns: IPatternKeys,
    text: string,
    couponProvider: string
  ): DocAnalyzerResult {
    const analyzerResult: DocAnalyzerResult = {
      provider: this.matchType(text, patterns),
      RFC: this.matchRFC(text, patterns, couponProvider),
      reservationTarget: this.matchReservationIdTarget(text, patterns),
      dates: this.matchDates(text, patterns, couponProvider),
      totalToPay: this.matchAmount(text, patterns),
      ratePerDay: this.matchRatePerDay(text, patterns, couponProvider),
    };
    return analyzerResult;
  }

  private static matchDates(
    text: string,
    patterns: IPatternKeys,
    couponProvider: string
  ): any {
    // let datesMatch: any;
    let dates = {
      dateIn: "",
      dateOut: "",
    };

    let monthFound = "";
    // if(couponProvider === "couponGTB")
    if (couponProvider === "couponGBT") {
      if (!patterns.bothDatesPattern) {
        console.log("Dates pattern was not provided by dev.");
        return dates;
      }
      const datesMatchSentence = text.match(patterns.bothDatesPattern);
      const datesSentence = datesMatchSentence ? datesMatchSentence[0] : "";
      const datesSentenceImprovedMatch = datesSentence
        ? datesSentence.match(/\d+-.{3}-\d+/g)
        : "";
      if (datesSentenceImprovedMatch) {
        const monthsNames = Object.keys(months);
        datesSentenceImprovedMatch.forEach((dateSentence) => {
          if (monthFound !== "") {
            dateSentence = dateSentence
              .replace(monthFound, months[monthFound as keyof IMonths])
              .replace(/-/g, "/");
            dates.dateOut = dateSentence;
          }
          monthsNames.forEach((month) => {
            if (dateSentence.includes(month)) {
              monthFound = month;
              dateSentence = dateSentence
                .replace(month, months[month as keyof IMonths])
                .replace(/-/g, "/");

              dates.dateIn = dateSentence;
            }
          });
        });
      }
    }

    if (couponProvider === "couponACCESS") {
      if (!patterns.bothDatesPattern) {
        console.log("Date pattern was not provided.");
        return dates;
      }

      const bothDates = text.match(patterns.bothDatesPattern);
      if (!bothDates) {
        console.log("Dates were not found in document.");
        return dates;
      }
      // model 2024/06/06
      dates.dateIn = bothDates[0].replaceAll("-", "/");
      dates.dateOut = bothDates[1].replaceAll("-", "/");
    }

    if (couponProvider === "couponCTS") {
      const dateInMatch = text.match(patterns.dateInPattern);
      const dateOutMatch = text.match(patterns.dateOutPattern);
      const dateIn = dateInMatch ? dateInMatch[0] : "";
      const dateOut = dateOutMatch ? dateOutMatch[1] : "";
      const dateInSegments = dateIn.split("/");
      const dateOutSements = dateOut.split("/");
      dates.dateIn = dateInSegments.reverse().join("/");
      dates.dateOut = dateOutSements.reverse().join("/");

      return dates;
    }

    if (couponProvider === "couponVCI") {
      const dateInMatch = text.match(patterns.dateInPattern);
      const dateOutMatch = text.match(patterns.dateOutPattern);

      const monthsSpanishKeys = Object.keys(monthsSpanish);

      monthsSpanishKeys.forEach((key) => {
        if (dateInMatch && dateInMatch[0].includes(key)) {
          const dateInMatchPars = dateInMatch[0].replace(
            key,
            monthsSpanish[key]
          );

          const matchSegments = dateInMatchPars.split(" ").reverse();
          dates.dateIn = `${matchSegments[0]}/${
            matchSegments[2]
          }/${matchSegments[1].replace(",", "")}`;
        }

        if (dateOutMatch && dateOutMatch[0].includes(key)) {
          const dateInMatchPars = dateOutMatch[0].replace(
            key,
            monthsSpanish[key]
          );

          const matchSegments = dateInMatchPars.split(" ").reverse();
          dates.dateOut = `${matchSegments[0]}/${
            matchSegments[2]
          }/${matchSegments[1].replace(",", "")}`;
        }
      });
    }

    // switch (couponProvider) {
    //   case "couponAccess":
    //     datesMatch = text.match(datesPattern);
    //     console.log(`match ${datesMatch}`);
    //     if (datesMatch) {
    //       console.log(datesMatch[0]);
    //       return datesMatch[0];
    //     }
    //     break;
    //   case "couponGBT":
    //     datesMatch = text.match(datesPattern);
    //     console.log(`match ${datesMatch}`);
    //     if (datesMatch) {
    //       return datesMatch[0];
    //     }
    //     break;
    //   case "couponCTS":
    //     datesMatch = text.match(datesPattern);
    //     console.log(`match ${datesMatch}`);
    //     if (datesMatch) {
    //       return datesMatch[0];
    //     }
    //     break;
    // }
    return dates;
  }

  private static matchAmount(text: string, pattern: IPatternKeys): number {
    let amount = 0;
    const amountPattern = pattern.totalToPay;

    if (amountPattern) {
      const amountMatch = text.match(amountPattern);
      const amountString = amountMatch ? amountMatch[0] : "";
      const amount = Number(
        amountString.replaceAll("$", "").replaceAll(",", "")
      );
      return amount;
    }

    return amount;
  }

  private static matchType(text: string, patterns: IPatternKeys): string {
    const typeMatch = text.match(patterns.primaryIdentificator);
    return typeMatch ? typeMatch[0].toUpperCase() : "";
  }

  private static matchRFC(
    text: string,
    patterns: IPatternKeys,
    couponProvider: string
  ): string {
    let RFC = "";
    if (!patterns.rfcPattern) {
      return RFC;
    }

    let RFCMatch = text.match(patterns.rfcPattern);
    RFC = RFCMatch ? RFCMatch[0].toUpperCase() : "";

    // special cases where RFC isn't included in coupon
    if (couponProvider === "couponVCI") {
      RFC = VCI_RFC;
    }

    if (couponProvider === "couponGBT") {
      RFC = RFCMatch ? RFCMatch[0].replace(/-/g, "").toLocaleUpperCase() : "";
    }

    return RFC;
  }

  private static matchRatePerDay(
    text: string,
    patterns: IPatternKeys,
    provider: string
  ) {
    let rate = 0;
    if (!patterns.ratePerDay) {
      return rate;
    }

    if (provider === "couponVCI") {
      const ratePerDayMatch = text.match(patterns.ratePerDay);
      rate = ratePerDayMatch ? Number(ratePerDayMatch[0].match(/\d+/)) : 0;
    }

    return rate;
  }

  private static matchReservationIdTarget(
    text: string,
    patterns: IPatternKeys
  ): string {
    const reservationIdSentenceMatch = text.match(
      patterns.reservationIdTargetSentence
    );

    const reservationIdTargetMatch = reservationIdSentenceMatch
      ? reservationIdSentenceMatch[0].match(patterns.reservationId)
      : null;

    const reservationId = reservationIdTargetMatch
      ? reservationIdTargetMatch[0]
      : "";

    return reservationId;
  }
}
