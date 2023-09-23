import FrontService from "../services/FrontService";
import TokenStorage from "./TokenStorage";
import Scrapper from "../Scrapper";

import ReservationSheet from "../types/ReservationSheet";

const frontService = new FrontService();

const { FRONT_API_RSRV_SHEETS } = process.env;

export async function getReservationSheetsData(
  reservationId: string
): Promise<ReservationSheet[]> {
  const _FRONT_API_RSRV_SHEETS = FRONT_API_RSRV_SHEETS?.replace(
    "{idField}",
    reservationId
  );
  if (!_FRONT_API_RSRV_SHEETS) {
    throw new Error("Invalid API endpoint");
  }

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_SHEETS,
    authTokens
  );

  const scrapper = new Scrapper(response);
  const sheets = scrapper.extractReservationSheetData();
  console.log(sheets);
  return [];
}
