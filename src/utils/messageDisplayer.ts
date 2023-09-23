export default class MessageDisplayer {
  constructor() {}

  display(response: any): void {
    if (response.status === 200) {
      console.log("\u001b[32m Operation success! \n");
    }

    if (response.status !== 200) {
      console.log("\u001b[31m Operation failed due the following error:");
      console.log(response.error + "\n");
    }
  }
}
