import { stripIngredients } from './stripIngredients.js'
import { getRefinedIngredients } from './ChatGPT.js'
import { Kroger } from './GroceryStores/Kroger.js'
import { search, stores} from './GroceryStores/WalmartAPICalls.js'
import {Walmart} from './GroceryStores/Walmart.js'

chrome.runtime.onInstalled.addListener(function() {

    //registerOpenTabs();
});

function returnGroceryClass(storeType){ //returns the class for the grocery store the user selected
    switch (storeType) {
        case 'Walmart':
            return new Walmart(); 
        case 'Kroger':
            return new Kroger(); 
        default:
            return new Kroger(); 
    }
}

// Function to interleave or alternate between two arrays
function interleaveLocations(array1, array2) {
    const interleavedArray = [];
    const maxLength = Math.max(array1.length, array2.length);
    
    for (let i = 0; i < maxLength; i++) {
        if (i < array1.length) {
            interleavedArray.push(array1[i]);
        }
        if (i < array2.length) {
            interleavedArray.push(array2[i]);
        }
    }
    
    return interleavedArray;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {    
    if(message.to === 'ingredients'){ //returns ingredients from kroger API
        var ingredients = Object.values(message.data); 
        console.log('found ingredients ', ingredients); 
        getRefinedIngredients(ingredients)
        .then(async strippedIngredients =>{
            console.log('strippedIngredients ', strippedIngredients);
            var finalIngredients = stripIngredients(strippedIngredients); 
            console.log('final product list ', finalIngredients); 
            if(strippedIngredients != null){
                chrome.storage.sync.get(['storeType'], (result) => {
                    console.log('store type ingredient', result['storeType']);
                    const groceryStore = returnGroceryClass(result['storeType']); 
                    //remove later 
                    groceryStore.getProducts(finalIngredients, message.locationExists)
                    .then(products => {
                        console.log('products ', products); 
                        sendResponse(products); 
                    }) 
                });
            }else{
                sendResponse({launch: false}); 
            }
        })
    }else if(message.to === 'checkout'){ //allows the user to checkout using API 
        console.log('checkout pressed'); 
        chrome.storage.sync.get('storeType', (result) => {
            const groceryStore = returnGroceryClass(result['storeType']); 
            groceryStore.checkout(message.data)
            .then(checkoutResponse => {
                sendResponse(checkoutResponse);
            })
        }); 
    }else if(message.to === 'locations'){
        chrome.storage.sync.get('zipCode', async (result) => {
            const walGroceryStore = new Walmart();
            const krogGroceryStore = new Kroger();
        
            try {
                // Call the locations method for both stores and await their results
                const walmartLocations = await walGroceryStore.locations(result['zipCode']);
                const krogerLocations = await krogGroceryStore.locations(result['zipCode']);
        
                // Interleave or alternate between Walmart and Kroger locations
                const interleavedLocations = interleaveLocations(walmartLocations, krogerLocations);
        
                // Handle or return interleavedLocations as needed
                //console.log('interleave ', interleavedLocations, walmartLocations, krogerLocations);
                sendResponse({locationData: interleavedLocations, locationsFound: interleavedLocations.length > 0});
            } catch (error) {
                console.error('Error fetching locations:', error);
                // Handle errors here
            }
        });
    }else{
        console.log('unnhandled message in background listener ', message);
    }
    return true; // Indicates that the response will be sent asynchronously 
});

// Listen for tab updates & Deletes 
/*
chrome.tabs.onUpdated.addListener(pinterestPageUpdated); 

var loadingPinterestURLs = {};
function pinterestPageUpdated(tabId, changeInfo, tab) { 
    // Retrieve the current URL using chrome.tabs.get
    chrome.tabs.get(tabId, function(updatedTab) {
        //console.log('tab ', tab); 
        //Check if updatedTab and updatedTab.url are defined 
        //console.log("URL page updated.", changeInfo.url, changeInfo.status, updatedTab.url, loadingPinterestURLs); 
        //URL needs to go from loading to complete in order to work 
        if (updatedTab.url && changeInfo.status === "loading" && updatedTab.url.includes("pinterest.com")){
            console.log('loading pinterest website '); 
            loadingPinterestURLs[tabId] = changeInfo.url;
        }else if(changeInfo.status === "complete"){
            if(loadingPinterestURLs[tabId] == updatedTab.url && updatedTab.url.includes("pinterest.com")){
                console.log("Pinterest page change detected.");
                // Sending a message to the content script of the updated tab
                chrome.tabs.sendMessage(tabId, {to: 'pinterestPageChanged'});                
            }
            delete loadingPinterestURLs[tabId];
        }
    });
}

// Listener for tab removal
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    if (loadingPinterestURLs.hasOwnProperty(tabId)) {
        delete loadingPinterestURLs[tabId];
    }
});
*/ 
// Function to register open tabs when the app is installed
/*
function registerOpenTabs() {
    chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
            if (tab.url && tab.url.includes("pinterest.com")) {
                loadingPinterestURLs[tab.id] = tab.url;
            }
        });
    });
}
*/ 
 