import inquirer from "inquirer";

export default class PrinterMenu {
  constructor() {}

  async display(): Promise<any> {
    const questions = [
      {
        type: "list",
        name: "printer",
        message: "Select docs",
        choices: ["AUD", new inquirer.Separator(), "Return"],
      },
    ];
    const answers = await inquirer.prompt(questions);
    return answers.printer;
  }
}
