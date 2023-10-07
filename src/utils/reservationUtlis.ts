import FrontService from "../services/FrontService";
import TokenStorage from "./TokenStorage";
import Scrapper from "../Scrapper";

import Ledger from "../types/Ledger";
import Payment from "../types/Payment";
import Invoice from "../types/Invoice";
import Reservation from "../types/Reservation";

import {
  DEPARTURES_FILTER,
  IN_HOUSE_FILTER,
  PRE_INVOICED,
  INVOICED,
} from "../consts";

import {
  invoiceEventHTMLElemPattern,
  invoiceReceptorRFCPattern,
  invoiceReceptorNamePattern,
} from "../patterns";

const frontService = new FrontService();
const {
  FRONT_API_RSRV_FOLIOS,
  FRONT_API_RSRV_FOLIOS_MOVS,
  FRONT_API_RSRV_CHANGE_LEDGER_STATUS,
  FRONT_API_RSRV_GUEST_INFO,
  FRONT_API_RSRV_ADD_NEW_LEDGER,
  FRONT_API_RSRV_NEW_PAYMENT,
  FRONT_API_RSRV_INVOICES,
  FRONT_API_RSRV_LIST,
} = process.env;

export async function getReservationLedgerList(
  reservationId: string
): Promise<Ledger[]> {
  if (!FRONT_API_RSRV_FOLIOS) {
    throw new Error("Endpoint cannot be undefined");
  }

  const _FRONT_API_RSRV_FOLIOS = FRONT_API_RSRV_FOLIOS?.replace(
    "{idField}",
    reservationId
  );

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

/**
 * @description Gets reservation list by following a status filter.
 * @param {string} status Condition to fetch list of reservation. See consts file to see usable filters.
 * @returns {Reservation}
 */
export async function getReservationList(
  status: string
): Promise<Reservation[]> {
  const listOptions = {
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
    rs: status === IN_HOUSE_FILTER ? "CHIN,NOSHOW" : "",
    st: status === DEPARTURES_FILTER ? "LS" : "EC",
    grp: "",
    gs: status === DEPARTURES_FILTER ? "CHOUT,CHIN,NOSHOW" : "",
    sidx: "NameGuest",
    sord: "asc",
    rows: 100,
    page: 1,
    ss: false,
    rcss: "",
    user: "HTJUGALDEA",
  };

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    listOptions,
    FRONT_API_RSRV_LIST || "",
    authTokens
  );

  // sort by room
  const items = response.data.rows;
  const sortRsrvByRoomNumber = (rsrvA: any, rsrvB: any) => {
    return rsrvA.room - rsrvB.room;
  };

  // map response items to Reservation interface
  const reservations: Reservation[] = items
    .map((item: any) => {
      const rsrvId = item.reservationId.match(/\d+/)[0] || ""; // parse id for better handling
      const reservation: Reservation = {
        id: rsrvId, // in this use case id must be an string because of API's requirements
        guestName: item.nameGuest,
        room: item.room,
        dateIn: item.dateIn,
        dateOut: item.dateOut,
        status: item.statusGuest,
        company: item.company,
        agency: item.agency,
      };

      return reservation;
    })
    .sort(sortRsrvByRoomNumber);
  return reservations;
}

export async function getReservationInvoiceList(
  reservation: Reservation
): Promise<Invoice[]> {
  if (!FRONT_API_RSRV_INVOICES) {
    throw new Error("Endpoint cannot be undefined");
  }

  const _FRONT_API_RSRV_INVOICES = FRONT_API_RSRV_INVOICES.replace(
    "{rsrvIdField}",
    reservation.id
  ).replace("{rsrvStatusField}", reservation.status);

  const authTokens = await TokenStorage.getData();
  if (!authTokens) {
    throw new Error("Error trying to get authentication tokens.");
  }
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_INVOICES,
    authTokens
  );

  const invoicesTableHTMLElemPattern = new RegExp(
    `<table cellspacing="0" cellpadding="0" width="100%" border="0">([\\s\\S\\t.]*)<\/table>`,
    "i"
  );
  const invoicesTableMatch = response
    .toString()
    .match(invoicesTableHTMLElemPattern);
  if (!invoicesTableMatch) {
    throw new Error(
      "Error trying to read main invoices table. Try login again."
    );
  }

  const invoiceEventMatch = invoicesTableMatch[0].match(
    invoiceEventHTMLElemPattern
  );
  if (!invoiceEventMatch || invoiceEventMatch.length === 0) {
    return [];
  }

  let invoices: Invoice[] = [];
  invoiceEventMatch.forEach((result: string) => {
    const eventNoMatch = result.match(/\d+/);

    const invoiceReceptorMatch = invoicesTableMatch[0].match(
      invoiceReceptorRFCPattern
    );

    const eventNo = eventNoMatch ? eventNoMatch[0] : 0;
    const receptorRFC = invoiceReceptorMatch ? invoiceReceptorMatch[0] : "";

    let ledgerNo = 0;
    let status = "";
    let RFC = "";
    let RFCName = "";
    if (eventNo !== 0) {
      // it match with a ledger number
      ledgerNo = Number(eventNo);
      status = result.includes(INVOICED) ? INVOICED : PRE_INVOICED;
    }

    if (receptorRFC) {
      const rfcResult = receptorRFC.match(/[A-Z]{3}\d{6}[A-Z]{2}\d/);
      RFC = rfcResult ? rfcResult[0] : "";
    }

    const receptorRFCNameResult = invoicesTableMatch[0].match(
      invoiceReceptorNamePattern
    );
    const receptorRFCName = receptorRFCNameResult
      ? receptorRFCNameResult[0]
      : null;
    console.log(receptorRFCName);
    // if (receptorRFCName) {
    // }
  });

  console.log(invoices);
  return invoices;
}

export async function addNewPayment(payment: Payment): Promise<any> {
  if (!FRONT_API_RSRV_NEW_PAYMENT) {
    throw new Error("Endpoint cannot be undefined");
  }

  if (payment.amount === 0) {
    return {
      status: 400,
      message: "Payment amount cannot be 0",
    };
  }

  const _FRONT_API_RSRV_NEW_PAYMENT = FRONT_API_RSRV_NEW_PAYMENT.replace(
    "{pymntTypeField}",
    payment.type
  )
    .replace("{rsrvIdField}", payment.reservationId)
    .replace("{rsrvLedgerCodeField}", payment.reservationCode)
    .replace("{ledgerBalance}", payment.amount.toString());

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_NEW_PAYMENT,
    authTokens
  );

  return response;
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
