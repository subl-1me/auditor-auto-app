export interface DocAnalyzerResult {
  type: string;
  RFC: string;
  reservationTarget: string;
  dates: couponDates;
}

interface couponDates {
  dateIn: string;
  dateOut: string;
}
