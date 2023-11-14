import FrontService from "../services/FrontService";
import TokenStorage from "./TokenStorage";
import Scrapper from "../Scrapper";

// Tyoes
import Ledger from "../types/Ledger";
import Payment from "../types/Payment";
import Invoice from "../types/Invoice";
import Reservation from "../types/Reservation";
import Transaction from "../types/Transaction";
import GuaranteeDoc from "../types/GuaranteeDoc";
import { RateDetails, Rate } from "../types/RateDetails";

import {
  DEPARTURES_FILTER,
  IN_HOUSE_FILTER,
  PRE_INVOICED,
  INVOICED,
  VIRTUAL_CARD_PROVIDERS,
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
  FRONT_API_RSRV_RATES,
  FRONT_API_RSRV_GET_RATE,
  FRONT_API_RSRV_GUARANTEE_DOCS,
  FRONT_API_DOWNLOAD_DOC,
  FRONT_API_RSRV_ROUTINGS,
  FRONT_API_RSRV_CERTIFICATE,
  FRONT_API_INIT_LEDGER_INVOICE,
  FRONT_API_SEARCH_RFC,
  FRONT_API_GENERATE_PRE_INVOICE,
  FRONT_API_GENERATE_INVOICE,
  FRONT_API_RESERVATION_NOTES,
  FRONT_API_ROUTING_SAVE,
  FRONT_API_RATE_DESCRIPTION,
} = process.env;

export async function getReservationCertificate(
  reservationId: string
): Promise<string | null> {
  if (!FRONT_API_RSRV_CERTIFICATE) {
    throw new Error("Endpoint cannot be null");
  }

  if (!reservationId) {
    throw new Error("Reservation ID is required.");
  }

  let _FRONT_API_RSRV_CERTIFICATE = FRONT_API_RSRV_CERTIFICATE.replace(
    "{rsrvIdField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_CERTIFICATE,
    authTokens
  );

  const scrapper = new Scrapper(response);
  let certificateId = scrapper.extractCertificateId();

  return certificateId;
}

