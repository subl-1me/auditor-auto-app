import { couponPatternsI } from "./types/couponPatterns";
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

export const couponPatternsList = {
  couponAccess: {
    primaryIdentificator: /cupón access/,
    reservationIdTarget: new RegExp(`clave de conﬁrmación \\d+`),
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}/g,
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`fecha de salida \\d+\\-\\d+\\-\\d+`),
  },
  couponGBT: {
    primaryIdentificator: /gbt travel services mexico/,
    reservationIdTarget: new RegExp(`clave de conﬁrmación(.*)\d+`),
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}/g,
    dateInPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
    dateOutPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  },
  couponCTS: {
    primaryIdentificator: /corporate travel services worldwide/,
    reservationIdTarget: /Clave(.*)\d+/,
    rfcPattern:
      /.{3}\d{7}.{1}\d{1}|.{3}\d{6}.{2}\d{1}|.{3}\d{9}|.{3}\d{6}.{1}\d{2}/g,
    dateInPattern: /\d+\/\d+\/\d+/,
    dateOutPattern: /\d+\/\d+\/\d+/,
  },
  // couponVCI: {
  //   primaryIdentificator: "viajes eci",
  //   confirmationIdPattern: new RegExp(`clave de conﬁrmación(.*)\d+`),
  //   totalPattern: new RegExp(`\$\\d+\,\\d+\.\\d+`),

  //   provider: VECI_PROVIDER,
  //   guestName: "",
  //   roomType: "",
  //   dateInPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  //   dateOutPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  //   ratePerNight: 0,
  //   placeDirection: "",
  // },
};

// VCC patterns
export const VCCPatternsList: VCCPatterns = {
  EXPEDIA: {
    amountPattern: /MXN \d+\.\d+/,
  },
  BOOKING: {
    amountPattern: /VCC AUTH MXN\d+\.\d+/,
  },
};
