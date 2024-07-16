import {stores, search, productLookup, generateWalmartHeaders} from './WalmartAPICalls.js'
import { GroceryStore } from './GroceryStore.js';
import {loadFromLocalStorage} from '../storageHelpers.js';

class Walmart extends GroceryStore { 
    constructor() {
        super(); // Must call the constructor of the parent class
    }
    #capitalizeFirstLetter(string) {
        if (!string) return ''; // Handle falsy values like undefined or null
        return string
            .trim() // Remove leading and trailing whitespace
            .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
            .split(' ') // Split the string into an array of words
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
            .join(' '); // Join the array back into a single string
    }

    async getProducts(finalIngredients) { 
        console.log('get products Walmart.js', finalIngredients);
    
        try {
            const ingredientDataPromises = finalIngredients.map(async ingredient => {
                // Call search for each ingredient
                const generatedHeaders = await generateWalmartHeaders();
                const searchResult = await search(ingredient, generatedHeaders);
                
                //NEED TO FIX PRODUCT LOOKUP
                // Extract item IDs from search results
                //const itemIds = searchResult.items.map(item => item.itemId);
                //console.log(`Item IDs for ingredient ${ingredient}:`, itemIds);
                
                // Call productLookup with the array of item IDs
                //const productDetails = await productLookup(itemIds, ingredient, generatedHeaders);
                //console.log(`Product details for ingredient ${ingredient}:`, productDetails);
                const productDetails = searchResult; //This is only here until product lookup is fixed
                // Check if productDetails is valid
                if (!productDetails || !productDetails.items) {
                    console.warn(`No product details found for ingredient ${ingredient}`);
                    return null; // Return null to filter out later
                }
    
                // Filter items where stock is "Available"
                const productsArray = productDetails.items.filter(item => item.stock === "Available")
                    .map(item => ({
                        description: item.name || '',
                        brand: item.brandName || '',
                        image: item.largeImage || '',
                        price: item.salePrice || '',
                        upc: item.upc || '', 
                        quantity: 0,
                        size: item.size || '',
                        offerId: item.offerId || '',
                        addToCartUrl: item.affiliateAddToCartUrl || '',
                        itemId: item.itemId || ''
                    }));
                
                // Check if productsArray is empty
                if (productsArray.length === 0) {
                    console.warn(`No available products found for ingredient ${ingredient}`);
                    return null; // Return null to filter out later
                }
    
                return [ingredient, productsArray];
            });
    
            // Wait for all ingredient data to be processed
            const allIngredientData = await Promise.all(ingredientDataPromises);
    
            // Filter out null values
            const ingredientData = allIngredientData.filter(data => data !== null);
    
            console.log('get products results', ingredientData); 
            if(ingredientData.length == 0){
                return {launch: false};  
            }else{
                return {launch: true, ingredientData};  
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            return {launch: false};  
        }
    }
    
    async checkout(itemsToCheckout) {
        console.log('checkout Walmart.js ', itemsToCheckout);
        var locationId; 
        chrome.storage.sync.get('locationId', (result) => {
            locationId = result['locationId'];
            console.log('location id ', locationId);
          }); 
        // Function to wrap chrome.windows.create in a promise
        function createWindow(url) {
            return new Promise((resolve, reject) => {
                chrome.windows.create({
                    url: url,
                    type: 'popup',
                    width: 1,
                    height: 1,
                    left: 0,
                    top: 0
                }, (window) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(window);
                    }
                });
            });
        }
    
        // Function to monitor when the tab has finished loading
        function waitForPageLoad(tabId) {
            return new Promise((resolve) => {
                function listener(tabIdUpdated, changeInfo) {
                    if (tabId === tabIdUpdated && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                }
                chrome.tabs.onUpdated.addListener(listener);
            });
        }
    
        // Function to close the window after a delay
        function closeWindowAfterDelay(window) {
            setTimeout(() => {
                chrome.windows.remove(window.id);
            }, 3000); // Wait for 3 seconds
        }
    
        try {
            const baseUrl = `https://affil.walmart.com/cart/addToCart?items=`
            // Concatenate all items into a single URL
            const concatenatedUrl = itemsToCheckout.reduce((url, item, index) => {
                return url + `${item.itemId}_${item.quantity}` + (index < itemsToCheckout.length - 1 ? '%2C' : '');
            }, baseUrl);
    
            // Create a single window with the concatenated URL
            if(locationId){
                console.log('store Id added in walmart.js checkout')
                concatenatedUrl = concatenatedUrl + `&storeId=` + locationId + `&ap=` + locationId; 
            }
            const window = await createWindow(concatenatedUrl);
            const [tab] = window.tabs;
            await waitForPageLoad(tab.id);
            closeWindowAfterDelay(window);
            
            return { success: true, errorMessage: "Successfully Added To Cart" };
        } catch (error) {
            console.error('Error creating or closing windows:', error);
            return { success: false, errorMessage: "Error When Adding To Cart" };
        }
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
                        var addressObj = {
                            'addressLine1': this.#capitalizeFirstLetter(singleLocation['streetAddress'] || ''),
                            'city': this.#capitalizeFirstLetter(singleLocation['city'] || ''),
                            'state': this.#capitalizeFirstLetter(singleLocation['stateProvCode'] || ''),
                            'zipCode': singleLocation['zip'] || '' // Zip codes are typically not capitalized
                        };
                        var newLocation = {
                            "name": singleLocation['name'],
                            "address": addressObj, 
                            "phone": singleLocation['phoneNumber'].replace(/-/g, ""),
                            "id": singleLocation['no'],
                            "logo": "/images/logos/walmart.png",
                            "storeType": "Walmart"
                        }
                        locationPopupData.push(newLocation);
                    } 
                    resolve(locationPopupData); 
                }else{
                    console.log('no locations found in Walmart.js')
                    resolve([]); 
                }
            })
            .catch(error => {
                console.log('error in backgroundWorker.js. when getting locations', error.message);
                resolve([]); 
            })
        }); 
    }
} 

export{Walmart}
