// reservation search filters
export const DEPARTURES_FILTER = "departures";
export const IN_HOUSE_FILTER = "in-house";

// invoice status
// it is on spanish because the API's language is spanish
export const INVOICED = "Timbrado";
export const PRE_INVOICED = "PreFactura";

// Virtual card providers
export const EXPEDIA = "EXPEDIA";
export const BOOKING = "BOOKING";

// Reservation payment status
export const FULLY_PAID = "FULLY PAID";
export const PRE_PAID = "PRE PAID";
export const PARTIAL_PAID = "PARTIAL PAID";
export const MIXED_PAYS = "MIXED PAYS";
export const PENDING = "PENDING PAYMENT";
export const PAYMENT_ERROR = "PAYMENT ERROR";
export const ROUTED = "ROUTED";
export const ROUTER = "ROUTER";
export const COUPON_NOT_PASS = "COUPON NOT PASS";

// PrePaid Methods names
export const DOCUMENTS = "DOCUMENTS";
export const COUPONS = "COUPONS";
export const VIRTUAL_CARD = "VIRTUAL CARD";
export const CERTIFICATE = "CERTIFICATE";
export const DOCS = "DOCS";

// Coupon classifier
export const UNSUPPORTED = "UNSUPPORTED";
export const COUPON = "COUPON";
export const UNKNOWN = "UNKNOWN";

// Coupon providers
export const ACCESS = "CUPÓN ACCESS";
export const GTB = "GTB TRAVEL SERVICES MEXICO";
export const CTS = "CORPORATE TRAVEL SERVICES WORLDWIDE";

//  Principal-Menu skeleton
export const HOME_MENU_OPERATION_NAMES = [
  "Login",
  "Invoicer",
  "Apply pre-paid methods",
  "Print docs",
  "Check PIT",
  "Check all virtual cards",
  "Utils",
  "Settings",
  " Exit ",
];

// Utils-Menu Skeleton
export const UTILS_MENU_OPERATION_NAMES = [
  "Create routing",
  "Create routing to Virtual Folio",
  "Get reservation details",
  " Return ",
];

// Virtual Card Providers
export const VIRTUAL_CARD_PROVIDERS = ["Expedia", "Booking"];

// This should help to skip coupons that contains
export const BANNED_COUPON_CONTENTS = ["hoteles gs definicion"];

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
