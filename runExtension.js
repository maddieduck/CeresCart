var allProductData = []; 
var allLocationData = []; 
var shadowRoot; 
var locationShadowRoot; 
let ingredients = findIngredientsOnPage();
console.log('ingredients ', ingredients);
if (ingredients != null) {
  (async () => { // Wrap the block in an async function 
    var locationExists = await loadFromLocalStorage('locationName');
    console.log('location exists ', locationExists);
    let backgroundResponse = await chrome.runtime.sendMessage({ to: 'ingredients', data: ingredients, locationExists: locationExists}); 
    console.log('background response ', backgroundResponse);

    if (backgroundResponse.launch) {
      try {
        const htmlContents = await Promise.all([
          fetch(chrome.runtime.getURL('index.html')).then(response => response.text()),
          fetch(chrome.runtime.getURL('styles.css')).then(response => response.text()),
        ]);
        const [indexHtml, cssStyle] = htmlContents;
        
        //insert HTML with shadowroot and css. 
        const containerDiv = document.createElement('div');
        containerDiv.id = 'ingrExpIngredientExporterPopup';
        shadowRoot = containerDiv.attachShadow({ mode: 'open', name: 'mainShadowRoot'});
        shadowRoot.innerHTML = indexHtml;
        const style = document.createElement('style'); 
        style.textContent = cssStyle; 
        shadowRoot.appendChild(style);
        document.body.insertAdjacentElement('afterbegin', containerDiv);

        //insert each ingredient into the popup
        const ingredientData = new Map(backgroundResponse.ingredientData);
        insertEachIngredient(ingredientData);
        //set the location name if it exists in memory 
        
        chrome.storage.local.get('locationName', (result) => {
          console.log('location Name ', result['locationName']);
          if (result['locationName'] != undefined){
            shadowRoot.getElementById('ingrExpZipCode').style.display = 'none';
            shadowRoot.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
            shadowRoot.getElementById('ingrExpPickupAt').textContent = result['locationName']
          }
        });

        /*
        shadowRoot.getElementById('minimize').addEventListener('click', minimizePopup); 
        */

        shadowRoot.getElementById('ingrExpClose').addEventListener('click', closePopup); 
        shadowRoot.getElementById('ingrExpPerson').addEventListener('click', personClicked); 
        shadowRoot.getElementById('ingrExpCheckoutButton').addEventListener('click', checkoutButtonClicked); 
        shadowRoot.getElementById('ingrExpCheckoutButton').addEventListener('click', checkoutButtonPopup); //TODO
        shadowRoot.getElementById('change').addEventListener('click', launchLocationPopup); 
        shadowRoot.getElementById('ingrExpZipCode').addEventListener('keyup', zipCodeEdited); 
        updateCheckoutButton();
      } catch (error) {
        console.error('ERROR in runExtension.js: ', error);
      }
    }
  })();
}

function checkoutButtonPopup(){
  var popup = shadowRoot.getElementById('ingrExpCheckoutButtonPopup');
  popup.style.display = 'block';

  setTimeout(function () {
      popup.style.display = 'none';
  }, 3000); // Adjust the time (in milliseconds) as needed
}

function loadFromLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

async function insertEachIngredient(ingredientData){

  fetch(chrome.runtime.getURL('ingredientContainer.html'))
  .then(response => response.text())
  .then(ingredientHtml => {
    //insert each ingredient into html 
    console.log('insert each ingr');
    let ingredDiv = shadowRoot.getElementById('ingrExpPlaceholderForIngredients');
    allProductData = []
    
    Array.from(ingredientData.entries()).forEach((entry, index) => {
      const [ingredient, productData] = entry;
      //TODO: Save allProductData as a map eventually 
      //console.log('prod data ', productData); 
      allProductData[index] = {indexOfProductDisplayed: 0, productData: productData}; 
      
      let nodeClone = document.createElement('div'); // Create a new div 
      nodeClone.innerHTML = ingredientHtml;  //Set the inner HTML of the div 
      nodeClone.querySelector('.ingrExpIngredientImage').src = productData[0].image; 
      nodeClone.querySelector('.ingrExpIngredientBrand').textContent = productData[0].brand; 
      nodeClone.querySelector('.ingredientDescription').textContent = productData[0].description;
      nodeClone.querySelector('.ingrExpSize').textContent = productData[0].size;
      nodeClone.querySelector('.ingrExpOuterContainer').id = 'ingrExpIngredient' + index;
      
      nodeClone.querySelector('.leftArrow').style.opacity = 0;
      nodeClone.querySelector('.leftArrow').style.visibility = 'hidden';
      nodeClone.querySelector('.leftArrow').style.pointerEvents = 'none';

      var price = productData[0].price;
      if (price !== null){
        const dollars = Math.floor(price);
        const cents = Math.round((price - dollars) * 100);
        nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
        nodeClone.querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
      }else{
        nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = ''; 
        nodeClone.querySelector('.ingrExpCents').innerHTML = '';
      }

      if (productData.length == 1){
        nodeClone.querySelector('.rightArrow').style.opacity = 0;
        nodeClone.querySelector('.rightArrow').style.visibility = 'hidden';
        nodeClone.querySelector('.rightArrow').style.pointerEvents = 'none';
      }
      ingredDiv.appendChild(nodeClone);
    });
    
    var elementsWithClass = shadowRoot.querySelectorAll('.ingrExpLeftArrow');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', leftArrowClicked);
    });

    elementsWithClass = shadowRoot.querySelectorAll('.rightArrow');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', rightArrowClicked);
    });

    elementsWithClass = shadowRoot.querySelectorAll('.ingrExpPlusButton');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', plusButtonClicked);
    });

    elementsWithClass = shadowRoot.querySelectorAll('.ingrExpMinusButton');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', minusButtonClicked);
    });
  })
  .catch(error => console.error('Error:', error));
}

