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
                // Generate headers and perform search
                const generatedHeaders = await generateWalmartHeaders();
                const searchResult = await search(ingredient.productName, generatedHeaders);
                
                // Check if searchResult contains items
                if (!searchResult.items || searchResult.items.length === 0) {
                    console.warn(`No available items found for ingredient ${ingredient.productName}`);
                    return null; // Skip this ingredient
                }
                
                // Extract item IDs from search results
                const itemIds = searchResult.items.map(item => item.itemId);
        
                // Lookup product details
                const productDetails = await productLookup(itemIds, ingredient.productName, generatedHeaders);
        
                // Check if productDetails is valid
                if (!productDetails || !productDetails.items) {
                    console.warn(`No product details found for ingredient ${ingredient.productName}`);
                    return null; // Skip this ingredient
                }
        
                // Filter items where stock is "Available" and map to product objects
                const products = productDetails.items
                    .filter(item => item.stock === "Available")
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
        
                // Skip this ingredient if no valid products are found
                if (products.length === 0) {
                    console.warn(`No valid products found for ingredient ${ingredient.productName}`);
                    return null;
                }
        
                // Append the products array to the ingredient object
                ingredient.products = products;
                return ingredient;
            });
    
            // Wait for all ingredient data to be processed and filter out null values
            const ingredientData = (await Promise.all(ingredientDataPromises)).filter(Boolean);
    
            console.log('get products results', ingredientData); 
            if (ingredientData.length === 0) {
                return { launch: false };
            } else {
                return { launch: true, ingredientData };
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            return { launch: false };
        }
    }    

    async changeLocation(url) {
        return new Promise((resolve, reject) => {
            // Get the current browser window's position and size
            chrome.windows.getCurrent({populate: false}, (currentWindow) => {
                const { left, top, width, height } = currentWindow;
                let popupTop = top + height - 70;
                console.log('popupTop ', popupTop)
                chrome.windows.create({
                    url: url,
                    type: 'popup',
                    width: 1, 
                    height: 1, 
                    left: left, // Align the popup with the current window
                    top: popupTop, // Align the popup with the current window
                    focused: false
                }, (newWindow) => {
                    // Add a delay of 1500 ms before resolving the promise
                    setTimeout(() => {
                        resolve();
                    }, 1500);
                });
            });
        });
    }

    async checkout(itemsToCheckout) { 
        let locationData = await new Promise((resolve, reject) => {
            chrome.storage.sync.get('currentLocation', (result) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(result.currentLocation);
            });
        });
        console.log('locationData in checkout ', locationData); 
        if(locationData){
            console.log('store Id exists in checkout ', locationData);
            let locationCity = locationData.address.city.toLowerCase().replace(/\s+/g, '-');
            let locationState = locationData.address.state.toLowerCase();
        
            var baseUrl = `https://www.walmart.com/store/${locationData.id}-${locationCity}-${locationState}`;
            const urlWithFlag = `${baseUrl}?fromExtension=true`;
    
            await this.changeLocation(urlWithFlag); 
        }

        console.log('checkout Walmart.js ', itemsToCheckout); 

        // Function to wrap chrome.windows.create in a promise
        function createWindow(url) {
            return new Promise((resolve, reject) => {
                // Get the current browser window's position and size
                chrome.windows.getCurrent({populate: false}, (currentWindow) => {
                    const { left, top, width, height } = currentWindow;
                    let popupTop = top + height - 70;

                    chrome.windows.create({
                        url: url,
                        type: 'popup',
                        width: 1, 
                        height: 1, 
                        left: left, // Align the popup with the current window
                        top: popupTop, // Align the popup with the current window
                        focused: false
                    }, (window) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(window);
                        }
                    });
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
            const baseUrlOffers = `https://goto.walmart.com/c/2263813/1207219/9383?veh=aff&sourceid=imp_000011112222333344&u=http%3A%2F%2Faffil.walmart.com%2Fcart%2FaddToCart%3Foffers%3D`
            var concatenatedUrlOffers = itemsToCheckout.reduce((url, item, index) => {
                return url + `${item.offerId}_${item.quantity}` + (index < itemsToCheckout.length - 1 ? '%2C' : '');
            }, baseUrlOffers); 
            
            if(locationData){
                console.log('store Id added in walmart.js checkout')
                concatenatedUrlOffers = concatenatedUrlOffers + `&storeId=` + locationData.id; 
            }
            console.log('checkout url ', concatenatedUrlOffers);
            const window = await createWindow(concatenatedUrlOffers);
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

    getCartUrl(){
        return('https://www.walmart.com/cart');
    }
} 

export{Walmart}
