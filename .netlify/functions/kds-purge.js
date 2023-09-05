const { schedule } = require("@netlify/functions");
const fetch = require('node-fetch');

const handler = async function(event, context) {
// exports.handler = async function(event, context) { // use this when running in dev mode

    const collectionId = '649e37c4a37a893333750cfd';
    const WEBFLOW_TOKEN = process.env.WEBFLOW_TOKEN;
    const baseUrl = `https://api.webflow.com/collections/`;
    const currentDate = new Date();
    
    const headers = {
      accept: 'application/json',
      authorization: `Bearer ${WEBFLOW_TOKEN}`
    };
  
    try {
      // Fetch Webflow items
      const response1 = await fetch(`${baseUrl}${collectionId}/items?limit=100`, { method: 'GET', headers });
      const response2 = await fetch(`${baseUrl}${collectionId}/items?offset=100&limit=100`, { method: 'GET', headers });
      const response3 = await fetch(`${baseUrl}${collectionId}/items?offset=200&limit=100`, { method: 'GET', headers });

      const data1 = await response1.json();
      const data2 = await response2.json();
      const data3 = await response3.json();

      const items = [...data1.items, ...data2.items, ...data3.items];

      console.log("WF items: ", items.length);
  
      // Decide which items to delete (based on your criteria)
      const itemsToDelete = items.filter(item => {
        // Your logic to decide if the item should be deleted
        const jobStartDate = new Date(item["job-start-date"]);
        
        // Calculate difference in milliseconds
        const differenceInMS = currentDate - jobStartDate;
      
        // Convert 5 weeks to milliseconds: 5 weeks * 7 days/week * 24 hours/day * 60 minutes/hour * 60 seconds/minute * 1000 ms/second
        const fiveWeeksInMS = 3 * 7 * 24 * 60 * 60 * 1000;
      
        return differenceInMS > fiveWeeksInMS;
      });

      console.log("itemsToDelete: ", itemsToDelete.length);
  
      // Delete each item
      if (itemsToDelete.length > 0) {
        for (let item of itemsToDelete) {
          await fetch(`${baseUrl}${collectionId}/items/${item._id}`, { method: 'DELETE', headers });
          console.log("deleted item with start date: ", item["job-start-date"])
        }
      } else {
        console.log("no items to delete atm..")
      }
  
      return {
        statusCode: 200,
        body: `Deleted ${itemsToDelete.length} items.`
      };
  
    } catch (error) {
      console.error("Error fetching and deleting items:", error);
      return {
        statusCode: 500,
        body: "Internal Server Error"
      };
    }

};

exports.handler = schedule("@weekly", handler);