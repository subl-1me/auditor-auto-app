const MockData = {
  sheets: [
    { sheetNo: 1, isOpen: false, balance: { isCredit: false, amount: 0 } },
    { sheetNo: 2, isOpen: true, balance: { isCredit: false, amount: 0 } },
  ],
  contactEmailFields: `<input class="form-control CajaText txtNRequired" id="txtPers_mail" name="txtPers_mail" placeholer="@F2goPMS.Recursos.Traducciones.mail" type="text" value="HDSJSN@GDJ.COM" readonly="readOnly"> 
  <input class="form-control CajaText" id="txtMail" name="txtMail" placeholer="@F2goPMS.Recursos.Traducciones.mail" type="text" value="bevanides@outlook.com">`,
  reservations: [
    {
      id: "20542321",
      guestName: "mock user 123",
      room: 123,
      dateIn: "2023/10/26",
      dateOut: "2023/10/26",
      status: "CHIN",
      company: "",
      agency: "",
    },
    {
      id: "20542322",
      guestName: "mock user 124",
      room: 124,
      dateIn: "2023/10/26",
      dateOut: "2023/10/26",
      status: "CHIN",
      company: "",
      agency: "",
    },
    {
      id: "20542323",
      guestName: "mock user 125",
      room: 125,
      dateIn: "2023/10/26",
      dateOut: "2023/10/26",
      status: "CHIN",
      company: "",
      agency: "",
    },
    {
      id: "20542324",
      guestName: "mock user 126",
      room: 126,
      dateIn: "2023/10/26",
      dateOut: "2023/10/26",
      status: "CHIN",
      company: "",
      agency: "",
    },
  ],
  routings: [
    {
      reservationId: "20542321",
      parent: "20542324",
    },
    {
      reservationId: "20542322",
      parent: "20542324",
    },
    {
      reservationId: "20542324",
      childs: ["20542321", "20542321", "20542321"],
    },
    {
      reservationId: "20542323",
      parent: "20542324",
    },
  ],
};

export default MockData;
