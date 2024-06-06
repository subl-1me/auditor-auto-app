export default interface Transaction {
  type: string;
  code: string;
  isRefund: boolean;
  amount: number;
  date: string | Date;
}
