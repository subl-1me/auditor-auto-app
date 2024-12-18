export interface IPatternKeys {
  [key: string]: RegExp | undefined;
  primaryIdentificator: RegExp;
  reservationIdTargetSentence: RegExp;
  reservationId: RegExp;
  rfcPattern?: RegExp;
  dateInPattern: RegExp;
  dateOutPattern: RegExp;
  bothDatesPattern?: RegExp;
  totalToPay?: RegExp;
  ratePerDay?: RegExp;
  bothRatesPattern?: RegExp;
  hotelTarget?: RegExp;
  guestNameSentence?: RegExp;
}

export interface couponPatterns {
  couponGBT: IPatternKeys;
  couponCTS: IPatternKeys;
  couponVCI: IPatternKeys;
  couponBCD: IPatternKeys;
  couponNOKTOS: IPatternKeys;
  couponACCESS: IPatternKeys;
  couponBAUSER: IPatternKeys;
  couponFLIGHT: IPatternKeys;
  couponVILLA: IPatternKeys;
}
