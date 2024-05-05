import dotenv from "dotenv";
dotenv.config();
import Reservation from "./types/Reservation";
import {
  addNewPayment,
  applyVCCPayment,
  getReservationCertificate,
  getReservationGuaranteeDocs,
  getReservationList,
  getReservationVCC,
} from "./utils/reservationUtlis";
import PrePaidMethod from "./types/PrePaidMethod";
import {
  ACCESS,
  CERTIFICATE,
  COUPON,
  COUPONS,
  DOCUMENTS,
  IN_HOUSE_FILTER,
  UNKNOWN,
  UNSUPPORTED,
  VIRTUAL_CARD,
} from "./consts";
import path from "path";
import { TempStorage } from "./utils/TempStorage";
import FrontService from "./services/FrontService";
import TokenStorage from "./utils/TokenStorage";
import DocAnalyzer from "./DocumentAnalyzer";
import GuaranteeDoc from "./types/GuaranteeDoc";

const { STORAGE_TEMP_PATH } = process.env;
const docsTempStoragePath = path.join(STORAGE_TEMP_PATH || "", "docsToAnalyze");
const frontService = new FrontService();

export default class PrePaid {
  constructor() {}

  static async getPrePaidMethod(
    reservation: Reservation
  ): Promise<PrePaidMethod | null> {
    const promises: any = [];
    promises.push(await getReservationCertificate(reservation.id));
    promises.push(await getReservationGuaranteeDocs(reservation.id));
    promises.push(await getReservationVCC(reservation.id));

    const results = await Promise.all(promises);
    for (const data of results) {
      let prePaidType = "";
      // case certificate
      if (typeof data === "string") {
        prePaidType = CERTIFICATE;
        return {
          type: prePaidType,
          data,
        };
      }

      // case documents
      if (Array.isArray(data) && data.length > 0) {
        prePaidType = UNKNOWN;
        const documentDownloader = await this.downloadDocuments({
          type: COUPONS,
          data,
        });

        const downloads = documentDownloader.filter(
          (result: any) => result.status === 200
        );

        // classify documents in order to search a valid coupon
        const coupons = await this.getCoupons(downloads);
        if (coupons.length === 0) {
          return {
            type: prePaidType,
            data,
          };
        }

        const mainCoupon = await this.findPrimaryCoupon(coupons, reservation);
        if (!mainCoupon) {
          console.log("Error trying to get main coupon.");
          return null;
        }

        console.log(`\nCoupon pass.`);
        console.log("---");
        console.log(`Provider: ${mainCoupon.result.patternMatches.provider}`);
        console.log(`RFC: ${mainCoupon.result.patternMatches.RFC}`);
        console.log(
          `To reservation: ${mainCoupon.result.patternMatches.reservationTarget}`
        );
        console.log(
          `Dates: ${mainCoupon.result.patternMatches.dates.dateIn} to ${mainCoupon.result.patternMatches.dates.dateOut}`
        );
        console.log("---\n");
        prePaidType = COUPON;
        return {
          type: prePaidType,
          data: mainCoupon,
        };
      }

      // case VCC
      if (data && data.provider && data.provider !== null) {
        prePaidType = VIRTUAL_CARD;
        return {
          type: prePaidType,
          data,
        };
      }
    }

    return null;
  }

  private static async downloadDocuments(
    prePaidMethod: PrePaidMethod
  ): Promise<any> {
    const isArray = Array.isArray(prePaidMethod.data);
    if (!isArray) {
      console.log("This reservation has no coupons.");
      return;
    }

    const authTokens = await TokenStorage.getData();
    const downloaderPromises: any = [];
    const documents = prePaidMethod.data as GuaranteeDoc[];
    for (let i = 0; i < documents.length; i++) {
      const fileName = `${documents[i].id}-${i + 1}-document.pdf`;
      downloaderPromises.push(
        await frontService.downloadByUrl(
          fileName,
          docsTempStoragePath,
          authTokens,
          documents[i].downloadUrl,
          {}
        )
      );
    }

    return await Promise.all(downloaderPromises);
  }

  private static async findPrimaryCoupon(
    coupons: any,
    reservation: Reservation
  ): Promise<any> {
    const analyzerPromises: any = [];
    for (const coupon of coupons) {
      analyzerPromises.push(
        await DocAnalyzer.compare(
          coupon.filePath,
          reservation,
          coupon.providerName
        )
      );
    }

    let mainCoupon;
    const analyzerResults = await Promise.all(analyzerPromises);
    analyzerResults.forEach((result, index) => {
      if (result.comparission.pass) {
        mainCoupon = {
          result,
          coupon: coupons[index],
        };
      }
    });

    return mainCoupon;
  }

  private static async getCoupons(downloads: any): Promise<any> {
    // classify documents
    const classificationPromises: any = [];
    for (const download of downloads) {
      classificationPromises.push(
        await DocAnalyzer.classifyDocument(download.filePath)
      );
    }

    const classificationList = await Promise.all(classificationPromises);
    const coupons: any = [];
    for (let i = 0; i < classificationList.length; i++) {
      const { classify, providerName } = classificationList[i];
      if (classify === COUPON) {
        coupons.push({
          classify,
          filePath: downloads[i].filePath,
          providerName,
        });
      }
    }

    return coupons;
  }

  static async applyPrePaidMethod(
    reservation: Reservation,
    prePaidMethod: PrePaidMethod | undefined
  ): Promise<any> {
    console.log("Applying prepaid payments...");
    const activeLedger = reservation.ledgers.find(
      (ledger) => ledger.isPrincipal
    );

    if (!prePaidMethod) {
      console.log("Prepaid method cannot be undefined.");
      return {
        error: true,
        message: "Prepaid method cannot be undefined.",
      };
    }

    if (!activeLedger) {
      console.log(
        "No current active ledger was found to apply prepaid method."
      );
      return {
        error: true,
        message: "No current active ledger was found to apply prepaid method.",
      };
    }

    if (activeLedger.balance === 0 || activeLedger.transactions.length === 0) {
      console.log("Payment cannot be applied with 0 balance.");
      return {
        error: true,
        message: "Payment cannot be applied with 0 balance.",
      };
    }

    let prePaidMethodResult = {
      error: false,
      message: "",
    };

    let pymntApplierRes;
    switch (prePaidMethod.type) {
      case CERTIFICATE:
        pymntApplierRes = await addNewPayment({
          type: "CB",
          amount: activeLedger?.balance || 0,
          reservationId: reservation.id,
          reservationCode: `${reservation.id}.${activeLedger.ledgerNo}`,
        });

        console.log(pymntApplierRes.data);
        break;
      case VIRTUAL_CARD:
        if (
          !prePaidMethod.data ||
          typeof prePaidMethod.data === "string" ||
          Array.isArray(prePaidMethod.data)
        ) {
          break;
        }

        if (!prePaidMethod.data.readyToCharge) {
          console.log(
            "This VCC is not available to charge. Please check it manually."
          );
          break;
        }

        pymntApplierRes = await applyVCCPayment(
          reservation.id,
          prePaidMethod.data,
          activeLedger
        );

        console.log(pymntApplierRes.data);
        break;
      case COUPON:
        console.log(prePaidMethod.data);
        pymntApplierRes = await addNewPayment({
          type: "CPC",
          amount: activeLedger?.balance || 0,
          reservationId: reservation.id,
          reservationCode: `${reservation.id}.${activeLedger?.ledgerNo}`,
        });

        console.log(pymntApplierRes.data);
        break;
      default:
        console.log("Trying to apply an invalid payment method:");
        console.log(prePaidMethod);
        break;
    }

    return prePaidMethodResult;
  }
}
