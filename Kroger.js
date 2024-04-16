import {clientCredentials, cartWriteAuthorizationCode, productSearch,locationSearchByZipcode, locationSearchByLongLat, addToCart, getAuthToken, getRefreshToken} from './KrogerAPICalls.js'
import { GroceryStore } from './GroceryStore.js';
import {loadFromLocalStorage} from './storageHelpers.js';

class Kroger extends GroceryStore { 
    constructor() {
        // Constructor logic
        super(); // Must call the constructor of the parent class
    }
    //possibly delete this function. Unused. 
    #pickupDepartmentExists(departments){ //check if the department 'Pickup' exists in the list of departments
        // Iterate through the departments
        for (var i = 0; i < departments.length; i++) {
            var department = departments[i];
            // Check if the department name is 'Pickup'
            if (department.name === 'Pickup') {
              return true; 
            }
        }
        return false; 
    }

    async #getCartWriteAuth(){
        return new Promise(async function(resolve,reject) {
            var timeOfExpiry = await loadFromLocalStorage("kroger_cart_token_expiry_time");
            //console.log('expiry time', timeOfExpiry);
            var currentTimeSeconds = new Date().getTime() / 1000;
            console.log('current cart Time Seconds', currentTimeSeconds);
    
            if ((timeOfExpiry === undefined)){ 
                //the key has never been received, call carth Auth
                console.log('Call cart auth credentials. There is no refresh token yet'); 
                cartWriteAuthorizationCode()
                .then(returnedAuthURL => {
    
                    console.log('AUTH URL', returnedAuthURL);
                    // Create a new window for OAuth 2 validation
                    chrome.windows.create({ url: returnedAuthURL, type: 'popup' }, (newWindow) => {
                        const newWindowId = newWindow.id;
                    
                        // Listen for URL changes in the new window
                        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
                            console.log('listener executed');
                            console.log('window ID ', tab.windowId, 'id ', newWindowId, 'url ', changeInfo.url);
                            if (tab.windowId === newWindowId && changeInfo.url) {
                                // Check if the updated URL matches your expected redirect URL 
                                if (!changeInfo.url.startsWith(returnedAuthURL)) {
                                    // Extract the code parameter after the url has changed
                                    const code = new URL(changeInfo.url).searchParams.get('code');
                                    console.log('Extracted code:', code);
                    
                                    //Check if the code indicates successful login
                                    if (code) {
                                        //Close the window
                                        getAuthToken(code).then(accessToken => {
                                            resolve(accessToken)
                                        })
                                    }else{
                                        console.log('Error with OAuth 2. No code. ')
                                        resolve(null);
                                    }
                                    chrome.windows.remove(newWindowId);
                                }
                            }
                        });
                    });
                })
                .catch(error => {
                    console.log('error in backgroundWorker.js. when getting Cart Write Auth', error.message);
                    reject(error);
                })
            }else if (currentTimeSeconds > (timeOfExpiry - 30)){ //subtract 30 seconds for buffer 
                console.log('Cart auth key is expired. Call the refresh token API.');
                var refreshToken = await loadFromLocalStorage("kroger_refresh_token");
                getRefreshToken(refreshToken)
                .then(accessToken => {
                    resolve(accessToken)
                })
            }
            else{
                //the key exists and is not expired, use the access token
                console.log('The Client Cart Auth key exists and is not expired. Using it');
                var accessToken = await loadFromLocalStorage("kroger_cart_access_token");
                resolve(accessToken);
            }
        });
    }

    //determines if the access token from the Kroger website needs to be returned 
    async #getProductAccessToken(){
        return new Promise(async function(resolve,reject) {
            var timeOfExpiry = await loadFromLocalStorage("kroger_product_token_expiry_time");
            //console.log('expiry time', timeOfExpiry);
            var currentTimeSeconds = new Date().getTime() / 1000;
            console.log('currentTimeSeconds', currentTimeSeconds);
            if ((currentTimeSeconds > (timeOfExpiry - 30)) || (timeOfExpiry === undefined)){ //subtract 30 seconds for buffer 
                //the key has expired or it has never been set, call client credentials to get a new key 
                console.log('call client credentials'); 
                var accessToken = await clientCredentials(); 
                resolve(accessToken);
            }else{
                //the key exists and is not expired, use the access token
                console.log('The Client Cred key exists and is not expired, using it');
                var accessToken = await loadFromLocalStorage("kroger_product_access_token");
                resolve(accessToken);
            }
        });
    }

    #prioritizeProducts(ingredient, productsForIngredient) {
        //make sure ingredient is not plural
        if (ingredient.endsWith("s")){
            ingredient = ingredient.slice(0, -1);
        }else if (ingredient.endsWith("es")){
            ingredient = ingredient.slice(0, -2);
        }
        // Initialize variables for products with and without the ingredient
        let productsWithIngredient = [];
        let productsWithoutIngredient = [];
        
        // Iterate through the array and sort into respective variables
        productsForIngredient.forEach(product => {
            if (product.description.toLowerCase().includes(ingredient.toLowerCase())) {
                productsWithIngredient.push(product);
            } else {
                productsWithoutIngredient.push(product);
            }
        });
        
        //sort UPC that have ingredient
        let productsWithIngredient94 = [];
        let productsWithIngredient4 = [];
        let productsWithIngredientOther = [];
        productsWithIngredient.forEach(product => {
            let numberString = product.upc.toString();
            if (numberString.length >= 10 && numberString[8] === '9' && numberString[9] === '4') {
                productsWithIngredient94.push(product);
            }else if (numberString.length >= 10 && numberString[9] === '4') {
                productsWithIngredient4.push(product);
            }else{
                productsWithIngredientOther.push(product);
            }
        });
        //products that are produce
        var productsWithIngredientProduce = this.#sortByPercentInDescription(ingredient, [...productsWithIngredient4, ...productsWithIngredient94]);
        productsWithIngredientOther = this.#sortByPercentInDescription(ingredient, productsWithIngredientOther);
        
        //sort UPC that have ingredient
        let productsWithoutIngredient94 = [];
        let productsWithoutIngredient4 = [];
        let productsWithoutIngredientOther = [];
        productsWithoutIngredient.forEach(product => {
            let numberString = product.upc.toString();
            if (numberString.length >= 10 && numberString[8] === '9' && numberString[9] === '4') {
                productsWithoutIngredient94.push(product);
            }else if (numberString.length >= 10 && numberString[9] === '4') {
                productsWithoutIngredient4.push(product);
            }else{
                productsWithoutIngredientOther.push(product);
            }
        });
        
        return [...productsWithIngredientProduce, ...productsWithIngredientOther, ...productsWithoutIngredient4, ...productsWithoutIngredient94, ...productsWithoutIngredientOther]; 
    }

    #checkCategories(categories) { //check if a product is part of a valid category. If not, return false.
        var blackListedCategories = ['Beauty', 'Personal Care', 'Baby', 'Pet Care', 'Cleaning Products', 'Home Decor', 'Natural & Organic', "Garden & Patio"];
        //TODO: may want to remove Natural & Organic. For 'lavender' was returning 'Cleaning Products' & 'N&O' for Mrs. Meyers Clean Day Soap
        //may want to remove anything containing cleaning products 
        if (!categories || categories.length === 0) {
            return false; // Return false if the array is blank
        }
        // Check if all categories are blacklisted
        var allBlacklisted = categories.every(function(category) {
            return blackListedCategories.includes(category);
        });
        return !allBlacklisted;
    }

    #returnImage(images) { //return the correct image based on the priorities
        const sizePriorities = ["xlarge", "large", "medium", "small", "thumbnail"];
        const perspectivePriorities = ["front", "left", "top"];
        const defaultURL = "chrome-extension://ndfnmkebkdcejlijnlgihonfeoepefbl/images/no image found.png"
    
        // Find the object with the highest priority perspective
        const highestPriorityPerspective = perspectivePriorities.find(perspective =>
            images.some(image => image.perspective === perspective)
        );
    
        if (!highestPriorityPerspective) {
            // Handle the case where no matching perspective is found
            console.error("No matching perspective found");
            return defaultURL;
        }
    
        // Find the size object with the highest priority size for the chosen perspective
        const highestPrioritySize = sizePriorities.find(size =>
            images.some(image =>
                image.perspective === highestPriorityPerspective &&
                image.sizes.some(imgSize => imgSize.size === size)
            )
        );
    
        if (!highestPrioritySize) {
            // Handle the case where no matching size is found for the chosen perspective
            console.error("No matching size found for the chosen perspective");
            return defaultURL;
        }
    
        // Return the URL of the highest priority size image for the chosen perspective
        const imageUrl = images.find(image =>
            image.perspective === highestPriorityPerspective &&
            image.sizes.some(size => size.size === highestPrioritySize)
        ).sizes.find(size => size.size === highestPrioritySize).url;
    
        return imageUrl;
    }

    #sortByPercentInDescription(ingredient, productsForIngredient) {
        // Ensure the ingredient is lowercase for case-insensitive comparison
        ingredient = ingredient.toLowerCase();
    
        // Sort the array by the largest percent in descending order
        const sortedProducts = productsForIngredient.sort((a, b) => {
            const descriptionA = a.description.toLowerCase();
            const descriptionB = b.description.toLowerCase();
    
            // Calculate the percentage of the ingredient in each description
            const percentA = (descriptionA.split(ingredient).length - 1) / descriptionA.split(' ').length;
            const percentB = (descriptionB.split(ingredient).length - 1) / descriptionB.split(' ').length;
    
            // Sort by the largest percent in descending order
            return percentB - percentA;
        });
    
        return sortedProducts;
    }

    async getProducts(finalIngredients, locationExists){  
        return new Promise((resolve, rejects)=>{

            this.#getProductAccessToken()
            .then(accessToken => {
                const promises = finalIngredients.map(ingredient => productSearch(accessToken, ingredient));
                return Promise.all(promises);
            })
            .then(allIngredientProducts => {
                console.log('All Ingred ', allIngredientProducts); 
                var allProductsFound = new Map();
                for (const j in allIngredientProducts) {
                    if (allIngredientProducts[j] && allIngredientProducts[j]['data'] != null) {
                        let productData = allIngredientProducts[j]['data'];
                        if (productData.length !== 0) {
                            let singularProductsData = [];
                            for (const index in productData) {
                                let product = productData[index];
                                var price = null;
                                if ('price' in product['items'][0] && product['items'][0]['price']['regular'] !== null) {
                                    price = product['items'][0]['price']['regular'];
                                } else {
                                    price = null;
                                }
                                if (this.#checkCategories(product['categories'])) {
                                    // Only append to singularProductsData if price exists and is not null
                                    if ((locationExists && price !== null) || (!locationExists)) {
                                        var newProduct = {
                                            "description": product['description'],
                                            "brand": product['brand'],
                                            "image": this.#returnImage(product['images']),
                                            "price": price,
                                            "upc": product['upc'],
                                            "quantity": 0,
                                            "size": product['items'][0]['size']
                                        };
                                        singularProductsData.push(newProduct);
                                    }
                                }
                            }
                            if (singularProductsData.length !== 0) {
                                allProductsFound.set(finalIngredients[j], singularProductsData);
                            }
                        }
                    }
                }
                console.log('all ingred products ', allProductsFound)
                if (allProductsFound.size !== 0){ 
                    const prioritizedMap = Array.from(allProductsFound).map(([ingredients, products]) => {
                        const prioritizedProducts = this.#prioritizeProducts(ingredients, products); 
                        return [ingredients, prioritizedProducts]; 
                    });
                    console.log("prioritized items ", prioritizedMap);
                    resolve({launch: true, ingredientData: prioritizedMap}); 
                }else{
                    resolve({launch: false}); 
                } 
            })        
            .catch(error => {
                console.log('error in backgroundWorker.js. when getting ingredients', error.message);
                resolve({launch: false}); 
            }); 
        });
    }

    async checkout(itemsToCheckout){
        return new Promise((resolve, rejects)=>{
            this.#getCartWriteAuth()
            .then(authCode => {
                console.log('Add to cart auth code ', authCode);
                if(authCode == null){
                    resolve({success: false, "errorMessage": "Cannot Authorize User"}); 
                }else{
                    addToCart(authCode, itemsToCheckout)
                    .then(success => {
                        console.log('add to cart successful? ', success);
                        if(success){//decrement free trial variable if relevant 
                            chrome.storage.sync.get('buttonCounter', (result) => {
                                var buttonCount = Number(result['buttonCounter']); 
                                if(buttonCount>0){ 
                                    buttonCount--; 
                                    chrome.storage.sync.set({'buttonCounter': buttonCount});
                                    console.log('exports left ', buttonCount);
                                } 
                            }); 
                            resolve({success: true, errorMessage: "Successfully Added To Cart"}); 
                        }else{
                            console.log('Error when adding to cart.')
                            resolve({success: false, errorMessage: "Error When Adding To Cart"}); 
                        }
                    })
                }
            })
            .catch(error => {
                console.log('error in backgroundWorker.js. when getting checking out', error.message);
                resolve({success: false, "errorMessage": "Error When Authorizing"}); 
            })
        }); 
    }    

    async locations(zipCode){
        return new Promise((resolve, rejects)=>{
            this.#getProductAccessToken()
            .then(async accessToken => { 
                var locationData = await locationSearchByZipcode(accessToken, zipCode);
                return locationData; 
            })
            .then(locationData =>{
                console.log('location data ', locationData)
                if (locationData != null && locationData['data'].length != 0){
                    var locationPopupData = []
                    for (const index in locationData['data']){
                        var singleLocation = locationData['data'][index];
                        var newLocation = {
                            "name": singleLocation['name'],
                            "address": singleLocation['address'],
                            "phone": singleLocation['phone'],
                            "id": singleLocation['locationId']
                        }
                        var pickupExists = true //TODO: pickupDepartmentExists(singleLocation['departments']);
                        if((singleLocation['phone'] != '9999999999') && pickupExists){ //filter locations 
                            locationPopupData.push(newLocation);
                        }
                    } 
                    console.log('locationPopupData ', locationPopupData);
                    resolve({locationData: locationPopupData, locationsFound: locationPopupData.length > 0}); 
                }else{
                    console.log('no locations found')
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

export{Kroger}