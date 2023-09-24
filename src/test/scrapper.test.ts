import { assert, expect } from "chai";
import Scrapper from "../Scrapper";
import { describe, it } from "mocha";

// load mock data
import MockData from "./mock/mock-data";

describe("Scrapper tests", function () {
  it("Should extract reservation sheet data", function () {
    const scrapper = new Scrapper(MockData.sheetsDataGrid);
    const result = scrapper.extractSheetBasicData();
  });
});
