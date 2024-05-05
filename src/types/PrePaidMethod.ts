import GuaranteeDoc from "./GuaranteeDoc";
import VCC from "./VCC";

export default interface PrePaidMethod {
  type: string;
  // data: VCC | GuaranteeDoc[] | string | null |;
  data: any;
}
