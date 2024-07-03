const impactRadiusID = "2263813"
export{search, stores}

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
  var locationId; 
  chrome.storage.sync.get('locationId', (result) => {
    locationId = result['locationId'];
  }); 
  try {
    const generatedHeaders = await generateWalmartHeaders();
    //console.log('headers in search ', generatedHeaders.headers);

    const url = `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search?publisherId=${impactRadiusID}&query=${term}&numItems=25`;
    if(locationId){
      url = url + "&storeId=" + locationId;
    }
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
    //console.log('data from walmart stores', data, response);
    return data;

  } catch (error) {
    console.error('ERROR in stores in Walmart API Calls', error);
    throw error;
  }
}

