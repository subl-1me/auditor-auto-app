// reservation search filters
export const DEPARTURES_FILTER = "departures";
export const IN_HOUSE_FILTER = "in-house";

// invoice status
// it is on spanish because the API's language is spanish
export const INVOICED = "Timbrado";
export const PRE_INVOICED = "PreFactura";

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
