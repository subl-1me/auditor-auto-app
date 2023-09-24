import FrontService from "../services/FrontService";
import TokenStorage from "./TokenStorage";
import Scrapper from "../Scrapper";
import Ledger from "../types/Ledger";

const frontService = new FrontService();
const { FRONT_API_RSRV_FOLIOS, FRONT_API_RSRV_FOLIOS_MOVS } = process.env;

export async function getReservationLedgerList(
  reservationId: string
): Promise<Ledger[]> {
  const _FRONT_API_RSRV_FOLIOS = FRONT_API_RSRV_FOLIOS?.replace(
    "{idField}",
    reservationId
  );
  if (!_FRONT_API_RSRV_FOLIOS) {
    throw new Error("Invalid API endpoint");
  }

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_FOLIOS,
    authTokens
  );

  // if response is a string it means the server returns Login Page as a response;
  if (typeof response === "string") {
    throw new Error("Error trying to get ledger list. Please log in again.");
  }

  // map items
  let ledgerList: Ledger[] = [];
  for (const ledger of response) {
    if (ledger.folioStatus === "OPEN") {
      // only gets movements if sheet is open
      const movements = await getLedgerMovements(
        `${reservationId}.${ledger.numFolio}`
      );
      ledgerList.push({
        ledgerNo: ledger.numFolio,
        status: ledger.folioStatus,
        balance: ledger.folioBalance | 0,
        isBalanceCredit: ledger.folioBalance < 0,
        movements,
      });
    } else {
      ledgerList.push({
        ledgerNo: ledger.numFolio,
        status: ledger.folioStatus,
        balance: ledger.folioBalance | 0,
        isBalanceCredit: ledger.folioBalance < 0,
        movements: [],
      });
    }
  }

  return ledgerList;
}

export async function getLedgerMovements(ledgerCode: string): Promise<any> {
  if (!FRONT_API_RSRV_FOLIOS_MOVS) {
    throw new Error("FRONT_API_RSRV_FOLIOS endpoint cannot be undefined");
  }
  const _FRONT_API_RSRV_FOLIOS_MOVS = FRONT_API_RSRV_FOLIOS_MOVS?.replace(
    "{ledgerCode}",
    ledgerCode
  );
  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    {},
    _FRONT_API_RSRV_FOLIOS_MOVS,
    authTokens
  );

  if (typeof response.data === "string") {
    throw new Error(
      `Error trying to get ledger's movements. Please try again.`
    );
  }

  return response.data;
}
