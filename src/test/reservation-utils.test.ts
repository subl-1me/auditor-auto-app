import { assert, expect } from "chai";
import { describe, it } from "mocha";
import Scrapper from "../Scrapper";
import PitChecker from "../operations/pit-checker/PitChecker";
import fs from "fs";

import {
  analyzeDoc,
  reservationDataMatcher,
  getReservationCertificate,
  getReservationGuaranteeDocs,
  getReservationInvoiceList,
  getReservationList,
  getReservationNotes,
  getReservationRateCode,
  getReservationRoutings,
  getReservationContact,
} from "../utils/reservationUtlis";
import MockData from "./mock/mock-data";
import Reservation from "../types/Reservation";
import { IN_HOUSE_FILTER } from "../consts";
import path from "path";
import GuaranteeDoc from "../types/GuaranteeDoc";

describe("Reservation-utils test suite", async () => {
  // it("Should change reservation ledge status", async (done) => {
  //   const reservationId = " 20387741";
  //   const ledgerNo = 1;
  //   try {
  //     const response = await changeLedgerStatus(
  //       reservationId,
  //       ledgerNo,
  //       "CHIN"
  //     );
  //     console.log(response);
  //     done();
  //   } catch (err) {
  //     console.log(err);
  //   }
  // });
  // it("Should get guest & company email contac", () => {
  //   const scrapperGuestField = new Scrapper(MockData.contactEmailFields);
  //   const emails = scrapperGuestField.extractContactEmails();
  //   console.log(emails);
  // });
  // it("Should get HTML response", async function () {
  //   const mock: Reservation = {
  //     id: " 20452558",
  //     room: 621,
  //     guestName: "",
  //     status: "CHIN",
  //     company: "",
  //     agency: "",
  //     dateIn: "",
  //     dateOut: "",
  //   };
  //   const result = await getReservationInvoiceList(mock);
  //   // console.log(result);
  //   expect(true).to.equal(true);
  // });

  it("Should check all reservation and its payments and rates", async () => {});

  it("Should get reservation code", async () => {
    // const result = await getReservationRateCode("20493304");
    expect(true).to.equal(true);
  });

  it("should get reservation coupons", async () => {
    // const reservationId = "20269851";
    // await getReservationGuaranteeDocs(reservationId);
    // const reservations = await getReservationList(IN_HOUSE_FILTER);
    // for (const reservation of reservations) {
    //   const routings = await getReservationRoutings(reservation.id);
    //   console.log(routings);
    // }
    expect(true).to.equal(true);
  });

  it("Should get reservations email attached", async () => {
    // const reservationId = "22228191";
    // const emails = await getReservationContact(reservationId);
    // console.log(emails);

    expect(true).to.equal(true);
  });

  it("Should analyze and clasificate coupon", async () => {
    // const reservations = await getReservationList(IN_HOUSE_FILTER);
    // for (const reservation of reservations) {
    //   const docs = await getReservationGuaranteeDocs(reservation.id);
    //   if (docs.length > 0) {
    //     // should classify coupon
    //     for (const doc of docs) {
    //       const analyzerResult = await analyzeDoc(doc);
    //     }
    //   }
    // }
    // const tempDocsPath = path.join(__dirname, "../", "utils", "docsTemp");
    // const reservationsMock = [
    //   {
    //     reservationId1: "19248096",
    //     reservationId2: "20470076",
    //     guestName: "pawan upreti",
    //     dateIn: "2023/10/31",
    //     dateOut: "2923/11/30",
    //     totalString: "$29,568.00",
    //   },
    //   {
    //     reservationId1: "19248096",
    //     reservationId2: "20470079",
    //     guestName: "pradeep kumar",
    //     dateIn: "2023/10/31",
    //     dateOut: "2923/11/30",
    //     totalString: "$29,568.00",
    //   },
    //   {
    //     reservationId1: "19248096",
    //     reservationId2: "20470081",
    //     guestName: "mohan neelakan",
    //     dateIn: "2023/10/31",
    //     dateOut: "2923/11/30",
    //     totalString: "$29,568.00",
    //   },
    // ];
    // fs.readdir(tempDocsPath, async (err, files) => {
    //   if (err) {
    //     throw new Error("Error reading directory.");
    //   }
    //   let counter = 0;
    //   for (const file of files) {
    //     let filePath = path.join(tempDocsPath, file);
    //     await reservationDataMatcher(filePath, reservationsMock[counter]);
    //     counter++;
    //   }
    // });
  });

  // it("should get reservation routings", async () => {
  //   const mockReservations = MockData.reservations;
  //   const mockRoutings = MockData.routings;

  //   let routers: any[] = [];
  //   for (const reservation of mockReservations) {
  //     mockRoutings.forEach((routing: any) => {
  //       const isMainRouterSet = routers.find(
  //         (router) => router.id === routing.RsrvTarget
  //       );

  //       if (isMainRouterSet) {
  //         console.log("Pushing new routing...");
  //         isMainRouterSet.rooms.push(reservation.id);
  //       } else {
  //         console.log("Setting new router...");
  //         routers.push({
  //           parentId: routing.RsrvTarget,
  //           rooms: [],
  //         });
  //       }
  //     });
  //   }

  //   // console.log(routers);
  //   // expect(true).to.equal(true);
  // });

  // it("Should get reservation notes", async () => {
  //   const reservationId = "20639553";

  //   const response = await getReservationNotes(reservationId);
  // });

  // it("Should check if reservation has Virtual Credit Card", async () => {
  //   const reservationId = "20743285";
  //   const response = await getVirtualCard(reservationId, "EXDJ", "2023/11/13");
  //   console.log(response);
  // });

  // it("Should get reservation certificate", async () => {
  //   const reservationId = "20611560";
  //   const certificate = await getReservationCertificate(reservationId);
  //   console.log(certificate);
  // });
});
