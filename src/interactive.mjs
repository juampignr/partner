import OpenAI from "openai";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { AssistantStream } from "openai/lib/AssistantStream.mjs";
import { input, checkbox } from "@inquirer/prompts";
import { writeFile, readFile } from "fs/promises";
import partner from "./partner.mjs";

const apiKey = await input({
  message: "Your OpenAI API Key:",
});

const instructions = await input({
  message:
    "Give your Partner instructions as how it should behave (eg: You will be an Apple Salesman):",
});

const file = await input({
  message:
    "Give your Partner some file to work with (eg: /home/me/inventory.pdf):",
});

let partnerInstance = new partner({
  apiKey: apiKey,
  assistantParams: {
    name: "Partner",
    instructions: instructions,
    model: "gpt-4o",
  },
});

const receiveMessage = async (message) => {
  const request = await input({
    message: `Partner> ${message}\nYou>`,
  });

  await partnerInstance.sendMessage(request);
};

const receiveRequest = async (request) => {
  await partnerInstance.respondRequest({
    request: request,
    status: "success",
    response: "Ok stored",
  });
};

partnerInstance.on("message", receiveMessage);
partnerInstance.on("request", receiveRequest);

const rawFile = await readFile("./src/memory.json");

let jsonObject = JSON.parse(rawFile);
jsonObject[`memory${Date.now()}`] = file;

await writeFile("./memory.json", JSON.stringify(jsonObject));

await partnerInstance.start();

/*
await partnerInstance.remember({
  job: "Online shoes salesman",
  responsibilities: "To compare and recommend shoes",
  faqs: ["Wheres the store at? Viamonte 4069"],
  relatedProducts: ["Nike shoes", "Nike apparel"],
  unrelatedProducts: ["formal clothing", "Non-Nike brands"],
});

await partnerInstance.remember("/home/jpbehler/Descargas/inventory.pdf");
*/

/*
for await (const event of assistantInstance.startConversation()) {
  //eventHandler.endConversation();

  assistantInstance.emit("event", event);
}
*/

/*
while (true) {
  request = await input({
    message: `Assistant: ${response ?? ""}\n`,
  });

  response = await sendMessage(request ?? "Comencemos");
}
*/
