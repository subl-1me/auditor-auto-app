import { assert, expect } from "chai";
import { describe, it, before } from "mocha";
import Invoicer from "../operations/invoicer/Invoicer";
import FrontService from "../services/FrontService";
import MockData from "./mock/mock-data";

describe("Invoicer tests suit", async function () {
  const invoicer = new Invoicer();
  it("Should close current reservation's sheet", () => {
    const response = invoicer.closeCurrentSheet(MockData.sheets);
  });
});
