export interface RateDetails {
  total: number;
  rates: Rate[];
}

export interface Rate {
  code: string;
  dateToApply: string;
  totalNoTax: number;
  totalWTax: number;
  currency: string;
}
