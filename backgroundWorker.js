import {clientCredentials, cartWriteAuthorizationCode, productSearch,locationSearchByZipcode, locationSearchByLongLat, addToCart, getAuthToken, getRefreshToken} from './KrogerCalls.js'
import {loadFromLocalStorage} from './storageHelpers.js'
import {stripIngredients} from './stripIngredients.js'
import {getRefinedIngredients} from './ChatGPT.js'

//determines if the access token from the Kroger website needs to be returned 
async function getProductAccessToken(){
    return new Promise(async function(resolve,reject) {
        var timeOfExpiry = await loadFromLocalStorage("product_token_expiry_time");
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
            var accessToken = await loadFromLocalStorage("product_access_token");
            resolve(accessToken);
        }
    });
}

async function getCartWriteAuth(){
    return new Promise(async function(resolve,reject) {
        var timeOfExpiry = await loadFromLocalStorage("cart_token_expiry_time");
        //console.log('expiry time', timeOfExpiry);
        var currentTimeSeconds = new Date().getTime() / 1000;
        console.log('current cart Time Seconds', currentTimeSeconds);

        if ((timeOfExpiry === undefined)){ 
            //the key has never been received, call carth Auth
            console.log('Call cart auth credentials. There is no refresh token yet'); 
            cartWriteAuthorizationCode()
            .then(returnedAuthURL => {
                console.log('AUTH URL', returnedAuthURL);
                chrome.identity.launchWebAuthFlow(
                    {
                      url: returnedAuthURL,
                      interactive: true,
                    },
                    (redirectedTo) => {
                        if (chrome.runtime.lastError) {
                            console.log('OAuth 2 Failed', chrome.runtime.lastError);
                            resolve(null)
                        }
                        if (redirectedTo) {
                            // Extract the authorization code from the redirected URL 
                            console.log('get code ', redirectedTo) 
                            const code = new URL(redirectedTo).searchParams.get('code'); 
                            console.log('CODE from AUTH ', code); 
                            getAuthToken(code).then(accessToken => {
                                resolve(accessToken)
                            })
                        }
                    }
                ); 
            })
            .catch(error => {
                console.log('error in backgroundWorker.js. when getting Cart Write Auth', error.message);
                reject(error);
            })
        }else if (currentTimeSeconds > (timeOfExpiry - 30)){ //subtract 30 seconds for buffer 
            console.log('Cart auth key is expired. Call the refresh token API.');
            var refreshToken = await loadFromLocalStorage("refresh_token");
            getRefreshToken(refreshToken)
            .then(accessToken => {
                resolve(accessToken)
            })
        }
        else{
            //the key exists and is not expired, use the access token
            console.log('The Client Cart Auth key exists and is not expired. Using it');
            var accessToken = await loadFromLocalStorage("cart_access_token");
            resolve(accessToken);
        }
    });
}

