import Ledger from "./Ledger";

export default interface LedgerClassification {
  reservationId: string;
  invoicable: Ledger[];
  empty: Ledger[];
  active: Ledger[];
  invoiced: Ledger[];
}
