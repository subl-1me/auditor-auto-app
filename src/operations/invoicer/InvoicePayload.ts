export default interface InvoicePayload {
  username: string;
  propCode: string;
  folioCode: string;
  guestCode: string;
  receptorId: string;
  tipoDetalle: string;
  currency: string;
  notas: string;
  docType: string;
  receptorNameModified: string;
  receptorCP_Modified: string;
  historico: boolean;
  impuestopais: string;
}