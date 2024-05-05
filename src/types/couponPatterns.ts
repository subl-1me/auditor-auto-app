export interface IPatternKeys {
  [key: string]: RegExp | undefined;
  primaryIdentificator: RegExp;
  reservationIdTargetSentence: RegExp;
  reservationId: RegExp;
  rfcPattern: RegExp;
  dateInPattern: RegExp;
  dateOutPattern: RegExp;
  bothDatesPattern?: RegExp;
}

export interface couponPatterns {
  // couponAccess: IPatternKeys;
  couponGBT: IPatternKeys;
  couponCTS: IPatternKeys;
  couponVCI: IPatternKeys;
}
