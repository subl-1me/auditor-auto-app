import { readPdfText } from "pdf-text-reader";
import * as Patterns from "../src/patterns";
import { couponPatterns, IPatternKeys } from "./types/couponPatterns";
import { DocAnalyzerResult } from "./types/DocAnalyzerResult";
import { ACCESS, GTB, CTS } from "./consts";
import Reservation from "./types/Reservation";
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

export default class DocAnalyzer {
  constructor() {}

  static async init(filePath: string, reservation: Reservation): Promise<any> {
    // read doc & extract data by following patterns
    const extractedData = await this.extractData(filePath);
    if (extractedData.error) {
      return extractedData;
    }
    const comparisonResult = await this.compare(reservation, extractedData);
    return comparisonResult;
  }

  private static async compare(
    reservation: Reservation,
    extracteData: any
  ): Promise<any> {
    const { id, dateIn, dateOut } = reservation;
    let comparision = {
      pass: false,
      id: false,
      guestName: false,
      dateInMatches: false,
      dateOutMatches: false,
    };

    const { reservationTarget, dates } = extracteData.result;

    if (id === reservationTarget) {
      comparision.id = true;
    }

    if (dates.dateIn === dateIn) {
      comparision.dateInMatches = true;
    }

    if (dates.dateOut === dateOut) {
      comparision.dateOutMatches = true;
    }

    // if (
    //   comparision.id &&
    //   comparision.dateInMatches &&
    //   comparision.dateOutMatches
    // ) {
    //   comparision.pass = true;
    // }
    comparision.pass = true;

    return {
      comparisionMatches: comparision,
      data: extracteData,
    };
  }

  private static async extractData(filePath: string): Promise<any> {
    try {
      const pdfText = (await readPdfText({ url: filePath })).toLowerCase();

      const couponPatternsList: couponPatterns = Patterns.couponPatternsList;
      const couponPatternsNames = Object.keys(couponPatternsList);
      for (const couponName of couponPatternsNames) {
        const couponPatterns =
          couponPatternsList[couponName as keyof couponPatterns];

        const primaryIdentificatorMatcher = pdfText.match(
          couponPatterns.primaryIdentificator
        );
        if (primaryIdentificatorMatcher) {
          const coupon = this.improveCouponPatternMatches(
            couponPatterns,
            pdfText,
            couponName
          );

          return {
            error: false,
            result: coupon,
          };
        }
      }

      return {
        error: true,
        message: "Document is not supported.",
      };
    } catch (err) {
      console.log(err);
    }
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

    let mothFound = "";
    // if(couponProvider === "couponGTB")
    if (couponProvider === "couponGBT") {
      const datesMatchSentence = text.match(patterns.bothDatesPattern || /d/);
      const datesSentence = datesMatchSentence ? datesMatchSentence[0] : "";
      const datesSentenceImprovedMatch = datesSentence
        ? datesSentence.match(/\d+-.{3}-\d+/g)
        : "";
      if (datesSentenceImprovedMatch) {
        const monthsNames = Object.keys(months);
        datesSentenceImprovedMatch.forEach((dateSentence) => {
          if (mothFound !== "") {
            dateSentence = dateSentence
              .replace(mothFound, months[mothFound as keyof IMonths])
              .replace(/-/g, "/");
            dates.dateOut = dateSentence;
          }
          monthsNames.forEach((month) => {
            if (dateSentence.includes(month)) {
              mothFound = month;
              dateSentence = dateSentence
                .replace(month, months[month as keyof IMonths])
                .replace(/-/g, "/");
              dates.dateIn = dateSentence;
            }
          });
        });
      }
      return dates;
    }

    const dateInMatch = text.match(patterns.dateInPattern);
    const dateOutMatch = text.match(patterns.dateOutPattern);
    dates.dateIn = dateInMatch ? dateInMatch[0] : "";
    dates.dateOut = dateOutMatch ? dateOutMatch[1] : "";

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
    const RFCMatch = text.match(patterns.rfcPattern);
    if (couponProvider === "couponGBT") {
      RFC = RFCMatch ? RFCMatch[0].replace(/-/g, "").toLocaleUpperCase() : "";
    } else {
      RFC = RFCMatch ? RFCMatch[0].toUpperCase() : "";
    }
    return RFC;
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
