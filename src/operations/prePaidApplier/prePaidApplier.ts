import {
  CERTIFICATE,
  COUPON,
  DEPARTURES_FILTER,
  VIRTUAL_CARD,
} from "../../consts";
import PrePaid from "../../PrePaid";
import Reservation from "../../types/Reservation";
import { TempStorage } from "../../utils/TempStorage";
import {
  getReservationLedgerList,
  getReservationList,
} from "../../utils/reservationUtlis";
import inquirer from "inquirer";

export default class PrePaidApplier {
  private departures: Reservation[];
  private tempStorage = new TempStorage();
  constructor() {
    this.departures = [];
  }

  private async getPrePaidDepartures(): Promise<Reservation[]> {
    const getPrePaidMethodsPromises: any = [];
    this.departures = this.departures.filter(
      (reservation) => !reservation.guestName.includes("AEROBUS")
    );

    for (const reservation of this.departures) {
      console.log(
        `Searching ${reservation.guestName} - ${reservation.room} for VCC, coupons or certificates...`
      );
      getPrePaidMethodsPromises.push(
        await PrePaid.getPrePaidMethod(reservation)
      );
    }

    // set pre-paid method to its reservation
    const prePaidMethods = (await Promise.all(getPrePaidMethodsPromises)).map(
      (result, index) => {
        if (result) {
          this.departures[index].prePaidMethod = result;
        }
      }
    );

    const prePaidDepartures = this.departures.filter(
      (reservation) => reservation.prePaidMethod
    );
    return prePaidDepartures || [];
  }

