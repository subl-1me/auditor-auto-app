export interface couponPatternsI {
  primaryIdentificator: RegExp;
  reservationIdTarget: RegExp;
  rfcPattern: RegExp;
  dateInPattern: RegExp;
  dateOutPattern: RegExp;
}
