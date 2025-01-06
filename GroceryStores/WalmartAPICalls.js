const impactRadiusID = "2263813"
export{search, stores, productLookup, generateWalmartHeaders}

async function generateWalmartHeaders() { //gets a token for use When making API requests that do not require customer consent
  const attemptFetch = async (retryCount) => {
    try {
      const response = await fetch('https://cerescartapis.onrender.com/generateWalmartHeaders');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json(); // Assuming response is JSON; use .text() for text, etc.
      return data; // Process the JSON response data here
    } catch (error) {
      if (retryCount > 0) {
        console.warn(`Retrying fetch... ${retryCount} attempts left`);
        return attemptFetch(retryCount - 1);
      } else {
        throw new Error(`Fetch error when generating Walmart headers: ${error.message}`);
      }
    }
  };

  return attemptFetch(2); // Attempt up to 3 times (initial call + 2 retries)
}

async function search(term, generatedHeaders) {
  //console.log('walmart search API running ', term);
  const attemptSearch = async (retries) => {
    try {
      //console.log('headers in Walmart search, Search API', generatedHeaders.headers);

      const baseURL = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/search';
      const params = new URLSearchParams({
        publisherId: impactRadiusID,
        query: term,
        numItems: 20,
        categoryId: "976759" 
      });

      params.append('facet', 'on');
      params.append('facet.filter', 'exclude_oos:Show available items only');

      var url = `${baseURL}?${params.toString()}`;
      //console.log('url in product search walmart  ', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: generatedHeaders.headers
      });

      if (!response.ok) {
        const errorMessage = `Client Walmart Search was unsuccessful. Status: ${response.status} ${response.statusText} `;
        console.error('Error response: ', response.status, term, response.statusText, url);
        throw new Error(errorMessage);
      }
      const data = await response.json();
      //console.log('data from walmart search', data);
      return data;
    } catch (error) {
      console.error('ERROR in Search in Walmart API Calls', error, url);

      if (retries > 0) {
        generatedHeaders = await generateWalmartHeaders();
        console.log(`Retrying Walmart search... ${retries} attempts left`);
        return attemptSearch(retries - 1);
      } else {
        throw error;
      }
    }
  };
  return attemptSearch(2); // Attempt up to 3 times (initial call + 2 retries)
}

async function productLookup(ids, ingredient, generatedHeaders) {
  //console.log('walmart product catalog snapshot running', ids, ingredient);
  var locationId; 

  locationId = await new Promise((resolve, reject) => {
    chrome.storage.sync.get('locationId', (result) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(result['locationId']);
    });
  });

  const attemptProductLookup = async (retries) => {
    try {
      //const generatedHeaders = await generateWalmartHeaders();
      //console.log('headers in Walmart search, product lookup API', generatedHeaders.headers);
      const baseURL = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/items';

      // Join the ids array into a comma-separated string
      const idsString = ids.join(',');
      //console.log('id strings ', idsString); 

      const params = new URLSearchParams({
        ids: idsString,
        publisherId: impactRadiusID
      });
      
      if (locationId) {
        //console.log('location id appended Walmart productLookup', locationId);
        params.append('storeId', locationId);
      }
      var url = `${baseURL}?${params.toString()}`; 
      //console.log('url in product search walmart  ', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: generatedHeaders.headers
      });

      if (!response.ok) {
        const errorMessage = `Client Walmart product lookup was unsuccessful. Status: ${response.status} ${response.statusText}`;
        console.error('Error response in Product Lookup :', ingredient, ids, response.status, response.statusText);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      //console.log('data from walmart product lookup ', ingredient, ' ', data);
      return data;
    } catch (error) {
      console.error('ERROR in product lookup in Walmart API Calls ', ingredient, ' ids length ', ids.length, error);

      if (retries > 0) {
        console.log(`Retrying product lookup... ${retries} attempts left`);
        return attemptProductLookup(retries - 1);
      } else {
        return null;
      }
    }
  };

  return attemptProductLookup(2); // Attempt up to 3 times (initial call + 2 retries)
}

//TODO Delete later
async function storesByGeoLocation(zipcode){ //gets a token for use When making API requests that do not require customer consent 
  console.log('Walmart stores running ', zipcode);
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
//TODO Delete Later 
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

async function stores(zipcode){ //gets a token for use When making API requests that do not require customer consent 
  console.log('Walmart stores running ', zipcode);
  try {
    const generatedHeaders = await generateWalmartHeaders();
    const url = 'https://developer.api.walmart.com/api-proxy/service/affil/product/v2/stores?zip=' + zipcode;
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
