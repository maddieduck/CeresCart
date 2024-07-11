const impactRadiusID = "2263813"
export{search, stores, productLookup}

async function getGeolocation(zipcode) { //returns geolocation as an array of [latitude, longitude]
  const url = `https://api.zippopotam.us/us/${zipcode}`;
  
  try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
          const location = data.places[0];
          return [location.latitude, location.longitude];
      } else {
          console.error('Geocoding failed: No results found');
          return null;
      }
  } catch (error) {
      console.error('Error:', error);
      return null;
  }
}

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
  console.log('walmart saerch API running ', term);
  var locationId; 

  locationId = await new Promise((resolve, reject) => {
    chrome.storage.sync.get('locationId', (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result['locationId']);
    });
  });

  console.log('location id ', locationId);

  try {
    const generatedHeaders = await generateWalmartHeaders();
    //console.log('headers in search ', generatedHeaders.headers);

    const baseURL = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search';
    const params = new URLSearchParams({
      publisherId: impactRadiusID,
      query: term,
      numItems: 20, //should be max 20 because product lookup can take a max of 20 item ids
      categoryId: "976759" //this appears to be for the food 
    });

    if (locationId) {
      console.log('location id appended Walmart ', locationId);
      params.append('storeId', locationId);
    }
    const url = `${baseURL}?${params.toString()}`; //+ `&facet=on&facet.filter=stock:Available`
    const response = await fetch(url, {
      method: 'GET',
      headers: generatedHeaders.headers
    });

    if (!response.ok) {
      const errorMessage = `Client Walmart Search was unsuccessful. Status: ${response.status} ${response.statusText}`;
      console.error('Error response:', response.status, response.statusText);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('data from walmart search', data);
    return data;
  } catch (error) {
    console.error('ERROR in Search in Walmart API Calls', error);
    throw error;
  }
}

async function productLookup(ids, ingredient) {
  console.log('walmart product catalog snapshot running', ingredient);
  var locationId; 

  locationId = await new Promise((resolve, reject) => {
    chrome.storage.sync.get('locationId', (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result['locationId']);
    });
  });

  //console.log('location id ', locationId);

  try {
    const generatedHeaders = await generateWalmartHeaders();
    const baseURL = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/items';

    // Join the ids array into a comma-separated string
    const idsString = ids.join(',');
    //console.log('id strings ', idsString); 

    const params = new URLSearchParams({
      publisherId: impactRadiusID,
      ids: ids
    });
    
    if (locationId) {
      console.log('location id appended Walmart');
      params.append('storeId', locationId);
    }
    const url = `${baseURL}?${params.toString()}`; 
    const response = await fetch(url, {
      method: 'GET',
      headers: generatedHeaders.headers
    });

    if (!response.ok) {
      const errorMessage = `Client Walmart product lookup was unsuccessful. Status: ${response.status} ${response.statusText}`;
      console.error('Error response in Product Lookup :', ingredient, response.status, response.statusText);
      return(null);
    }
    const data = await response.json();
    //console.log('data from walmart product lookup', data);
    return data;
  } catch (error) {
    console.error('ERROR in product lookup in Walmart API Calls ',ingredient, error);
    return(null);
  }
}

async function stores(zipcode){ //gets a token for use When making API requests that do not require customer consent 
  console.log('Walmart stores running');
  try {
    const generatedHeaders = await generateWalmartHeaders();
    const geolocation = await getGeolocation(zipcode);
    //console.log('headers in Walmart search ', generatedHeaders.headers);
    console.log('geolocation ', geolocation);
    const url = `https://developer.api.walmart.com/api-proxy/service/affil/product/v2/stores?lon=${geolocation[1]}&lat=${geolocation[0]}`;
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

