export default interface ReservationSheet {
  sheetNo: number;
  isOpen: boolean;
  balance: {
    isCredit: boolean;
    amount: number;
  };
  invoices: Invoice[];
}

interface Invoice {
  rfc: string;
  name: string;
}
