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

  it("Should recognize BCD Travel coupon", async () => {
    const couponPath = path.join(resourcesDir, "bcd_coupon.pdf");
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

  it("Should recognize Noktos coupion", async (done) => {
    const couponPath = path.join(resourcesDir, "noktos_coupon.pdf");

    const text = (await readPdfText({ url: couponPath })).toLocaleLowerCase();
    console.log(text.replace(/\s+/g, " ").trim());

    const NoktosPatterns = couponPatternsList.couponNOKTOS;
    const primaryIdentificatorMatcher = text.match(
      NoktosPatterns.primaryIdentificator
    );
    const reservationIdTargetSentenceMatcher = text.match(
      NoktosPatterns.reservationIdTargetSentence
    );
    const dateInMatcher = text.match(NoktosPatterns.dateInPattern);
    const dateOutMatcher = text.match(NoktosPatterns.dateOutPattern);
    const hotelTargetMatcher = NoktosPatterns.hotelTarget
      ? text.match(NoktosPatterns.hotelTarget)
      : null;

    const guestNameSentenceMatcher = NoktosPatterns.guestNameSentence
      ? text.match(NoktosPatterns.guestNameSentence)
      : null;

    let recopiled = {
      provider: "",
      guestName: "",
      reservationId: "",
      checkIn: "",
      checkOut: "",
      targetHotel: "",
    };

    if (guestNameSentenceMatcher) {
      // console.log(guestNameSentenceMatcher[0].split(" "));
      const [_, name1, name2, secondName, secondName2] =
        guestNameSentenceMatcher[0].split(" ");
      recopiled.guestName = `${name1} ${name2} ${secondName} ${secondName2}`;
    }

    if (primaryIdentificatorMatcher) {
      recopiled.provider = primaryIdentificatorMatcher[0];
    }

    if (reservationIdTargetSentenceMatcher) {
      const reservationId =
        reservationIdTargetSentenceMatcher[0].match(/\d{8}/);
      recopiled.reservationId = reservationId ? reservationId[0] : "";
    }

    const datePattern = /\d{4}-\d{2}-\d{2}/;
    if (dateInMatcher) {
      const checkIn = dateInMatcher[0].match(datePattern);
      recopiled.checkIn = checkIn ? checkIn[0] : "";
    }

    if (dateOutMatcher) {
      const checkOut = dateOutMatcher[0].match(datePattern);
      recopiled.checkOut = checkOut ? checkOut[0] : "";
    }

    if (hotelTargetMatcher) {
      recopiled.targetHotel = hotelTargetMatcher[0];
    }

    console.log(recopiled);

    done();
  });
});
