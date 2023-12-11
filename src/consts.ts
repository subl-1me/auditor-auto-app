// reservation search filters
export const DEPARTURES_FILTER = "departures";
export const IN_HOUSE_FILTER = "in-house";

// invoice status
// it is on spanish because the API's language is spanish
export const INVOICED = "Timbrado";
export const PRE_INVOICED = "PreFactura";

//  Principal-Menu skeleton
export const HOME_MENU_OPERATION_NAMES = [
  "Login",
  "Invoicer",
  "Print docs",
  "Start Noktos process",
  "Check PIT",
  "Utils",
  "Settings",
  " Exit ",
];

// Virtual Card Providers
export const VIRTUAL_CARD_PROVIDERS = ["Expedia", "Booking"];

// Utils-Menu Skeleton
export const UTILS_MENU_OPERATION_NAMES = [
  "Create routing",
  "Get reservation details",
  " Return ",
];

interface GuaranteeDocsPatterns {
  [key: string]: {
    primaryIdentificator: string;
    provider: string;
    confirmationIdPattern: RegExp;
    totalPattern: RegExp;
    guestName: RegExp;
    roomType: string;
    hotelName: string;
    dateInPattern: RegExp;
    dateOutPattern: RegExp;
    ratePerNight: number;
  };
}

export const ACCESS_PROVIDER = "ACCESS";
export const NOKTS_PROVIDER = "NOKTS";
export const VECI_PROVIDER = "VECI";
export const CTS_PROVIDER = "CTS";
export const GBT_PROVIDER = "GBT";

// This should help to skip coupons that contains
export const BANNED_COUPON_CONTENTS = ["hoteles gs definicion"];

export const guaranteeDocPatterns: GuaranteeDocsPatterns = {
  couponAccess: {
    primaryIdentificator: "cupón access",
    provider: ACCESS_PROVIDER,
    confirmationIdPattern: new RegExp(`clave de conﬁrmación \\d+`),
    totalPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
    guestName: new RegExp("nombre del huésped(.*?)hotel city express"),
    hotelName: "city express by marriott",
    roomType: "",
    dateInPattern: new RegExp(`\\d+\\-\\d+\\-\\d+`, "g"),
    dateOutPattern: new RegExp(`fecha de salida \\d+\\-\\d+\\-\\d+`),
    ratePerNight: 0,
  },
  couponNok: {
    primaryIdentificator: "noktos",
    confirmationIdPattern: new RegExp(`\d{8}`),
    totalPattern: new RegExp(""),
    provider: NOKTS_PROVIDER,
    guestName: new RegExp(`\$\\d+\,\\d+\.\\d+`),
    hotelName: "city(.*)express(.*)ciudad(.*)juarez",
    roomType: "",
    dateInPattern: new RegExp(`\\d+-( .*)-\\d+`),
    dateOutPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
    ratePerNight: 0,
  },
  // couponGBT: {
  //   primaryIdentificator: "gbt travel services mexico",
  //   confirmationIdPatrtern: new RegExp(`clave de conﬁrmación(.*)\d+`),
  //   totalPattern: new RegExp(`\$\\d+\,\\d+\.\\d+`),
  //   provider: GBT_PROVIDER,
  //   guestName: new RegExp("nombre del huésped(.*?)hotel city express"),
  //   roomType: "",
  //   dateInPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  //   dateOutPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  //   ratePerNight: 0,
  // },
  // couponCTS: {
  //   primaryIdentificator: "corporate travel services worldwide",
  //   confirmationIdPattern: new RegExp(`clave de conﬁrmación(.*)\d+`),
  //   totalPattern: new RegExp(`\$\\d+\,\\d+\.\\d+`),

  //   provider: CTS_PROVIDER,
  //   guestName: new RegExp("nombre del huésped(.*?)hotel city express"),

  //   roomType: "",
  //   dateInPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  //   dateOutPattern: new RegExp(`\\$\\d+\\,\\d+\\.\\d+`),
  //   ratePerNight: 0,
  //   placeDirection: "",
  // },
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

// printer guides
export const reportsByUser = {
  accountant: [
    "rpt_Early_Bird",
    "rpt_daybalance",
    "rpt_AccountCxC",
    "rpt_dailytransactions2",
    "rpt_guestbalance",
    "rpt_todaychin",
    "rpt_Cajeros_Resum",
    "rpt_cajeros",
    "rpt_cajeroindividual",
    "rpt_cajeros_smart",
    "rpt_depbalance",
    "rpt_deptransferidos",
    "rpt_nad_balance",
    "rpt_CancelAdjust",
    "rpt_RSRV_CXLD",
    "rpt_FoliosVirtuales",
  ],
  manager: [
    "rpt_Early_Bird",
    "rpt_todaychin",
    "rpt_guestbalance",
    "rpt_nad_balance",
    "rpt_CancelAdjust",
  ],
  salesManager: ["rpt_Early_Bird", "rpt_todaychin", "rpt_CancelAdjust"],
  extras: ["rpt_guestbalance"],
};
