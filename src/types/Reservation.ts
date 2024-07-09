import Ledger from "./Ledger";
import PrePaidMethod from "../types/PrePaidMethod";
import LedgerClassification from "./LedgerClassification";

export default interface Reservation {
  id: string;
  guestName: string;
  room: number;
  dateIn: string;
  dateOut: string;
  status: string;
  company: string;
  agency: string;
  totalToPay?: number;
  prePaidMethod?: PrePaidMethod;
  invocingData?: {
    RFC: string;
    RS: string;
    sendToEmail: string;
  };
  ledgers: Ledger[];
  ledgerClassification?: LedgerClassification;
}
