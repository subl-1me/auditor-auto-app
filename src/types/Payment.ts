export default interface Payment {
  type: string;
  amount: number;
  reservationId: string;
  reservationCode: string;
}
