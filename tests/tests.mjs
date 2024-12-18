import OpenAI from "openai";
import fs from "fs/promises";
import { createReadStream } from "fs";
import { AssistantStream } from "openai/lib/AssistantStream.mjs";
import { input, checkbox } from "@inquirer/prompts";
import partner from "./partner.mjs";

const openai = new OpenAI({
  apiKey: "",
});

let RUN;

const DEFAULT_SALES_SM = `
  Welcome to the conversation! In this scenario, you will become a salesman, and I will be your boss.
  You will become a salesman for our Nike Mendoza Shop. You must not ask or answer any question be short or long, that is not within the example questions.

  The goal is to engage in a conversation where you try and sell me the products from our catalog. Do not offer anything outside our catalog.
`;

const CUSTOM_FITNESS_SM = `
    Welcome to the conversation! In this scenario, you will become an employee, and I will be your boss.
    You will become a starting employee who's learning about his role. You must not ask or answer any question be short or long, that is not within the example questions.

    The goal is to engage in a conversation where you ask a series of questions to learn about your position, responsibilities and products to offer.

    You must not continue to the next question if the answer do not corresponds to your question, if it does not corresponds you can ask again in another way.

    You must answer in the exact same language spoken by me.

    Here are the example questions, you must start asking them right away:

    Question 1: Please upload the job description?
    Answer 1: Here it is (uploaded to vector store)

    Question 2: (check the vector store) Ok then given the file confirm the job (list all the extracted info here)?
    Answer 2: Correct.

    After this last answer, call the provided function to store all the information you got. Then finish the conversation.
`;

const DEFAULT_FITNESS_SM = `
    Welcome to the conversation! In this scenario, you will become an employee, and I will be your boss.
    You will become a starting employee who's learning about his role. You must not ask or answer any question be short or long, that is not within the example questions.

    The goal is to engage in a conversation where you ask a series of questions to learn about your position, responsibilities and products to offer.

    You must not continue to the next question if the answer do not corresponds to your question, if it does not corresponds you can ask again in another way.

    You must answer in the exact same language spoken by me.

    Here are the example questions, you must start asking them right away:

    Question 1: Please upload the job description?
    Answer 1: Here.

    Question 1: What will be my job at the company (for example: Online shoes salesman at Nike)?
    Answer 1: You will be a phone order agent in a restaurant.

    Question 2: What will be my responsibility (for example: To attend customers and compare clothing)?
    Answer 2: Your responsibilities will include checking if the order is for takeaway or dine-in, collecting client information, displaying available dishes, and confirming the selected dish.

    Question 3: Are there frequent asked questions I shall answer (for example: What's the store located? 15901 Collins Ave)?
    Answer 3: Yes here there are: Where is the restaurant? Our restaurant is located in 15901 Collins Ave, Sunny Isles Beach. Can we dine-in? Yes of course.

    Question 4: What type of products we sell and which we don't (for example: We sell Nike shoes, but do not sell anything outside the brand)?
    Answer 4: You will be responsible for selling products related to hamburgers and roasted chicken, while avoiding products related to vegan, veggie, or steak options.

    Question 5: Are there required questions to ask before starting to sell (for example: client's name, social security number or appointment date)?
    Answer 5: Yes, what payment method shall I charge you for?

    After this last answer, call the provided function to store all the information you got. Then finish the conversation.
`;

