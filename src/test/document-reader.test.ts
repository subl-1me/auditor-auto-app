import { describe, it } from "mocha";
import { expect } from "chai";
import { readPdfText } from "pdf-text-reader";
import path from "path";
import { couponPatterns } from "../types/couponPatterns";
import { couponPatternsList } from "../patterns";

describe("Document reader & classifier test suites", () => {
  const resourcesDir = path.join(
    process.env.INIT_CWD || "",
    "temp",
    "resources"
  );

  const couponPath = path.join(resourcesDir, "bcd_coupon.pdf");

  it("Should recognize BCD Travel coupon", async () => {
    const text = (await readPdfText({ url: couponPath })).toLowerCase();
    console.log(text.replace(/\s+/g, " ").trim());

    const BCDTravelPatterns = couponPatternsList.couponBCD;
    const {
      reservationId,
      rfcPattern,
      primaryIdentificator,
      bothDatesPattern,
      bothRatesPattern,
    } = BCDTravelPatterns;

    const reservationIdMatcher = text.match(reservationId);
    const primaryIdentificatorMatcher = text.match(primaryIdentificator);
    const rfcPatternMatcher = rfcPattern ? text.match(rfcPattern) : null;
    const bothDatesmatcher = bothDatesPattern
      ? text.match(bothDatesPattern)
      : null;
    const bothRatesMatcher = bothRatesPattern
      ? text.match(bothRatesPattern)
      : null;

    if (reservationIdMatcher) {
      console.log(`Reservation target ID: ${reservationIdMatcher[0]}`);
    }

    if (primaryIdentificatorMatcher) {
      console.log(`Provider: ${primaryIdentificatorMatcher[0].toUpperCase()}`);
    }

    if (rfcPatternMatcher) {
      console.log(`RFC: ${rfcPatternMatcher[0].toUpperCase()}`);
    }

    if (bothDatesmatcher) {
      console.log(`Date in: ${bothDatesmatcher[2]}`);
      console.log(`Date out: ${bothDatesmatcher[1]}`);
    }

    if (bothRatesMatcher) {
      const ratePerDay = bothRatesMatcher[0].match(/\d+/);
      const totalToPay = bothRatesMatcher[1].match(/\d+/);
      console.log(`Rate without tax: ${Number(ratePerDay)}`);
      console.log(`Total to pay: ${Number(totalToPay)}`);
    }
  });
});
