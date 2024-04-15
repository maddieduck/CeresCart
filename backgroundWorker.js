import {clientCredentials, cartWriteAuthorizationCode, productSearch,locationSearchByZipcode, addToCart, getAuthToken, getRefreshToken} from './KrogerAPICalls.js'
import {loadFromLocalStorage} from './storageHelpers.js'
import {stripIngredients} from './stripIngredients.js'
import {getRefinedIngredients} from './ChatGPT.js'
import {ExtPay} from './ExtPay.js'
import {walmartClientCredentials} from './WalmartCalls.js'
import {Kroger} from './Kroger.js'
import { GroceryStore } from './GroceryStore.js'

chrome.runtime.onInstalled.addListener(function() {
    // Initialize the counter
    chrome.storage.sync.set({'buttonCounter': 3});

    // this line is required to use ExtPay in the rest of your extension
    const extpay = ExtPay('ceres-cart');
    extpay.startBackground(); 
    console.log('ext pay started');
});

//determines if the access token from the Kroger website needs to be returned 
async function getProductAccessToken(){
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

async function getCartWriteAuth(){
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

function returnGroceryClass(){
    //TODO: Change to be with more options
    return new Kroger(); 
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {    
    if (message.to === 'userHasAccess'){ //returns ingredients from kroger API
        //check if the user has paid 
        const extpay = ExtPay('ceres-cart');
        extpay.getUser().then(user => { 
            console.log('ext pay user ', user, 'paid ', user['paid']); 
            if(user['paid']){
                sendResponse({'userPaid': true, "exportsLeft": null}); 
            }else{
                chrome.storage.sync.get('buttonCounter', (result) => {
                    var buttonCount = Number(result['buttonCounter']); 
                    if (buttonCount){
                        //free  uses are available 
                        sendResponse({'userPaid': false, "exportsLeft": buttonCount}); 
                    }else{
                        //free uses are up
                        sendResponse({'userPaid': false, "exportsLeft": 0}); 
                    }
                });
            }
        })
    }else if(message.to === 'launchPayWindow'){
        const extpay = ExtPay('ceres-cart')
        extpay.openPaymentPage();
    }else if (message.to === 'ingredients'){ //returns ingredients from kroger API
        const groceryStore = returnGroceryClass(); 
        var ingredients = Object.values(message.data); 
        console.log('found ingredients ', ingredients); 
        getRefinedIngredients(ingredients)
        .then(async strippedIngredients =>{
            var finalIngredients = stripIngredients(strippedIngredients); 
            console.log('final product list ', finalIngredients); 
            if(strippedIngredients != null){
                groceryStore.getProducts(finalIngredients, message)
                .then(products => {
                    console.log('products ', products); 
                    sendResponse(products); 
                }) 
            }else{
                sendResponse({launch: false}); 
            }
        })
    }else if(message.to === 'checkout'){ //allows the user to checkout using API 
        console.log('checkout pressed'); 
        getCartWriteAuth()
        .then(authCode => {
            console.log('Add to cart auth code ', authCode);
            if(authCode == null){
                sendResponse({success: false, "errorMessage": "Cannot Authorize User"}); 
            }else{
                addToCart(authCode, message.data)
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
                        sendResponse({success: true, errorMessage: "Successfully Added To Cart"}); 
                    }else{
                        console.log('Error when adding to cart.')
                        sendResponse({success: false, errorMessage: "Error When Adding To Cart"}); 
                    }
                })
            }
        })
        .catch(error => {
            sendResponse({success: false, "errorMessage": "Error When Authorizing"}); 
            console.log('error in backgroundWorker.js. when getting checking out', error.message);
        })
    }else if(message.to === 'locations'){
        getProductAccessToken()
        .then(accessToken => { 
            return new Promise((resolve, reject) => {
              chrome.storage.sync.get('zipCode', (result) => {
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
    }else{
        console.log('unnhandled message in background listener ', message);
    }
    return true; // Indicates that the response will be sent asynchronously 
});
