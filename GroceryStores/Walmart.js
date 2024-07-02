import {stores, search} from './WalmartAPICalls.js'
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
                //console.log('ingred data ', allIngredientProducts);

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
            // Create windows for each item with the updated URL
            const promises = itemsToCheckout.map(async item => {
                const url = `${item.upc}_${item.quantity}`;
                const window = await createWindow(url);
                const [tab] = window.tabs;
                await waitForPageLoad(tab.id);
                closeWindowAfterDelay(window);
                return window;
            });
    
            // Wait for all pages to load
            await Promise.all(promises);
    
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
                            "id": singleLocation['no']
                        }
                        locationPopupData.push(newLocation);
                    } 
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
