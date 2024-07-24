import { assert, expect } from "chai";
import { describe, it, before } from "mocha";
import Invoicer from "../operations/invoicer/Invoicer";
import FrontService from "../services/FrontService";
import MockData from "./mock/mock-data";

describe("Invoicer tests suit", async function () {
  const invoicer = new Invoicer();
  it("Should close current reservation's sheet", () => {
    // const response = invoicer.closeCurrentSheet(MockData.sheets);
  });

  // it("Should get RFC data to invoice", async function (done) {
  //   const response = await invoicer.searchForRFC("ALEXIS PIEDRA");
  //   const { Items } = response.data.d;
  //   const reqItem = Items.pop();
  //   const itemValue = reqItem.Value;
  //   console.log(itemValue);
  // });

  it("Should get RFC info", async function () {
    // search for whole RFC data
    // const rfcInfo = await invoicer.recoverRFCInfo("783754");
    // console.log();
  });

  it("Should send a invoice to an given email", async function () {
    // const reservationId = "21822122";
    // const invoiceId = "17897344";
    // const sendEmailResponse = await invoicer.sendInvoiceByEmail(
    //   invoiceId,
    //   reservationId,
    //   "julio.ugalde404@gmail.com"
    // );
    // // julio.ugalde404@gmail.com
    // console.log(sendEmailResponse);
  });
});
