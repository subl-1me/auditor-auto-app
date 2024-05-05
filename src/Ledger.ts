import ILedger from "../src/types/Ledger";
import FrontService from "../src/services/FrontService";

export default class Ledger {
  private ledgers: ILedger[];
  constructor(private frontService: FrontService) {
    this.ledgers = [];
  }

  async getReservationLedgers(reservation: string): Promise<ILedger[]> {
    const ledgers: ILedger[] = [];

    return ledgers;
  }
}
