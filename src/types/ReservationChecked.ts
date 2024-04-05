export default interface ReservationChecked {
  id: string;
  hasCoupon: boolean;
  hasVCC: boolean;
  hasCertificate: boolean;
  checkAgain: boolean;
  dateOut: string;
}