export async function createReservationRouting(
  parentReservation: string | number,
  childs: string[] | number[],
  ledgerNo: Number,
  reservationsToProcess: Reservation[]
): Promise<void> {
  if (!FRONT_API_ROUTING_SAVE) {
    throw new Error("API ENDPOITN NULL");
  }

  const authTokens = await TokenStorage.getData();
  for (const reservation of reservationsToProcess) {
    console.log(`Processing for room: ${reservation.room}`);
    let routingPayload = {
      PropCode: "CECJS",
      RoutingType: "transaction",
      SourceRsrvCode: reservation.id,
      SourceRsrvStatus: "CHIN",
      TargetFolio: `${parentReservation}.${ledgerNo}`,
      TargetRsrvCode: parentReservation,
      TransCode: "HAB",
    };

    const routingSaveResponse = await frontService.postRequest(
      routingPayload,
      FRONT_API_ROUTING_SAVE,
      authTokens
    );

    const data = routingSaveResponse.data;
    console.log(data);
  }
}

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
      const transactions = await getLedgerTransactions(
        `${reservationId}.${ledger.numFolio}`
      );
      let balance = parseFloat(ledger.folioBalance.toString()).toFixed(2);
      ledgerList.push({
        ledgerNo: ledger.numFolio,
        status: ledger.folioStatus,
        balance: Number(balance),
        isBalanceCredit: ledger.folioBalance < 0,
        isCertificated: ledger.showCertificated,
        transactions,
      });
    } else {
      ledgerList.push({
        ledgerNo: ledger.numFolio,
        status: ledger.folioStatus,
        balance: ledger.folioBalance | 0,
        isBalanceCredit: ledger.folioBalance < 0,
        isCertificated: ledger.showCertificated,
        transactions: [],
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
    rows: 120,
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
  let reservations: Reservation[] = [];
  reservations = items
    .map((item: any) => {
      let rsrvId = item.reservationId.match(/\d+/)[0] || ""; // parse id for better handling
      return {
        id: rsrvId, // in this use case id must be an string because of API's requirements
        guestName: item.nameGuest,
        room: Number(item.room),
        dateIn: item.dateIn,
        dateOut: item.dateOut,
        status: item.statusGuest,
        company: item.company,
        agency: item.agency,
      };
    })
    .sort(sortRsrvByRoomNumber);
  return reservations;
}

export async function getReservationRateCode(
  reservationId: string
): Promise<string | null> {
  const authTokens = await TokenStorage.getData();
  if (!FRONT_API_RSRV_GET_RATE) {
    throw new Error("Endpoint cannot be null");
  }

  const _FRONT_API_RSRV_GET_RATE = FRONT_API_RSRV_GET_RATE.replace(
    "{rsrvIdField}",
    reservationId
  );

  const response = await frontService.getRequest(
    _FRONT_API_RSRV_GET_RATE,
    authTokens
  );

  if (typeof response !== "string") {
    throw new Error("Expected a STRING response. Try login again");
  }

  const scrapper = new Scrapper(response);
  const rateCode = scrapper.extractReservationRateCode();

  return rateCode;
}

export async function getReservationNotes(
  reservationId: string
): Promise<any[]> {
  if (!FRONT_API_RESERVATION_NOTES) {
    throw new Error("Endpoing cannot be null");
  }

  const _FRONT_API_RESERVATION_NOTES = FRONT_API_RESERVATION_NOTES.replace(
    "{rsrvIdField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RESERVATION_NOTES,
    authTokens
  );

  if (response.rows.length === 0) {
    return [];
  }

  const notes = JSON.parse(response.rows[0].guenoNotes);
  return notes;
}

export async function getVirtualCard(
  reservationId: string,
  rateCode: string,
  appDate: string
): Promise<any> {
  const notes = await getReservationNotes(reservationId);
  // const VIRTUAL_CREDIT_CARD_MSG = "Virtual Credit Card";
  const virtualCardAmountPattern = /MXN \d+\.\d+/;

  const hasVirtualCardAmount = notes.find((note: any) =>
    note.text.match(virtualCardAmountPattern)
  );

  if (!hasVirtualCardAmount) {
    return null;
  }

  const amountMatch = hasVirtualCardAmount.text.match(/\d+\.\d+/);
  if (!amountMatch) {
    return { type: "Unknown", amount: 0 };
  }

  //TODO: Get Virtual Card type
  const rateDescription = await GetReservationRateDescription(
    reservationId,
    appDate,
    rateCode
  );

  VIRTUAL_CARD_PROVIDERS.forEach((type) => {
    if (rateDescription.includes(type)) {
      return {
        type,
        amount: Number(amountMatch[0]),
      };
    }
  });

  return { type: "Unknown", amount: Number(amountMatch[0]) };
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

export async function GetReservationRateDescription(
  reservationId: string,
  appDate: string,
  rateCode: string
): Promise<any> {
  if (!FRONT_API_RATE_DESCRIPTION) {
    throw new Error("API ENDPOINT NULL");
  }

  const _FRONT_API_RATE_DESCRIPTION = FRONT_API_RATE_DESCRIPTION.replace(
    "{rsrvIdField}",
    reservationId
  )
    .replace("{rateCodeField}", rateCode)
    .replace("{appDateField}", appDate);

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RATE_DESCRIPTION,
    authTokens
  );

  const scrapper = new Scrapper(response);
  const rateDescription = scrapper.extractReservationRateDescription();
  if (!rateDescription) {
    return "";
  }

  return rateDescription;
}

export async function getReservationRates(
  reservationId: string
): Promise<RateDetails> {
  if (!FRONT_API_RSRV_RATES) {
    throw new Error("Endpoint cannot be null");
  }

  // first get rate code
  const rateCode = await getReservationRateCode(reservationId);
  if (!rateCode) {
    throw new Error("Error trying to get rate code");
  }

  const FRONT_API_RSRV_RATES_MODF = FRONT_API_RSRV_RATES.replace(
    "{rsrvIdField}",
    reservationId
  )
    .replace("{appDateField}", "2023/11/14")
    .replace("{rateCodeField}", rateCode);

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    FRONT_API_RSRV_RATES_MODF,
    authTokens
  );

  if (typeof response === "string") {
    throw new Error(
      "Error trying to get reservation rates data. Try log in again."
    );
  }

  const { rows } = response;
  const { TotalAmount } = response.userdata;
  // map items
  let rates: Rate[] = [];
  rates = rows.map((item: any) => {
    return {
      code: item.cell[1].trim(),
      dateToApply: item.cell[2].trim(),
      totalNoTax: Number(parseFloat(item.cell[3].trim()).toFixed(2)),
      totalWTax: Number(parseFloat(item.cell[5].trim()).toFixed(2)),
      currency: item.cell[6].trim(),
    };
  });

  return {
    total: Number(parseFloat(TotalAmount).toFixed(2)),
    rates,
  };
}

export async function getReservationGuaranteeDocs(
  reservationId: string
): Promise<GuaranteeDoc[]> {
  let docs: GuaranteeDoc[] = [];

  if (!FRONT_API_RSRV_GUARANTEE_DOCS) {
    throw new Error("ENDPOINT NULL");
  }

  let _FRONT_API_RSRV_GUARANTEE_DOCS = FRONT_API_RSRV_GUARANTEE_DOCS?.replace(
    "{rsrvIdField}",
    reservationId
  );

  const authTokens = await TokenStorage.getData();
  const response = await frontService.getRequest(
    _FRONT_API_RSRV_GUARANTEE_DOCS,
    authTokens
  );

  const scrapper = new Scrapper(response);
  const scrappedDocs = scrapper.extractGuaranteeDocs();
  if (scrappedDocs.length > 0) {
    docs = scrappedDocs.map((doc) => {
      let _FRONT_API_DOWNLOAD_DOC =
        FRONT_API_DOWNLOAD_DOC?.replace("{docIdField}", doc.id) ||
        "INVALID_URL";
      return {
        id: doc.id,
        type: doc.type,
        downloadUrl: _FRONT_API_DOWNLOAD_DOC,
      };
    });
  }

  return docs;
}

export async function getReservationRoutings(
  reservationId: string
): Promise<any> {
  if (!FRONT_API_RSRV_ROUTINGS) {
    throw new Error("Routings endpoint cannot be null.");
  }

  const authTokens = await TokenStorage.getData();
  let formData = new FormData();
  formData.append("_hdn001", "KFwHWn911eaVeJhL++adWg==");
  formData.append("_hdn002", "false");
  formData.append("_hdn003", "KFwHWn911eaVeJhL++adWg==");
  formData.append("_hdnPropName", "City Express Ciudad Juarez");
  formData.append("_hdnRoleName", "RecepcionT");
  formData.append("hdnGuestCode", `${reservationId}`);
  formData.append("hdnGuestStatus", "CHIN");
  formData.append("hdnSafePeople", "");
  formData.append("hdnGuestFolio", "1");
  formData.append("__RequestVerificationToken", authTokens.verificationToken);

  const response = await frontService.postRequest(
    formData,
    FRONT_API_RSRV_ROUTINGS,
    authTokens
  );

  const scrapper = new Scrapper(response.data);
  let routings: any[] = [];
  routings = scrapper.extractRoutings();
  // console.log(routings);

  if (routings.length === 1) {
    // if only 1, means this reservation is routed.
    const routingData = routings.pop();
    const parent = routingData.RsrvTarget || "";
    if (parent === reservationId) {
      const child = routingData.RsrvSource;
      return {
        isParent: true,
        child,
      };
    }

    return {
      isParent: false,
      parent,
    };
  }

  // it means it is a parent router.
  if (routings.length > 1) {
    const childReservations: string[] = routings.map((routing) => {
      if (routing.RsrvSource !== reservationId) {
        return routing.RsrvSource;
      }
    });

    return {
      isParent: true,
      childs: childReservations,
    };
  }

  return routings;
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

export async function getLedgerTransactions(ledgerCode: string): Promise<any> {
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

  // map to Transaction type
  let transactions: Transaction[] = [];
  transactions = response.data.map((item: any) => {
    let transType = item.transType.includes("P ") ? "PAYMENT" : "CHARGE";
    let amount = item.postAmount;
    return {
      // Front2Go API uses payments with minus (-) signal to show that is a payment instead a charge
      type: transType,
      isRefund: transType === "PAYMENT" && amount > 0 ? true : false,
      code: item.transCode,
      amount,
      date: item.dateCreate,
    };
  });

  return transactions;
}

export async function getInvoiceReceptor(
  reservationId: string,
  ledgerNo: number,
  RFC: string
): Promise<any> {
  const context = {
    context: {
      FiscalID: "",
      NumberOfItems: 0,
      PropCode: "CECJS",
      RAnticipo: "",
      TargetFolio: reservationId + "." + ledgerNo.toString(),
      Text: RFC,
    },
  };

  if (!FRONT_API_SEARCH_RFC) {
    throw new Error("RFC SEARCH ENDPOINT CANNOT BE NULL");
  }

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    context,
    FRONT_API_SEARCH_RFC,
    authTokens
  );

  const { data } = response;

  return data.d.Items[0];
}

export async function generatePreInvoice(
  reservationId: string,
  ledgerNo: number,
  receptor: any
): Promise<any> {
  const receptorNameSegments = receptor.Text.split("-");
  const receptorName = receptorNameSegments[2].trim();
  const receptorId = receptor.value;
  console.log("----");
  console.log(`Currently invoicing to: ${receptorName}`);
  console.log(receptorName);
  console.log("---- \n\n");

  const invoiceData = {
    pGuest_code: reservationId,
    pProp_Code: "CECJS",
    pFolio_code: reservationId + "." + ledgerNo.toString(),
    pReceptorId: receptorId,
    pFormat: "D",
    pNotas: "",
    pCurrency: "MXN",
    pUsoCFDI: "G03",
    pReceptorNameModified: receptorName,
    pIdiom: "Spa",
    pUser: "",
    pReceptorCP_Modified: "",
  };

  if (!FRONT_API_GENERATE_PRE_INVOICE) {
    throw new Error("INVOICE GENERATOR ENDPOINT CANNOT BE NULL");
  }

  const authTokens = await TokenStorage.getData();
  const preInvoiceRes = await frontService.postRequest(
    invoiceData,
    FRONT_API_GENERATE_PRE_INVOICE,
    authTokens
  );

  console.log(preInvoiceRes.data.d);
  return preInvoiceRes.data.d;
}

export async function generateInvoice(
  preInvoiceId: string,
  reservationId: string,
  ledgerNo: number
) {
  const body = {
    pComprobante: preInvoiceId,
    pProp_Code: "CECJS",
    pFolio_code: reservationId + "." + ledgerNo.toString(),
    pGuest_code: reservationId,
    pFormat: "D",
    pNotas: "",
    pCurrency: "MXN",
    pUsoCFDI: "G03",
    pReceptorNameModified: "",
    pIdiom: "Spa",
    pUser: "",
  };

  if (!FRONT_API_GENERATE_INVOICE) {
    throw new Error("FRONT_API_GENERATE_INVOICE null");
  }

  const authTokens = await TokenStorage.getData();
  const invoiceResponse = await frontService.postRequest(
    body,
    FRONT_API_GENERATE_INVOICE,
    authTokens
  );

  const { data } = invoiceResponse;
  return data;
}

export async function initializeLedgerInvoice(
  reservationId: string,
  ledgerNo: number
): Promise<any> {
  const body = {
    pFolioCode: reservationId + "." + ledgerNo,
    pPropCode: "CECJS",
  };

  if (!FRONT_API_INIT_LEDGER_INVOICE) {
    throw new Error("INIT LEDGER API CANNOT BE NULL");
  }

  const authTokens = await TokenStorage.getData();
  const response = await frontService.postRequest(
    body,
    FRONT_API_INIT_LEDGER_INVOICE,
    authTokens
  );

  const { data } = response;
  if (data.value === "|") {
    return {
      status: 200,
    };
  }

  return {
    status: 400,
  };
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
