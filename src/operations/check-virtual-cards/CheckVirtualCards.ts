import * as reservationUtils from "../../utils/reservationUtlis";
import { IN_HOUSE_FILTER } from "../../consts";
import Reservation from "../../types/Reservation";
import { Rate } from "../../types/RateDetails";
import Note from "../../types/Note";

interface BookingVCCPatterns {
  OTA: RegExp;
  VCCAmount: RegExp;
  primaryIdentificator: RegExp;
  secondaryIdentificator: RegExp;
}

interface ExpediaVCCPatterns {
  VCCAmount: RegExp;
}

interface AgodaVCCPatterns {
  primaryIdentificator: RegExp;
  VCCAmount: RegExp;
}

export default class CheckVirtualCards {
  private BOOKING_CARD_PATTERNS = {
    OTA: new RegExp(`OTA BOOKING`),
    VCCAmount: new RegExp(`MXN\\d+\\.\\d+`),
    primaryIdentificator: new RegExp(`VIRTUAL CREDIT CARD VCC`),
    secondaryIdentificator: new RegExp(
      `HAS RECIBIDO UNA TARJETA DE CREDITO VIRTUAL`
    ),
  };

  private EXPEDIA_CARD_PATTERNS = {
    VCCAmount: new RegExp(`MXN \\d+\\.\\d+`),
  };

  private AGODA_CARD_PATTERNS = {
    primaryIdentificator: new RegExp(`VIRTUAL CREDIT CARD`),
    VCCAmount: new RegExp(`-Auth MXN\\d+\\.\\d+`),
  };

  constructor() {}

  async init(): Promise<any> {
    const reservations = await reservationUtils.getReservationList(
      IN_HOUSE_FILTER
    );

    for (const reservation of reservations) {
      const notes = await reservationUtils.getReservationNotes(reservation.id);
      let fullNote = "";
      notes.forEach((noteObj: Note) => {
        if (noteObj.text) {
          fullNote += (noteObj.text.trim() + " ").toUpperCase();
        }
      });
      //   console.log(fullNote + "\n");
      const VCCClassif = this.categoriceOTAVCC(fullNote);
      if (VCCClassif) {
        console.log(`For: ${reservation.guestName} ~ ${reservation.room}`);
        const rateDetails = await reservationUtils.getReservationRates(
          reservation.id
        );
        console.log(VCCClassif);
        console.log(`Rsrv total: ${rateDetails.total}`);
        console.log(`\n`);
      }
    }
    // console.log(reservations);
  }

  private categoriceOTAVCC(note: string): any {
    const bookingKeys = Object.getOwnPropertyNames(this.BOOKING_CARD_PATTERNS);
    const expediaKeys = Object.getOwnPropertyNames(this.EXPEDIA_CARD_PATTERNS);
    const agodaKeys = Object.getOwnPropertyNames(this.AGODA_CARD_PATTERNS);
    let bookingProbValue = 0;
    let expediaProbValue = 0;
    let agodaProbValue = 0;

    bookingKeys.forEach((key: string) => {
      if (
        note.match(this.BOOKING_CARD_PATTERNS[key as keyof BookingVCCPatterns])
      ) {
        bookingProbValue++;
      }
    });

    expediaKeys.forEach((key: string) => {
      if (
        note.match(this.EXPEDIA_CARD_PATTERNS[key as keyof ExpediaVCCPatterns])
      ) {
        expediaProbValue++;
      }
    });

    agodaKeys.forEach((key: string) => {
      if (note.match(this.AGODA_CARD_PATTERNS[key as keyof AgodaVCCPatterns])) {
        agodaProbValue++;
      }
    });

    // console.log("prob values:");
    // console.log(`Expedia: ${expediaProbValue}`);
    // console.log(`Booking: ${bookingProbValue}`);
    // console.log(`Agoda: ${agodaProbValue} \n`);

    if (expediaProbValue > bookingProbValue) {
      let amount = note.match(this.EXPEDIA_CARD_PATTERNS.VCCAmount);
      if (amount) {
        return {
          VCCType: "EXPEDIA",
          VCCAmount: amount[0],
        };
      }
    }

    if (bookingProbValue > expediaProbValue) {
      let amount = note.match(this.BOOKING_CARD_PATTERNS.VCCAmount);
      if (amount) {
        return {
          VCCType: "BOOKING",
          VCCAmount: amount[0],
        };
      }
    }

    // otherwhise it'll AGODA
    let amount = note.match(this.AGODA_CARD_PATTERNS.VCCAmount);
    if (amount) {
      return {
        VCCType: "AGODA",
        VCCAmount: amount[0],
      };
    }
  }
}
