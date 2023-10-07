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
