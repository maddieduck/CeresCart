var clientID = 'chromeextension-9164a765a55fbb5196e486a21816eebc2545707629365177077'
var clientSecret = '-K-l4m3_XtLtLDYzWbhRyuCiR9esN3Oo2BRX00Kz'
var redirectURI = 'https://neodpkgadbjhpapepfepfegjokomhnhc.chromiumapp.org' 
import {saveToLocalStorage} from './storageHelpers.js'

async function clientCredentials(){ //gets a token for use When making API requests that do not require customer consent 
  return new Promise((resolve, rejects)=>{
    fetch('https://api.kroger.com/v1/connect/oauth2/token?', {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(clientID + ':' + clientSecret)
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'product.compact'
      })
    }).then(res => {
      if (res.ok){
        return res.json()
      }else{
        console.log('Client Credentials was unsuccessful. ', res);
        rejects("fetch response in Kroger Calls returned an invalid response");
      }
    })
    .then(data => {
      console.log('data from client cred ', data);
      var currentTimeSeconds = new Date().getTime() / 1000; 
      var expiryTime = currentTimeSeconds + data["expires_in"]; 
      console.log('expiry time', expiryTime); 
      saveToLocalStorage('product_token_expiry_time', expiryTime); 
      saveToLocalStorage('product_access_token', data["access_token"]); 
      resolve(data["access_token"]);  
    })
    .catch(error => {
      console.log('ERROR in client credentials in Kroger Calls', error);
      rejects(error);
    })
  })
}

async function getAuthToken(code){ //gets a token for use When making API requests that do not require customer consent 
  return new Promise((resolve, rejects)=>{
    fetch('https://api.kroger.com/v1/connect/oauth2/token?', {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(clientID + ':' + clientSecret)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectURI
      })
    }).then(res => {
      if (res.ok){
        return res.json()
      }else{
        console.log('Client Auth was unsuccessful. ');
        throw new Error("fetch response in Kroger Calls returned an invalid response");
      }
    })
    .then(data => {
      console.log('data from auth ', data);
      var currentTimeSeconds = new Date().getTime() / 1000; 
      var expiryTime = currentTimeSeconds + data["expires_in"]; 
      console.log('expiry time', expiryTime); 
      saveToLocalStorage('cart_token_expiry_time', expiryTime); 
      saveToLocalStorage('cart_access_token', data["access_token"]); 
      saveToLocalStorage('refresh_token', data["refresh_token"]);
      resolve(data["access_token"]);
    })
    .catch(error => {
      console.log('ERROR in client credentials in Kroger Calls', error);
      rejects(error);
    })
  })
}

async function getRefreshToken(refreshToken){
  return new Promise((resolve, rejects)=>{
    fetch('https://api.kroger.com/v1/connect/oauth2/token?', {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(clientID + ':' + clientSecret)
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    }).then(res => {
      if (res.ok){
        return res.json()
      }else{
        console.log('Client Auth was unsuccessful. ');
        throw new Error("fetch response in Kroger Calls returned an invalid response");
      }
    })
    .then(data => {
      console.log('data from auth ', data);
      var currentTimeSeconds = new Date().getTime() / 1000; 
      var expiryTime = currentTimeSeconds + data["expires_in"]; 
      console.log('expiry time', expiryTime); 
      saveToLocalStorage('cart_token_expiry_time', expiryTime); 
      saveToLocalStorage('cart_access_token', data["access_token"]); 
      saveToLocalStorage('refresh_token', data["refresh_token"]);
      resolve(data["access_token"]);
    })
    .catch(error => {
      console.log('ERROR in client credentials in Kroger Calls', error);
      rejects(error);
    })
  })
}

async function cartWriteAuthorizationCode(){
  var scope = 'cart.basic:write'
  var endString = 'https://api.kroger.com/v1/connect/oauth2/authorize?scope=' + scope + '&response_type=code&client_id=' + clientID + '&redirect_uri=' + redirectURI
  return new Promise((resolve, rejects)=>{
    fetch(endString, {
      method: 'Get',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + btoa(clientID + ':' + clientSecret)
      }
    }).then(res => {
      if (res.ok){
        console.log("Successfully got cart write auth credentials.")
        return res
      }else{
        console.log('Cart Write Auth was unsuccessful. ', res);
        resolve(null);
      }
    })
    .then(data => {
      //console.log('URL from cartWriteAuthorization', data.url)
      resolve(data.url);
    })
    .catch(error => {
      console.log('ERROR in Kroger Calls', error);
      resolve(null);
    })
  })
}

async function addToCart(accessToken, items) { //returns true if added successfully 
  console.log('items ', items)
  return new Promise((resolve, reject) => {
    const fetchString = "https://api.kroger.com/v1/cart/add";
    fetch(fetchString, {
      method: 'PUT',
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json", // Specify JSON content type
      },
      body: JSON.stringify({items: items}), // Send the items directly in the JSON body
    }).then(res => {
      if (res.ok) {
        console.log('Kroger APIs. Add to cart successful', res)
        return true
      } else {
        console.log('Kroger APIs. Add to Cart was unsuccessful. ', res);
        resolve(null);
      }
    })
    .then(data => {
      resolve(data);
    })
    .catch(error => {
      console.log('ERROR in Kroger Calls Add to Cart Function', error);
      resolve(null);
    });
  });
}

async function productSearch(accessToken, term) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get('locationId', (result) => {
      var locationId = result['locationId'];
      let fetchString = "https://api.kroger.com/v1/products?filter.term=" + term + "&filter.fulfillment=ais"; //,csp
      if (locationId) {
        fetchString += "&filter.locationId=" + locationId;
      }
      fetch(fetchString, {
        method: 'GET',
        headers: {
          "Accept": "application/json",
          "Authorization": "Bearer " + accessToken
        }
      })
      .then(res => {
        if (res.ok) {
          return res.json();
        } else {
          console.log('Product Search was unsuccessful with term  ', term);
          resolve(null);
        }
      })
      .then(data => {
        resolve(data);
      })
      .catch(error => {
        console.log('ERROR in Kroger Calls Product Search Function', error);
        resolve(null); 
      });
    });
  });
}

async function locationSearchByZipcode(accessToken, zipcode){
  return new Promise((resolve, rejects)=>{
    fetch("https://api.kroger.com/v1/locations?filter.zipCode.near=" + zipcode, {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + accessToken
      }
    }).then(res => {
      if (res.ok){
        return res.json()
      }else{
        console.log('Location Search By Zipcode was unsuccessful.');
        resolve(null);
      }
    })
    .then(data => {
      resolve(data);
    })
    .catch(error => {
      console.log('ERROR in Kroger Calls Location Search By Zipcode Function', error); 
      resolve(null); 
    })
  })
}

async function locationSearchByLongLat(accessToken, latitude, longitude){
  return new Promise((resolve, rejects)=>{
    fetch("https://api.kroger.com/v1/locations?filter.latLong.near=" + latitude + "," + longitude, {
      method: 'GET',
      headers: {
        "Accept": "application/json",
        "Authorization": "Bearer " + accessToken
      }
    }).then(res => {
      if (res.ok){
        return res.json()
      }else{
        console.log('Locationn Search by Long Lat was unsuccessful. ');
        resolve(null);
      }
    })
    .then(data => {
      resolve(data);
    })
    .catch(error => {
      console.log('ERROR in Kroger Calls Location Search Long Lat Function', error); 
      resolve(null); 
    })
  })
}

export{clientCredentials, cartWriteAuthorizationCode, productSearch, locationSearchByZipcode, locationSearchByLongLat, addToCart, getAuthToken, getRefreshToken}