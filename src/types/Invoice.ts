export default interface Invoice {
  ledgerNo: number | Number;
  RFC: string;
  RFCName: string;
  status: string;
  receiptId?: string;
  downloadUrl?: string;
}
