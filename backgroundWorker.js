import {clientCredentials, cartWriteAuthorizationCode, productSearch,locationSearchByZipcode, locationSearchByLongLat, addToCart, getAuthToken, getRefreshToken} from './KrogerCalls.js'
import {loadFromLocalStorage} from './storageHelpers.js'
import {stripIngredients} from './stripIngredients.js'
var appID = 'ndfnmkebkdcejlijnlgihonfeoepefbl' //TODO: Change to published app's ID and make consistent 

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
                //TODO: try again?
                console.log('error in backgroundWorker.js. when getting ingredients', error.message);
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

function checkCategories(categories) {
    var blackListedCategories = ['Beauty', 'Personal Care'];
    if (!categories || categories.length === 0) {
        return false; // Return false if the array is blank
    }
    // Check if all categories are blacklisted
    var allBlacklisted = categories.every(function(category) {
        return blackListedCategories.includes(category);
    });
    return !allBlacklisted;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    //console.log("ingredients found on page", message); 
    if (message.to === 'ingredients'){ //returns ingredients from kroger API
        var ingredients = Object.values(message.data);
        var strippedIngredients = stripIngredients(ingredients); 
        console.log('stripped ingredients ', strippedIngredients); 

        getProductAccessToken()
        .then(accessToken => {
            const promises = [];
            //console.log('accessToken ', accessToken);
            for (const ingredient in strippedIngredients){
                //console.log(strippedIngredients[ingredient]);
                const promise = productSearch(accessToken, strippedIngredients[ingredient]); 
                promises.push(promise);
            }
            return Promise.all(promises);
        })
        .then(allIngredientProducts => {
            console.log('All Ingred ', allIngredientProducts);
            //TODO: Remove items that are not food. Sort by category. Blacklist 'Baby', 'Personal Care', "Beauty"
            var allProductsFound = []; 
            for (const j in allIngredientProducts){
                if (allIngredientProducts[j] != null){
                    let productData = allIngredientProducts[j]['data'];
                    if (productData.length !=0){
                        let singularProductsData = [];
                        for (const index in productData){
                            let product = productData[index];
                            var price = null
                            if ('price' in product['items'][0] && product['items'][0]['price']['regular'] !== null) {
                                price = product['items'][0]['price']['regular']
                            }else{
                                price = null; 
                            }
                            if (checkCategories(product['categories'])){                           
                                var newProduct = {
                                "description": product['description'],
                                "brand": product['brand'],
                                "image": product['images'][0]['sizes'][0]['url'],
                                "price": price,
                                "upc": product['upc'],
                                "quantity": 0,
                                "size": product['items'][0]['size']
                                }
                                //TODO: factor in promo price 
                                //TODO: price is only returned with a location 
                                //newProduct.price = product['items'][0]['price']['regular']
                                singularProductsData.push(newProduct);
                            }
                        }
                        if (singularProductsData != []){
                            allProductsFound.push(singularProductsData);
                        }
                    }
                }    
            }
            console.log('allProductsFound', allProductsFound);
            if (allProductsFound.length != 0){
                sendResponse({launch: true, ingredientData: allProductsFound}); 
            };
        })
        .catch(error => {
            console.log('error in backgroundWorker.js. when getting ingredients', error.message);
            sendResponse({launch: false}); 
        }); 
        return true; // Indicates that the response will be sent asynchronously 
    }else if(message.to === 'checkout'){ //allows the user to checkout using API 
        console.log('checkout pressed'); 
        getCartWriteAuth()
        .then(authCode => {
            console.log('Add to cart auth code received ', authCode);
            console.log(message.data);
            if (message.data.length === 0){ //no products selected 
                //TODO: Send feedback to user that they haven't selected anything
                console.log('no products selected to check out with ')
            }else{
                addToCart(authCode, message.data)
            }
        })
        .catch(error => {
            console.log('error in backgroundWorker.js. when getting checking out', error.message);
        })
    }
});