function checkCategories(categories) { //check if a product is part of a valid category. If not, return false.
    var blackListedCategories = ['Beauty', 'Personal Care', 'Baby', 'Pet Care', 'Cleaning Products', 'Home Decor', 'Natural & Organic'];
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

function pickupDepartmentExists(departments){ //check if the department 'Pickup' exists in the list of departments
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

function returnImage(images) { //return the correct image based on the priorities
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

function prioritizeProducts(ingredient, productsForIngredient) {
    //console.log(ingredient, productsForIngredient);
    const priorityUPCs = [
        ["banana", ["0000000004011", "0000000094011"]],
        ["baking soda", ["0001111090765", "0001990000320"]],
        ["garlic", ["0000000004608", "0001111002882"]],
        ["onion", ["0000000004663", "0000000004082", "0000000004093", "0000000094093","0000000004166"]],
        ["lemon", ["0000000004053"]]
        //add lime and spinach 
        // Add more priorityUPCs as needed
    ];
    //check plural values as well 
    const normalizedIngredient = ingredient.toLowerCase().endsWith('s') ? ingredient.slice(0, -1) : ingredient.toLowerCase();

    // Check if the ingredient is found in the description and prioritize those
    const descriptionPriority = productsForIngredient.filter(product =>
        product.description.toLowerCase().includes(normalizedIngredient)
    );

    if (descriptionPriority.length > 0) {
        // Sort by the percentage of the description occupied by the ingredient
        const sortedByPercentage = descriptionPriority.sort((a, b) => {
            const percentageA = (a.description.toLowerCase().match(new RegExp(normalizedIngredient, 'g')) || []).length / a.description.length;
            const percentageB = (b.description.toLowerCase().match(new RegExp(normalizedIngredient, 'g')) || []).length / b.description.length;
            return percentageB - percentageA;
        });

        // Separate products into priority and non-priority based on UPC
        const priorityProducts = sortedByPercentage.filter(product =>
            priorityUPCs.some(pair => pair[1].includes(product.upc))
        );
        const nonPriorityProducts = sortedByPercentage.filter(product =>
            !priorityUPCs.some(pair => pair[1].includes(product.upc))
        );

        // Concatenate priority and non-priority products
        const prioritizedProducts = [...priorityProducts, ...nonPriorityProducts];

        return prioritizedProducts;
    } else {
        // Continue with the existing logic for priorityUPCs
        const matchingPriorityUPC = priorityUPCs.find(pair => normalizedIngredient.includes(pair[0].toLowerCase()));

        if (matchingPriorityUPC) {
            const [_, npriorityUPCs] = matchingPriorityUPC;

            const priorityProducts = productsForIngredient.filter(product =>
                npriorityUPCs.includes(product.upc)
            );
            const nonPriorityProducts = productsForIngredient.filter(product =>
                !npriorityUPCs.includes(product.upc)
            );

            const prioritizedProducts = [...priorityProducts, ...nonPriorityProducts];

            return prioritizedProducts;
        } else {
            return productsForIngredient;
        }
    }
}

function replaceWords(products) {
    const oldWordPairs = [
        ["spring onion", "green onion"],
        ["garlic clove", "garlic"],
        ["clove garlic", "garlic"],
        ["cloves garlic", "garlic"],
        ["white sugar", "sugar"],
        ["granulated sugar", "sugar"],
        ["egg yolk", "egg"],
        ["great northern bean", "cannellini bean"],
        ["bramley", "green"],
        ["frozen banana", "banana"]
    ];

    const newWordPairs = [
        ["spring onion", "green onion"],
        ["great northern bean", "cannellini bean"],
        ["bramley", "granny smith"],
        ["swede", "rutabaga"],
        ["heavy cream", "heavy whipping cream"],
        ["fennel bulb", "fennel"]
    ];
    
    const resultArray = products.map(product => {
        // Iterate through each word pair for the current product
        newWordPairs.forEach(pair => {
            const [oldWord, newWord] = pair;
            // Create a regular expression to match the old word globally
            const regex = new RegExp("\\b" + oldWord + "(?:s)?\\b", "gi");
            // Replace occurrences of the old word with the new word
            product = product.replace(regex, (match) => {
                // Check if the matched word is in plural form (ends with "s")
                const isPlural = match.toLowerCase().endsWith('s');
                // If it's plural, replace with the new word in singular form
                return isPlural ? newWord + 's' : newWord;
            });
        });

        return product;
    });

    return resultArray;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {    
    if (message.to === 'ingredients'){ //returns ingredients from kroger API
        var ingredients = Object.values(message.data); 
        console.log('found ingredients ', ingredients); 
        getRefinedIngredients(ingredients)
        .then(strippedIngredients =>{
            var products = replaceWords(strippedIngredients)
            console.log('final product list ', products); 
            if(stripIngredients != null){
                getProductAccessToken()
                .then(accessToken => {
                    const promises = [];
                    for (const ingredient of products) {
                      const productsForIngredient = productSearch(accessToken, ingredient);
                      promises.push(
                        productsForIngredient.then(products => prioritizeProducts(ingredient, products['data']))
                      );
                    }
                    return Promise.all(promises);
                  })
                .then(allIngredientProducts => {
                    console.log('All Ingred ', allIngredientProducts);
                    var allProductsFound = []; 
                    for (const j in allIngredientProducts){
                        if (allIngredientProducts[j] != null){
                            let productData = allIngredientProducts[j];
                            if (productData.length !== 0){
                                let singularProductsData = [];
                                for (const index in productData){
                                    let product = productData[index];
                                    var price = null;
                                    if ('price' in product['items'][0] && product['items'][0]['price']['regular'] !== null) {
                                        price = product['items'][0]['price']['regular'];
                                    } else {
                                        price = null; 
                                    }
                                    if (checkCategories(product['categories'])){                           
                                        var newProduct = {
                                            "description": product['description'],
                                            "brand": product['brand'],
                                            "image": returnImage(product['images']),
                                            "price": price,
                                            "upc": product['upc'],
                                            "quantity": 0,
                                            "size": product['items'][0]['size']
                                        };
                                        // TODO: factor in promo price 
                                        singularProductsData.push(newProduct);
                                    }
                                }
                                if (singularProductsData.length !== 0){
                                    allProductsFound.push(singularProductsData);
                                }
                            }
                        }    
                    }
                    //console.log('allProductsFound', allProductsFound);
                    if (allProductsFound.length !== 0){
                        sendResponse({launch: true, ingredientData: allProductsFound}); 
                    }else{
                        sendResponse({launch: false, ingredientData: allProductsFound}); 
                    }
                })        
                .catch(error => {
                    console.log('error in backgroundWorker.js. when getting ingredients', error.message);
                    sendResponse({launch: false}); 
                }); 
            }
        })
    }else if(message.to === 'checkout'){ //allows the user to checkout using API 
        console.log('checkout pressed'); 
        getCartWriteAuth()
        .then(authCode => {
            console.log('Add to cart auth code received ', authCode);
            console.log(message.data);
            if (message.data.length === 0){ //no products selected 
                console.log('no products selected to check out with ')
            }else{
                addToCart(authCode, message.data)
                .then(success => {
                    sendResponse(success);
                })
            }
        })
        .catch(error => {
            console.log('error in backgroundWorker.js. when getting checking out', error.message);
        })
    }else if(message.to === 'locations'){
        getProductAccessToken()
        .then(accessToken => { 
            return new Promise((resolve, reject) => {
              chrome.storage.local.get('zipCode', (result) => {
                //console.log('zip code ', result['zipCode']);
                resolve(locationSearchByZipcode(accessToken, result['zipCode']));
              });
            });
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
                sendResponse({locationData: locationPopupData, locationsFound: locationPopupData.length > 0}); 
            }else{
                console.log('no locations found')
                sendResponse({locationsFound: false}); 
            }
        })
        .catch(error => {
            console.log('error in backgroundWorker.js. when getting locations', error.message);
            sendResponse({locationsFound: false}); 
        })
    }
    return true; // Indicates that the response will be sent asynchronously 

});