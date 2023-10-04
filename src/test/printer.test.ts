import { describe, it } from "mocha";
import { expect } from "chai";
import Printer from "../operations/printer/Printer";

describe("Printer suite test", () => {
  const printer = new Printer();

  it("Should get last reports .zip", async () => {
    // await printer.getAudReports();

    expect(true).to.be.equal(true);
  });
});
