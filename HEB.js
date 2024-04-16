class HEB extends GroceryStore { 

    constructor() {
        // Constructor logic
        super(); // Must call the constructor of the parent class
    }

    async productSearch(accessToken, term) {
        return new Promise((resolve, reject) => {
            var locationId = result['locationId'];
            let fetchString = "https://www.heb.com/graphql";
            fetch(fetchString, {
              method: 'GET',
              headers: {
                "Accept": "application/json",
                "Authorization": "Bearer " + accessToken
              }
            })
            .then(res => {
              if (res.ok) {
                return res.json();
              } else {
                console.log('Product Search was unsuccessful with term  ', term);
                resolve(null);
              }
            })
            .then(data => {
              resolve(data);
            })
            .catch(error => {
              console.log('ERROR in Kroger Calls Product Search Function', error);
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