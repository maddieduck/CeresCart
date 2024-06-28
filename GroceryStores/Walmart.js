import {stores} from './WalmartAPICalls.js'
import { GroceryStore } from './GroceryStore.js';
import {loadFromLocalStorage} from '../storageHelpers.js';

class Walmart extends GroceryStore { 
    constructor() {
        // Constructor logic
        super(); // Must call the constructor of the parent class
    }

    async getProducts(finalIngredients, locationExists){  

    }

    async checkout(itemsToCheckout){
  
    }    

    async locations(zipCode){ //returns store locations for Walmart 
        return new Promise((resolve, rejects)=>{
            stores(zipCode)
            .then(locationData =>{
                //console.log('Walmart location data ', locationData)
                if (locationData != null && locationData.length != 0){
                    var locationPopupData = []
                    for (const index in locationData){
                        var singleLocation = locationData[index];
                        var newLocation = {
                            "name": singleLocation['name'],
                            "address": singleLocation['streetAddress'], //todo; format address better 
                            "phone": singleLocation['phoneNumber'],
                            "id": singleLocation['no']
                        }
                        locationPopupData.push(newLocation);
                    } 
                    //console.log('locationPopupData ', locationPopupData);
                    resolve({locationData: locationPopupData, locationsFound: locationPopupData.length > 0}); 
                }else{
                    console.log('no locations found in Walmart.js')
                    resolve({locationsFound: false}); 
                }
            })
            .catch(error => {
                console.log('error in backgroundWorker.js. when getting locations', error.message);
                resolve({locationsFound: false}); 
            })
        }); 
    }
} 

export{Walmart}
