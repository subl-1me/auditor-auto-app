import { readPdfText } from "pdf-text-reader";
import * as Patterns from "./patterns";
import { couponPatterns, IPatternKeys } from "./types/couponPatterns";
import { DocAnalyzerResult } from "./types/DocAnalyzerResult";
import { ACCESS, GTB, CTS, UNSUPPORTED, COUPON } from "./consts";
import Comparission from "./types/Comparission";
import Reservation from "./types/Reservation";
import GuaranteeDoc from "./types/GuaranteeDoc";
import path from "path";

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
    const documentName = path.basename(documentPath);
    // console.log(`Classifying document ${documentName}...`);
    const checker = await this.isCoupon(documentPath);
    if (!checker.isCoupon) {
      return {
        error: false,
        classify: UNSUPPORTED,
      };
    }

    if (checker.error) {
      // console.log(
      //   `Error trying to read document. Try again later or check document in main system.`
      // );
      return {
        error: true,
        message: `Error trying to read document. ${checker.message}`,
      };
    }

    return {
      error: false,
      classify: COUPON,
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
    };

    const { reservationTarget, dates } = patternMatches;
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
    } catch (err: any) {
      return {
        error: true,
        message: err.message,
      };
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

    let monthFound = "";
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
      return dates;
    }

    if (couponProvider === "couponVCI") {
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
