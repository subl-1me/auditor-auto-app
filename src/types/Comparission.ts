interface Match {
  match: boolean;
  toCompare: any[];
}

export default interface Comparission {
  pass: boolean;
  id: Match;
  dateInMatches: Match;
  dateOutMatches: Match;
  totalToPay?: Match;
}
