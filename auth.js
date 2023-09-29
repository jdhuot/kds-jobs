
const {OAuth2Client} = require('google-auth-library');

const CLIENT_ID = "263638085300-2ensh9g76i4n0hdi586s9fih9tgsaib2.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "https://kds-jobs.netlify.app/final";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.readonly']
});

console.log(`Authenticate here: ${authUrl}`);



https://kds-jobs.netlify.app/final?code=4/0Adeu5BWLjYgMF_a_tPGzYsHo23UllyuD93zj283Yf79nSQX_FDwy5OLL6Gh5d8JV66ObGA&scope=https://www.googleapis.com/auth/gmail.readonly