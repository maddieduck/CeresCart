const impactRadiusID = "2263813"
export{search, stores, consolidatedAddToCart}

async function generateWalmartHeaders(){ //gets a token for use When making API requests that do not require customer consent 
  return new Promise((resolve, rejects)=>{
    fetch('http://localhost:3000/')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      resolve(response.json()); // Assuming response is JSON; use .text() for text, etc.
    })
    .then(data => {
      resolve(data); // Process the JSON response data here
    })
    .catch(error => {
      rejects('Fetch error:', error);
    });
  })
}

async function search(term) {
  console.log('walmart product catalog snapshot running');
  try {
    const generatedHeaders = await generateWalmartHeaders();
    //console.log('headers in search ', generatedHeaders.headers);

    const url = `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?publisherId=${impactRadiusID}&query=${term}&numItems=25`;
    const response = await fetch(url, {
      method: 'GET',
      headers: generatedHeaders.headers
    });

    if (!response.ok) {
      const errorMessage = `Client Walmart Auth was unsuccessful. Status: ${response.status} ${response.statusText}`;
      console.error('Error response:', response.status, response.statusText);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    //console.log('data from walmart search', data);
    return data;
  } catch (error) {
    console.error('ERROR in client credentials in Walmart API Calls', error);
    throw error;
  }
}

async function stores(zipcode){ //gets a token for use When making API requests that do not require customer consent 
  console.log('Walmart stores running');
  try {
    const generatedHeaders = await generateWalmartHeaders();
    //console.log('headers in Walmart search ', generatedHeaders.headers);
    const url = `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/stores?lon=-95.511747&lat=29.735577`;
    const response = await fetch(url, {
      method: 'GET',
      headers: generatedHeaders.headers
    });

    if (!response.ok) {
      const errorMessage = `stores in WalmartAPICalls was unsuccessful. Status: ${response.status} ${response.statusText}`;
      console.error('Error response:', response.status, response.statusText);
      throw new Error(errorMessage);
    }
    const data = await response.json();
    console.log('data from walmart stores', data, response);
    return data;

  } catch (error) {
    console.error('ERROR in stores in Walmart API Calls', error);
    throw error;
  }
}

/*
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
*/ 
async function consolidatedAddToCart(){
  console.log('walmart consolidated add to cart running');
  try {
    const generatedHeaders = await generateWalmartHeaders();
    console.log('headers in consolidatedAddToCart ', generatedHeaders.headers);
    //TODO: 
    const url = `https://affil.walmart.com/cart/addToCart?items=945193065,660768274_2 `;
    const response = await fetch(url, {
      method: 'PUT'
    });

    if (!response.ok) {
      const errorMessage = `Client Walmart Auth was unsuccessful. Status: ${response.status} ${response.statusText}`;
      console.error('Error response:', response.status, response.statusText);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('data from walmart auth', data);
    return data.access_token;
  } catch (error) {
    console.error('ERROR in client credentials in Walmart API Calls', error);
    throw error;
  }
}