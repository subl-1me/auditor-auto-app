import FrontService from "../services/FrontService";
import TokenStorage from "./TokenStorage";
import Scrapper from "../Scrapper";
import Ledger from "../types/Ledger";

const frontService = new FrontService();
const {
  FRONT_API_RSRV_FOLIOS,
  FRONT_API_RSRV_FOLIOS_MOVS,
  FRONT_API_RSRV_CHANGE_LEDGER_STATUS,
  FRONT_API_RSRV_GUEST_INFO,
  FRONT_API_RSRV_ADD_NEW_LEDGER,
} = process.env;

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

export async function changeLedgerStatus(
  reservationId: string,
  ledgerNo: number,
  reservationStatus: string
): Promise<any> {
  if (!FRONT_API_RSRV_CHANGE_LEDGER_STATUS) {
    throw new Error(
      "FRONT_API_RSRV_CHANGE_LEDGER_STATUS endpoint cannot be undefined"
    );
  }

  const payload = {
    folio_code: `${reservationId}.${ledgerNo}`,
    guest_code: reservationId,
    guest_status: reservationStatus,
    max_folios: 8,
    prop_code: "CECJS",
  };

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    payload,
    FRONT_API_RSRV_CHANGE_LEDGER_STATUS,
    authTokens
  );

  if (response.data !== "ok") {
    return {
      status: 400,
      message: `Error trying to change ledger no. ${ledgerNo} status.`,
    };
  }

  return {
    status: 200,
    message: "OK",
  };
}

export async function addNewLegder(reservationId: string): Promise<void> {
  if (!FRONT_API_RSRV_ADD_NEW_LEDGER) {
    throw new Error("FRONT_API_RSRV_ADD_NEW_LEDGER endpoint cannot be empty");
  }

  const authTokens = await TokenStorage.getData();
  const _FRONT_API_RSRV_ADD_NEW_LEDGER = FRONT_API_RSRV_ADD_NEW_LEDGER.replace(
    "{idField}",
    reservationId
  );
  const response = await frontService.postRequest(
    {},
    _FRONT_API_RSRV_ADD_NEW_LEDGER,
    authTokens
  );

  return response;
}

export async function getReservationContact(
  reservationId: string
): Promise<any> {
  if (!FRONT_API_RSRV_GUEST_INFO) {
    throw new Error("FRONT_API_RSRV_GUEST_INFO endpoint cannot be undefined.");
  }

  const _FRONT_API_RSRV_GUEST_INFO = FRONT_API_RSRV_GUEST_INFO.replace(
    "{idField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const htmlBody = await frontService.getRequest(
    _FRONT_API_RSRV_GUEST_INFO,
    authTokens
  );
  if (typeof htmlBody !== "string") {
    throw new Error(
      "Error trying to get guest info contact. Expected string as response"
    );
  }
  const scrapper = new Scrapper(htmlBody);
  const emails = scrapper.extractContactEmails();
  return emails;
}
