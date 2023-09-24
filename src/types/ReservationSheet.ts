export default interface ReservationSheet {
  sheetNo: number;
  isOpen: boolean;
  balance: {
    isCredit: boolean;
    amount: number;
  };
}
