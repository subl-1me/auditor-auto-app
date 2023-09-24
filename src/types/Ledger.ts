export default interface Ledger {
  ledgerNo: number;
  status: string;
  balance: number;
  isBalanceCredit: boolean;
  movements: [];
}
