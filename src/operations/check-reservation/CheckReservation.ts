import dotenv from "dotenv";
import inquirer from "inquirer";
import Spinnies from "spinnies";
import { getReservationByFilter } from "../../utils/reservationUtlis";
import PITChecker from "../pit-checker/PitChecker";

export default class CheckReservation {
  constructor() {}

  async performCheck(): Promise<any> {
    const spinnies = new Spinnies();

    const filter = await this.getReservationTarget();
    const reservation = await getReservationByFilter(filter);

    spinnies.add("spinner-1", { text: "Checking reservation...." });
    const pitChecker = new PITChecker();
    const check = await pitChecker.check(reservation);
    spinnies.succeed("spinner-1", { text: "Checked." });
    console.log(check);
  }

  private async getReservationTarget(): Promise<any> {
    const targetPrompt = [
      {
        type: "input",
        name: "reservationTarget",
        message: "Type reservation room or id",
      },
    ];

    const promptResponse = await inquirer.prompt(targetPrompt);
    const answer = promptResponse.reservationTarget;
    return answer;
  }
}
