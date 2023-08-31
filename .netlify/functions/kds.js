const {google} = require('googleapis');
const privateKey = require('../../round-seeker-359613-b67af335c425.json');

const jwtClient = new google.auth.JWT(
  privateKey.client_email,
  null,
  privateKey.private_key,
  ['https://www.googleapis.com/auth/gmail.readonly'], // You can add multiple scopes here
);

jwtClient.authorize(function(err, tokens) {
  if (err) {
    console.log(err);
    return;
  }
  // You're authenticated, proceed with Gmail API calls
});