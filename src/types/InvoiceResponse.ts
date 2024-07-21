import Invoice from "./Invoice";
export default interface InvoiceResponse {
  status: Number;
  error: string;
  reservationId: string;
  invoice?: Invoice;
}
