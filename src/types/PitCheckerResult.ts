import Ledger from "./Ledger";
import PrePaidMethod from "./PrePaidMethod";

interface CheckerRemarks {
  type: string;
  description: string;
  data?: any;
}

// interface Receptor{

// }

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
    fiscalUse: string;
    note?: string;
    receptor?: any;
  };
  remarks: CheckerRemarks[];
  totalReservation?: number;
  checkDate: Date;
}
