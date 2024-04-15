import {clientCredentials, cartWriteAuthorizationCode, productSearch,locationSearchByZipcode, locationSearchByLongLat, addToCart, getAuthToken, getRefreshToken} from './KrogerAPICalls.js'
import { GroceryStore } from './GroceryStore.js';
import {loadFromLocalStorage} from './storageHelpers.js';

class Kroger extends GroceryStore { 
    constructor() {
        // Constructor logic
        super(); // Call the constructor of the parent class
    }
    
    //TODO:Make private
    prioritizeProducts(ingredient, productsForIngredient) {
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
        var productsWithIngredientProduce = this.sortByPercentInDescription(ingredient, [...productsWithIngredient4, ...productsWithIngredient94]);
        productsWithIngredientOther = this.sortByPercentInDescription(ingredient, productsWithIngredientOther);
        
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
    //TODO Make private
    checkCategories(categories) { //check if a product is part of a valid category. If not, return false.
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
    //TODO Make private
    returnImage(images) { //return the correct image based on the priorities
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

    sortByPercentInDescription(ingredient, productsForIngredient) {
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
    
    //TODO Make private
    async getProductAccessToken(){
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

    async getProducts(finalIngredients, message){  
        return new Promise((resolve, rejects)=>{

            this.getProductAccessToken()
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
                                if (this.checkCategories(product['categories'])) {
                                    // Only append to singularProductsData if price exists and is not null
                                    if ((message.locationExists && price !== null) || (!message.locationExists)) {
                                        var newProduct = {
                                            "description": product['description'],
                                            "brand": product['brand'],
                                            "image": this.returnImage(product['images']),
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
                        const prioritizedProducts = this.prioritizeProducts(ingredients, products); 
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
} 

export{Kroger}