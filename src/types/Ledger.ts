import Invoice from "./Invoice";
import Transaction from "./Transaction";

export default interface Ledger {
  ledgerNo: number;
  status: string;
  balance: number;
  isBalanceCredit: boolean;
  transactions: Transaction[];
  isInvoiced: boolean;
  invoice: Invoice | null;
}
