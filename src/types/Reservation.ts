import PrePaid from "../PrePaid";
import GuaranteeDoc from "./GuaranteeDoc";
import Ledger from "./Ledger";
import VCC from "./VCC";
import PrePaidMethod from "../types/PrePaidMethod";

export default interface Reservation {
  id: string;
  guestName: string;
  room: number;
  dateIn: string;
  dateOut: string;
  status: string;
  company: string;
  agency: string;
  prePaidMethod?: PrePaidMethod;
  invocingData?: {
    RFC: string;
    RS: string;
    sendToEmail: string;
  };
  ledgers: Ledger[];
}
