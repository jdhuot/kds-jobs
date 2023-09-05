const {google} = require('googleapis');
const {OAuth2Client} = require('google-auth-library');
require('dotenv').config();
const quotedPrintable = require('quoted-printable');
const utf8 = require('utf8');
const TurndownService = require('turndown');
const OpenAI = require('openai');
const fetch = require('node-fetch');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN; 

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });


// HELPERS

// Markdown
const turndownService = new TurndownService();
function convertHtmlToMarkdown(html) {
  return turndownService.turndown(html);
}

// Email parsing
function decodeQuotedPrintable(data) {
  return utf8.decode(quotedPrintable.decode(data));
}
function findPartByMimeType(parts, mimeType) {
  for (const part of parts) {
    if (part.mimeType === mimeType) {
      return part;
    }
    if (part.parts) {
      const mimePart = findPartByMimeType(part.parts, mimeType);
      if (mimePart) {
        return mimePart;
      }
    }
  }
  return null;
}
function getEmailBody(message) {
  const payload = message.payload;
  if (!payload) {
    return 'No payload found';
  }

  // First, try to find HTML content
  let textPart = findPartByMimeType([payload], 'text/html');
  
  // If HTML content is not found, fallback to plain text
  if (!textPart) {
    textPart = findPartByMimeType([payload], 'text/plain');
  }

  if (!textPart) {
    return 'No text part found';
  }

  let bodyData = textPart.body.data;
  
  if (textPart.headers.some(header => header.name === 'Content-Transfer-Encoding' && header.value === 'quoted-printable')) {
    return decodeQuotedPrintable(Buffer.from(bodyData, 'base64').toString('utf8'));
  }
  
  return Buffer.from(bodyData, 'base64').toString('utf8');
}
const getSenderInfo = (headers) => {
  const fromHeader = headers.find(header => header.name === 'From');
  return fromHeader ? fromHeader.value : 'Unknown';
};



// Open AI
console.log("OpenAI: !!!: ", OpenAI);
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY
});
const instructions = `
Context - an email came in to a drywall sanding company called Klassen Drywall Sanding. The email could be from a client company and contain a work order for drywall sanding services. First, if the from email address contains "robsdrywall", please scan the email content which is formatted in markdown, and if there is a table present, please DISREGARD all rows in the table which do not start with "Klassen" in the first column (but don't disregard the first heading row). Next parse the relevant data from the following email sender and body content into a fully structured JSON object like this:  {
  "Job Address":"",
  "Job Start Date":"",
  "Quantity":"",
  "Notes":"",
  "Timeframe":"",
  "Client":""
  }
  notes - 1. the quantity should be in square feet, but the value returned should just be a number format, like: 1026. 2. For notes, please include any and all relavent notes that would be useful such as specific contact information, or notes about the job site. 3. For the client field, please apply the relavent company that appears to match ONLY from the following options: Rob's Drywall, SPAAR, or New Interiors Ltd (this will likely be indicated by the sender of the email). 4. Please scan for an appropriate date to use for Job start date. Job start date set in the object should be formatted like: month-day-year (eg: 12-21-2023) The year will almost always be the current year, please extrapolate based on the current date's year. 5. sometimes the email may contain rows or data pertaining to other companies for different somewhat related services like texturing, please disregard any data relavent to those companies and only filter for relavent data for Klassen Drywall Services. 6. For Timeframe, only set as either AM or PM if it's mentioned (and only if it appears to relate specifically to Klassen Drywall Sanding), otherwise set Timeframe to "". 7. IMPORTANT: If the email body content doesn't seem to match relavent info related to a job order, or job order update, then simply enter "null" for all the object values.
`;

