# Partner AI

![Partner Logo](https://img.utdstc.com/icon/52c/db0/52cdb027fdc84505cd1205b0cded773f18227832b23de165d4a87bcbc8cc0217:100)

> A human-friendly and digestible way to use OpenAI Assistants API (ugh finally...)

---

## 🚀 Features

- Enables you to create a full-fledged OpenAI Assistant with similar syntax like the ChatCompletion API
- Admits both Event handlers and await/Promise syntax
- Intuitive API, just write partner.sendMessage() to send a message and partner.remember() to add a file context
- Able to store both files and JSON AI Context persistently for later use with partner.remember()
- Works with a single instruction or multiple instructions as steps for the AI to tackle

---

## 📦 Installation

Install the package via npm:

```bash
npm install @jpbehler/partner
```

---

## 🛠️ Usage

### Quick Start

```javascript
import partner from "@jpbehler/partner";
import { input } from "@inquirer/prompts";

let salesman = new partner({
  apiKey:
    "sk-***",
  assistantParams: {
    name: "iPhone Salesman",
    instructions: "You are an iPhone Salesman. Do not offer MacBooks.",
    model: "gpt-4o",
  },
});

const receiveMessage = async (message) => {
  console.log(message);

  const question = await input({
    message: "Question>",
  });
  await salesman.sendMessage(question);
};

//Handle incoming messages async using eventHandlers
salesman.on("message", receiveMessage);
await salesman.start("Let's start!");

//Or just use async/await syntax
//await salesman.start();
//const response = await salesman.sendMessage("Let's start!");
```

### Define functions/code for the Partner to use

```javascript
import partner from "@jpbehler/partner";
import { input } from "@inquirer/prompts";

//Define a function as a tool the Partner should call whenever asked for a product
const GET_FROM_DB = {
  type: "function",
  function: {
    name: "getProduct",
    description: "Gets stored product information",
    parameters: {
      type: "object",
      properties: {
        _id: {
          type: "string",
          description: "Entry or document ID to be fetched",
        },
        database: {
          type: "string",
          description: "Database to query from",
        },
      },
      required: ["_id", "database"],
    },
  },
};

//Define a Partner that makes use of the above function
let salesman = new partner({
  apiKey:
    "sk-***",

  assistantParams: {
    name: "iPhone Salesman",
    instructions:
      "You are an iPhone Salesman. Do not offer MacBooks. (Please use the provided functions and files to get and recommend products)",
    model: "gpt-4o",
    tools: [GET_FROM_DB, { type: "file_search" }],
  },
});

const receiveMessage = async (message) => {
  console.log(message);

  const question = await input({
    message: "Question>",
  });
  await salesman.sendMessage(question);
};

//Handle GET_FROM_DB function calls
const receiveRequest = async (request) => {
  /* 1. Iterate request.required_action.submit_tool_outputs.tool_calls
     2. Get the function and parameters the AI needs to request
     3. Execute the associated function (eg. getProduct(_id,database))
     4. Respond to the AI request so it can use the information
  */

  await salesman.respondRequest({
    request: request,
    status: "success",
    response: "Ok stored",
  });
};

salesman.on("message", receiveMessage);
salesman.on("request", receiveRequest);

await salesman.start("Let's start");
```

### Define multiple instructions as steps the Partner must resolve

```javascript
import partner from "@jpbehler/partner";
import { input } from "@inquirer/prompts";

let salesman = new partner([
  {
    apiKey:
      "sk-***",
    assistantParams: {
      name: "Salesman",
      instructions: "You are an iPhone Salesman. Do not offer MacBooks.",
      model: "gpt-4o",
    },
  },
  {
    apiKey:
      "sk-***",
    assistantParams: {
      name: "Cashier",
      instructions:
        "You are a store Cashier, please help the customer with his/her payment.",
      model: "gpt-4o",
    },
  },
]);

const receiveMessage = async (message) => {
  //Check the AI response and go to the next step by sending the "<done>" special code
  if (message.includes("pay")) await salesman.sendMessage("<done>");

  console.log(message);

  const question = await input({
    message: "Question>",
  });
  await salesman.sendMessage(question);
};

//Handle incoming messages async using eventHandlers
salesman.on("message", receiveMessage);
await salesman.start("Let's start!");
```
---

## 🌟 GitHub

If you notice a bug, be welcomed to open an [Issue](https://github.com/juampignr/partner)
If you just love it, please consider giving it a ⭐ on [GitHub](https://github.com/juampignr/partner)!

---

## 🧑‍💻 Author

Created with ❤️ & ☕ by [J.P. Behler](https://www.linkedin.com/in/juanpablobehler/).

---

## 🫀 Donate

If you really appreciate it, consider buying me a [Coffee](https://buymeacoffee.com/jpbehler). Remember we developers turn coffee into apps 😆