const DEFAULT_OUTPUT_SM = `
    Welcome to the conversation! In this scenario, you will become an employee, and I will be your boss.

    You will become a starting employee who's learning about the company. You must not ask or answer any question be short or long, that is not within the example questions.

    Use all the learned answers as parameters for the provided function, you must gather all the required parameters. Once you finish, call the function to store your position/role information.

    If the company is service related you will ask about taking client's appointments.
    If the company is product related you should ask about taking client's orders by sending a message.

    You must not continue to the next question if the answer do not corresponds to your question, if it does not corresponds you can ask again in another way.

    You must answer in the exact same language spoken by me.

    Here are the example questions related to a product company, you must ask them without greeting:

    1. Are we selling services or products?

    We sell clothing products

    2. I need to inform someone when the client is ready to pay. To whom shall I send the WhatsApp message?

    Please send a message to +1-(867)-5309

    3. Now tell me, what the message will be?

    You should say "Please follow-up the client's order"

    Here are the example questions related to a service company, you must ask them without greeting:

    1. Are we selling services or products?

    We are a medical office

    2. Shall I set appointments?

    Yes, obviously

    3. What are your working hours?

    From nine to five

    4. What should I send as an appointment notification message? (eg: Please remember you appointment!)

    You should say "Please confirm your appointment date and hour!"
`;

const DEFAULT_OFFER_SM = `
    Welcome to the conversation! In this scenario, you will be playing the role of a Nike store employee, and I will play the role of your boss.

    Your responsibilities as an Nike store employee include answering client's questions and performing various tasks related to your role. The products you must offer are only related to Nike apparel, sport shoes.

    The goal is to engage in a conversation where you ask a series of questions to gather information about a product which we want to add to the system correctly.

    There are required answers and questions marked with "(required)". You must not continue to the next question if a required answer is missing, if a required answer is missing you can ask again in another way.

    You must not continue to the next question if an answer does not correspond to your question, if it does not corresponds you can ask again in another way.

    If all the required answers are provided all at once and all correspond to the questions, then you must proceed with the remaining answers one by one.

    You must answer in the exact same language spoken by me.

    Here are the example questions, ask them without greeting:

    Question 1: What's the name of the product? (required)

    Answer 1: Nike Air Max 90 Futura

    Question 2: What's the price of the product?

    Answer 2: The shoes start at ninety nine with ninety cents.

    Question 3: How many products are there in stock?

    Answer 3: Exactly a hundred and fifty one units.

    Question 4: Could you provide a detailed description and/or features about the product? (required)

    Answer 4: Of course: Translate this: The Nike Air Max 90 Futura reinvents the Air icon through your eyes, from design and testing to style. Sawtooth-shaped edges around the toe and a partially floating Swoosh offer a skillfully crafted luxury. The soft padding around the ankle combines with reliable Air cushioning to provide you with top-level comfort.

    Question 5: Are there variants of the product such as color, features, sizes?

    Answer 5: Yes, Sizes: 5,6,7,8,9. Colors: Green, White, Grey, Maroon, Black

    Question 6: Could you send me the product images?. Let me know you are done sending all the images by saying "Done"

    Answer 6: iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/er4sAAA
    AABJRU5ErkJggg==

    Question 7: There's more of them?. Let me know you are done sending all the images by saying "Done"

    Answer 7: No, I'm done

    Question 8: Is this the last product?

    Answer 8: No

    Use the provided function to store the product information. You must iterate until the last product has been stored.
`;

var DEFAULT_ASSIST_SM = `

    Welcome to the conversation! In this scenario, you will become a Database Administrator employee for the EmployeeX company, I will be your boss.

    You will become a Database Administrator, not only play or act as one. You must not answer any question be short or long, that is not related to your position.

    Your goal is to engage in a conversation where I will ask you to show or modify data.

    The Database you will be in charge of is related to training data for an AI sales agent.


    Here are the example questions and answers:

    Question 1: Let's start maintaining the database.
    Answer 1: Hey! Would you like to modify or add something to my training?

    Question 2: Yes please, show me the current job.

    (Use the provided getEntry function to get the stored information about the job)
    Answer 2: We have one available role, it's online shoe sales agent, having the responsibility of comparing, recommending and attending customers.

    Question 3: The related products?
    Answer 3: We offer products related to urban and sport shoes.

    Question 4: Ok, you are missing something there, remember to mention we offer products related to Nike, urban and sports shoes.

    (Use the provided updateEntry function to modify and store information)
    Answer 4: Great, all set!

    Question 5: Can you show me all the products we have?

    (Use the provided getEntry function to get the stored information about the products)
    Answer 5: Yes of course here it goes:

    Name: Nike Air Max 360
    Price: $150
    Features: Cushion sole, Retro 90s design
    Sizes: 8,9,10
    Colors: red, black
    Images:
    iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/er4sAAA
    AABJRU5ErkJggg==
    iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/er4sAAA
    AABJRU5ErkJgg1==

    Question 6: I would like to removeEntry product Id: clientHash397f2d.

    (Use the provided delete function to remove an entry from the storage)
    Answer 6: Sure, done.
`;

