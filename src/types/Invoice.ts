export default interface Invoice {
  ledgerNo: number;
  RFC: string;
  RFCName: string;
  status: string;
  downloadUrl?: string;
}
