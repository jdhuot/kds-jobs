const {OAuth2Client} = require('google-auth-library');
require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://kds-jobs.netlify.app/final'; // Replace with your actual redirect URI

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method is Not Allowed" };
  }

  const operation = event.queryStringParameters.operation; // Assuming you pass 'generateUrl' or 'getToken' as a query parameter

  if (operation === 'generateUrl') {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly']
    });
    return {
      statusCode: 200,
      body: `Authenticate here: ${authUrl}`
    };

  } else if (operation === 'getToken') {
    const code = event.queryStringParameters.code; // Assuming the code is passed as a query parameter

    try {
      const {tokens} = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      return {
        statusCode: 200,
        body: `Tokens set successfully: ${JSON.stringify(tokens)}`
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: `Failed to set tokens: ${error}`
      };
    }

  } else {
    return {
      statusCode: 400,
      body: 'Invalid operation specified'
    };
  }
};


// Tokens set successfully: {"access_token":"ya29.a0AfB_byCv60YcKPk_4-F6R3mM3XMDFKqNYZc4ZxwiCYboiP5EJSLjXYpX17RbgJBzXz4D4xnNWFCIwMj3dUz_qs-YRuNsAYadjK9zbzSXsOooCXpC-YEXs8LHJ_we6vxadkk0EOKNVna3UVh__2tONN-x9ls7hPA5odnfhAaCgYKAacSARASFQHsvYlse15nduB6r_85MTfpGIUFEg0173","refresh_token":"1//06FwLnrFn56yvCgYIARAAGAYSNwF-L9IrbJK4_EoKgXyOjtBxWrjYLpX4ZwGhGniP7FScdS6H90mcPOeliIF5tK8fvMNcVCkCe7Y","scope":"https://www.googleapis.com/auth/gmail.readonly","token_type":"Bearer","expiry_date":1693463570548}