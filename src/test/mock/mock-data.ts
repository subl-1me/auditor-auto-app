const MockData = {
  sheetsDataGrid: `

  <!DOCTYPE html>
  <html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>
  
  </title><meta http-equiv="X-UA-COMPATIBLE" content="IE=10" /><link rel="stylesheet" type="text/css" href="/WHS-PMS/bundles/folios2css" />
          <script type="text/javascript" src="/WHS-PMS/bundles/masterjs"></script>
          <link rel="stylesheet" type="text/css" href="/WHS-PMS/bundles/folioscss" />
          <script type="text/javascript" src="/WHS-PMS/bundles/foliosjs"></script>
  
          <style type="text/css">
                  .FolioItem {
                          HEIGHT: 30px;
                          BORDER-TOP: #DEDADA 5px solid;
                          width: 45px;
                          cursor: pointer;
                          font-family: 'Century Gothic';
                          text-align: center;
                          font-size: 15px;
                          color: #868686;
                  }
  
                  .FolioItem:hover {
                          BORDER-TOP: #006699 5px solid;
                          font-size: 20px;
                          color: black;
                  }
  
                  .FolioActive {
                          HEIGHT: 30px;
                          width: 45px;
                          cursor: pointer;
                          font-family: 'Century Gothic';
                          text-align: center;
                          BORDER-TOP: green 5px solid;
                          font-size: 20px;
                          color: black;
                  }
  
                  .FolioClosed {
                          HEIGHT: 30px;
                          width: 45px;
                          cursor: pointer;
                          font-family: 'Century Gothic';
                          BORDER-TOP: #A00000 5px solid;
                          text-align: center;
                          font-size: 15px;
                          color: #868686;
                  }
  
                  .FolioClosed:hover {
                          BORDER-TOP: #A00000 5px solid;
                          font-size: 20px;
                          color: black;
                  }
  
                  .FolioClosedActive {
                          HEIGHT: 30px;
                          width: 45px;
                          cursor: pointer;
                          font-family: 'Century Gothic';
                          text-align: center;
                          BORDER-TOP: #A00000 5px solid;
                          font-size: 20px;
                          color: black;
                  }
  
                  a {
                          color: #2E2E2E;
                          font-size: 12px;
                          background-color: none;
                  }
  
                  a:active {
                          background-color: none;
                  }
  
                  a::selection {
                          background-color: none;
                  }
  
                  .GridRowAlt {
                          color: #434141;
                          font-weight: normal;
                  }
  
                  .GridRow {
                          background: #EAF8FF;
                          color: #434141;
                          font-weight: normal;
                  }
  
                  .GridFooter {
                          font-size: 16px;
                          background: #EAF8FF;
                          border-bottom: 1px solid #006699 !important;
                          border-top: 1px solid #006699 !important;
                          -webkit-border-radius: 3px;
                          -moz-border-radius: 3px;
                          border-radius: 3px;
                          background: #EAF8FF;
                          font-weight: bold;
                  }
  
                  .datagrid table {
                          text-align: left;
                          width: 100%;
                  }
  
                  .simpleTable table {
                          width: 100% !important;
                          padding: 0 !important;
                          border: none !important;
                          margin: 0 !important;
                  }
  
                  .WhiteText {
                          color: white;
                          font-family: 'Century Gothic';
                          font-size: 12px;
                  }
  
                  img {
                          border-style: none;
                          border-color: inherit;
                          border-width: medium;
                          padding-top: 2px;
                  }
  
                  .redColor {
                          color: Red;
                  }
  
                  
  #testdiv {width:600px; margin:25px auto; border:1px solid #ccc; padding:20px 25px 12px; background:#fff}
  
  
  .tbox {position:absolute; display:none; padding:14px 17px; z-index:900000;}
  .tinner {padding:15px; -moz-border-radius:10px; border-radius:10px; background:#fff url(/WHS-PMS/Img/Ppreload.gif) no-repeat 50% 50%; border-right:1px solid #333; border-bottom:1px solid #333}
  .tmask {position:absolute; display:none; top:0px; left:0px; height:100%; width:100%; background:#000; z-index:800000;}
  .tclose {position:absolute; top:0px; right:0px; width:30px; height:30px; cursor:pointer; background:url(/WHS-PMS/Img/Pclose.png) no-repeat}
  .tclose:hover {background-position:0 -30px}
  
  #error {background:#ff6969; color:#fff; text-shadow:1px 1px #cf5454; border-right:1px solid #000; border-bottom:1px solid #000; padding:0}
  #error .tcontent {padding:10px 14px 11px; border:1px solid #ffb8b8; -moz-border-radius:10px; border-radius:10px}
  #success {background:#2ea125; color:#fff; text-shadow:1px 1px #1b6116; border-right:1px solid #000; border-bottom:1px solid #000; padding:10; -moz-border-radius:0; border-radius:0}
  #bluemask {background:#4195aa}
  #frameless {padding:0}
  #frameless .tclose {left:6px}
  
  
  
          </style>
  
          <script type="text/javascript">
                  var MouseX = 0;
                  var MouseY = 0;
                  var fjsNAV = navigator.appName;
  
                  $(document).ready(function () {
                          fjsSelectFolio(document.getElementById("hdnSelectedFolio").value);
                          var jsWarning = document.getElementById("hdnSystemAlert").value;
                          var tdFolios = document.getElementById("tdFoliosContent")
  
                          if (jsWarning != "")
                                  alert(jsWarning);
                          tdFolios.style.visibility = 'visible';
  
                          $('#carouselF').elastislide({
                                  imageW: 50
                          });
  
                  });
  
                  function fjsSelectFolio(pFolio) {
                          var guest = document.getElementById("hdnGuest_code").value;
                          document.getElementById("hdnSelectedFolio").value = pFolio;
  
                          $('.datagrid').hide();
  
                          $('#tab' + pFolio).fadeIn('slow');
                          $('#tab' + pFolio).show();
  
                          $('.FolioItem').removeClass('FolioActive');
                          $('.FolioClosed').removeClass('FolioClosedActive');
  
                          if ($('#td_' + pFolio).hasClass('FolioClosed'))
                                  $('#td_' + pFolio).addClass('FolioClosedActive');
                          else
                                  $('#td_' + pFolio).addClass('FolioActive');
                  }
  
                  //Obtiene las Cooordenadas del Mouse
                  function coordenadas(e) {
                          MouseX = 0;
                          MouseY = 0;
  
                          MouseX = e.pageX
                          MouseY = e.pageY
                  };
  
                  function fjsMessege(data) {
                          switch (data) {
                                  case "folio_facturado":
                                          alert(aFoliosMsges[10]);
                                          break;
                                  case "balance_not_cero":
                                          alert(aFoliosMsges[11]);
                                          break;
                                  case "no_folio_status":
                                          alert(aFoliosMsges[12]);
                                          break;
                                  case "successful":
                                          alert(aFoliosMsges[13]);
                                          break;
                                  case "not_successful":
                                          alert(aFoliosMsges[14]);
                                          break;
                                  case "no_data_found_folio":
                                          alert(aFoliosMsges[15]);
                                          break;
                                  case "process_night_audit":
                                          alert(aFoliosMsges[16]);
                                          break;
                                  case "last_folio_must_not_closed":
                                          alert(aFoliosMsges[17]);
                                          break;
                                  case "Invalid_Amount_FAO":
                                          alert(aFoliosMsges[29]);
                                          break;
                                  default:
                                          alert(data);
                          }
                  }
  
                  function fjsPost(folio, status) {
                          var sPage = '';
                          var jsSHOW_CREDIT_WARNING = '';
                          var guest = '';
  
                          try {
                                  if (status == 'CLOSED') { alert(aFoliosMsges[9]); return; }
  
                                  jsSHOW_CREDIT_WARNING = document.getElementById("hdnSHOW_CREDIT_WARNING").value;
                                  guest = document.getElementById("hdnGuest_code").value;
                                  sPage = '/WHS-PMS/Transacciones/NewPosting.aspx?guestId=' + guest + "&folio=" + folio;
  
                                  if (jsSHOW_CREDIT_WARNING == "1") {
                                          //guest_credit_isnot_approved_sure_to_continue
                                          if (confirm(aFoliosMsges[25])) {
                                                  try {
                                                          TINY.box.show({ iframe: sPage, width: 600, height: 460, close: true, fixed: false, maskopacity: 40 });
                                                  }
                                                  catch (err) { }
                                          }
                                  } else {
                                          TINY.box.show({ iframe: sPage, width: 600, height: 460, close: true, fixed: false, maskopacity: 40 });
                                  }
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsPost.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsPrintRepot(folio, moneda, doc_type,rep_type) {
                          var url = '/WHS-PMS/Reportes/FolioForm.aspx' + "?pFolio=" + folio + "&mon=" + moneda + "&doct=" + doc_type + "&tiket=" + rep_type;
                          //window.open(url);
                          window.open(url, "Reporte", '');
                          TINY.box.hide();
                  }
  
                  function fjsPrint(folio, guest_x4) {
                          // si es prepago y es el folio 1, no se imprime (teampulse 5763)
                          if ((guest_x4 == "prepaid") && (folio.substring(folio.indexOf("."), folio.length) == ".1")) {
                                  // mostrar popup
                                  alert(aFoliosMsges[22]);
                                  return;
                          } else {
                                  var sPage = '';
                                  sPage = '/WHS-PMS/Transacciones/TypeMoneda.aspx?folio=' + folio;
                                  TINY.box.show({ iframe: sPage, width: 300, height: 150, close: true, fixed: false, maskopacity: 40 })
                          }
                  }
  
                  function fjsApply(folio, status) {
                          var sPage = '';
                          var rsrv = '';
                          var jsProp_Code = '';
                          try {
                                  if (status == 'CLOSED') { alert(aFoliosMsges[9]); return; }
  
                                  rsrv = document.getElementById("hdnGuest_code").value;
                                  jsProp_Code = document.getElementById("hdnDataBase").value;
  
                                  sPage = "/WHS-PMS/Transacciones/NewPayment.aspx?folio=" + folio + "&guest=" + rsrv + "&prop=" + jsProp_Code;
                                  TINY.box.show({ iframe: sPage, width: 640, height: 550, close: true, fixed: false, maskopacity: 40 })
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsApply\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsChangeStatus(folio, status) {
                          //Para Obligarlos a usar chrome o firefox en esta parte
                          //if (fjsNAV == "Microsoft Internet Explorer") {
                          //    alert(aFoliosMsges[21]);
                          //    return;
                          //}
                          var jsPerm = document.getElementById("hdnPerm_ChangeStat").value;
                          var jsPermOpenClosed = document.getElementById("hdnPerm_OpenClosed").value;
                          var jsGuestX9 = document.getElementById("hdnGuestX9").value;
                          var guest = document.getElementById("hdnGuest_code").value;
                          
                          if (jsGuestX9 == "GUESTFACT" && folio == (guest + ".2") && status != "PEND") {
                                  alert(aFoliosMsges[28]);
                                  return;
                          }
  
                          if (jsPerm == "true") {
                                  if (status == "CLOSED" && jsPermOpenClosed != "true") {
                                          alert(aFoliosMsges[18]);
                                          return;
                                  }
  
                                  var database = document.getElementById("hdnDataBase").value;
                                  var user = document.getElementById("hdnUserName").value;
                                  var sParams = '';
  
                                  sParams = 'db=' + database + '&fl=' + folio + '&gt=' + guest + '&usr=' + user;
  
                                  $.ajax({
                                          method: "GET",
                                          url: "/whsengine/api/FolioStatusCh?" + sParams + "&callback=?",
                                          dataType: "json"
                                  })
                            .done(function (data) {
                                    if (data == 'successful') {
                                            fjsReloadPage();
                                    }
                                    else {
                                            fjsMessege(data);
                                    }
                            })
                            .fail(function () {
                                    fjsMessege(data);
                            });
                                  
                          }
                          else
                                  alert(aFoliosMsges[18]);
                  }
  
                  /*****************************************************************************************
                  'Nombre     -->	fjsGetSelectedPosts
  
                  'Descripcion-->	Obtiene los posteos seleccionados desde el checkbox y los guarda en un escondido concatenados por ","
                  'Parametros -->	folio:			    Número de folio seleccionado desde el renglón de agrupación (cadena)
                  bValidateTransType:	Bandera que determina si es necesario validar que los posteos sean del mismo tipo (boleano)
                  sSpecificType:      Si deben ser de un tipo específico, se envía en este parámetro en caso contrario puede ser vacío ""
                  'Regresa    --> True o False
                  'Ejemplo    --> fjsGetSelectedPosts('302052830.1', true, 'C');
                  ******************************************************************************************/
                  function fjsGetSelectedPosts(folio, bValidateTransType, sSpecificType, bValidateTrans, bValidateTax) {
                          var pChecked = null;
                          var pChkData = null;
                          var pValidaChk = null;
                          var sData = ''; //Cadena donde se guardarán los posteos seleccionados
                          var aux_value = null;
                          var trans_type = '';
                          var isDifferentType = false;
                          var isNotSpecificType = false;
                          var sWarning = '';
                          var bResult = false;
                          var aux_folio = folio.split(".");
                          var bIsTax = false; //Determina sí el tipo de transacción es IMPUESTO
                          var bIsTransfered = false; //Determina sí se trata de un posteo previamente transferido, es decir el valor en negativo generado en el folio origen.
                          var bAjuste = false;
                          var bIsDifferentPKG = false;
                          document.getElementById("hdnSelectedType").value = "";
                          document.getElementById("hdnIsPkg").value = "";
  
                          // Obtiene la cantidad de elementos (posteos) seleccionados para el folio correspondiente
                          // [incluso cuando estén "checkeados" los de otros folios]
                          var input = $("input[name=chkPost" + aux_folio[1] + "]:checked");
                          if (input.length > 0) {
                                  if (input.length > 1) {
                                          input.each(function () {
                                                  aux_value = $(this).val().split("_");
                                                  sData += aux_value[0] + ",";
                                                  //En algunos casos se requiere que los posteos sean de un solo tipo
                                                  //Si la bandera viene encendida se hace la validación
                                                  if (bValidateTransType) {
                                                          //Todos deben corresponder al mismo tipo de transacción ya sea CARGO, ABONO, ETC...
                                                          if (document.getElementById("hdnSelectedType").value == "") {
                                                                  document.getElementById("hdnSelectedType").value = aux_value[1];
                                                          }
                                                          else {
                                                                  if (document.getElementById("hdnSelectedType").value != aux_value[1])
                                                                          isDifferentType = true;
                                                          }
                                                  }
  
                                                  if (aux_value[3] == "1")
                                                          bIsTax = true;
  
                                                  if (aux_value[4] == "1" && aux_value[5] == "1")
                                                          bIsTransfered = true;
  
                                                  if (bValidateTrans)
                                                          if (aux_value[2] == "1")
                                                                  bAjuste = true;
  
                                                  if (isDifferentType) {
                                                          return false;
                                                  }
  
                                                  //Todos deben corresponder al mismo tipo de transacción ya sea PAQUETE ó NORMAL.
                                                  if (document.getElementById("hdnIsPkg").value == "") {
                                                          document.getElementById("hdnIsPkg").value = aux_value[6];
                                                  }
                                                  else {
                                                          if (document.getElementById("hdnIsPkg").value != aux_value[6])
                                                                  bIsDifferentPKG = true;
                                                  }
                                          });
                                  }
                                  else {
                                          input.each(function () {
                                                  aux_value = $(this).val().split("_");
                                                  sData = aux_value[0];
                                                  document.getElementById("hdnIsPkg").value = aux_value[6];
                                                  document.getElementById("hdnSelectedType").value = aux_value[1];
  
                                                  if (sSpecificType != "") {
                                                          if (aux_value[1] != sSpecificType) {
                                                                  isDifferentType = true;
                                                                  isNotSpecificType = true;
                                                          }
                                                  }
  
                                                  if (bValidateTrans) {
                                                          if (aux_value[2] == "1")
                                                                  bAjuste = true;
                                                  }
                                          });
                                  }
  
                                  if (isDifferentType) {
                                          alert(aFoliosMsges[1]);
                                          return false;
                                  }
  
                                  if (bAjuste) {
                                          alert(aFoliosMsges[8]);
                                          return false;
                                  }
  
                                  //Sí el parámetro = true, NO PODRÁN SELECCIONAR LOS POSTEOS DE TIPO IMPUESTO
                                  if (bValidateTax) {
                                          if (bIsTransfered) {
                                                  alert(aFoliosMsges[8]);
                                                  return false;
                                          }
  
                                          if (bIsTax) {
                                                  alert(aFoliosMsges[2]);
                                                  return false;
                                          }
                                  }
  
                                  if (sData.length > 0) {
                                          if (sData.substring(sData.length, sData.length - 1) == ',') {
                                                  sData = sData.substring(0, sData.length - 1);
                                          }
                                          //Finalmente se asignan los valores al escondido
                                          document.getElementById("hdnSelectedPosts").value = sData;
                                  }
                                  else {
                                          alert(aFoliosMsges[0]);
                                          return false;
                                  }
  
                                  if (bIsDifferentPKG) {
                                          alert(aFoliosMsges[20]);
                                          return false;
                                  }
  
                                  return true;
                          }
                          else {
                                  alert(aFoliosMsges[3]);
                                  return false;
                          }
                  }
  
                  function fjsAdjust(folio, status) {
                          //Para Obligarlos a usar chrome o firefox en esta parte
                          //if (fjsNAV == "Microsoft Internet Explorer") {
                          //    alert(aFoliosMsges[21]);
                          //    return;
                          //}
  
                          if (status == 'CLOSED') { alert(aFoliosMsges[9]); return; }
                          if (fjsGetSelectedPosts(folio, true, "", false, true)) {
                                  var jsIsPKG = document.getElementById("hdnIsPkg").value;
                                  var sElements = document.getElementById("hdnSelectedPosts").value;
                                  if (sElements != "") {
                                          var trans_type = document.getElementById("hdnSelectedType").value;
                                          var guest = document.getElementById("hdnGuest_code").value;
  
                                          if (jsIsPKG == "1")
                                                  url = '/WHS-PMS/Transacciones/CancelPostingPkg.aspx?guestId=' + guest + "&folio=" + folio + '&post=' + sElements;
                                          else {
                                                  if (trans_type == 'C') {
                                                          url = '/WHS-PMS/Transacciones/AdjCancelPosting.aspx?guestId=' + guest + "&folio=" + folio + '&post=' + sElements;
                                                  }
                                          }
  
                                          TINY.box.show({
                                                  iframe: url, width: 640, height: 450, close: true, fixed: false, maskopacity: 40, closejs: function () {
                                                          if (document.getElementById("hdnCloseUpdate").value == "1") { fjsCloseAndReload(); }
                                                  }
                                          });
                                  }
                          }
                  }
  
                  function fjsTransfer(folio, status) {
                          //Para Obligarlos a usar chrome o firefox en esta parte
                          //if (fjsNAV == "Microsoft Internet Explorer") {
                          //    alert(aFoliosMsges[21]);
                          //    return;
                          //}
  
                          if (status == 'CLOSED') { alert(aFoliosMsges[9]); return; }
  
                          if (fjsGetSelectedPosts(folio, true, "", true, true)) {
                                  var jsIsPKG = document.getElementById("hdnIsPkg").value;
                                  var sElements = document.getElementById("hdnSelectedPosts").value;
  
                                  if (sElements != "") {
                                          var sPage = '';
                                          var guest = document.getElementById("hdnGuest_code").value;
  
                                          if (jsIsPKG == "1")
                                                  sPage = '/WHS-PMS/Transacciones/PostTransferPkg.aspx?guestId=' + guest + "&folio=" + folio + "&posts=" + sElements;
                                          else {
  
                                                  if (document.getElementById("hdnSelectedType").value == 'C') {
                                                          sPage = '/WHS-PMS/Transacciones/PostTransfer.aspx?guestId=' + guest + "&folio=" + folio + "&posts=" + sElements;
                                                  } else {
                                                          sPage = '/WHS-PMS/Transacciones/PaymentTransfer.aspx?guestId=' + guest + "&folio=" + folio + "&posts=" + sElements;
                                                  }
                                          }
  
                                          TINY.box.show({ iframe: sPage, width: 680, height: 530, close: true, fixed: false, maskopacity: 40 });
                                  }
                          }
                  }
  
                  function uploadImg(guestCode, folioCode, postID) {
                          var vjsLink = '';
                          vjsLink = "/WHS-PMS/Reserva/p_UploadImgPosting.aspx?guestCode=" + guestCode + "&folio_code=" + folioCode + "&postID=" + postID;
  
                          TINY.box.show({ iframe: vjsLink, width: 700, height: 330, close: true, fixed: false, maskopacity: 40 });
                  }
  
                  function fjsViewInfo(pContent, pUnits, pMargin) {
                          //La variable IE determina si estamos utilizando IE
                          document.getElementById('flDiv').innerHTML = "";
                          document.getElementById('flDiv').style.display = 'none';
  
                          var IE = document.all ? true : false;
  
                          var tempX = 0;
                          var tempY = 0;
  
                          if (IE) { //para IE
                                  //event.y|event.clientY = devuelve la posicion en relacion a la parte superior visible del navegador
                                  //event.screenY = devuelve la posicion del cursor en relaciona la parte superior de la pantalla
                                  //event.offsetY = devuelve la posicion del mouse en relacion a la posicion superior de la caja donde se ha pulsado
                                  tempX = MouseX;  //event.x
                                  tempY = MouseY;  //event.y
                                  if (window.pageYOffset) {
                                          tempY = (tempY + window.pageYOffset);
                                          tempX = (tempX + window.pageXOffset);
                                  } else {
                                          tempY = (tempY + Math.max(document.body.scrollTop, document.documentElement.scrollTop));
                                          tempX = (tempX + Math.max(document.body.scrollLeft, document.documentElement.scrollLeft));
                                  }
                          } else { //para netscape
                                  //window.pageYOffset = devuelve el tamaño en pixels de la parte superior no visible (scroll) de la pagina
                                  //document.captureEvents(Event.MOUSEMOVE);
                                  tempX = MouseX; //Event.pageX;
                                  tempY = MouseY; // Event.pageY;
                                  tempX = (tempX - parseInt(pUnits))
                                  tempY = (tempY - 15)
                          }
  
                          //if (tempX < 0) { tempX = 0; }
                          //if (tempY < 0) { tempY = 0; }
                          document.getElementById('flDiv').innerHTML = pContent;
                          document.getElementById('flDiv').style.top = (tempY + parseInt(pMargin)) + "px";
                          document.getElementById('flDiv').style.left = (tempX + parseInt(pMargin)) + "px";
                          document.getElementById('flDiv').style.display = 'block';
                          return;
                  }
  
                  function fjsAddFolio() {
                          //Para Obligarlos a usar chrome o firefox en esta parte
                          //if (fjsNAV == "Microsoft Internet Explorer") {
                          //    alert(aFoliosMsges[21]);
                          //    return;
                          //} 
  
                          var pGuest_Code = document.getElementById("hdnGuest_code").value;
                          Reserva_GuestFolios.AddNewFolio(pGuest_Code, fjsAddFolio_CallBack);
                  }
  
                  function fjsAddFolio_CallBack(response) {
                          if (response.error != null) {
                                  alert(response.error.Message);
                                  return;
                          }
  
                          if (response.value == "FAIL") {
                                  alert(aFoliosMsges[19]);
                          }
                          else {
                                  document.getElementById("hdnSelectedFolio").value = response.value;
                                  fjsReloadPage();
                          }
                  }
  
                  function fjsReportVaucher(TicketPar) {
                          sPage = "/WHS-PMS/Reportes/all_vouchers_smart.aspx?" + TicketPar;
                          //window.location.href = sPage;
  
                          // definimos la anchura y altura de la ventana
                          var altura = 380;
                          var anchura = 630;
  
                          // calculamos la posicion x e y para centrar la ventana
                          var y = parseInt((window.screen.height / 2) - (altura / 2));
                          var x = parseInt((window.screen.width / 2) - (anchura / 2));
  
                          // mostramos la ventana centrada
                          window.open(sPage, 'Pinpad', 'width=' + anchura + ',height=' + altura + ',top=' + y + ',left=' + x + ',toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,directories=no,resizable=yes')
                  }
  
                  function fjsCloseAndReload() {
                          try { TINY.box.hide(); }
                          catch (err) { }
                          fjsReloadPage();
                  }
  
                  function fjsReloadPage() {
                      try {
                          var pSelectedFolio = document.getElementById("hdnSelectedFolio").value;
  
                          if (document.getElementById("hdnModvCore").value != "true") {
                              parent.fjsLoadFoliosPage('Reserva/LoadFolios.aspx', '6', pSelectedFolio);
                          } else {
                              parent.document.getElementById("hdnLoadFolio").value = pSelectedFolio;
                              parent.LoadPage('SI', '6');
                          }
                      }
                      catch (err) { }
                  }
  
                  function fjsLedgerGuest() {
                          var GuestID = document.getElementById("hdnGuest_code").value;
                          var sPage = "/WHS-PMS/Reserva/ViewerRptLedgerGuest.aspx?guestcode=" + GuestID + "&Hledger=";
                          TINY.box.show({ iframe: sPage, width: 800, height: 400, close: true, fixed: false, maskopacity: 40 });
                  }
  
                  function fjsTransacSmartGuest() {
                          var GuestID = document.getElementById("hdnGuest_code").value;
                          var sPage = "/WHS-PMS/Reserva/ViewerRptTransacSmart.aspx?guestcode=" + GuestID + "&Hledger=";
                          var ifrm = parent.document.getElementById("inlineFrameExample");
  
                          if (typeof (ifrm) != "undefined" && ifrm != null) {
                                  var ww = ifrm.scrollWidth - 96;
                                  var hh = Math.min(ifrm.scrollHeight - 96, 600);
                                  TINY.box.show({ iframe: sPage, width: ww, height: hh, close: true, maskopacity: 40, top: 1 });
                          }
                          else {
                                  TINY.box.show({ iframe: sPage, width: 1500, height: 600, close: true, maskopacity: 40 });
                          }
                  }
  
                  function fjsShowFixPost() {
                          //Para Obligarlos a usar chrome o firefox en esta parte
                          //if (fjsNAV == "Microsoft Internet Explorer") {
                          //    alert(aFoliosMsges[21]);
                          //    return;
                          //}
                          var pSelectedFolio = document.getElementById("hdnSelectedFolio").value;
                          parent.fjsLoadCustomPage("/WHS-PMS/Reserva/RsrvFixPostList.aspx", "6", pSelectedFolio);
                  }
  
                  function fjsShowRouting() {
                          //Para Obligarlos a usar chrome o firefox en esta parte
                          //if (fjsNAV == "Microsoft Internet Explorer") {
                          //    alert(aFoliosMsges[21]);
                          //    return;
                          //}
                          var pSelectedFolio = document.getElementById("hdnSelectedFolio").value;
                          parent.fjsLoadCustomPage("/WHS-PMS/Reserva/RsrvRoutingList.aspx", "6", pSelectedFolio);
                  }
  
                  function fjsCancelPayment(folio, status) {
                          var sPage = '';
                          var rsrv = '';
                          var jsProp_Code = '';
                          try {
                                  if (status == 'CLOSED') { alert(aFoliosMsges[9]); return; }
  
                                  jsProp_Code = document.getElementById("hdnDataBase").value;
                                  rsrv = document.getElementById("hdnGuest_code").value;
  
                                  sPage = "/WHS-PMS/Transacciones/CancelPayment.aspx?folio=" + folio + "&guest=" + rsrv + "&prop=" + jsProp_Code;
                                  TINY.box.show({ iframe: sPage, width: 740, height: 450, close: true, fixed: false, maskopacity: 40 });
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsCancelPayment.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsShowPrePay() {
                          var sPage = '';
                          var jsGuest_Code = '';
                          var jsProp_Code = '';
                          var jsFolio_Code = '';
                          var jsNumFolio = '';
                          try {
                                  //TINY.box.hide();
  
                                  jsProp_Code = document.getElementById("hdnDataBase").value;
                                  jsGuest_Code = document.getElementById("hdnGuest_code").value;
                                  jsNumFolio = document.getElementById("hdnSelectedFolio").value;
                                  jsFolio_Code = jsGuest_Code + '.' + jsNumFolio
  
                                  sPage = "/WHS-PMS/Transacciones/ProcessPrePay.aspx?folio=" + jsFolio_Code + "&guest=" + jsGuest_Code + "&prop=" + jsProp_Code;
  
                                  TINY.box.show({ iframe: sPage, width: 900, height: 450, close: true, fixed: false, maskopacity: 40 });
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsShowPrePay.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsShowModal(pURL) {
                          TINY.box.show({ iframe: pURL, width: 300, height: 230, close: true, fixed: false, maskopacity: 40 });
                  }
  
                  function fjsShowSquirrel(pFolio, pStatus) {
                          var sPage = '';
                          var guest = '';
  
                          try {
                                  if (pStatus == 'CLOSED') { alert(aFoliosMsges[9]); return; }
                                  guest = document.getElementById("hdnGuest_code").value;
                                  sPage = '/WHS-PMS/Transacciones/ShowSquirrel.aspx?guestId=' + guest + "&folio=" + pFolio;
                                  TINY.box.show({ iframe: sPage, width: 800, height: 450, close: true, fixed: false, maskopacity: 40 });
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsShowSquirrel.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsProcessAntInvoice(pFolio, pGuestCode) {
                          var jsSessionKey = '';
                          var jsGuestCode = '';
                          var jsProp_Code = '';
                          var jsUserName = '';
                          try {
                                  if (confirm(aFoliosMsges[27])) {
                                          $.blockUI({
                                                  message: blockHTML,
                                                  css: {
                                                          background: "transparent",
                                                          border: 0,
                                                          position: "fixed"
                                                  }
                                          });
  
                                          jsSessionKey = document.getElementById("hdnSessionKeyCHIN_BEDA").value;
                                          jsGuestCode = pGuestCode;
                                          jsProp_Code = document.getElementById("hdnDataBase").value;
                                          jsUserName = document.getElementById("hdnUserName").value;
  
                                          $.ajax({
                                                  type: "POST",
                                                  contentType: "application/json; charset=utf-8",
                                                  url: "/whsengine/WS_CheckInBEDA.asmx/ProcessCHIN_Invoice",
                                                  data: "{'session_key':'" + jsSessionKey + "','guest_code':'" + jsGuestCode + "','prop_code':'" + jsProp_Code + "','username':'" + jsUserName + "'}",
                                                  contentType: "application/json; charset=utf-8",
                                                  dataType: "json",
                                                  success: function (msg) {
                                                          $.unblockUI();
                                                          if (msg.d == "") {
                                                                  fjsReloadPage();;
                                                          } else {
                                                                  //Oculta el boton en caso que existiese algun error
                                                                  document.getElementById("aFacAnt").style.display = "none";
                                                                  
                                                                  if (msg.d.includes(':')) {
                                                                          var arrMessage = msg.d.split(':');
                                                                          if (arrMessage[0] == "error")
                                                                                  alert(aFoliosMsges[26] + ": " + arrMessage[1]);
                                                                          else
                                                                                  alert(msg.d);
                                                                  }
                                                                  else
                                                                          alert(msg.d);
                                                          }
                                                  },
                                                  error: function (XMLHttpRequest, textStatus, errorThrown) {
                                                          $.unblockUI();
                                                          alert(XMLHttpRequest);
                                                          alert(textStatus);
                                                          alert(errorThrown);
                                                          fjsReloadPage();
                                                  }
                                          }).fail(function (jqXHR, textStatus, errorThrown) { $.unblockUI(); alert('Uncaught Error: ' + jqXHR.responseText); });
  
                                  }
                          }
                          catch (err) {
                                  $.unblockUI();
                                  txt = "There was an error on this page. Function: fjsProcessAntInvoice\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsRemoveRSRV_ANTICIPOS() {
                          var jsRsrv_Code = '';
                          var jsGuest_Code = '';
                          try {
                                  //sure_to_remove_rsrv_from_CFDI_RSRV_ANTICIPOS
                                  if (confirm(aFoliosMsges[24])) {
                                          jsRsrv_Code = $("#lblCFRA_FolioDestinoValue").text();
                                          jsGuest_Code = document.getElementById("hdnGuest_code").value;
                                          Reserva_GuestFolios.RemoveRSRV_ANTICIPOS(jsGuest_Code, jsRsrv_Code, fjsRemoveRSRV_ANTICIPOS_CallBack);
                                  }
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsRemoveRSRV_ANTICIPOS.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsRemoveRSRV_ANTICIPOS_CallBack(response) {
                          try {
                                  if (response.error != null) {
                                          alert(response.error.Message);
                                          return false;
                                  }
  
                                  if (response.value == "") {
                                          alert(aFoliosMsges[23]); //CFDI_RSRV_ANTICIPOS_removed
                                          fjsReloadPage();
                                  }
                                  else {
                                          alert(response.value);
                                  }
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsRemoveRSRV_ANTICIPOS_CallBack.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
  
                  }
  
                  function fjsShowCertificate() {
                          var sPage = '';
                          var guest = '';
  
                          try {
                                  //if (pStatus == 'CLOSED') { alert(aFoliosMsges[9]); return; }
                                  guest = document.getElementById("hdnGuest_code").value;
                                  jsProp_Code = document.getElementById("hdnDataBase").value;
                                  sPage = '/WHS-PMS/Transacciones/sCertificate.aspx?guestId=' + guest + "&propcode=" + jsProp_Code;
                                  TINY.box.show({ iframe: sPage, width: 800, height: 300, close: true, fixed: false, maskopacity: 40 });
                          }
                          catch (err) {
                                  txt = "There was an error on this page. Function: fjsShowCertificate.\n\n";
                                  txt += "Error description: " + err.message + "\n\n";
                                  txt += "Click OK to continue.\n\n";
                                  alert(txt);
                          }
                  }
  
                  function fjsClosePopUp() {
                          TINY.box.hide();
                  }
  
                  function fjsCloseAndReloadTiny() {
                          try { TINY.box.hide(); }
                          catch (err) { }
                          fjsReloadPage();
                  }
  
                  function fjsClosePopUpTiny() {
                          try { TINY.box.hide(); }
                          catch (err) { }
                  }
  
                  function fjsUpdateReg() {
                          document.getElementById("hdnCloseUpdate").value = "1"
                  }
          </script>
  </head>
  <body>
          <form id="frmFoliosPortada" name="frmFoliosPortada" method="post" action="/whs-pms/PortadaRsrv.aspx"
                  target="_parent">
                  <input type="hidden" name="hdn_Rsrv" id="hdn_Rsrv" value="" />
                  <input type="hidden" name="hdn_PagePortada" id="hdn_PagePortada" value="" />
                  <input type="hidden" name="hdn_LoadFolio" id="hdn_LoadFolio" value="" />
          </form>
          <form method="post" action="/WHS-PMS/Reserva/GuestFolios.aspx" id="frmGuestFolios" onmousemove="coordenadas(event);">
  <div class="aspNetHidden">
  <input type="hidden" name="__EVENTTARGET" id="__EVENTTARGET" value="" />
  <input type="hidden" name="__EVENTARGUMENT" id="__EVENTARGUMENT" value="" />
  <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="GCDEqpdozUZn0W/IJVfW3tCguH48TqNMlzFeZlfagvhUGp9lO6dam0O0jlEQvQHab6KFDg/VLaIJ/a647Cvzj5VHCoKPrQM+sdFgP5PGFtNz1EJKItayqxYfZ7Fl/pb1p8MzR7WPreLWCJRRwVQgaPsOU6VkrSojlGs/UryDvtkcN9ViN5ZIb6mGiv3eFbYyKuYTEEUNt1/HUeQ2DKvSmzGQ9qYv3VNdeCHIQTxyXzRwVfnJYGJ+aJGXVVaFVOaywEKuZrmM0CZm3k2mjmD6Vj9HdSWo9NGFwJ0AAMyRWx2ytEl8wmY7loqXDt17GyZbp/rKe2eHsMpUVME7XdYRoJanYuSKELLUYhHPEBXZkdiqHzyuoQFpTJQjDJHn+ZGb0tKUkWQMsbKNLiils9BiKGlWno5nsWUaPFlTPowZ/4eK3r+tZRy3FTzXG6K34co787vbwXNlvGSWmIeSt3fAQJFG5vq10Ug+OV0gowkTXEh7Is8JjkvC3Zhw9HHPRF8e836jJc4qmF6te00GGQ/0SuYN1YLcr3Q+f9ZfFcwPnFK7/NoXaNcHU0JQORKLik/FQ1TUV2xIPfSpCGDSNXsv5QnsG0mJg4qjtWWiqtAHHsK8JXQI4ZQzRoe/tihTTvNV6lCJyHiyyPi1W4/WafrAZe0CzZ6pRoim09GOCRGYfg6jWcp1wxZwkqrrSzyyCupNYFhMXSHtHwDra3mSLvgPu27LdXa52Ur4lVFYJ2crNRd9pQb9RpF+C0apyzfrzw3p39H5O6IED6/YLNWBri6Jw/KTRZn9PTCeClke9+/FGcVGzfYOpoLNUciI03xf9U7yRcGE3qKj0DU5+gy1KT+shIGYY08RBhKZB3pkpAVo4R6VonNOZPkA4JqstDmeMD4WPDHiHbBK9qlo+UdUQ2UvepdNA/j8TGaOqsTbis6fKqU9QLIHC/MQwHB+yu/mVcmTb4+EEC0wDnXQBq1dMf6KqwomzrvV8gPqsRqveWWJJZzUz7Vu2kwQBZMQPVkpa6vJxYHTbR55TMuFz1Qn6HaFAcy0t/q2y34TJRMzjllFE9rKzgqItmXoUueXt55G6BDLPFHezIDLvn4qgOzRyOccCBLohLQFYKZY0ehiRwwJAJNukGVqYEHZe5B+/66aE1oqglbjkayodK+ZvaHrVL4bcL80HNDUl7GtdTt7mCwIrEhLJFYKjnv7bwkK1hQLbqvNUgYnztbkNbMjSeJitywsCP2Q2AXEmg4sOjhzP9p+pBrc5JP6iEo8MkRc3gkUMeGVC6TrIYqT9uJ0U8vksTGf0XKAXzAwWGnydwPsTGZObiACD8aSqxzJIHry1Y3Mq7uXRxdV6uFArAW4NLYN3h/3vwgqxKXwfWV/vqslm7kVF9/gS0fQBUJM8JSm8jn33rsqJ7brG7+HtOKYQMCsSlTGnOnb5I9g9zkVBanjsruXWazZUPCI8CaH5nRSm0PlH1axgZEeOpzZ2hBcwkA//QxCQvHofCsWK5qq94iBL0bjbDqRUMuboNigMXr3+9DEt5gN98gQsxgKGRGhS2BEswbn/Uab16khJvTGz+PZhsI4u/plJawoV0VGTT4WtcuNZb7GoRbME/AbFmPptlb0/uR2DvJx0AgA3jws8SBuATQTgLL5jgfOSXTackJGY/FbDro4CYC4w+PMPswiGW3YPsNicxDSeYZEFeQPOfUS6AvLmbHf1hZBeOQ+piv/cL7Qc0wbvzAqDd494hx/0GyOqAFli9zFL9nrUeN/NjwsBE7+Ov+DEt5ri+VQDPss7E1IOOIPfBxtm3lpNyNmsbX0mUHxNljj3JQENAoWHK2Zy3WFDoRmc4BQETxgsFvS/JliLnvKgoGP1fSlD1OlmPyj3cEfaqYBhyDt6/5dRdkGORQ6bEUpLe1cEezGBTzE5TplBPLN5HKfRUTlT3oT2xgh8alxUO0q4ogJqETwrxdEfdqEcZ5PH9bedzJgwWIH+X1tNh0cds0niu5q5QzRZk1x5NLtNNJEGHlfFajPEeLpZevgXdnl4lT0TcoaiCw4Lz+RQiPWyiWc8QmDfFXjf0n8VBCDWKyTOu0nypqWn2joUyWzZ/eJ0pPk24Cz7SQyt49FzGKENlO35WjfScAoNSdiKeAG6Lgw+5Te+eY2S5PmImf9uLYdiUTs/NAyH0tw+y/y7xDeynpMob2eLb7cXkOFx/M4rqKp4Z06Yi+7eo4GN6TLisBcYeFhnrZI3tEQcy/tX+ClP5tcGDu5QNcJUwbTe05r3o2N/Ahe6w1MFHNMFIE/FoJhexYWNRxcmhs/Aj5wvfit1GXzx9ZJ42aSaY762M4gOV1+iXg5+uqGekoGEJekX37ey2pR23I17gpLeav/13rdsTFO2zLSev4dTdgtUarK4Cjzx+ZRkK9wf9sZnqznmv9AsEkJOvk9VU7laQHeaqZVX98ya3JSssyRs2EZwKUijkGccUYPVHmgKwYQksurSbBlOtYOfnIdBSjEW7UJFowmygg01hyeGeTMqUuvCddMNPjaSUAD9Z7ZfYWsElA+QFY=" />
  </div>
  
  <script type="text/javascript">
  //<![CDATA[
  var theForm = document.forms['frmGuestFolios'];
  if (!theForm) {
      theForm = document.frmGuestFolios;
  }
  function __doPostBack(eventTarget, eventArgument) {
      if (!theForm.onsubmit || (theForm.onsubmit() != false)) {
          theForm.__EVENTTARGET.value = eventTarget;
          theForm.__EVENTARGUMENT.value = eventArgument;
          theForm.submit();
      }
  }
  //]]>
  </script>
  
  
  <script src="/WHS-PMS/WebResource.axd?d=pynGkmcFUV13He1Qd6_TZGw_WB2XYPPmvlAApsM88BsDA6OvGwjrZOKOKpOhpsjXp8pUFEqSoly9PGqwGgi9zw2&amp;t=638242633795219488" type="text/javascript"></script>
  
  
  <script type="text/javascript" src="/WHS-PMS/ajaxpro/prototype.ashx"></script>
  <script type="text/javascript" src="/WHS-PMS/ajaxpro/core.ashx"></script>
  <script type="text/javascript" src="/WHS-PMS/ajaxpro/converter.ashx"></script>
  <script type="text/javascript" src="/WHS-PMS/ajaxpro/Reserva_GuestFolios,WHSPMS.ashx"></script>
  
  <script src="/WHS-PMS/ScriptResource.axd?d=yeSNAJTOPtPimTGCAo3LlT6Mwxq1HySsU0_DnsCwVR0A-S5kNG0ORsYBsD6FZ8RDuzq1BZA3Dx-rmdhCdg__yRDwtfwFT2Yhip2kiCLkhZBceieC9PVx_vxO-FYqBWd00&amp;t=3a1336b1" type="text/javascript"></script>
  <script type="text/javascript">
  //<![CDATA[
  if (typeof(Sys) === 'undefined') throw new Error('ASP.NET Ajax client-side framework failed to load.');
  //]]>
  </script>
  
  <script src="/WHS-PMS/ScriptResource.axd?d=DT3YJR8QaqV61-teuz0hglmpSLxVa482_SRcM3kJbomgBvGWhXQGqJ2focAeMqvRLqd4g9vSJU4EPoY7n9NpqO2HDf2wDuY_MbLL_yB6AKDjiAaD_ou9SFiOQQZhqOQEIxjybrPje-suQAeOVxtWRA2&amp;t=3a1336b1" type="text/javascript"></script>
  <div class="aspNetHidden">
  
          <input type="hidden" name="__VIEWSTATEGENERATOR" id="__VIEWSTATEGENERATOR" value="6DF45B31" />
  </div>
                  <input type="hidden" name="hdnGuest_code" id="hdnGuest_code" value="20346968" />
                  <input type="hidden" name="hdnRsrvStatus" id="hdnRsrvStatus" value="CHIN" />
                  <input type="hidden" name="hdnSelectedFolio" id="hdnSelectedFolio" value="1" />
                  <input type="hidden" name="hdnSelTransType" id="hdnSelTransType" />
                  <input type="hidden" name="hdnSelectedPosts" id="hdnSelectedPosts" />
                  <input type="hidden" name="hdnSelectedType" id="hdnSelectedType" />
                  <input type="hidden" name="hdnUserName" id="hdnUserName" value="HTJUGALDEA" />
                  <input type="hidden" name="hdnDataBase" id="hdnDataBase" value="CECJS" />
                  <input type="hidden" name="hdnPerm_ChangeStat" id="hdnPerm_ChangeStat" value="true" />
                  <input type="hidden" name="hdnPerm_OpenClosed" id="hdnPerm_OpenClosed" value="true" />
                  <input type="hidden" name="hdnSystemAlert" id="hdnSystemAlert" value="Fecha de operacion diferente a fecha actual" />
                  <input type="hidden" name="hdnIsPkg" id="hdnIsPkg" />
                  <input type="hidden" name="hdnEsANTICIPO" id="hdnEsANTICIPO" />
                  <input type="hidden" name="hdnCloseUpdate" id="hdnCloseUpdate" />
                  <input type="hidden" name="hdnSHOW_CREDIT_WARNING" id="hdnSHOW_CREDIT_WARNING" value="0" />
                  <input type="hidden" name="hdnSessionKeyCHIN_BEDA" id="hdnSessionKeyCHIN_BEDA" value="121159-SSA" />
                  <input type="hidden" name="hdnGuestX9" id="hdnGuestX9" />
                  <input type="hidden" name="hdnModvCore" id="hdnModvCore" value="true" />
                  <script type="text/javascript">
  //<![CDATA[
  Sys.WebForms.PageRequestManager._initialize('ScriptManager1', 'frmGuestFolios', [], [], [], 90, '');
  //]]>
  </script>
  
                  <div align="center">
                          <table style="width: 90%">
                                  <tr>
                                          <td colspan="3" align="center" style="padding-bottom: 25px;">
                                                  <table width="100%">
                                                          <tr>
                                                                  <td align="center">
                                                                          <span id="lblGuesFoliosTitle" class="azulclarocss" style="font-size: x-large; text-transform: uppercase;">Folios Huesped</span>
                                                                  </td>
                                                          </tr>
                                                  </table>
                                          </td>
  
                                  </tr>
                                  
                                  <tr>
                                          <td align="left" valign="bottom" style="width: 50%">
                                                  <div id="carouselF" class="es-carousel-wrapper" style="width: 455px; left: 50%; margin-left: -55%;">
                                                          <div class="es-carousel" style="text-align: left;">
                                                                  
                                                                                  <ul>
                                                                          
                                                                                  <li class="FolioItem" id="td_1" onclick="javascript:fjsSelectFolio('1');">
                                                                                          1 
                                                                                  </li>
                                                                          
                                                                                  <li class="FolioItem" id="td_2" onclick="javascript:fjsSelectFolio('2');">
                                                                                          2 
                                                                                  </li>
                                                                          
                                                                                  <li class="FolioItem" onclick="javascript:fjsAddFolio()">
                                                                                          <img src="/WHSSettings/Img/add_folioD.png" title='Crear nuevo folio' onmouseover="src='/WHSSettings/Img/add_folio.png'; return true;"
                                                                                                  onmouseout="src='/WHSSettings/Img/add_folioD.png'; return true;" />
                                                                                  </li>
                                                                                  </ul>
                                                                          
                                                          </div>
                                                  </div>
                                          </td>
                                          <td id="addFolio" style="width: 10%" align="left" class="Invisible" onclick="javascript:fjsAddFolio()">
                                                  <img src="/WHSSettings/Img/add_folioD.png" title='' onmouseover="src='/WHSSettings/Img/add_folio.png'; return true;"
                                                          onmouseout="src='/WHSSettings/Img/add_folioD.png'; return true;" />
                                          </td>
  
                                          <td align="right" valign="middle" style="width: 40%">
                                                  <span id="lblGuestBalanceTitle" style="color:#006699;font-family:Century Gothic;font-size:15px;">Saldo Huesped: </span>&nbsp;
                                                  <span id="lblGuestBalance" style="color:#006699;font-family:Century Gothic;font-size:15px;font-weight:bold;">-$ 1,831.20</span>
                                          </td>
                                  </tr>
                                  <tr>
                                          <td colspan="3" id="tdFoliosContent" style="visibility: hidden">
                                                  
                                                                  <div class="datagrid" id='tab1'>
                                                                          <table style="width: 100%">
                                                                                  <thead>
                                                                                          <th colspan="5" valign="middle">
                                                                                                  <table class="simpleTable" border="0">
                                                                                                          <tr>
                                                                                                                  <td valign="middle" align="left" style="width: 180px">
                                                                                                                          <a class="WhiteText" style="font-size: 16px; font-family: 'Century Gothic'" href="javascript:fjsChangeStatus('20346968.1', 'OPEN')" title='Estatus de Folio' id="ChangeStat">OPEN</a>
                                                                                                                  </td>
                                                                                                                  <td valign="middle" align="left" class="WhiteText">
                                                                                                                          
                                                                                                                  </td>
  
                                                                                                                  <td valign="middle" align="right" style="width: 250px">
                                                                                                                          <a class="Invisible" href="javascript:fjsShowSquirrel('20346968.1','OPEN')" id="Squirrel">
                                                                                                                                  <img src="/WHSSettings/Img/ToolBars/Seek/binoculars_32.png" title='lblSquirrel' /></a>
  
                                                                                                                          <a class="" id="aFacAnt" href="javascript:fjsProcessAntInvoice('20346968.1','20346968')" id="FacturaAnticipada">
                                                                                                                                  <img src="/WHSSettings/Img/Grid/xm_bl.png" title='lblFacturaAnticipada' /></a>
  
                                                                                                                          <a class="Invisible"  href="javascript:fjsShowCertificate()">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/calidad.png" width="22px" height="22px" title='lblcertificate' /></a>
  
                                                                                                                          <a class="" href="javascript:fjsPost('20346968.1','OPEN')" id="post">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/postear.png" title='Cargo' /></a>
                                                                                                                          <a class="" href="javascript:fjsApply('20346968.1','OPEN')" id="applypost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/aplicar.png" title='Pagos' /></a>
                                                                                                                          <a class="" href="javascript:fjsTransfer('20346968.1','OPEN')" id="transferpost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/entre_folios.png" title='Transferir' /></a>
                                                                                                                          <a class="" href="javascript:fjsAdjust('20346968.1','OPEN');" id="AdjustPost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/ajuste.png" title='Ajuste' /></a>
                                                                                                                          <a class="" href="javascript:fjsPrint('20346968.1','')" id="PrintPost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/imprimir.png" title='Imprimir' /></a>
                                                                                                                          <a href="javascript:fjsLedgerGuest()" class="">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/arch_folios.png" width="23px" title='Reporte Ledger'></a>
                                                                                                                          <a href="javascript:fjsTransacSmartGuest()" class="Invisible">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/transSmart.png" style="height: 18px; vertical-align: top; margin-top: 2px" title='Reportes'></a>
                                                                                                                          <a class="" href="javascript:fjsCancelPayment('20346968.1','OPEN')" id="A1">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/cancel_32.png" width="23px" title='Cancelacion o Devolucion' /></a>
                                                                                                                  </td>
                                                                                                                  <td valign="middle" align="right" style="width: 50px">
                                                                                                                          <a href="javascript:fjsShowFixPost()" class="">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/fixpost.png" title='Cargos fijos'></a>
                                                                                                                          <a href="javascript:fjsShowRouting()" class="">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/routing.png" title='Ruteo cargos'></a>
                                                                                                                  </td>
                                                                                                          </tr>
                                                                                                  </table>
                                                                                          </th>
                                                                                  </thead>
                                                                                  <tbody>
                                                                                          
                                                                                                          <tr class="GridRow">
                                                                                                                  <td style="width: 15px"></td>
                                                                                                                  <td style="width: 70px; border-left: 1px solid #C7D2D8">2023/09/18</td>
                                                                                                                  <td style="border-left: 1px solid #C7D2D8; cursor: pointer" onclick="javascript:fjsViewInfo('<p><em>VISA DEBITO NACIONAL</em>&bull;&nbsp;&nbsp;2023/09/18</br>&bull;&nbsp;&nbsp;$ -1831.20</br>&bull;&nbsp;&nbsp;PMS</br>&bull;&nbsp;&nbsp;Auth_Code: 000944</br>&bull;&nbsp;&nbsp;0</br>&bull;&nbsp;&nbsp;MXN -1831.20(MXN)</br>&bull;&nbsp;&nbsp;HTJUGALDEA</br>&bull;&nbsp;&nbsp;2023-09-18 22:06</br>&bull;&nbsp;&nbsp;1250574</p></a>', '-10', '15')">VISADEB</td>
                                                                                                                  <td style="border-left: 1px solid #C7D2D8"><a style="color: #006699" href="javascript:uploadImg('20346968','20346968.1','1250574');">VISA DEBITO NACIONAL</a></td>
                                                                                                                  <td style="border-left: 1px solid #C7D2D8; cursor: pointer" align="right" onclick="javascript:fjsViewInfo('<p><em>VISADEB</em>&bull;&nbsp;&nbsp;VISA DEBITO NACIONAL<br/></p>', '100', '10')">-$ 1,831.20</td>
                                                                                                          </tr>
                                                                                                  
                                                                                          <tr class="GridFooter">
                                                                                                  <td align="right" colspan="4">Total
                                                                                                  </td>
                                                                                                  <td align="right">
                                                                                                          <span id="rptFoliosContent_ctl00_lblfolio_balance">-$ 1,831.20</span>
                                                                                                  </td>
                                                                                          </tr>
                                                                                  </tbody>
                                                                          </table>
                                                                  </div>
                                                          
                                                                  <div class="datagrid" id='tab2'>
                                                                          <table style="width: 100%">
                                                                                  <thead>
                                                                                          <th colspan="5" valign="middle">
                                                                                                  <table class="simpleTable" border="0">
                                                                                                          <tr>
                                                                                                                  <td valign="middle" align="left" style="width: 180px">
                                                                                                                          <a class="WhiteText" style="font-size: 16px; font-family: 'Century Gothic'" href="javascript:fjsChangeStatus('20346968.2', 'OPEN')" title='Estatus de Folio' id="ChangeStat">OPEN</a>
                                                                                                                  </td>
                                                                                                                  <td valign="middle" align="left" class="WhiteText">
                                                                                                                          
                                                                                                                  </td>
  
                                                                                                                  <td valign="middle" align="right" style="width: 250px">
                                                                                                                          <a class="Invisible" href="javascript:fjsShowSquirrel('20346968.2','OPEN')" id="Squirrel">
                                                                                                                                  <img src="/WHSSettings/Img/ToolBars/Seek/binoculars_32.png" title='lblSquirrel' /></a>
  
                                                                                                                          <a class="Invisible" id="aFacAnt" href="javascript:fjsProcessAntInvoice('20346968.2','20346968')" id="FacturaAnticipada">
                                                                                                                                  <img src="/WHSSettings/Img/Grid/xm_bl.png" title='lblFacturaAnticipada' /></a>
  
                                                                                                                          <a class="Invisible"  href="javascript:fjsShowCertificate()">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/calidad.png" width="22px" height="22px" title='lblcertificate' /></a>
  
                                                                                                                          <a class="" href="javascript:fjsPost('20346968.2','OPEN')" id="post">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/postear.png" title='Cargo' /></a>
                                                                                                                          <a class="" href="javascript:fjsApply('20346968.2','OPEN')" id="applypost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/aplicar.png" title='Pagos' /></a>
                                                                                                                          <a class="" href="javascript:fjsTransfer('20346968.2','OPEN')" id="transferpost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/entre_folios.png" title='Transferir' /></a>
                                                                                                                          <a class="" href="javascript:fjsAdjust('20346968.2','OPEN');" id="AdjustPost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/ajuste.png" title='Ajuste' /></a>
                                                                                                                          <a class="" href="javascript:fjsPrint('20346968.2','')" id="PrintPost">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/imprimir.png" title='Imprimir' /></a>
                                                                                                                          <a href="javascript:fjsLedgerGuest()" class="">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/arch_folios.png" width="23px" title='Reporte Ledger'></a>
                                                                                                                          <a href="javascript:fjsTransacSmartGuest()" class="Invisible">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/transSmart.png" style="height: 18px; vertical-align: top; margin-top: 2px" title='Reportes'></a>
                                                                                                                          <a class="" href="javascript:fjsCancelPayment('20346968.2','OPEN')" id="A1">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/cancel_32.png" width="23px" title='Cancelacion o Devolucion' /></a>
                                                                                                                  </td>
                                                                                                                  <td valign="middle" align="right" style="width: 50px">
                                                                                                                          <a href="javascript:fjsShowFixPost()" class="">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/fixpost.png" title='Cargos fijos'></a>
                                                                                                                          <a href="javascript:fjsShowRouting()" class="">
                                                                                                                                  <img src="/WHSSettings/Img/iconos/routing.png" title='Ruteo cargos'></a>
                                                                                                                  </td>
                                                                                                          </tr>
                                                                                                  </table>
                                                                                          </th>
                                                                                  </thead>
                                                                                  <tbody>
                                                                                          
                                                                                          <tr class="GridFooter">
                                                                                                  <td align="right" colspan="4">Total
                                                                                                  </td>
                                                                                                  <td align="right">
                                                                                                          <span id="rptFoliosContent_ctl01_lblfolio_balance">$ 0.00</span>
                                                                                                  </td>
                                                                                          </tr>
                                                                                  </tbody>
                                                                          </table>
                                                                  </div>
                                                          
                                          </td>
                                  </tr>
                                  <tr>
                                          <td colspan="3">&nbsp;</td>
                                  </tr>
                          </table>
                  </div>
                  <div id="flDiv" class="flDivcss" onmouseout="this.style.display='none'" onclick="this.style.display='none'"
                          onmouseover="this.style.display='block'">
                  </div>
          
  <script type="text/javascript">
  //<![CDATA[
  var aFoliosMsges =  new Array('Seleccione al menos una transaccion de este folio.','Seleccione posteos del mismo tipo','Debe seleccionar CARGOS para usar esta opcion','No hay cargos fijos.','¿Seguro de continuar?','error_set_room_to_rsrv','Cuarto asignado','Fin de registros','No puede transferirse. Por favor verifique.','Folio cerrado','Folio facturado','El balance debe ser cero','no_folio_status','Exitoso','not_successful','no_data_found_folio','Acci?n no permitida. Procesando auditoria nocturna. Favor de contactar a Soporte.','Debe existir otro folio abierto. El ultimo folio solo se cierra en estatus Check Out','user_have_not_permission','error_creating_new_folio','Seleccione solo un tipo de posteo ya sea posteos normales o posteos de paquete','for_this_option_to_use_Chrome_or_Firefox','La impresión del folio 1 no esta permitira en reservas prepagadas','Se ha eliminado la relación depósito anticipo de la reserva','¿Seguro eliminar la relación hacia la reserva?','Estatus Credito no es Approved','error_on_charging_rent','confirm_charge_rent_for_invoice?','Unable_Modify_Status','Invalid_Amount_FAO');
  //]]>
  </script>
  </form>
  </body>
  </html>
  
  `,
  sheets: [
    { sheetNo: 1, isOpen: false, balance: { isCredit: false, amount: 0 } },
    { sheetNo: 2, isOpen: true, balance: { isCredit: false, amount: 0 } },
  ],
};

export default MockData;
