// const {google} = require('googleapis');
// const privateKey = require('../../round-seeker-359613-b67af335c425.json');
// const gmail = google.gmail({version: 'v1', auth: jwtClient});

// const jwtClient = new google.auth.JWT(
//   privateKey.client_email,
//   null,
//   privateKey.private_key,
//   ['https://www.googleapis.com/auth/gmail.readonly'], // You can add multiple scopes here
// );

// jwtClient.authorize(function(err, tokens) {
//   if (err) {
//     console.log(err);
//     return;
//   }

//   // authenticated now..
  
//   // Initialize Gmail API Client
//   const gmail = google.gmail({version: 'v1', auth: jwtClient});


//   // List the most recent email
//   gmail.users.messages.list({
//     userId: 'me',
//     maxResults: 1
//   }, (err, res) => {
//     if (err) {
//       console.log(`Error: ${err}`);
//       return;
//     }
  
//     const messages = res.data.messages;
  
//     if (messages && messages.length === 1) {
//       const messageId = messages[0].id;
  
//       // Fetch details of the most recent email
//       gmail.users.messages.get({
//         userId: 'me',
//         id: messageId,
//       }, (err, res) => {
//         if (err) {
//           console.log(`Error: ${err}`);
//           return;
//         }
  
//         console.log(`Email Data: ${JSON.stringify(res.data, null, 2)}`);
//       });
//     }
//   });

  
//   // // List unread emails
//   // gmail.users.messages.list({
//   //   userId: 'me',
//   //   q: 'is:unread',
//   // }, (err, res) => {
//   //   if (err) {
//   //     console.log(`Error: ${err}`);
//   //     return;
//   //   }
    
//   //   const messages = res.data.messages;
//   //   if (messages && messages.length) {
//   //     messages.forEach((message) => {
//   //       gmail.users.messages.get({
//   //         userId: 'me',
//   //         id: message.id,
//   //       }, (err, res) => {
//   //         if (err) {
//   //           console.log(`Error: ${err}`);
//   //           return;
//   //         }
          
//   //         const emailData = res.data;
//   //         // Send emailData to ChatGPT via an API call
//   //       });
//   //     });
//   //   }
//   // });
// });



const {google} = require('googleapis');
const privateKey = require('../../round-seeker-359613-b67af335c425.json');

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const jwtClient = new google.auth.JWT(
    privateKey.client_email,
    null,
    privateKey.private_key,
    ['https://www.googleapis.com/auth/gmail.readonly'],
  );

  return new Promise((resolve, reject) => {
    jwtClient.authorize(function(err, tokens) {
      if (err) {
        reject({ statusCode: 500, body: `Authorization Error: ${err}` });
        return;
      }

      const gmail = google.gmail({version: 'v1', auth: jwtClient});

      gmail.users.messages.list({
        userId: 'me',
        maxResults: 1
      }, (err, res) => {
        if (err) {
          reject({ statusCode: 500, body: `Gmail API Error: ${err}` });
          return;
        }
      
        const messages = res.data.messages;
      
        if (messages && messages.length === 1) {
          const messageId = messages[0].id;
      
          gmail.users.messages.get({
            userId: 'me',
            id: messageId,
          }, (err, res) => {
            if (err) {
              reject({ statusCode: 500, body: `Gmail API Error: ${err}` });
              return;
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
  });
};


// oauth client:
// client id: 263638085300-2ensh9g76i4n0hdi586s9fih9tgsaib2.apps.googleusercontent.com
// client secret: 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
// creation date: August 30, 2023 at 10:59:06 PM GMT-6