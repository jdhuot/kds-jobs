
const {OAuth2Client} = require('google-auth-library');

const CLIENT_ID = "263638085300-2ensh9g76i4n0hdi586s9fih9tgsaib2.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "/final";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly']
});

console.log(`Authenticate here: ${authUrl}`);