import { describe, it } from "mocha";
import { expect } from "chai";
import { readPdfText } from "pdf-text-reader";
import path from "path";
import { couponPatterns } from "../types/couponPatterns";
import { couponPatternsList } from "../patterns";
import fs from "fs/promises";

describe("Document reader & classifier test suites", () => {
  const resourcesDir = path.join(
    process.env.INIT_CWD || "",
    "temp",
    "resources"
  );

  const RFC_PATTERN =
    /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g;

  const FISCAL_DATA_SECTION_PATTERNS: Record<string, RegExp> = {
    addressSection:
      /DATOS DEL DOMICILIO REGISTRADO(.*?)(?=ACTIVIDADES ECONÓMICAS)/,
    identificationSection:
      /DATOS DE IDENTIFICACIÓN DEL CONTRIBUYENTE:(.*?)(?=DATOS DEL DOMICILIO REGISTRADO)/,
  };

  const FISCAL_DATA_ADDRESS_SECTION_PATTERNS: Record<string, RegExp> = {
    zipCode: /(?=CÓDIGO POSTAL:)\d+(?=TIPO DE VIALIDAD:)/,
    street: /(?=NOMBRE DE VIALIDAD:)(.*?)(?=NÚMERO EXTERIOR)/,
    extNumber: /(?=NÚMERO EXTERIOR:)\d+(?=NÚMERO INTERIOR:)/,
    intNumber: /(?=NÚMERO INTERIOR:)(.*)\d+(?=NOMBRE DE LA COLONIA:)/,
    neighbor: /NOMBRE DE LA COLONIA:\s+(.+?)\s+NOMBRE DE LA LOCALIDAD/,
    state: /(?=NOMBRE DE LA ENTIDAD FEDERATIVA:)(.*)(?=ENTRE CALLE:)/,
  };

  // const RFC_TEXT_SECTION_PATTERNS: Record<string, RegExp> = {
  //   curp: /CURP/,
  //   names: /(.*)(?=NOMBRE (S))/,
  //   surname1: /(.*)(?=PRIMER APELLIDO)/,
  //   surname2: /(.*)(?=SEGUNDO APELLIDO)/,
  //   generalFiscalData:
  //     /DATOS DE IDENTIFICACIÓN DEL CONTRIBUYENTE:(.*?)(?=DATOS DEL DOMICILIO REGISTRADO)/,
  //   fiscalName: /(.*)(?=DENOMINACIÓN\/RAZÓN SOCIAL)/,
  //   fiscalAddress:
  //     /DATOS DEL DOMICILIO REGISTRADO(.*?)(?=ACTIVIDADES ECONÓMICAS)/,
  //   extNumber: /(.*)(?=NÚMERO EXTERIOR)/,
  //   neighbor: /(.*)(?=NOMBRE DE LA LOCALIDAD)/,
  // };

  // it("Should recognize BCD Travel coupon", async () => {
  //   const couponPath = path.join(resourcesDir, "bcd_coupon.pdf");
  //   const text = (await readPdfText({ url: couponPath })).toLowerCase();
  //   // console.log(text.replace(/\s+/g, " ").trim());

  //   const BCDTravelPatterns = couponPatternsList.couponBCD;
  //   const {
  //     reservationId,
  //     rfcPattern,
  //     primaryIdentificator,
  //     bothDatesPattern,
  //     bothRatesPattern,
  //   } = BCDTravelPatterns;

  //   const reservationIdMatcher = text.match(reservationId);
  //   const primaryIdentificatorMatcher = text.match(primaryIdentificator);
  //   const rfcPatternMatcher = rfcPattern ? text.match(rfcPattern) : null;
  //   const bothDatesmatcher = bothDatesPattern
  //     ? text.match(bothDatesPattern)
  //     : null;
  //   const bothRatesMatcher = bothRatesPattern
  //     ? text.match(bothRatesPattern)
  //     : null;

  //   if (reservationIdMatcher) {
  //     console.log(`Reservation target ID: ${reservationIdMatcher[0]}`);
  //   }

  //   if (primaryIdentificatorMatcher) {
  //     console.log(`Provider: ${primaryIdentificatorMatcher[0].toUpperCase()}`);
  //   }

  //   if (rfcPatternMatcher) {
  //     console.log(`RFC: ${rfcPatternMatcher[0].toUpperCase()}`);
  //   }

  //   if (bothDatesmatcher) {
  //     console.log(`Date in: ${bothDatesmatcher[2]}`);
  //     console.log(`Date out: ${bothDatesmatcher[1]}`);
  //   }

  //   if (bothRatesMatcher) {
  //     const ratePerDay = bothRatesMatcher[0].match(/\d+/);
  //     const totalToPay = bothRatesMatcher[1].match(/\d+/);
  //     console.log(`Rate without tax: ${Number(ratePerDay)}`);
  //     console.log(`Total to pay: ${Number(totalToPay)}`);
  //   }
  // });

  // it("Should recognize Noktos coupon", async (done) => {
  //   const couponPath = path.join(resourcesDir, "noktos_coupon.pdf");

  //   const text = (await readPdfText({ url: couponPath })).toLocaleLowerCase();
  //   // console.log(text.replace(/\s+/g, " ").trim());

  //   const NoktosPatterns = couponPatternsList.couponNOKTOS;
  //   const primaryIdentificatorMatcher = text.match(
  //     NoktosPatterns.primaryIdentificator
  //   );
  //   const reservationIdTargetSentenceMatcher = text.match(
  //     NoktosPatterns.reservationIdTargetSentence
  //   );
  //   const dateInMatcher = text.match(NoktosPatterns.dateInPattern);
  //   const dateOutMatcher = text.match(NoktosPatterns.dateOutPattern);
  //   const hotelTargetMatcher = NoktosPatterns.hotelTarget
  //     ? text.match(NoktosPatterns.hotelTarget)
  //     : null;

  //   const guestNameSentenceMatcher = NoktosPatterns.guestNameSentence
  //     ? text.match(NoktosPatterns.guestNameSentence)
  //     : null;

  //   let recopiled = {
  //     provider: "",
  //     guestName: "",
  //     reservationId: "",
  //     checkIn: "",
  //     checkOut: "",
  //     targetHotel: "",
  //   };

  //   if (guestNameSentenceMatcher) {
  //     // console.log(guestNameSentenceMatcher[0].split(" "));
  //     const [_, name1, name2, secondName, secondName2] =
  //       guestNameSentenceMatcher[0].split(" ");
  //     recopiled.guestName = `${name1} ${name2} ${secondName} ${secondName2}`;
  //   }

  //   if (primaryIdentificatorMatcher) {
  //     recopiled.provider = primaryIdentificatorMatcher[0];
  //   }

  //   if (reservationIdTargetSentenceMatcher) {
  //     const reservationId =
  //       reservationIdTargetSentenceMatcher[0].match(/\d{8}/);
  //     recopiled.reservationId = reservationId ? reservationId[0] : "";
  //   }

  //   const datePattern = /\d{4}-\d{2}-\d{2}/;
  //   if (dateInMatcher) {
  //     const checkIn = dateInMatcher[0].match(datePattern);
  //     recopiled.checkIn = checkIn ? checkIn[0] : "";
  //   }

  //   if (dateOutMatcher) {
  //     const checkOut = dateOutMatcher[0].match(datePattern);
  //     recopiled.checkOut = checkOut ? checkOut[0] : "";
  //   }

  //   if (hotelTargetMatcher) {
  //     recopiled.targetHotel = hotelTargetMatcher[0];
  //   }

  //   console.log(recopiled);

  //   done();
  // });

  it("Should recognize RFC certificate", async (done) => {
    const files = await fs.readdir(resourcesDir);
    const fiscalDataFiles = files.filter((fileName) =>
      fileName.match(/RFC_\d+/)
    );

    for (const file of fiscalDataFiles) {
      const constancyDocument = path.join(resourcesDir, file);
      const text = await readPdfText({ url: constancyDocument });
      const sanitText = text.toUpperCase().replace(/\s+/g, " ").trim();
      // console.log(sanitText + "\n");

      console.log(sanitText.split(":"));

      // for (const patternKey in FISCAL_DATA_ADDRESS_SECTION_PATTERNS) {
      //   if (
      //     Object.prototype.hasOwnProperty.call(
      //       FISCAL_DATA_ADDRESS_SECTION_PATTERNS,
      //       patternKey
      //     )
      //   ) {
      //     const matcher = sanitText.match(
      //       FISCAL_DATA_ADDRESS_SECTION_PATTERNS[patternKey]
      //     );
      //     if (matcher) {
      //       console.log(matcher);
      //     }
      //   }
      // }

      // const matcher = sanitText.match(RFC_TEXT_SECTION_PATTERNS.fiscalAddress);
      // if (matcher) {
      //   console.log(matcher[0].split(":"));
      // }

      let fiscalData = {
        isPerson: false,
        rfc: "",
        curp: "",
        completeName: "",
        firstName: "",
        secondName: "",
        surname: "",
        legalName: "",
        address: {
          street: "",
          extNo: "",
          intNo: "",
          country: "Mexico", // we live in Mexico =)
          state: "",
          postalCode: "",
          neighbor: "",
        },
        regimens: [],
      };

      // console.log(sanitText);
      // const matchFiscalData = (text: string) => {
      //   // const textSectionSegments = text.split(":");
      //   for (const patternKey in RFC_TEXT_SECTION_PATTERNS) {
      //     if (
      //       Object.prototype.hasOwnProperty.call(
      //         RFC_TEXT_SECTION_PATTERNS,
      //         patternKey
      //       )
      //     ) {
      //       const patternMatcher = sanitText.match(
      //         RFC_TEXT_SECTION_PATTERNS[patternKey]
      //       );

      //       if (patternMatcher) {
      //         // if (patternKey == "curpValidator") {
      //         //   fiscalData.isPerson = true;
      //         // }
      //         console.log("---");
      //         console.log(patternMatcher[0]);
      //         console.log("---");
      //       }
      //     }
      //   }
      // };

      // matchFiscalData(sanitText);
      // const patterns = Object.keys(RFC_TEXT_SECTION_PATTERNS);

      // determinate if RFC belongs to a person or a company
      // const curpTextMatch = sanitText.match(
      //   RFC_TEXT_SECTION_PATTERNS.curpValidation
      // );
      // if (curpTextMatch) {
      //   console.log("This RFC belongs to a person.");
      //   fiscalData.isPerson = true;
      // }

      // get RFC data section:
      // const generalFiscalDataPattern =
      //   /DATOS DE IDENTIFICACIÓN DEL CONTRIBUYENTE:(.*?)(?=DATOS DEL DOMICILIO REGISTRADO)/;
      // const generalFiscalDataMatch = sanitText.match(generalFiscalDataPattern);
      // if (generalFiscalDataMatch) {
      //   // get rfc code
      //   const generalDataSegments = generalFiscalDataMatch[0].split(":");
      //   console.log(generalDataSegments);
      //   const rfcSegment = generalDataSegments[1];
      //   const rfcMatch = rfcSegment.match(RFCPattern);
      //   if (rfcMatch) {
      //     fiscalData.rfc = rfcMatch[0];
      //   }

      //   // get fiscal name
      //   const fiscalNameSegment = generalDataSegments[2];
      //   const fiscalNamePattern = /(.*)(?=DENOMINACIÓN\/RAZÓN SOCIAL)/;
      //   const fiscalNameMatch = fiscalNameSegment.match(fiscalNamePattern);
      //   if (fiscalNameMatch) {
      //     fiscalData.legalName = fiscalNameMatch[0].trim();
      //   }
      // }

      // const addressFiscalDataPattern =
      //   /DATOS DEL DOMICILIO REGISTRADO(.*?)(?=ACTIVIDADES ECONÓMICAS)/;
      // const addressFiscalDataMatch = sanitText.match(addressFiscalDataPattern);
      // if (addressFiscalDataMatch) {
      //   const addressSegments = addressFiscalDataMatch[0].split(":");
      //   console.log(addressSegments);

      //   const streetNameMatch = addressSegments[1].match(/\d+/);
      //   if (streetNameMatch) {
      //     fiscalData.address.postalCode = streetNameMatch[0].trim();
      //   }

      //   const adddress1Pattern = /(.*)(?=NÚMERO EXTERIOR)/;
      //   const address1Match = addressSegments[3].match(adddress1Pattern);
      //   if (address1Match) {
      //     fiscalData.address.street = address1Match[0].trim();
      //   }

      //   const num1Match = addressSegments[4].match(/\d+/);
      //   if (num1Match) {
      //     fiscalData.address.extNo = num1Match[0].trim();
      //   }

      //   const neighborPattern = /(.*)(?=NOMBRE DE LA LOCALIDAD)/;
      //   const neighborMatch = addressSegments[6].match(neighborPattern);
      //   if (neighborMatch) {
      //     fiscalData.address.neighbor = neighborMatch[0].trim();
      //   }

      //   const statePattern = /(.*)(?=ENTRE CALLE)/;
      //   const stateMatch = addressSegments[9].match(statePattern);
      //   if (stateMatch) {
      //     fiscalData.address.state = stateMatch[0].trim();
      //   }
      // }

      console.log(fiscalData);
    }
    // console.log(sanitText.split(":"));
    done();
  });
});
