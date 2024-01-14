let allProductData = []; 
let allLocationData = []; 
let ingredients = findIngredientsOnPage();
console.log('ingredients ', ingredients);
if (ingredients != null) {
  (async () => { // Wrap the block in an async function 
    let response = await chrome.runtime.sendMessage({ to: 'ingredients', data: ingredients});
    if (response.launch) {
      try {
        const htmlContents = await Promise.all([
          fetch(chrome.runtime.getURL('index.html')).then(response => response.text()),
        ]);
        const [indexHtml] = htmlContents;
        
        // insert popup into html
        document.body.insertAdjacentHTML('afterbegin', `<div id="ingrExpIngredientExporterPopup">${indexHtml}</div>`);

        //insert each ingredient into the popup
        insertEachIngredient(response.ingredientData);

        //set the location name if it exists in memory 
        chrome.storage.local.get('locationName', (result) => {
          console.log('location Name ', result['locationName']);
          if (result['locationName'] != undefined){
            document.getElementById('ingrExpZipCode').style.display = 'none';
            document.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
            document.getElementById('ingrExpPickupAt').textContent = result['locationName']
          }
        });

        /*
        document.getElementById('minimize').addEventListener('click', minimizePopup); 
        */
        document.getElementById('ingrExpCloseImage').addEventListener('click', closePopup); 
        document.getElementById('ingrExpCheckoutButton').addEventListener('click', checkoutButtonClicked); 
        document.getElementById('ingrExpDownArrow').addEventListener('click', launchLocationPopup); 
        document.getElementById('ingrExpZipCode').addEventListener('keyup', zipCodeEdited); 

        chrome.runtime.sendMessage({to: 'backgroundWorker', data: ingredients});

      } catch (error) {
        console.error('ERROR in runExtension.js: ', error);
      }
    }
  })();
}

