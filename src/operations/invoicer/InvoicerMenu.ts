import inquirer from "inquirer";

export default class InvoicerMenu {
  constructor() {}

  async display(): Promise<any> {
    const questions = [
      {
        type: "list",
        name: "invoicer-select",
        message: "Select an option",
        choices: [
          "Invoice all departures",
          "Invoice by room",
          // "Resume skipped",
          "Set generic list",
          new inquirer.Separator(),
          "Return",
        ],
      },
    ];
    const answer = await inquirer.prompt(questions);
    return answer["invoicer-select"];
  }
}
