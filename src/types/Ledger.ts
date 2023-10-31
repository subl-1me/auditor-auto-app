import Transaction from "./Transaction";

export default interface Ledger {
  ledgerNo: number;
  status: string;
  balance: number;
  isBalanceCredit: boolean;
  isCertificated: boolean;
  transactions: Transaction[];
}
