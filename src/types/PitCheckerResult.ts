import Ledger from "./Ledger";
import PrePaidMethod from "./PrePaidMethod";

export default interface PitCheckerResult {
  guest: string;
  reservationId: string;
  room: Number | number;
  paymentStatus: string;
  routing: {
    isParent: boolean;
    parentId: string;
    ledgerTarget: number;
    routingCheckDetails: any;
    childs: string[];
  };
  ledgers: Ledger[];
  prePaidMethod: PrePaidMethod | null;
  nightsPaid: Number | number;
  pendingBalance: Number | number;
  futurePaymentErrors: any;
  checkAgainOn: string;
  deleteRegisterOn: string;
  hasErrors: boolean;
  errorDetail: any;
  invoiceSettings: {
    repeat: boolean;
    RFC: string;
    companyName: string;
    emails: string[];
  };
  totalReservation?: number;
  checkDate: Date;
}