function personClicked(event){
  chrome.runtime.sendMessage({to: 'launchPayWindow'}); 
}

function closePopup(event) {//closes the main popup or the location popup 
  console.log('close id ', event.target.id);
  var id = event.target.id;
  if (id === 'ingrExpCloseImage'){
    document.getElementById('ingrExpIngredientExporterPopup').remove();
    var locationPopup = document.getElementById('ingrExpLocationPopup');
    if (locationPopup){
      locationPopup.remove();
    }
  }else if (id === "ingrExpCloseImageInPopup"){
    document.getElementById('ingrExpLocationPopup').remove();
  }
}

async function loadLocationsInPopup(newLocationData){
  let locationPlaceholder = locationShadowRoot.getElementById('ingrExpPlaceholderForLocations');
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
  if(backgroundResponse.locationsFound){
    loadLocationsInPopup(backgroundResponse.locationData); 
    locationShadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'none'; 
  }else{
    locationShadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'inline-block'; 
  }
}

async function launchLocationPopup() {
  var locationPopup = shadowRoot.getElementById('ingrExpLocationPopup'); 
  console.log('launch location popup ', locationPopup); 
  //display or hide the zip code in the lcoations popup 
  var pickupAt = shadowRoot.getElementById('ingrExpPickupAt'); //check if the location is being displayed in main popup
  console.log('pickup at ', pickupAt.style.display)
  if (locationPopup == null){//check if popup is already open 
    try{ //insert the popup
      const locationPopupResponse = await fetch(chrome.runtime.getURL('locationPopup.html'));
      const locationPopupHtml = await locationPopupResponse.text();
      //document.body.insertAdjacentHTML('afterbegin', `<div id="ingrExpLocationPopup">${locationPopupHtml}</div>`); 
      
      const htmlContents = await Promise.all([
        fetch(chrome.runtime.getURL('locationPopup.html')).then(response => response.text()),
        fetch(chrome.runtime.getURL('styles.css')).then(response => response.text()),
      ]);
      const [locationHtml, cssStyle] = htmlContents;

      //insert HTML with shadowroot and css. 
      const containerDiv = document.createElement('div');
      containerDiv.id = 'ingrExpLocationPopup';
      locationShadowRoot = containerDiv.attachShadow({ mode: 'open', name: 'locationShadowRoot'});
      locationShadowRoot.innerHTML = locationHtml;
      const style = document.createElement('style'); 
      style.textContent = cssStyle; 
      locationShadowRoot.appendChild(style);
      document.body.insertAdjacentElement('afterbegin', containerDiv);

      locationShadowRoot.getElementById('ingrExpCloseInPopup').addEventListener('click', closePopup); 

      
      console.log('display style ', pickupAt.style.display);
      if (pickupAt.style.display == '-webkit-box'){ //The store location is showing, show the zip code 
        console.log('show zip code')
        locationShadowRoot.getElementById('ingrExpZipCodeInPopup').style.display = '-webkit-box';
        chrome.storage.local.get('zipCode', (result) => {
          if (result['zipCode'] != undefined){
            console.log('zip code being used in location popup ', result['zipCode']);
            locationShadowRoot.getElementById('ingrExpZipCodeInPopup').value = result['zipCode']
            locationShadowRoot.getElementById('ingrExpZipCodeInPopup').addEventListener('keyup', zipCodeInPopupEdited);
          } 
        }); 
      }else{ 
        console.log('dont display zipcode');
        locationShadowRoot.getElementById('ingrExpZipCodeInPopup').style.display = 'none';
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
  shadowRoot.getElementById('ingrExpZipCode').style.display = 'none';
  shadowRoot.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
  shadowRoot.getElementById('ingrExpPickupAt').textContent = locationName; 
  chrome.storage.local.set({['locationId']: locationId});
  chrome.storage.local.set({['locationName']: locationName});

  //remove ingredients from the main popup
  var elementsWithClass = shadowRoot.querySelectorAll('.ingrExpOuterContainer');
  elementsWithClass.forEach(element => {
    console.log('remove element')
    element.parentNode.removeChild(element);
  });

  //insert ingredients from the new store location
  let backgroundResponse = await chrome.runtime.sendMessage({ to: 'ingredients', data: ingredients, locationExists: true});
  const ingredientData = new Map(backgroundResponse.ingredientData);

  insertEachIngredient(ingredientData);
  updateCheckoutButton();
}

function minimizePopup() {//TODO: commented out for now, but need to add 
  var popupContainer = shadowRoot.getElementById('ingrExpIngredientExporterPopup');
  if (popupContainer) {
    popupContainer.remove();
  }
  //TODO: make new screen to display
}

function displayNewIngredient(id, rightOrLeft){ //loads the image and product info when an arrow is clicked 
  console.log('all product Data', allProductData);
  var productIndex = Number(id.replace(/ingrExpIngredient/g, '')); 
  var ingredientClickedData = allProductData[productIndex]; 
  if (rightOrLeft == 'right'){
    var newIngredientIndex = Number(ingredientClickedData['indexOfProductDisplayed']) + 1;
  }else if (rightOrLeft == 'left'){
    var newIngredientIndex = Number(ingredientClickedData['indexOfProductDisplayed']) - 1;
  }
  allProductData[productIndex]['indexOfProductDisplayed'] = newIngredientIndex 
  //display the new ingredient 
  shadowRoot.getElementById(id).querySelector('.ingrExpIngredientImage').src = ingredientClickedData['productData'][newIngredientIndex]['image'];
  shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').textContent = ingredientClickedData['productData'][newIngredientIndex]['brand'];
  shadowRoot.getElementById(id).querySelector('.ingredientDescription').textContent = ingredientClickedData['productData'][newIngredientIndex]['description'];
  shadowRoot.getElementById(id).querySelector('.ingrExpSize').textContent = ingredientClickedData['productData'][newIngredientIndex]['size'];
  //TODO
  //shadowRoot.getElementById(id).querySelector('.ingrExpQuantity').innerText = String(ingredientClickedData['productData'][newIngredientIndex]['quantity']);
  if(ingredientClickedData['productData'][newIngredientIndex]['price'] != null){
    const dollars = Math.floor(ingredientClickedData['productData'][newIngredientIndex]['price']);
    const cents = Math.round((ingredientClickedData['productData'][newIngredientIndex]['price'] - dollars) * 100);
    shadowRoot.getElementById(id).querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
    shadowRoot.getElementById(id).querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
  }else{
    shadowRoot.getElementById(id).querySelector('.ingrExpIngrExpPrice').innerHTML = "";
    shadowRoot.getElementById(id).querySelector('.ingrExpCents').innerHTML = "";
  }

  //check if arrow should be removed or shown 
  var totalIndexes = allProductData[productIndex]['productData'].length 
  if (rightOrLeft == 'right'){
    shadowRoot.getElementById(id).querySelector('.leftArrow').style.visibility = 'visible';
    shadowRoot.getElementById(id).querySelector('.leftArrow').style.pointerEvents = 'auto';
    shadowRoot.getElementById(id).querySelector('.leftArrow').style.opacity = '1';
    if ((newIngredientIndex + 1) >= totalIndexes) {
      shadowRoot.getElementById(id).querySelector('.rightArrow').style.visibility = 'hidden';
      shadowRoot.getElementById(id).querySelector('.rightArrow').style.pointerEvents = 'none';
      shadowRoot.getElementById(id).querySelector('.rightArrow').style.opacity = '0';
    }else{
      shadowRoot.getElementById(id).querySelector('.rightArrow').style.visibility = 'visible';
      shadowRoot.getElementById(id).querySelector('.rightArrow').style.pointerEvents = 'auto';
      shadowRoot.getElementById(id).querySelector('.rightArrow').style.opacity = '1';
    }
  }else if (rightOrLeft == 'left'){ 
    shadowRoot.getElementById(id).querySelector('.rightArrow').style.visibility = 'visible';
    shadowRoot.getElementById(id).querySelector('.rightArrow').style.pointerEvents = 'auto';
    shadowRoot.getElementById(id).querySelector('.rightArrow').style.opacity = '1';
    if (newIngredientIndex == 0) {
      shadowRoot.getElementById(id).querySelector('.leftArrow').style.visibility = 'hidden';
      shadowRoot.getElementById(id).querySelector('.leftArrow').style.pointerEvents = 'none';
      shadowRoot.getElementById(id).querySelector('.leftArrow').style.opacity = '0';
    }else{
      shadowRoot.getElementById(id).querySelector('.leftArrow').style.visibility = 'visible';
      shadowRoot.getElementById(id).querySelector('.leftArrow').style.pointerEvents = 'auto';
      shadowRoot.getElementById(id).querySelector('.leftArrow').style.opacity = '1';
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

async function updateCheckoutButton() {
  console.log('update checkout button');
  let hasAccess = await chrome.runtime.sendMessage({ to: 'userHasAccess'}); 
  console.log('access in checkout button ', hasAccess);
  if (hasAccess){
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
      shadowRoot.getElementById('ingrExpCheckoutButton').innerHTML = `Add <span class="bold">${totalQuantity}</span> Items`;
    } else if (totalQuantity == 0) {
      shadowRoot.getElementById('ingrExpCheckoutButton').innerHTML = `No Items Selected`;
    } else {
      shadowRoot.getElementById('ingrExpCheckoutButton').innerHTML = `Add <span class="bold">${totalQuantity}</span> Items for <span class="bold">$${totalPrice.toFixed(2)}</span>`;
    }
  }else{
    shadowRoot.getElementById('ingrExpCheckoutButton').innerHTML = `Sign Up or Log In to Export`;
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
    console.log('all prod data ', productIndex); 
    var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
    allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity + 1;
  }
  updateCheckoutButton(); 
}
 
async function checkoutUser(quantityAndUPCArray){//lets the user attempt to checkout if they have paid
  let successful = await chrome.runtime.sendMessage({ to: 'checkout', data: quantityAndUPCArray}); 
  console.log('Was cart successful? ', successful); 
  if(successful){
    //make all quantities 0 in array 
    allProductData.forEach(outerArray => {
      outerArray.productData.forEach(product => {
          product.quantity = 0;
      });
    });
    //make all quantities 0
    const elements = shadowRoot.querySelectorAll(`.${'ingrExpQuantity'}`);
    elements.forEach(element => {
      element.innerText = '0';
    });
    //update checkout button
    shadowRoot.getElementById('ingrExpCheckoutButton').innerHTML = `Items Successfully Added`;
  }else{
    console.log('error when trying to add to cart');
  }  
}

async function checkoutButtonClicked(){
   
  //disable button until products are done being added
  shadowRoot.getElementById("ingrExpCheckoutButton").disabled = true;

  //get the quantity of items to add to cart 
  const quantityAndUPCArray = [];
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
    let hasAccess = await chrome.runtime.sendMessage({ to: 'userHasAccess'}); 
    if(hasAccess){
      checkoutUser(quantityAndUPCArray)
    }else{
      console.log('User has not paid. Launch Extension Pay.')
      chrome.runtime.sendMessage({ to: 'launchPayWindow', data: quantityAndUPCArray}); 
      //change button if the user has paid 
    }
  }else{
    console.log('No items selected. Do nothing.');
  }
  //enable button again
  shadowRoot.getElementById("ingrExpCheckoutButton").disabled = false;
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
  //console.log('find ingr ', scripts);
  for (const script of scripts) {
    const schema = JSON.parse(script.textContent);
    console.log('ingred script ', schema)
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
  var zipCode = shadowRoot.getElementById('ingrExpZipCode').value;
  // Check if the Enter key is pressed and the zip code is not blank
  if (event.key === 'Enter' && zipCode.trim() !== '') {
    console.log('zip code used ', zipCode)
    chrome.storage.local.set({['zipCode']: zipCode.trim()}); 
    launchLocationPopup();
  }
}

function zipCodeInPopupEdited(event) {
  console.log('zip code in popup edited ', event.key)
  var zipCode = locationShadowRoot.getElementById('ingrExpZipCodeInPopup').value;
  if (event.key === 'Enter' && zipCode.trim() !== '') {
    //remove all existing locations before running again
    var elementsToRemove = locationShadowRoot.querySelectorAll('.ingrExpTopLocationDiv'); // Use a dot for class name
    elementsToRemove.forEach(element => {
      element.parentNode.removeChild(element);
    });

    chrome.storage.local.set({['zipCode']: zipCode.trim()}); 
    insertLocations();
  }
}