  async performPrePaidApplier(): Promise<any> {
    console.log("Getting all departures...");
    this.departures = await getReservationList(DEPARTURES_FILTER);
    // work only with pre-paid
    const prePaidReservations = await this.getPrePaidDepartures();

    // const alreadyChecked = await this.tempStorage.readChecked();
    // const prePaidReservations = alreadyChecked.PRE_PAID;
    // const { VIRTUAL_CARD, COUPON, CERTIFICATE } = prePaidReservations;

    // console.log(`\n-----------------------------`);
    // console.log("The following pre-paid method payments will be applied:");

    // console.log(`-----------------------------`);
    // console.log(`VIRTUAL CARDS:`);
    // console.log(`-----------------------------\n`);
    // VIRTUAL_CARD.forEach((prePaidReservation: any) => {
    //   console.log(`Room: ${prePaidReservation.room}`);
    //   console.log(
    //     `VCC provider: ${prePaidReservation.prePaidMethod.data.provider}`
    //   );
    //   console.log(
    //     `VCC Amount: ${prePaidReservation.prePaidMethod.data.amount}`
    //   );
    //   console.log(
    //     `Active: ${prePaidReservation.prePaidMethod.data.readyToCharge}`
    //   );
    //   console.log("---------------");
    // });

    // console.log(`\n-----------------------------`);
    // console.log(`COUPONS:`);
    // console.log(`-----------------------------\n`);
    // COUPON.forEach((prePaidReservation: any) => {
    //   console.log(`Room: ${prePaidReservation.room}`);
    //   console.log(
    //     `Coupon provider: ${prePaidReservation.prePaidMethod.data.coupon.providerName}`
    //   );
    //   console.log(
    //     `Is coupon OK?: ${prePaidReservation.prePaidMethod.data.result.comparission.pass}`
    //   );
    //   console.log("---------------");
    // });

    // console.log(`\n-----------------------------`);
    // console.log(`CERTIFICATE:`);
    // console.log(`-----------------------------`);
    // CERTIFICATE.forEach((prePaidReservation: any) => {
    //   console.log(`Room: ${prePaidReservation.room}`);
    //   console.log(`Certificate ID: ${prePaidReservation.prePaidMethod.data}`);
    //   console.log("---------------");
    // });

    // console.log("\n");
    // const confirmPrompt = [
    //   {
    //     type: "confirm",
    //     name: "conf",
    //     message: "wanna confirm?",
    //   },
    // ];

    // const skippedByUserPrompt = [
    //   {
    //     type: "input",
    //     name: "skip",
    //     message: "Type reservations rooms to skip:",
    //   },
    // ];

    // const skipResponse = await inquirer.prompt(skippedByUserPrompt);
    // const skipInput = skipResponse.skip;
    // const skipList = skipInput
    //   .split(" ")
    //   .map((roomString: string) => Number(roomString));

    // const response = await inquirer.prompt(confirmPrompt);
    // const answer = response.conf;

    // if (!answer) {
    //   console.log("Skipping...");
    //   return;
    // }
    // console.log("Appliying prepaid methods...");

    const getLedgersPromises: any = [];
    for (const reservation of prePaidReservations) {
      console.log(
        `Loading ${reservation.guestName} - ${reservation.room} ledger list...`
      );
      getLedgersPromises.push(
        await getReservationLedgerList(reservation.id, "CHIN")
      );
    }

    // set ledgers to its reservation
    const ledgerResults = await Promise.all(getLedgersPromises).then(
      (ledgersList) => {
        for (let i = 0; i < ledgersList.length; i++) {
          prePaidReservations[i].ledgers = ledgersList[i];
        }
      }
    );

    prePaidReservations.forEach((reservation) => {
      console.log("\n---");
      console.log(`${reservation.guestName} - ${reservation.room}`);
      if (
        reservation.prePaidMethod &&
        reservation.prePaidMethod.type === VIRTUAL_CARD
      ) {
        console.log(
          "A Virtual Card payment will be applied to this reservation.\n"
        );
        console.log("VCC payment details:\n");
        console.log(reservation.prePaidMethod.data);
      }

      if (
        reservation.prePaidMethod &&
        reservation.prePaidMethod.type === COUPON
      ) {
        console.log("A CXC payment will be applied to this reservation.\n");
        console.log("Coupon details:\n");
        console.log(reservation.prePaidMethod);
      }

      if (
        reservation.prePaidMethod &&
        reservation.prePaidMethod.type === CERTIFICATE
      ) {
        console.log(
          "A bonboy CERTIFICATE payment will be applied to this reservation."
        );
      }
      console.log("---\n");
    });

    const confirmPrompt = [
      {
        type: "confirm",
        name: "conf",
        message: "wanna confirm?",
      },
    ];

    const skippedByUserPrompt = [
      {
        type: "input",
        name: "skip",
        message: "Type reservations rooms to skip:",
      },
    ];

    const skipResponse = await inquirer.prompt(skippedByUserPrompt);
    const skipInput = skipResponse.skip;
    const skipList = skipInput
      .split(" ")
      .map((roomString: string) => Number(roomString));

    const response = await inquirer.prompt(confirmPrompt);
    const answer = response.conf;

    if (!answer) {
      console.log("Skipping...");
      return;
    }

    // Work only in CHECK-IN status reservation
    // this.departures = this.departures.filter(
    //   (departure) => departure.status === "CHIN"
    // );

    const applyPrePayMethodPromises: any = [];
    for (const reservation of prePaidReservations) {
      if (skipList.includes(reservation.room)) {
        console.log("This reservation will be skipped by user.");
        continue;
      }
      // if (
      //   reservation.prePaidMethod?.type === VIRTUAL_CARD ||
      //   reservation.prePaidMethod?.type === CERTIFICATE
      // ) {
      //   continue;
      // }
      console.log(
        `Applying pre-paid method ${reservation.prePaidMethod?.type} for ${reservation.guestName} - ${reservation.room}...`
      );

      applyPrePayMethodPromises.push(
        await PrePaid.applyPrePaidMethod(reservation, reservation.prePaidMethod)
      );
    }

    const paymentApplierResList = await Promise.all(applyPrePayMethodPromises);
    return {
      error: false,
      message: "Pending payments were applied.",
      errors: [],
    };

    // return applierResponse;
  }
}
