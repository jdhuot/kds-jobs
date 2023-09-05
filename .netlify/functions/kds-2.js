// const utf8 = require('utf8');
const OpenAI = require('openai');
const fetch = require('node-fetch');




// Open AI registration
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY
});

// HELPERS

function modifyJob(jobObj) {

  // Check if the "Client" key value contains "spa" and update it to "SPAAR" if true
  if (jobObj["Client"] && jobObj["Client"].toLowerCase().includes("spa")) {
    jobObj["Client"] = "SPAAR";
  } else if (jobObj["Client"] && jobObj["Client"].toLowerCase().includes("rob")) {
  jobObj["Client"] = "Rob's Drywall";
  }


  // Extract the year from the "Job Start Date" and update it to the current year if it's less
  let jobStartDate = jobObj["Job Start Date"];
  if (jobStartDate) {
    const dateParts = jobStartDate.split("-");
    const currentYear = new Date().getFullYear();
    const jobYear = parseInt(dateParts[2]);

    if (jobYear < currentYear) {
      dateParts[2] = currentYear;
      jobObj["Job Start Date"] = dateParts.join("-");
    }
  }
  return jobObj;
}


async function sendToGPT3(originalInput, originalOutput) {
  const prompt = originalInput;
  const prompt2 = `Please look over the initial instructions sent to Chat GPT earlier, along with the initial inputs, and then analyze the initial output from Chat GPT to see if it accurately followed the instructions. If there are errors, please fix and output the correct object. ############################## Initial instructions and input: ${prompt} ############################# Initial output: ${originalOutput}`;


  const completion2 = await openai.chat.completions.create({
    messages: [{ role: 'user', content: prompt2 }],
    model: 'gpt-3.5-turbo',
  });

  let inputString2 = completion2.choices[0].message.content;

  console.log("inputString2: ", inputString2);

  // Find the start and end positions of the object within the string
  const start2 = inputString2.indexOf("{");
  const end2 = inputString2.lastIndexOf("}") + 1;
  // Extract the object substring
  const objectString2 = inputString2.slice(start2, end2);
  // Parse the object string into an actual JavaScript object
  console.log("objectString2: ", objectString2);
  const parsedObject2 = JSON.parse(objectString2);

  modifyJob(parsedObject2);

  console.log("parsedObject2: ", parsedObject2);

  return parsedObject2;
  
}



async function fetchWebflowCollectionItems(token, collectionId, parsedObject, emailHtml) {
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






exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }


  const { headers, httpMethod, body } = event;

  if (httpMethod === 'OPTIONS') {
    console.log("Returning 204 status code for OPTIONS request");
    return {
      statusCode: 204,
      headers,
      body: ''
    }
  }


  console.log("headers: ", headers);
  console.log("httpMethod: ", httpMethod);
  console.log("body: ", body);

  let data = JSON.parse(body);

  const originalInput = data.originalInput;
  const originalOutput = data.originalOutput;
  const emailBodyHTML = data.bodyHtml;
  // console.log("res.data.payload.parts: ", res.data.payload.parts);
  // console.log("emailMarkdown: ", emailMarkdown);


  const jobFromGpt = await sendToGPT3(originalInput, originalOutput).catch((error) => {
    console.log("Error with OpenAI API: ", error);
  });

  const collectionId = '649e37c4a37a893333750cfd';
  const webflowProcessing = await fetchWebflowCollectionItems(process.env.WEBFLOW_TOKEN, collectionId, jobFromGpt, emailBodyHTML).catch((error) => {
    console.log("Error with Webflow API: ", error);
  })

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({"res": "endpoint hit, sent to GPT/Webflow!"})
  };
    




};
