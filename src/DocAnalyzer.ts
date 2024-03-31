import { readPdfText } from "pdf-text-reader";
import * as Patterns from "../src/patterns";
import { couponPatternsI } from "./types/couponPatterns";

export default class DocAnalyzer {
  constructor() {}

  static async read(filePath: string): Promise<any> {
    try {
      const pdfText = (await readPdfText({ url: filePath })).toLowerCase();

      const couponPatternsNames = Object.getOwnPropertyNames(
        Patterns.couponPatternsList
      );
      // console.log(couponPatternsNames);
      const { couponPatternsList } = Patterns;
      // console.log(couponPatternsList);
      couponPatternsNames.forEach((couponName) => {
        const primaryIdentificatorMatcher = pdfText.match(
          couponPatternsList[couponName].primaryIdentificator
        );
        if (primaryIdentificatorMatcher) {
          const couponPatterns = couponPatternsList[couponName];
          const couponPatternsNames = Object.keys(couponPatterns);
          console.log(couponPatterns);
          // couponPatternsNames.forEach((patternName) => {
          //   let pattern = couponPatterns[patternName];
          //   console.log(pattern);
          //   // let patternMatch = pdfText.match(couponPatterns[patternName]);
          //   // if (patternMatch) {
          //   //   console.log("Pattern found:");
          //   //   console.log(patternMatch[0]);
          //   //   console.log("\n");
          //   // }
          // });
        }
      });
      //   console.log(pdfText);
    } catch (err) {
      console.log(err);
    }
  }
}
