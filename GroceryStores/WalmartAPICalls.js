var privateKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwB+mUHuZ2EGIPteYYv7maJh8L9AwICHfm9/y5VkeuMbCpMaOu+9nRQulpqbLjNgkPR+lNB9ZkWe//0YuJ2rTaw/R+H95nIp86mIDoj8ZAsMV3QzejnsQZYMCkelCXpAPaPPCJiyN7w3opCh7PId+Vd+RTOXMiBHfQjhR6kr26/nuGDHlr5l0jTJNtPZgweDEztEWzo0jUXfbuF87cFkrHdWEQBKEEysrviTxEUSTeFuzpJocGYQ/VLZgAktK3aTdLE/bsWA1GKde+0KezjvjveX14WE0733Q6NkmELKg7HaIenFxCvhyS2rFNeh0R8ndZeeI/IX+czH6Wli2oqsOuwIDAQAB"
var consumerId = "13c8234e-f5dc-4952-9b26-a938bf98b3be"
//import { sign } from 'crypto';
//import {saveToLocalStorage} from './storageHelpers.js'

async function walmartClientCredentials(){ //gets a token for use When making API requests that do not require customer consent 
  return new Promise((resolve, rejects)=>{
    fetch('https://developer.api.stg.walmart.com/api-proxy/service/identity/oauth/v1/token', {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "cache-control": "no-cache", 
        "WM_CONSUMER.ID": consumerId
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: consumerId,
        client_secret: privateKey
      })
    }).then(res => {
      if (res.ok){
        return res.json()
      }else{
        console.log('Client Walmart Auth was unsuccessful. ', res);
        throw new Error("fetch response in Kroger Calls returned an invalid response");
      }
    })
    .then(data => {
      console.log('data from walmart auth ', data); 
      //var currentTimeSeconds = new Date().getTime() / 1000; 
      //var expiryTime = currentTimeSeconds + data["expires_in"]; 
      console.log('expiry time', expiryTime); 
      //saveToLocalStorage('kroger_cart_token_expiry_time', expiryTime); 
      //saveToLocalStorage('kroger_cart_access_token', data["access_token"]); 
      //saveToLocalStorage('kroger_refresh_token', data["refresh_token"]);
      resolve(data["access_token"]);
    })
    .catch(error => {
      console.log('ERROR in client credentials in Kroger Calls', error);
      rejects(error);
    })
  })
}

  export{walmartClientCredentials}