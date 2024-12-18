#!/usr/bin/env -S node --no-deprecation

import fs from "fs/promises";
import { input } from "@inquirer/prompts";
import { writeFile } from "fs/promises";
import { existsSync } from "fs";
import chalk from "chalk";
import partner from "./partner.mjs";

var show = (arg) => {
  switch (typeof arg) {
    case "string":
      console.log(chalk.inverse(arg));
      break;

    case "object":
      console.log(arg);
      break;

    case "function":
      console.log(arg);
      break;

    default:
      console.log(chalk.bold(arg));
      break;
  }
};

var debug = (arg) => {
  switch (typeof arg) {
    case "string":
      console.log(chalk.red.underline(arg));
      break;

    case "object":
      console.log(arg);
      break;

    case "function":
      console.log(arg);
      break;

    default:
      console.log(chalk.red.underline(arg));
      break;
  }
};

var warn = (arg) => {
  switch (typeof arg) {
    case "string":
      console.log(chalk.bgRed.inverse(arg));
      break;

    case "object":
      console.log(arg);
      break;

    case "function":
      console.log(arg);
      break;

    default:
      console.log(chalk.bgRed(arg));
      break;
  }
};

const apiKey = await input({
  message: "Your OpenAI API Key:",
});

if (!apiKey)
  warn("OpenAI API Key must be set before using Partner (eg: sk-proj-***)>");

const instructions = await input({
  message:
    "Give your Partner instructions as how it should behave (eg: You will act as Jared Leto)>",
});

let file = await input({
  message:
    "Give your Partner some context (eg: file.{txt,pdf,docx,csv,xlsx,jpeg,zip,tar}). Default (./memory.txt)>",
});

if (existsSync("./memory.txt")) {
  file = "./memory.txt";
} else {
  await writeFile("./memory.txt", "insert memory here");
  file = "./memory.txt";
}

let partnerInstance = new partner({
  apiKey: apiKey,
  assistantParams: {
    name: "Partner",
    instructions: instructions,
    model: "gpt-4o",
    tools: [{ type: "file_search" }],
  },
});

const receiveMessage = async (message) => {
  const request = await input({
    message: `Partner> ${message}\nYou>`,
  });

  await partnerInstance.sendMessage(request);
};

partnerInstance.on("message", receiveMessage);

await partnerInstance.start();
await partnerInstance.remember(file);
