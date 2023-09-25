import { assert, expect } from "chai";
import { describe, it } from "mocha";
import Scrapper from "../Scrapper";
import { changeLedgerStatus } from "../utils/reservationUtlis";
import MockData from "./mock/mock-data";

describe("Reservation-utils test suite", async () => {
  //   it("Should change reservation ledge status", async (done) => {
  //     const reservationId = "20382263";
  //     const ledgerNo = 3;
  //     const response = await changeLedgerStatus(reservationId, ledgerNo);
  //     console.log(response);
  //     done();
  //   });

  it("Should get guest & company email contac", () => {
    const scrapperGuestField = new Scrapper(MockData.guestContactField);
    const emailContact = scrapperGuestField.extractReservationEmailContact();

    const scrapperCorpField = new Scrapper(MockData.corpContactField);
    const emailCorp = scrapperCorpField.extractReservationEmailCorp();
    console.log(emailContact);
    console.log(emailCorp);
  });
});
