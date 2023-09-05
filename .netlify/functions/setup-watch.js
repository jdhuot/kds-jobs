const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

exports.handler = async function (event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }



  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const params = {
      userId: 'me',
      requestBody: {
        labelIds: ['INBOX'],
        topicName: 'projects/round-seeker-359613/topics/new-email-topic'
      }
    };

    const res = await gmail.users.watch(params);
    console.log('Watch response', res);

    const expirationTime = res.expiration;  // Assume `res` is the response from Gmail API watch setup
    const expirationDate = new Date(expirationTime);  // Convert to Date object
    console.log(`Watch will expire at: ${expirationDate}`);

    return {
      statusCode: 200,
      body: JSON.stringify(res.data)
    };

  } catch (error) {
    console.log('Error:', error);
    return {
      statusCode: 500,
      body: `Failed: ${error}`
    };
  }
};
