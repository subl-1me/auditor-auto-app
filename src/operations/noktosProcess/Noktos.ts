import FrontService from "../../services/FrontService";
import MenuStack from "../../MenuStack";
import TokenStorage from "../../utils/TokenStorage";
import FormData from "form-data";
import { getConfig } from "../../utils/frontSystemUtils";

const { FRONT_API_RSRV_LIST, FRONT_API_RSRV_HOME } = process.env;

export default class Noktos {
  private frontService: FrontService;
  constructor() {
    this.frontService = new FrontService();
  }

  async performProcess(menuStack: MenuStack) {
    //TODO: Get reservation list
    //TODO: Filter only NOKTOS company
    //TODO: For each reservation close the FIRST open sheet available by adding CXC payment method
    // & make sure there are 15 room charges.
    //TODO: Finally make the invoice via Invoicer

    const data = {
      pc: "KFwHWn911eaVeJhL++adWg==",
      ph: false,
      pn: "",
      ci: "",
      gpi: "",
      ti: "",
      rc: "",
      rm: "",
      fm: "",
      to: "",
      fq: "",
      rs: "CHIN,NOSHOW,POST",
      st: "EC",
      grp: "",
      gs: "",
      sidx: "NameGuest",
      sord: "asc",
      rows: 100,
      page: 1,
      ss: false,
      rcss: "",
      user: "HTJUGALDEA",
    };
    const authTokens = await TokenStorage.getData();
    const response = await this.frontService.postRequest(
      data,
      FRONT_API_RSRV_LIST || "",
      authTokens
    );

    const reservations: any[] = response.data.rows;
    const sortRsrvByRoomNumber = (rsrvA: any, rsrvB: any) => {
      return rsrvA.room - rsrvB.room;
    };
    const noktosReservations = reservations
      .filter((reservation) => reservation.company === "NOKTOS-C")
      .sort(sortRsrvByRoomNumber);

    for (const reservation of noktosReservations) {
    }
  }

  async getReservationRate(
    reservationId: string,
    authTokens: any
  ): Promise<void> {
    const configData = await getConfig();
    const frontAppDate = configData.appDate;
    const data = this.setupSearchFormData(
      reservationId,
      authTokens.verificationToken,
      frontAppDate
    );
  }

  async setupSearchFormData(
    reservationId: string,
    verificationToken: string,
    frontAppDate: string
  ): Promise<FormData> {
    const formData = new FormData();
    formData.append("_hdn001", "KFwHWn911eaVeJhL++adWg==");
    formData.append("_hdn002", "false");
    formData.append("_hdn003", "KFwHWn911eaVeJhL++adWg==");
    formData.append("_hdnPropName", "City+Express+Ciudad+Juarez");
    formData.append("_hdnRoleName", "RecepcionT");
    formData.append("_hdnOffset", "-6");
    formData.append("_hdnAppDate", frontAppDate);
    formData.append("_hdnMessage", "");
    formData.append("_hdnIdiom", "Spa");
    formData.append("_hdnRSRV", reservationId);
    formData.append("__RequestVerificationToken", verificationToken);
    return formData;
  }
}