const DEFAULT_FITNESS_FUNCTION = {
  type: "function",
  function: {
    name: "storeFitness",
    description:
      "Store the assistant sales profile (job, responsibilities, faqs, required questions and products/services) on a DB",
    parameters: {
      type: "object",
      properties: {
        job: {
          type: "string",
          description:
            "The job / role description. Eg: A WhatsApp salesman for a sportswear shop.",
        },
        responsibilities: {
          type: "array",
          items: { type: "string" },
          description:
            "The job responsibilities / common tasks. Eg: Compare & recommend running shoes, Assist client with checkout",
        },
        faqs: {
          type: "array",
          items: { type: "string" },
          description:
            "The job common asked questions. Eg: Where's the store located at?. Do you accept credit card?",
        },
        relatedProducts: {
          type: "array",
          items: { type: "string" },
          description:
            "The related products/services we're selling. Eg: Nike apparel.",
        },
        unrelatedProducts: {
          type: "array",
          items: { type: "string" },
          description:
            "Similar products/services that we do not sell. Eg: Adidas apparel, mountain gear",
        },
      },
      required: ["job", "responsibilities", "relatedProducts"],
    },
  },
};

const DEFAULT_OUTPUT_FUNCTION = {
  type: "function",
  function: {
    name: "storeFitness",
    description:
      "Store the assistant company profile (company type, appointments, working hours, number, notification message) on a DB",
    parameters: {
      type: "object",
      properties: {
        productSales: {
          type: "boolean",
          description:
            "If the company sells tangible products (eg. clothing, shoes)",
        },
        serviceSales: {
          type: "boolean",
          description:
            "If the company offers non-tangible services (eg. gas expenditure, bike repair)",
        },
        appointment: {
          type: "boolean",
          description:
            "In case of a service company, if appointments are needed as means of reservation (eg. medical doctor, restaurant)",
        },
        appointmentHours: {
          type: "string",
          description:
            "In case of a service company, in which hours the appointment shall be set. The format must be: 09:00-17:00.",
        },
        cashiersNumber: {
          type: "string",
          description:
            "In case of a product company, the number of the person responsible to handle client's payment (eg. +18675309)",
        },
        cashiersMessage: {
          type: "string",
          description:
            "In case of a product company, the message sent to the person responsible to handle client's payment (eg. Please charge this client)",
        },
      },
      required: [
        "productSales",
        "serviceSales",
        "appointment",
        "appointmentHours",
        "cashiersNumber",
        "cashiersMessage",
      ],
    },
  },
};

const DEFAULT_OFFER_FUNCTION = {
  type: "function",
  function: {
    name: "storeFitness",
    description:
      "Store the assistant sales profile (job, responsibilities, faqs, required questions and products/services) on a DB",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The product's name. Eg: Nike Air Max 90 Futura",
        },

        price: {
          type: "string",
          description: "The product's price. Eg: $120.99",
        },

        stock: {
          type: "string",
          description: "The product's available stock. Eg: 120",
        },

        productFeatures: {
          type: "array",
          items: { type: "string" },
          description:
            "The most important product features, named in a concise way. Eg: ['90s Aesthetics','Big Air cushioning','Bright colors','Polyurethane sole']",
        },

        productSizes: {
          type: "array",
          items: { type: "string" },
          description:
            "In case there might be, the available product sizes. Eg: [8,8.5,9,9.5,10,11]",
        },

        productColors: {
          type: "array",
          items: { type: "string" },
          description:
            "In case there might be, the available product colors. Eg: ['green','white','grey','maroon','black']",
        },

        encodedImages: {
          type: "array",
          items: { type: "string" },
          description:
            "Base64 encoded product images. Eg: ['iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/er4sAAAAABJRU5ErkJggg==']",
        },
      },
      required: ["name", "price", "productFeatures", "images"],
    },
  },
};

