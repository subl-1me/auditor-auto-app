export interface DocAnalyzerResult {
  provider: string;
  RFC: string;
  reservationTarget: string;
  dates: couponDates;
}

interface couponDates {
  dateIn: string;
  dateOut: string;
}
