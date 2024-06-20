export interface DocAnalyzerResult {
  provider: string;
  RFC: string;
  reservationTarget: string;
  dates: couponDates;
  totalToPay?: number;
  ratePerDay?: number;
}

interface couponDates {
  dateIn: string;
  dateOut: string;
}
