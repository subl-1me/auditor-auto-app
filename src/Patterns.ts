import { couponPatterns } from "./types/couponPatterns";
import { VCCPatterns } from "./types/VCCPatterns";

// Sheets
export const BalanceAmountPattern = new RegExp(
  `[-+]?\\$ (\\d+\\,?\\d+\\.?\\d+|\\d+\\,?\\.\\d+)`
);

export const SheetBalanceSpanPattern = new RegExp(
  `<span id="rptFoliosContent_ctl\\d+_lblfolio_balance">([\\s\\S\\t.]*?)<\/span>`
);

export const InputTokenContainerPattern = new RegExp(
  '<input name="__RequestVerificationToken" ([\\s\\S\\t.]*?) />',
  "i"
);

export const BearerVarDeclarationPattern = new RegExp(
  `let jsTques = "([\\s\\S\\t.]*?)"`
);

export const BearerValuePattern = new RegExp(`"([\\s\\S\\t.]*?)"`);

//Reservations
export const tableDataPattern = /<td(.*?)>(.*)<\/td>/;

// Front2Go system
export const SystemDatePattern = /\d{4}\/\d{2}\/\d{2}/;

// Invoice events
export const invoiceEventHTMLElemPattern = new RegExp(
  `<span id="rptCFDI_GUEST_ctl[0-8]+_lblevent_name" class="azulclarocss">(.*)</span>`,
  "g"
);

export const invoiceReceptorRFCPattern = new RegExp(
  `<span id="rptCFDI_GUEST_ctl[0-8]+_lblcomprobante_rfc">(.*)</span>`
);

export const invoiceReceptorNamePattern = new RegExp(
  `<span id="rptCFDI_GUEST_ctl[0-8]+_lblcomprobante_emisor">(.*)</span>`
);

// DOC - Coupons
export const ACCESS_PROVIDER = "ACCESS";
export const NOKTS_PROVIDER = "NOKTS";
export const VECI_PROVIDER = "VECI";
export const CTS_PROVIDER = "CTS";
export const GBT_PROVIDER = "GBT";

export const couponPatternsList: couponPatterns = {
  couponACCESS: {
    primaryIdentificator: /cupón access/,
    reservationIdTargetSentence: new RegExp(/\d{8}/, "g"),
    reservationId: /\d{8}/,
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`fecha de salida \\d+\\-\\d+\\-\\d+`),
    bothDatesPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    totalToPay: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  },
  couponBAUSER: {
    primaryIdentificator: /bauser/,
    reservationIdTargetSentence: new RegExp(/\d{8}/, "g"),
    reservationId: /\d{8}/,
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`fecha de salida \\d+\\-\\d+\\-\\d+`),
    bothDatesPattern: new RegExp(`\\d+\\/\\d+\\/\\d+`, "g"),
  },
  couponVILLA: {
    primaryIdentificator: /villa tours/,
    reservationIdTargetSentence: new RegExp(/clave: \d{8}/, "g"),
    reservationId: /\d{8}/,
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`fecha de salida \\d+\\-\\d+\\-\\d+`),
    bothDatesPattern: new RegExp(`\\d+\\/\\d+\\/\\d+`, "g"),
  },
  couponFLIGHT: {
    primaryIdentificator: /flight centre travel group/,
    reservationIdTargetSentence: new RegExp(/\d{8}/, "g"),
    reservationId: /\d{8}/,
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`fecha de salida \\d+\\-\\d+\\-\\d+`),
    bothDatesPattern: new RegExp(`\\d+\\/\\d+\\/\\d+`, "g"),
  },
  couponGBT: {
    primaryIdentificator: /gbt travel services mexico/,
    reservationIdTargetSentence: new RegExp(`confirmado por:(.*)\\d+`),
    reservationId: /\d+/,
    rfcPattern: /.{3}-\d+-.{2}\d/g,
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
    bothDatesPattern: /del(.*)\d+-(.*)-\d+(.*)al(.*)\d+-(.*)-\d+/,
  },
  couponCTS: {
    primaryIdentificator: /corporate travel services worldwide/,
    reservationIdTargetSentence: /clave(.*)\d+/,
    reservationId: /\d+/,
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g,
    dateInPattern: /\d+\/\d+\/\d+/g,
    dateOutPattern: /\d+\/\d+\/\d+/g,
  },
  couponVCI: {
    primaryIdentificator: /viajes eci/,
    reservationIdTargetSentence:
      /clave de conﬁrmación(.*)\d+|confirmación:(.*)\d+/,
    reservationId: /\d+/,
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g,
    dateInPattern: /fecha:\s\w+\s\d{1,2},\s\d{4}/,
    dateOutPattern: /salida:\s\w+\s\d{1,2},\s\d{4}/,
    ratePerDay: /tarifa(.*)\d+mxn/,
  },
  couponBCD: {
    primaryIdentificator: /bcd travel/,
    reservationIdTargetSentence: new RegExp(/\d{8}/, "g"),
    reservationId: /\d{8}/,
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g,
    dateInPattern: /\d{2}\/\d{2}\/\d{4}/,
    dateOutPattern: /\d{2}\/\d{2}\/\d{4}/,
    bothDatesPattern: /\d{2}\/\d{2}\/\d{4}/g,
    bothRatesPattern: /tarifa:(.*)\d+\.\d+/g,
  },
  couponNOKTOS: {
    primaryIdentificator: /noktos/,
    reservationIdTargetSentence: /codigo(.*)de(.*)reservación:(.*)\d{8}/,
    reservationId: /\d{8}/,
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}|.{3}\d{7}.{2}|.{3}\d{6}.{3}/g,
    dateInPattern: /check(.*)in:(.*)\d{4}-\d{2}-\d{2}/,
    dateOutPattern: /check(.*)out:(.*)\d{4}-\d{2}-\d{2}/,
    hotelTarget: /city express ciudad juarez/,
    guestNameSentence: /huésped:(.*)\s/,
  },
};

// VCC patterns
export const VCCPatternsList: VCCPatterns = {
  EXPEDIA: {
    amountPattern: /MXN \d+\.\d+/,
  },
  BOOKING: {
    amountPattern: /VCC AUTH MXN\d+\.\d+/,
  },
  AGODA: {
    amountPattern: /-AUTH MXN\d+\.\d+/,
  },
  EBOOKING: {
    amountPattern: /VIRTUAL CREDIT CARD VCC AUTH MXN \d+\.\d+,CTRIP PA/,
  },
};
