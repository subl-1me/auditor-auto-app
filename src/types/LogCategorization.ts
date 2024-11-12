export interface LogCategorization {
  rates: RateLog[];
}

export interface RateLog {
  oldValue: string;
  newValue: string;
  dateString: string;
  dateInfo?: DateInfo;
}

export interface DateInfo {
  isToday: boolean;
  diffHours: number;
  diffMins: number;
  diffSecs: number;
  diffMs: number;
  formattedDate: Date;
}
