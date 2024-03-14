import Ledger from "./Ledger";

export default interface Reservation {
  id: string;
  guestName: string;
  room: number;
  dateIn: string;
  dateOut: string;
  status: string;
  company: string;
  agency: string;
  ledgers: Ledger[];
}