function insertEachIngredient(ingredientData){
  //insert each ingredient into html 
  console.log('insert each ingr');
  let ingredDiv = document.getElementById('ingrExpPlaceholderForIngredients');
  allProductData = []

  try {
    fetch(chrome.runtime.getURL('ingredientContainer.html'))
      .then(response => response.text()) 
      .then(ingredientHtml => {
        for (const index in ingredientData){ 
          singularIngredientData = ingredientData[index]; 
          allProductData[index] = {indexOfProductDisplayed: 0, productData: singularIngredientData}; 
          
          let nodeClone = document.createElement('div'); // Create a new div 
          nodeClone.innerHTML = ingredientHtml;  //Set the inner HTML of the div 
          nodeClone.querySelector('.ingrExpIngredientImage').src = singularIngredientData[0].image; 
          nodeClone.querySelector('.ingrExpIngredientBrand').textContent = singularIngredientData[0].brand; 
          nodeClone.querySelector('.ingrExpIngredientDescription').textContent = singularIngredientData[0].description;
          nodeClone.querySelector('.ingrExpSize').textContent = singularIngredientData[0].size;
          nodeClone.querySelector('.ingrExpParagraphOutline').id = 'ingrExpIngredient' + index;
          nodeClone.querySelector('.ingrExpLeftArrowImage').style.opacity = 0;
          nodeClone.querySelector('.ingrExpLeftArrowImage').style.visibility = 'hidden';
          nodeClone.querySelector('.ingrExpLeftArrowImage').style.pointerEvents = 'none';
      
          var price = singularIngredientData[0].price;
          if (price !== null){
            const dollars = Math.floor(price);
            const cents = Math.round((price - dollars) * 100);
            nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
            nodeClone.querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
          }else{
            nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = ''; 
            nodeClone.querySelector('.ingrExpCents').innerHTML = '';
          }
      
          if (singularIngredientData.length == 1){
            nodeClone.querySelector('.ingrExpRightArrowImage').style.opacity = 0;
            nodeClone.querySelector('.ingrExpRightArrowImage').style.visibility = 'hidden';
            nodeClone.querySelector('.ingrExpRightArrowImage').style.pointerEvents = 'none';
          }
          ingredDiv.appendChild(nodeClone);
        }
        var elem = document.getElementsByClassName('ingrExpLeftArrowImage'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', leftArrowClicked);
        }

        var elem = document.getElementsByClassName('ingrExpRightArrowImage'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', rightArrowClicked);
        }

        var elem = document.getElementsByClassName('ingrExpPlusButton'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', plusButtonClicked);
        }
        
        var elem = document.getElementsByClassName('ingrExpMinusButton'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', minusButtonClicked);
        }
      })
      .catch(error => {
        console.error('Error fetching ingredient container HTML:', error);
      });
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

function closePopup(event) {//closes the main popup or the location popup 
  var id = event.target.closest('[id]').id; 
  if (id === 'ingrExpCloseImage'){
    document.getElementById('ingrExpIngredientExporterPopup').remove();
    var locationPopup = document.getElementById('ingrExpLocationPopup');
    if (locationPopup){
      locationPopup.remove();
    }
  }else if (id === "ingrExpCloseImageLocationPopup"){
    document.getElementById('ingrExpLocationPopup').remove();
  }
}

async function loadLocationsInPopup(newLocationData){
  let locationPlaceholder = document.getElementById('ingrExpPlaceholderForLocations');
  const locationResponse = await fetch(chrome.runtime.getURL('location.html'));
  const locationHtml = await locationResponse.text();
  allLocationData = newLocationData; 
  for (const index in newLocationData){
    var locationData = newLocationData[index];
    let nodeClone = document.createElement('div');  // Create a new div 
    nodeClone.innerHTML = locationHtml;  // Set the inner HTML of the div 
    nodeClone.querySelector('.ingrExpTopLocationDiv').id = 'ingrExpTopLocationDiv' + index;
    nodeClone.querySelector('.ingrExpLocationName').textContent = locationData["name"]
    var addressObject = locationData["address"];
    var formattedAddress = `${addressObject.addressLine1}\n${addressObject.city}, ${addressObject.state} ${addressObject.zipCode}`;
    nodeClone.querySelector('.ingrExpLocationAddress').textContent = formattedAddress
    if (locationData["phone"] != undefined){
      const formattedNumber = `${locationData["phone"].substring(0, 3)}-${locationData["phone"].substring(3, 6)}-${locationData["phone"].substring(6)}`;  
      nodeClone.querySelector('.ingrExpPhoneNumber').textContent = formattedNumber 
    }
    nodeClone.querySelector('.ingrExpShopStore').addEventListener('click', shopStore); 
    locationPlaceholder.appendChild(nodeClone); 
  }
}

async function insertLocations(){
  let backgroundResponse = await chrome.runtime.sendMessage({to: 'locations'}); 
  console.log('background response ', backgroundResponse)
  allLocationData = backgroundResponse.locationData; 
  if(backgroundResponse.locationsFound){
    loadLocationsInPopup(backgroundResponse.locationData); 
    document.getElementById('ingrExpNoLocationsFound').style.display = 'none'; 
  }else{
    document.getElementById('ingrExpNoLocationsFound').style.display = 'inline-block'; 
  }
}

async function launchLocationPopup() {
  var locationPopup = document.getElementById('ingrExpLocationPopup'); 
  console.log('launch location popup '); 
  //display or hide the zip code in the lcoations popup 
  var pickupAt = document.getElementById('ingrExpPickupAt'); //check if the location is being displayed in main popup
  console.log('pickup at ', pickupAt.style.display)
  if (locationPopup == null){//check if popup is already open 
    try{ //insert the popup
      const locationPopupResponse = await fetch(chrome.runtime.getURL('locationPopup.html'));
      const locationPopupHtml = await locationPopupResponse.text();
      document.body.insertAdjacentHTML('afterbegin', `<div id="ingrExpLocationPopup">${locationPopupHtml}</div>`); 
      document.getElementById('ingrExpCloseImageLocationPopup').addEventListener('click', closePopup); 
      console.log('display style ', pickupAt.style.display);
      if (pickupAt.style.display == '-webkit-box'){ //The store location is showing, show the zip code 
        console.log('show zip code')
        document.getElementById('ingrExpZipCodeInPopup').style.display = '-webkit-box';
        chrome.storage.local.get('zipCode', (result) => {
          if (result['zipCode'] != undefined){
            console.log('zip code being used in location popup ', result['zipCode']);
            document.getElementById('ingrExpZipCodeInPopup').value = result['zipCode']
            document.getElementById('ingrExpZipCodeInPopup').addEventListener('keyup', zipCodeInPopupEdited);
          } 
        }); 
      }else{ 
        console.log('dont display zipcode');
        document.getElementById('ingrExpZipCodeInPopup').style.display = 'none';
      }
      insertLocations()
    }catch (error) {
      console.error('ERROR in launch location popup: ', error);
    }
  }else{
    console.log('Popup is already open. Do not launch.')
  }
}

async function shopStore(event){ //a location has been selected from the location popup.
  document.getElementById('ingrExpLocationPopup').remove(); 
  var id = event.target.closest('[id]').id; 
  var locationIndex = Number(id.replace(/ingrExpTopLocationDiv/g, '')); 
  console.log('shop store pressed ', locationIndex); 
  var locationId = allLocationData[locationIndex]['id'];
  var locationName = allLocationData[locationIndex]['name'];
  document.getElementById('ingrExpZipCode').style.display = 'none';
  document.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
  document.getElementById('ingrExpPickupAt').textContent = locationName; 
  chrome.storage.local.set({['locationId']: locationId});
  chrome.storage.local.set({['locationName']: locationName});

  //remove store locations from the popup 
  var elementsToRemove = document.getElementsByClassName('ingrExpParagraphOutline');
  var elementsArray = Array.from(elementsToRemove);
  elementsArray.forEach(function(element) {
    element.parentNode.removeChild(element);
  });

  //insert ingredients from the new store location
  let response = await chrome.runtime.sendMessage({ to: 'ingredients', data: ingredients});
  insertEachIngredient(response.ingredientData);
}

function minimizePopup() {//TODO: commented out for now, but need to add 
  var popupContainer = document.getElementById('ingrExpIngredientExporterPopup');
  if (popupContainer) {
    popupContainer.remove();
  }
  //TODO: make new screen to display
}

function displayNewIngredient(id, rightOrLeft){ //loads the image and product info when an arrow is clicked 
  //console.log('all product Data', allProductData);
  var productIndex = Number(id.replace(/ingrExpIngredient/g, '')); 
  var ingredientClickedData = allProductData[productIndex]; 
  if (rightOrLeft == 'right'){
    var newIngredientIndex = Number(ingredientClickedData['indexOfProductDisplayed']) + 1;
  }else if (rightOrLeft == 'left'){
    var newIngredientIndex = Number(ingredientClickedData['indexOfProductDisplayed']) - 1;
  }
  allProductData[productIndex]['indexOfProductDisplayed'] = newIngredientIndex 
  //display the new ingredient 
  document.getElementById(id).querySelector('.ingrExpIngredientImage').src = ingredientClickedData['productData'][newIngredientIndex]['image'];
  document.getElementById(id).querySelector('.ingrExpIngredientBrand').textContent = ingredientClickedData['productData'][newIngredientIndex]['brand'];
  document.getElementById(id).querySelector('.ingrExpIngredientDescription').textContent = ingredientClickedData['productData'][newIngredientIndex]['description'];
  document.getElementById(id).querySelector('.ingrExpSize').textContent = ingredientClickedData['productData'][newIngredientIndex]['size'];
  document.getElementById(id).querySelector('.ingrExpQuantity').innerText = String(ingredientClickedData['productData'][newIngredientIndex]['quantity']);
  if(ingredientClickedData['productData'][newIngredientIndex]['price'] != null){
    const dollars = Math.floor(ingredientClickedData['productData'][newIngredientIndex]['price']);
    const cents = Math.round((ingredientClickedData['productData'][newIngredientIndex]['price'] - dollars) * 100);
    document.getElementById(id).querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
    document.getElementById(id).querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
  }

  //check if arrow should be removed or shown 
  var totalIndexes = allProductData[productIndex]['productData'].length 
  if (rightOrLeft == 'right'){
    document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.visibility = 'visible';
    document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.pointerEvents = 'auto';
    document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.opacity = '1';
    if ((newIngredientIndex + 1) >= totalIndexes) {
      document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.visibility = 'hidden';
      document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.pointerEvents = 'none';
      document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.opacity = '0';
    }else{
      document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.visibility = 'visible';
      document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.pointerEvents = 'auto';
      document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.opacity = '1';
    }
  }else if (rightOrLeft == 'left'){ 
    document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.visibility = 'visible';
    document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.pointerEvents = 'auto';
    document.getElementById(id).querySelector('.ingrExpRightArrowImage').style.opacity = '1';
    if (newIngredientIndex == 0) {
      document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.visibility = 'hidden';
      document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.pointerEvents = 'none';
      document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.opacity = '0';
    }else{
      document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.visibility = 'visible';
      document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.pointerEvents = 'auto';
      document.getElementById(id).querySelector('.ingrExpLeftArrowImage').style.opacity = '1';
    }
  }
}

function leftArrowClicked(event){
  var id = event.target.closest('[id]').id; 
  displayNewIngredient(id, 'left'); 
}

function rightArrowClicked(event){
  var id = event.target.closest('[id]').id; 
  displayNewIngredient(id, 'right'); 
}

function updateCheckoutButton() {
  var totalQuantity = 0;
  var totalPrice = 0.0;
  var hasNullPrices = false;

  // Iterate through allProductData and get the total quantity and price 
  allProductData.forEach(function (element) {
    element.productData.forEach(function (product) {
      var quantity = product.quantity || 0;
      var price = parseFloat(product.price);

      totalQuantity += quantity;

      // Check for null prices only if quantity is not null
      if (quantity > 0) {
        if (isNaN(price) || price === null) {
          hasNullPrices = true;
        } else {
          totalPrice += quantity * price;
        }
      }
    });
  });

  if (hasNullPrices) {
    document.getElementById('ingrExpCheckoutButton').innerHTML = `Add <span class="bold">${totalQuantity}</span> Items`;
  } else if (totalQuantity == 0) {
    document.getElementById('ingrExpCheckoutButton').innerHTML = `No Items Selected`;
  } else {
    document.getElementById('ingrExpCheckoutButton').innerHTML = `Add <span class="bold">${totalQuantity}</span> Items for <span class="bold">$${totalPrice.toFixed(2)}</span>`;
  }
}

function minusButtonClicked(event) {
  // Find the quantity element within the closest ancestor
  var quantityElement = event.target.closest('.ingrExpMainDiv').querySelector('.ingrExpQuantity');

  // Check if the element is found
  if (quantityElement) {
    // Update the content of the quantity element (decrement, for example)
    var currentQuantity = Number(quantityElement.innerText);
    if (currentQuantity > 0) {
      quantityElement.innerText = String(currentQuantity - 1);

      // Update the corresponding data in allProductData
      var id = event.target.closest('[id]').id;
      var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
      var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
      allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity - 1;
    }
  }
  updateCheckoutButton(); 
}

function plusButtonClicked(event) {
  // Find the quantity element within the closest ancestor
  var quantityElement = event.target.closest('.ingrExpMainDiv').querySelector('.ingrExpQuantity');
  // Check if the element is found
  if (quantityElement) {
    // Update the content of the quantity element (increment, for example)
    var currentQuantity = Number(quantityElement.innerText);
    quantityElement.innerText = String(currentQuantity + 1);

    // Update the corresponding data in allProductData
    var id = event.target.closest('[id]').id;
    var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
    var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
    allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity + 1;
  }
  updateCheckoutButton(); 
}

async function checkoutButtonClicked(){
  const quantityAndUPCArray = []; 
  //disable button until products are done being added
  document.getElementById("ingrExpCheckoutButton").disabled = true;

  for (const productData of allProductData) {
    for (const product of productData.productData) {
      const quantity = product.quantity;
      const upc = product.upc; // Assuming there's a property named 'upc' in your data structure
      if (quantity > 0){
        const quantityAndUPC = {'quantity': quantity, 'upc': upc};
        quantityAndUPCArray.push(quantityAndUPC);
      }
    }
  }
  if(quantityAndUPCArray.length != 0){
    console.log('quantity and upc ', quantityAndUPCArray);
    let successful = await chrome.runtime.sendMessage({ to: 'checkout', data: quantityAndUPCArray}); //get auth url to call
    console.log('Was cart successful? ', successful); 
    if(successful){
      //make all quantities 0 in array 
      allProductData.forEach(outerArray => {
        outerArray.productData.forEach(product => {
            product.quantity = 0;
        });
      });
      //make all quantities 0
      const elements = document.querySelectorAll(`.${'ingrExpQuantity'}`);
      elements.forEach(element => {
        element.innerText = '0';
      });
      //update checkout button
      document.getElementById('ingrExpCheckoutButton').innerHTML = `Items Successfully Added`;
    }else{
      console.log('error when trying to add to cart');
    }
  }else{
    console.log('No items selected. Do nothing.');
  }
  document.getElementById("ingrExpCheckoutButton").disabled = false;
}

function stringIngredientsFromRecipe(i){
  scriptType = i['@type'] ?? false; 
  if (scriptType == 'Recipe'){ 
    return i['recipeIngredient'];
  }else if (Array.isArray(scriptType)) {
    if (scriptType.includes('Recipe')){
      if (i['recipeIngredient'] != null){
        return i['recipeIngredient'];
      }
    }
  }else{
    return null;
  }
}

function findIngredientsOnPage() {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    const schema = JSON.parse(script.textContent);
    let graph = schema['@graph'];
    if (graph != undefined){
      for (const key in graph) {
        var value = graph[key];
        var ingredients = stringIngredientsFromRecipe(value) 
        if(ingredients!= null){
          return ingredients
        }
      }
    }else{
      var ingredients = stringIngredientsFromRecipe(schema);
      if(ingredients!= null){
        return ingredients
      }
      for (const key in schema) {
        var value = schema[key]; 
        if (key == 'recipeIngredient'){
          return schema[key]
        }
        var ingredients = stringIngredientsFromRecipe(value) 
        if(ingredients!= null){
          return ingredients
        }
      }
    }
  }
  return null; 
}

function zipCodeEdited(event) {
  var zipCode = document.getElementById('ingrExpZipCode').value;
  // Check if the Enter key is pressed and the zip code is not blank
  if (event.key === 'Enter' && zipCode.trim() !== '') {
    console.log('zip code used ', zipCode)
    chrome.storage.local.set({['zipCode']: zipCode.trim()}); 
    launchLocationPopup();
  }
}

function zipCodeInPopupEdited(event) {
  console.log('zip code in popup edited')
  var zipCode = document.getElementById('ingrExpZipCodeInPopup').value;
  if (event.key === 'Enter' && zipCode.trim() !== '') {
    //remove all existing locations before running again
    var elementsToRemove = document.getElementsByClassName('ingrExpTopLocationDiv'); //Get elements by class name
    var elementsArray = Array.from(elementsToRemove); // Convert HTMLCollection to an array
    elementsArray.forEach(function(element) { //Remove each element
      element.parentNode.removeChild(element);
    });

    chrome.storage.local.set({['zipCode']: zipCode.trim()}); 
    insertLocations();
  }
}

            //check if store location exists in memory 
            //if not, prompt for geolocation 
/*
            //gets geolocation 
      navigator.geolocation.getCurrentPosition(
        (loc) => {
            console.log('location', loc);
            },
        // in case the user doesnt have/is blocking `geolocation`
        (err) => console.log('geo error ', err)
      );  
*/

      // prompts for geolocation permission and handle the result
      /*
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        if (permissionStatus.state === 'granted') {
          // Geolocation permission granted, proceed to use it
          navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
          });
        } else {
          console.log('Geolocation permission denied.');
        }
      });
      */
/*
      chrome.storage.local.get('store', (result) => {
        console.log("store result ", result);
      });
      */