import { GroceryStore } from './GroceryStore.js';

class HEB extends GroceryStore { 

    constructor() {
        // Constructor logic
        super(); // Must call the constructor of the parent class
    }

    async productSearch(term) {
        return new Promise((resolve, reject) => {
            let fetchString = "https://www.heb.com/graphql";
            fetch(fetchString, {
              method: 'GET',
              headers: {
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/json',
                'Connection': 'Close',
                'Cookie': 'visid_incap_.... (YOUR COOKIE); USER_SELECT_STORE=false; CURR_SESSION_STORE=92',
                'Host': 'www.heb.com',
                'User-Agent': 'Paw/3.3.3 (Macintosh; OS X/12.1.0) GCDHTTPRequest'
              }
            })
            .then(res => {
              if (res.ok) {
                return res.json();
              } else {
                console.log('Product Search for HEB products was unsuccessful with term  ', term);
                resolve(null);
              }
            })
            .then(data => {
              console.log('HEB product data ', data);
              resolve(data);
            })
            .catch(error => {
              console.log('ERROR in HEB Product Search Function', error);
              resolve(null); 
            });
        });
      }

    async getProducts(finalIngredients, locationExists){

    }

    async checkout(itemsToCheckout){

    }

    async locations(zipCode){
        
    }

}

export {HEB}