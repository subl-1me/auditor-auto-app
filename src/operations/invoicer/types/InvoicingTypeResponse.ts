import InvoiceResponse from "../../../types/InvoiceResponse";

export default interface InvoicingTypeResponse {
  reservationId: string;
  invoiceType: string;
  hasError: boolean;
  errors: ValidatorError[];
  success: boolean;
  invoice?: InvoiceResponse;
}

interface ValidatorError {
  type: string;
  detail: string;
}
