import { assert, expect } from "chai";
import { describe, it } from "mocha";
import Scrapper from "../Scrapper";
import { changeLedgerStatus } from "../utils/reservationUtlis";
import MockData from "./mock/mock-data";

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
});
