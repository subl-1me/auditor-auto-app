import inquirer from "inquirer";
import OperationManager from "../OperationManager";

export default class Home {
  constructor() {
    console.log("inserting home into stack...");
  }

  async display(): Promise<string> {
    const questions = [
      {
        type: "list",
        name: "home",
        message: "Select an option",
        choices: [
          "Login",
          "Invoicer",
          "Print docs",
          // "Start Noktos process",
          new inquirer.Separator(),
          "Exit",
        ],
      },
    ];

    const answer = await inquirer.prompt(questions);
    if (answer.home === "Exit") {
      return "Exit";
    }

    return answer;
  }
}
