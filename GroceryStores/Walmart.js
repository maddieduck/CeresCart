import {stores, search} from './WalmartAPICalls.js'
import { GroceryStore } from './GroceryStore.js';
import {loadFromLocalStorage} from '../storageHelpers.js';

class Walmart extends GroceryStore { 
    constructor() {
        super(); // Must call the constructor of the parent class
    }
    async getProducts(finalIngredients) { 
        console.log('get products Walmart.js', finalIngredients);
        const promises = finalIngredients.map(ingredient => search(ingredient));
    
        try {
            const allIngredientProducts = await Promise.all(promises); 
    
            // Process the results into a 2D array where each element is [ingredient, productsArray]
            const ingredientData = allIngredientProducts.map((singularProductsData, index) => {
                const ingredient = finalIngredients[index];
                const productsArray = singularProductsData.items.map(item => ({
                    description: item.name || '',
                    brand: item.brandName || '',
                    image: item.largeImage || '',
                    price: item.salePrice || '',
                    upc: item.affiliateAddToCartUrl || '', //This is correct. This url is used to checkout, not upc
                    quantity: 0,
                    size: item.size || ''
                }));
                console.log('ingred data ', allIngredientProducts);

                return [ingredient, productsArray];
            });
    
            console.log('get products results', ingredientData); 
            return {launch: true, ingredientData};  
        } catch (error) {
            console.error('Error fetching products:', error);
            return {launch: false};  
        }
    }
    
    async checkout(itemsToCheckout) {
        console.log('checkout Walmart.js ', itemsToCheckout);
        // Base URL for the API endpoint
        const baseURL = 'https://affil.walmart.com/cart/addToCart?items=';
        // Format itemsToCheckout into the desired string
        const formattedItems = itemsToCheckout.map(item => `${item.upc}_${item.quantity}`).join(',');
        // Construct the final URL
        const finalURL = baseURL + formattedItems;
        //console.log('Final URL:', finalURL);
    
        // Open the new window with the final URL
        chrome.windows.create({
            url: itemsToCheckout[0].upc,
            type: 'normal',  // or 'normal' to open in a new window
            width: 800,     // Optional: Specify width
            height: 600     // Optional: Specify height
        });
        return({success: true, errorMessage: "Successfully Added To Cart"}); 
    }
    
    async locations(zipCode){ //returns store locations for Walmart 
        //console.log('locations Walmart.js')
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
