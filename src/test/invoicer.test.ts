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
});