async function sendToGPT3(senderInfo, markdownContent, instructions, emailHtml) {
  const prompt = `instructions: ${instructions}\n\nemail sender: ${senderInfo}\n\nemail body (markdown): ${markdownContent}`;
  // const maxTokens = 100;  // Adjust based on your needs
  
  // const gpt3Response = await openai.createCompletion({
  //   prompt,
  //   max_tokens: maxTokens
  // });

  
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'gpt-3.5-turbo',
  });


  let inputString = completion.choices[0].message.content;

  // Find the start and end positions of the object within the string
  const start = inputString.indexOf("{");
  const end = inputString.lastIndexOf("}") + 1;

  // Extract the object substring
  const objectString = inputString.slice(start, end);

  // Parse the object string into an actual JavaScript object
  const parsedObject = JSON.parse(objectString);

  // Check if the "Client" key value contains "spa" and update it to "SPAAR" if true
  if (parsedObject["Client"] && parsedObject["Client"].toLowerCase().includes("spa")) {
    parsedObject["Client"] = "SPAAR";
  } else if (parsedObject["Client"] && parsedObject["Client"].toLowerCase().includes("rob")) {
  parsedObject["Client"] = "Rob's Drywall";
  }


  // Extract the year from the "Job Start Date" and update it to the current year if it's less
  let jobStartDate = parsedObject["Job Start Date"];
  if (jobStartDate) {
    const dateParts = jobStartDate.split("-");
    const currentYear = new Date().getFullYear();
    const jobYear = parseInt(dateParts[2]);

    if (jobYear < currentYear) {
      dateParts[2] = currentYear;
      parsedObject["Job Start Date"] = dateParts.join("-");
    }
  }

  console.log(parsedObject);

  // I've got the data baby

  parsedObject["Quantity"] = 5951

  async function fetchWebflowCollectionItems(token, collectionId) {
    const baseUrl = `https://api.webflow.com/collections/`;
    const basicOptions = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${token}`
      }
    };

    const fetchJobs = await fetch(`${baseUrl}${collectionId}/items`, basicOptions);
    const fetchJobsJSON = await fetchJobs.json();


    let existingItem = fetchJobsJSON.items.filter(item => item.name.toLowerCase() === parsedObject["Job Address"].toLowerCase());

    if (existingItem.length > 0) {
      // job exists, just update
      
      const patchJob = await fetch(`${baseUrl}${collectionId}/items/${existingItem[0]._id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fields: {
          client: parsedObject.Client,
          "job-start-date": new Date(parsedObject["Job Start Date"]),
          quantity: parsedObject.Quantity,
          email: emailHtml,
          "date-updated": new Date(),
          timeframe: parsedObject.Timeframe,
          notes: parsedObject.Notes,
          _archived: false, 
          _draft: false
        } })
      });

      // const patchJobJSON = await patchJob.json();

      const publishPatchedJob = await fetch(`${baseUrl}${collectionId}/items/publish`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({itemIds: [existingItem[0]._id]})
      });

      const publishPatchedJobJSON = await publishPatchedJob.json();
      console.log("publishPatchedJobJSON: ", publishPatchedJobJSON);
      
    } else {
      // job doesn't exist, let's create it

      const createJob = await fetch(`${baseUrl}${collectionId}/items/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fields: {
          client: parsedObject.Client,
          "job-start-date": new Date(parsedObject["Job Start Date"]),
          quantity: parsedObject.Quantity,
          email: emailHtml,
          timeframe: parsedObject.Timeframe,
          notes: parsedObject.Notes,
          slug: Math.floor(Math.random() * 100000000000000).toString(), 
          name: parsedObject["Job Address"], 
          _archived: false, 
          _draft: false
        } })
      });

      const createJobJSON = await createJob.json();

      console.log("createJobJSON: ", createJobJSON);

      const newJobId = createJobJSON._id;

      if (newJobId) {
        const publishJob = await fetch(`${baseUrl}${collectionId}/items/publish`, {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({itemIds: [newJobId]})
        });
  
        const publishJobJSON = await publishJob.json();
        console.log("publishJobJSON: ", publishJobJSON);
      }


    }


  }

  const collectionId = '649e37c4a37a893333750cfd';
  
  fetchWebflowCollectionItems(process.env.WEBFLOW_TOKEN, collectionId)
    .then(items => {
      // console.log('Webflow Collection Items:', items);
    });


  

}


function containsKeywords(text, keywords) {
  // Create a regex pattern that looks for any of the keywords, case-insensitively
  const pattern = new RegExp(keywords.join("|"), "i");
  return pattern.test(text);
}


exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  return new Promise((resolve, reject) => {
    gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
    }, (err, res) => {
      if (err) {
        reject({ statusCode: 500, body: `Gmail API Error: ${err}` });
        return;
      }
    
      const messages = res.data.messages;

      console.log("messages: ", messages)

    
      if (messages && messages.length > 0) {

        for (let i = 0; i < messages.length; i++) {
          console.log("message: ", messages[i])
        }

        const messageId = messages[3].id;

        console.log("messageId: ", messageId);
    
        gmail.users.messages.get({
          userId: 'me',
          id: messageId,
        }, (err, res) => {
          if (err) {
            reject({ statusCode: 500, body: `Gmail API Error: ${err}` });
            return;
          }
          const senderInfo = console.log("sender info: ", getSenderInfo(res.data.payload.headers));
          const emailBodyHTML = getEmailBody(res.data);
          const emailMarkdown = convertHtmlToMarkdown(emailBodyHTML);
          const keywords = ["work order", "robsdrywall", "spaar", "sanding", "job site", "job address", "sand"];
          // console.log("res.data.payload.parts: ", res.data.payload.parts);
          console.log("emailMarkdown: ", emailMarkdown);

          if (containsKeywords(emailBodyHTML, keywords)) {
            console.log("Email body contains one of the keywords.");

            sendToGPT3(senderInfo, emailMarkdown, instructions, emailBodyHTML).catch(console.error);

          } else {
            console.log("Email body does not contain any of the keywords.");
          }

          resolve({
            statusCode: 200,
            body: JSON.stringify(res.data)
          });
        });
      } else {


        resolve({
          statusCode: 200,
          body: "No recent messages found."
        });
      }
    });
  });
};
