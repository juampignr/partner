import { input, checkbox } from "@inquirer/prompts";
import { writeFile, readFile, access, open } from "fs/promises";
import { randomBytes } from "crypto";
import { cp, createReadStream } from "fs";
import OpenAI from "openai";
import path from "path";
import os from "os";
import chalk from "chalk";
import EventEmitter from "events";

var _ = (name) => {
  return Symbol.for(name);
};

var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

export default class partner extends EventEmitter {
  constructor(options) {
    super();

    this.options;
    this.steps;
    this.hi;

    if (Array.isArray(options)) {
      this.options = options[0];
      this.steps = options;

      for (const element of this.steps) {
        element.assistantParams["instructions"] =
          `${element.assistantParams["instructions"]}\n(You must make use of the provided files and functions during the conversation)`;
      }
    } else if (typeof options === "object") {
      this.options = options;
      this.options.assistantParams["instructions"] =
        `${this.options.assistantParams["instructions"]}\n(You must make use of the provided files and functions during the conversation)`;
    } else {
      warn(
        `Partner instance options must be an object or list of objects: ${typeof options}`,
      );
    }

    this.apiKey = this.options.apiKey ?? "";
    this.assistantParams = this.options.assistantParams ?? {
      name: "Partner",
      model: "gpt-4o-mini",
    };
    this.run = "";
    this.response = "";
    this.request = "";
    this.stop = false;
    this.vectorStore = false;

    this.client;
    this.assistant;
    this.thread;
    this.assistantId;
    this.threadId;

    this.on("event", this.onEvent.bind(this));
  }

  async start(message = "Hello!") {
    this.hi = message;

    try {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });

      this.assistant = await this.client.beta.assistants.create(
        this.assistantParams,
      );
      this.assistantId = this.assistant?.id;

      this.thread = await this.client.beta.threads.create();
      this.threadId = this.thread?.id;

      let rawFile;

      try {
        await access("./memory.json");

        rawFile = await readFile("./memory.json");
      } catch {
        await writeFile("./memory.json", JSON.stringify({}));

        rawFile = await readFile("./memory.json");
      }

      let tasks = [];
      let jsonObject = JSON.parse(rawFile);

      tasks.push(this.sendMessage(message));
      for (const key in jsonObject) {
        tasks.push(this.#storeOnShortTerm(jsonObject[key]));
      }

      const res = await Promise.all(tasks);

      return res[0];
    } catch (error) {
      warn(
        `Unable to create assistant, please check the apiKey or assistantParams: ${error.stack}`,
      );
    }
  }

  async onEvent(event) {
    try {
      switch (event.event) {
        case "thread.run.requires_action":
          event.data.required_action.submit_tool_outputs.tool_calls.map(
            (toolCall) => {
              if (toolCall.type === "function") {
                this.emit("request", event.data);
              }
            },
          );
          break;

        case "thread.message.completed":
          this.emit("message", event.data.content[0].text.value);

          break;

        case "run.completed":
          await this.sendMessage();
      }
    } catch (error) {
      warn(`Error emiting events: ${error.stack}`);
    }
  }

  async #store(data) {
    const rawFile = await readFile("./memory.json");

    let jsonObject = JSON.parse(rawFile);
    show(data);
    show(Object.values(jsonObject));

    if (!Object.values(jsonObject).includes(data)) {
      jsonObject[`memory${Date.now()}`] = data;

      await writeFile("./memory.json", JSON.stringify(jsonObject));
    }
  }

  async #storeOnLongTerm(data) {
    if (typeof data === "object") {
      try {
        this.#store(data);
      } catch (error) {
        warn(`Expected a JSON parseable object: ${error.stack}`);
      }
    } else if (typeof data === "string") {
      try {
        await access(data);

        this.#store(data);
      } catch (error) {
        warn(`Expected an existent file as string: ${error.stack}`);
      }
    } else {
      warn("Unsupported data type. Expected an object or a string.");
    }
  }

  async #storeOnShortTerm(data) {
    try {
      let filePath = data;

      if (typeof data === "object") {
        const localTempDir = os.tmpdir();
        filePath = path.join(localTempDir, `shortTermMemory${Date.now()}.json`);

        await writeFile(filePath, JSON.stringify(data));
      }

      if (!this.vectorStore?.id) {
        this.vectorStore = await this.client.beta.vectorStores.create({
          name: "Short Term Memory",
        });
      }

      // Upload the file and poll for the result
      const res = await this.client.beta.vectorStores.fileBatches.uploadAndPoll(
        this.vectorStore.id,
        { files: [createReadStream(filePath, { encoding: "utf8" })] }, // Pass the file correctly
      );

      await this.client.beta.assistants.update(this.assistantId, {
        tool_resources: {
          file_search: { vector_store_ids: [this.vectorStore.id] },
        },
      });
    } catch (error) {
      warn(
        `Expected a JSON object or a file of supported type: ${error.stack}`,
      );
    }
  }

  async sendMessage(message, whisper = false) {
    try {
      if (message && typeof message === "string") {
        if (message === "<done>") throw message;

        await this.client.beta.threads.messages.create(this.threadId, {
          role: "user",
          content: message,
        });

        this.run = this.client.beta.threads.runs.stream(
          this.threadId,
          {
            assistant_id: this.assistantId,
          },
          this,
        );

        for await (const event of this.run) {
          if (!whisper) {
            this.emit("event", event);

            if (
              event.data?.object === "thread.message" &&
              event.data?.status === "completed"
            )
              return event.data?.content[0].text.value;
          }
        }
      } else {
        warn("Message must be a non-empty string!");
      }
    } catch (error) {
      if (error === "<done>") {
        if (this.steps) {
          this.steps = this.steps.reverse();
          this.steps.pop();

          if (this.steps.length) {
            this.apiKey = this.steps[0]?.apiKey;
            this.assistantParams = this.steps[0]?.assistantParams;
          }

          this.start(this.hi);
        } else {
          return;
        }
      } else {
        warn(`Unable to send message because of: ${error.stack}`);
      }
    }
  }

  async respondRequest(response) {
    try {
      if (typeof response === "object") {
        const runId = response?.request?.id;
        const callId =
          response?.request?.required_action?.submit_tool_outputs?.tool_calls[0]
            .id;

        const stream = this.client.beta.threads.runs.submitToolOutputsStream(
          this.threadId,
          runId,
          {
            tool_outputs: [
              {
                tool_call_id: callId,
                output: JSON.stringify({
                  status: response?.status ?? "success",
                  response: response?.response ?? "ready",
                }),
              },
            ],
          },
        );
        for await (const event of stream) {
          this.emit("event", event);
        }
      } else {
        warn(
          `Response must be an object containing "request", "status" and "response" keys`,
        );
      }
    } catch (error) {
      warn(`Error submitting tool outputs: ${error.stack}`);
    }
  }

  async remember(data) {
    await this.#storeOnShortTerm(data);
    await this.#storeOnLongTerm(data);
  }

  async nextTask(assistant) {
    this;
  }
}
