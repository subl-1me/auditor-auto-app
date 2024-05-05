export default interface VCC {
  provider: string | null;
  amount: Number;
  type?: string;
  readyToCharge?: boolean;
}
