export default interface InvoiceResponse {
  status: Number;
  reservationId: string;
  invoiceStatus: string;
  RFC: string;
  error: string;
  invoiceReceiptId: string;
}
