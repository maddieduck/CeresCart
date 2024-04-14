var key = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1rhUD+knXfTb4oNedsdWOHJ4hplk3EuWpbRIVVH+gkqSBmjFlrvHsuw1Ok2dPhA26LWdj5ZUOPDH0ntvUpp4MFTwnOt94EiLvd8WUBCSd0j06/VUdp7mXEl18mXp79y2a0pPZMaWq8RKgQhsK71UKhShDQI+fC1d/OeWU+I1N1/cJ2gAYsdXmTWD4ZM3wz9VeIXW/iyXACBd8xH57xAz7ltdRobtjkRVmNM3w9p++x5K/je3jGUFZa9wK3Zy24g3nuck34kA+ZLF1IyX8WM1bhNWekAaLWrBMs6A8rhUKNEER/iukfPqJOQINxJJrzjBFI/92CE3loQ4cL7E4oQZYwIDAQAB"
var consumerId = "13c8234e-f5dc-4952-9b26-a938bf98b3be"
var keyVersion = "2"
//import { sign } from 'crypto';
//import {saveToLocalStorage} from './storageHelpers.js'

function generateSignature(key, stringToSign) {
    // Assuming the required cryptographic libraries are available
    const signatureInstance = new Signature("SHA256withRSA");

    // Assuming you have a method to decode the Base64 encoded key
    const decodedKey = decodeBase64(key);

    // Assuming you have a method to create a private key from the decoded key
    const resolvedPrivateKey = createPrivateKey(decodedKey);

    signatureInstance.initSign(resolvedPrivateKey);

    const bytesToSign = new TextEncoder().encode(stringToSign);
    signatureInstance.update(bytesToSign);
    const signatureBytes = signatureInstance.sign();

    // Assuming you have a method to encode the signature bytes to Base64
    const signatureString = encodeBase64(signatureBytes);

    return signatureString;
}

function canonicalize(headersToSign) {
    let canonicalizedStrBuffer = "";
    let parameterNamesBuffer = "";

    for (let [key, value] of headersToSign) {
        parameterNamesBuffer += key.trim() + ";";
        canonicalizedStrBuffer += value.toString().trim() + "\n";
    }
    return [parameterNamesBuffer, canonicalizedStrBuffer];
}

function getSignature(timestamp){
    const map = new Map();
    map.set("WM_CONSUMER.ID", consumerId);
    map.set("WM_CONSUMER.INTIMESTAMP", timestamp.toString());
    map.set("WM_SEC.KEY_VERSION", keyVersion);

    const [parameterNames, stringToSign] = canonicalize(map);

    try {
        const data = generateSignature(key, stringToSign);
        console.log("Signature: " + data);
    } catch (e) {
        console.error("Error generating signature: ", e);
    }
}

async function walmartLocationSearchByZipCode(zipcode){ //gets a token for use When making API requests that do not require customer consent 
    const timestamp = Date.now(); 
    var signature = getSignature(timestamp); 
    console.log('walmart locations run. signature ', signature); 
    return new Promise((resolve, rejects)=>{
      fetch('https://developer.api.walmart.com/api-proxy/service/affil/v2/stores?zip='+zipcode, {
        method: 'GET',
        headers: {
            "WM_SEC.KEY_VERSION": keyVersion,
            "WM_CONSUMER.ID": consumerId,
            "WM_CONSUMER.INTIMESTAMP": timestamp,
            "WM_SEC.AUTH_SIGNATURE": signature
        }
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
        //var currentTimeSeconds = new Date().getTime() / 1000; 
        //var expiryTime = currentTimeSeconds + data["expires_in"]; 
        //console.log('expiry time', expiryTime); 
        //saveToLocalStorage('walmart_product_token_expiry_time', expiryTime); 
        //saveToLocalStorage('walmart_product_access_token', data["access_token"]); 
        resolve(data);  
      })
      .catch(error => {
        console.log('ERROR in client credentials in Walmart Calls', error);
        rejects(error);
      })
    })
  }

  export{walmartLocationSearchByZipCode}