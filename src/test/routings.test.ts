import { assert, expect } from "chai";
import { describe, it, before } from "mocha";
import {
  analyzeReservationRouting,
  getReservationRoutings,
} from "../utils/reservationUtlis";

describe("Routing tests suits", async function () {
  it("Should analyze routing's payments & charges flow", async (done) => {
    const routerReservation = "23006370";
    const routing = await getReservationRoutings(routerReservation);
    const routingResults = await analyzeReservationRouting(routing);

    done();
  });
});
