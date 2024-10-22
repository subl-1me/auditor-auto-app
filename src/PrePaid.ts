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
  UNKNOWN_DOCUMENT,
  UNSUPPORTED,
  VIRTUAL_CARD,
} from "./consts";
import path from "path";
import { TempStorage } from "./utils/TempStorage";
import FrontService from "./services/FrontService";
import TokenStorage from "./utils/TokenStorage";
import DocAnalyzer from "./DocumentAnalyzer";
import GuaranteeDoc from "./types/GuaranteeDoc";
import DocumentClassification from "./types/DocumentClassification";

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
    for (const result of results) {
      // case certificate
      if (typeof result === "string") {
        return {
          type: CERTIFICATE,
          data: { code: result },
        };
      }

      // case documents
      if (Array.isArray(result) && result.length > 0) {
        const documentDownloader = await this.downloadDocuments(result);

        const downloads = documentDownloader.filter(
          (result: any) => result.status === 200
        );

        // classify documents in order to search a valid coupon
        const documents = await this.getDocumentsClassification(downloads);
        const { coupons, other } = documents;
        if (coupons.length === 0 && other.length === 0) {
          return {
            type: "ERROR",
            data: { coupons, other },
          };
        }

        const mainCouponResults = await this.findPrimaryCoupon(
          coupons,
          reservation
        );

        if (mainCouponResults.length === 0) {
          return {
            type: UNKNOWN_DOCUMENT,
            data: { coupons, other },
          };
        }

        mainCouponResults.forEach((result: any) => {
          const matchIndex = coupons.findIndex(
            (coupon: any) => coupon.filePath === result.coupon.filePath
          );
          if (matchIndex >= 0) {
            coupons[matchIndex].isPrimary = true;
            coupons[matchIndex].analyzerResult = result.result;
          }
        });

        return {
          type: COUPON,
          data: {
            coupons,
            other,
          },
        };
      }

      // case VCC
      if (result && result.provider && result.provider !== null) {
        return {
          type: VIRTUAL_CARD,
          data: result,
        };
      }
    }

    return null;
  }

  private static async downloadDocuments(
    documents: GuaranteeDoc[]
  ): Promise<any> {
    if (documents.length === 0) {
      return [];
    }

    const authTokens = await TokenStorage.getData();
    const downloaderPromises: any = [];
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

    let primaryCoupons: any = [];
    const analyzerResults = await Promise.all(analyzerPromises);
    analyzerResults.forEach((result, index) => {
      if (result.comparission.pass) {
        primaryCoupons.push({
          result,
          coupon: coupons[index],
        });
      }
    });

    return primaryCoupons;
  }

  private static async getDocumentsClassification(
    downloads: any
  ): Promise<any> {
    // classify documents
    const classificationPromises: any = [];
    for (const download of downloads) {
      classificationPromises.push(
        await DocAnalyzer.classifyDocument(download.filePath)
      );
    }

    const classificationList = await Promise.all(classificationPromises);
    const documentClassification: DocumentClassification = {
      coupons: [],
      other: [],
    };
    for (let i = 0; i < classificationList.length; i++) {
      const { classification, providerName } = classificationList[i];
      if (classification === COUPON) {
        documentClassification.coupons.push({
          providerName,
          classification,
          filePath: downloads[i].filePath,
        });
      } else {
        documentClassification.other.push({
          classification,
          filePath: downloads[i].filePath,
        });
      }
    }

    return documentClassification;
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
      console.log("Prepaid method cannot be undefined.\n");
      return {
        error: true,
        message: "Prepaid method cannot be undefined.",
      };
    }

    if (!activeLedger) {
      console.log(
        "No current active ledger was found to apply prepaid method.\n"
      );
      return {
        error: true,
        message: "No current active ledger was found to apply prepaid method.",
      };
    }

    if (activeLedger.balance === 0 || activeLedger.transactions.length === 0) {
      console.log("Payment cannot be applied with 0 balance.\n");
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
        console.log("Points payment was applied.\n");
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
            "This VCC is not available to charge. Please check it manually.\n"
          );
          break;
        }

        pymntApplierRes = await applyVCCPayment(
          reservation.id,
          prePaidMethod.data,
          activeLedger
        );

        console.log("Virtual Card payment was applied.\n");
        break;
      case COUPON:
        pymntApplierRes = await addNewPayment({
          type: "CPC",
          amount: activeLedger?.balance || 0,
          reservationId: reservation.id,
          reservationCode: `${reservation.id}.${activeLedger?.ledgerNo}`,
        });

        console.log(pymntApplierRes.data);
        console.log("\n");
        break;
      default:
        console.log("Trying to apply an invalid payment method:");
        console.log(prePaidMethod);
        break;
    }

    return prePaidMethodResult;
  }
}
