interface Match {
  match: boolean;
  toCompare: string[];
}

export default interface Comparission {
  pass: boolean;
  id: Match;
  dateInMatches: Match;
  dateOutMatches: Match;
}