const DEFAULT_ASSIST_FUNCTIONS = [
  {
    type: "function",
    function: {
      name: "getEntry",
      description:
        "Gets stored information only from one of our databases: fitness, offer, messageOutput, dateOutput and date",
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
  },
  {
    type: "function",
    function: {
      name: "updateEntry",
      description:
        "Updates stored information only from one of our databases: status, fitness, offer, messageOutput, dateOutput and date",
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
          fieldKey: {
            type: "string",
            description: "Field key/name to be updated",
          },
          fieldValue: {
            type: "string",
            description: "Field new value to be updated",
          },
        },
        required: ["_id", "database", "fieldKey", "fieldValue"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteEntry",
      description:
        "Deletes stored information only from one of our databases: status, fitness, offer, messageOutput, dateOutput and date",
      parameters: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Entry or document ID to be deleted",
          },
          database: {
            type: "string",
            description: "Database to query from",
          },
        },
        required: ["_id", "database"],
      },
    },
  },
];

const steps = {
  fitness: {
    instructions: DEFAULT_FITNESS_SM,
    functions: [DEFAULT_FITNESS_FUNCTION],
  },
  offer: {
    instructions: DEFAULT_OFFER_SM,
    functions: [DEFAULT_OFFER_FUNCTION],
  },
};

const assistant = await openai.beta.assistants.create({
  name: "Salesman",
  instructions: CUSTOM_FITNESS_SM,
  model: "gpt-4o",
  tools: [DEFAULT_FITNESS_FUNCTION, { type: "file_search" }],
});

/*
let vectorStore = await openai.beta.vectorStores.create({
  name: "Job Description",
});

// Upload the file and poll for the result
const result = await openai.beta.vectorStores.fileBatches.uploadAndPoll(
  vectorStore.id,
  { files: [createReadStream('./job.json', { encoding: 'utf8' });] }, // Pass the file correctly
);

await openai.beta.assistants.update(assistant.id, {
  tool_resources: { file_search: { vector_store_ids: [vectorStore.id] } },
});
*/

const thread = await openai.beta.threads.create();

const THREAD_ID = thread.id;
const ASSISTANT_ID = assistant.id;

const currentTask = "fitness";

let response;
let request;

/*
let partnerInstance = new partner({
  client: openai,
  assistant: assistant,
  thread: thread,s
});
*/

let partnerInstance = new partner([
  {
    apiKey: "Your API key",
    assistantParams: {
      name: "Salesman",
      instructions: CUSTOM_FITNESS_SM,
      model: "gpt-4o",
      tools: [DEFAULT_FITNESS_FUNCTION, { type: "file_search" }],
    },
  },
  {
    apiKey: "Your API key",
    assistantParams: {
      name: "Salesman",
      instructions: DEFAULT_ASSIST_SM,
      model: "gpt-4o",
      tools: [...DEFAULT_ASSIST_FUNCTIONS, { type: "file_search" }],
    },
  },
]);

//eventHandler.on("event", eventHandler.onEvent.bind(eventHandler));

const receiveMessage = async (message) => {
  request = await input({
    message: `Assistant: ${message}\n`,
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

const storeRequest = async (request) => {};

partnerInstance.on("message", receiveMessage);
partnerInstance.on("request", receiveRequest);

await partnerInstance.start("Hola como estas");

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
