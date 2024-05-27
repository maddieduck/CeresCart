import { stripIngredients } from './stripIngredients.js'
import { getRefinedIngredients } from './ChatGPT.js'
import { ExtPay } from './ExtPay.js'
import { Kroger } from './GroceryStores/Kroger.js'
let lastURL = {}; 

//import { search } from './GroceryStores/WalmartAPICalls.js'

chrome.runtime.onInstalled.addListener(function() {
    // Initialize the counter
    chrome.storage.sync.set({'buttonCounter': 3});

    // this line is required to use ExtPay in the rest of your extension
    const extpay = ExtPay('ceres-cart');
    extpay.startBackground(); 
    console.log('ext pay started');

    //to initialize keeping track of the last URL 
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            lastURL[tab.id] = tab.url;
        });
        console.log('Initialized tab tracking on installation:', lastURL);
    });
});

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
        //search(); 
        const groceryStore = returnGroceryClass(); 
        var ingredients = Object.values(message.data); 
        console.log('found ingredients ', ingredients); 
        getRefinedIngredients(ingredients)
        .then(async strippedIngredients =>{
            var finalIngredients = stripIngredients(strippedIngredients); 
            console.log('final product list ', finalIngredients); 
            if(strippedIngredients != null){
                groceryStore.getProducts(finalIngredients, message.locationExists)
                .then(products => {
                    console.log('products ', products); 
                    sendResponse(products); 
                }) 
            }else{
                sendResponse({launch: false}); 
            }
        })
    }else if(message.to === 'checkout'){ //allows the user to checkout using API 
        const groceryStore = returnGroceryClass(); 
        console.log('checkout pressed'); 
        groceryStore.checkout(message.data)
        .then(checkoutResponse => {
            sendResponse(checkoutResponse);
        })
    }else if(message.to === 'locations'){
        chrome.storage.sync.get('zipCode', (result) => {
            //console.log('zip code ', result['zipCode']);
            var zipCode = result['zipCode']; 
            const groceryStore = returnGroceryClass(); 
            groceryStore.locations(zipCode).then(locationsResponse => {
                sendResponse(locationsResponse); 
            })
        });
    }else{
        console.log('unnhandled message in background listener ', message);
    }
    return true; // Indicates that the response will be sent asynchronously 
});

// Listen for tab updates & Deletes 
chrome.tabs.onUpdated.addListener(pinterestPageUpdated); 

var loadingPinterestURL = null; 

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    delete lastURL[tabId];
    console.log(`Tab ${tabId} closed and removed from tracking.`);
});

function pinterestPageUpdated(tabId, changeInfo, tab) { 
    // Retrieve the current URL using chrome.tabs.get
    chrome.tabs.get(tabId, function(updatedTab) {
        //console.log('tab ', tab); 
        //Check if updatedTab and updatedTab.url are defined 
        console.log("URL page updated.", changeInfo.url, changeInfo.status, updatedTab.url, lastURL[tabId]); 
        //URL needs to go from loading to complete in order to work 
        if (changeInfo.url && changeInfo.status === "loading" && updatedTab.url.includes("pinterest.com")){
            //lastURL[tabId] && lastURL[tabId].includes("pinterest.com/pin")
            /*check the last website because if this is the first time going to pinterest 
            you do not need to trigger this message. The popup will try to run the first time anyways*/
            console.log('loading pinterest website '); 
            loadingPinterestURL = changeInfo.url; 
        }else if(changeInfo.status === "complete"){
            if(loadingPinterestURL == updatedTab.url && updatedTab.url.includes("pinterest.com")){
                console.log("Pinterest page change detected.");
                // Sending a message to the content script of the updated tab
                chrome.tabs.sendMessage(tabId, { to: 'pinterestPageChanged' });                
            }
            loadingPinterestURL = null;
        }
        lastURL[tabId] = updatedTab.url;
    });
}

// Function to clean up the last url dictionary 
function cleanupTabUrls() {
    chrome.tabs.query({}, (tabs) => {
      const openTabIds = tabs.map(tab => tab.id);
      // Remove entries for tabs that are no longer open
      for (const tabId in lastURL) {
        if (!openTabIds.includes(parseInt(tabId, 10))) {
          delete lastURL[tabId];
          console.log(`Cleaned up closed tab ${tabId} from tracking.`);
        }
      }
    });
  }
  
// Optional: Set up periodic cleanup
setInterval(cleanupTabUrls, 60000); // Clean up every 60 seconds