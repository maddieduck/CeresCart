var allProductData = []; //2D array of all data from grocery store
var allLocationData = []; 
var shadowRoot; 
var locationShadowRoot; 
var minimizeShadowRoot; 
var currentUrl = window.location.href;
console.log("run extension " + currentUrl);
var currentUrl = window.location.href;
console.log("Current URL: " + currentUrl);
var recipe = findRecipeDataOnPage(); 
console.log('recipe ', recipe);
var ingredients = recipe.ingredients; 
console.log('ingredients ', ingredients); 

if (!currentUrl.includes("pinterest.com")) {
  deployExtension(); 
  console.log('deploy ext');
}

function deployExtension(){
  const mainPopup = document.getElementById('ingrExpIngredientExporterPopup');
  const minimizedPopup = document.getElementById('minimizePopup');

  if (ingredients != null && ingredients.length > 0) {
    (async () => { // Wrap the block in an async function 
      var locationExists = await loadFromLocalStorage('locationName');
      console.log('location exists ', locationExists);
      let backgroundResponse = await chrome.runtime.sendMessage({to: 'ingredients', data: ingredients, locationExists: locationExists}); 
      
      if(backgroundResponse.launch){
        try {
          const htmlContents = await Promise.all([
            fetch(chrome.runtime.getURL('index.html')).then(response => response.text()),
            fetch(chrome.runtime.getURL('styles.css')).then(response => response.text())
          ]);
          const [indexHtml, cssStyle] = htmlContents;
          const containerDiv = document.createElement('div');
          containerDiv.id = 'ingrExpIngredientExporterPopup';
          shadowRoot = containerDiv.attachShadow({ mode: 'open', name: 'mainShadowRoot'});
          shadowRoot.innerHTML = indexHtml;
          const style = document.createElement('style'); 
          style.textContent = cssStyle; 
          shadowRoot.appendChild(style);
          document.body.insertAdjacentElement('afterbegin', containerDiv);
  
          if(backgroundResponse.noLocation){
            //add the no location html
            fetch(chrome.runtime.getURL('noLocation.html'))
            .then(response => response.text())
            .then(ingredientHtml => {
              //insert each ingredient into html 
              let ingredDiv = shadowRoot.getElementById('ingrExpPlaceholderForIngredients');
              let nodeClone = document.createElement('div'); // Create a new div 
              nodeClone.innerHTML = ingredientHtml;  //Set the inner HTML of the div 
              nodeClone.id = 'noLocationDiv';  // Set the id of the new div
              ingredDiv.appendChild(nodeClone);
            })
          }else{
            //insert each ingredient into the popup
            const ingredientData = new Map(backgroundResponse.ingredientData);
            insertEachIngredient(ingredientData);
            //set the location name if it exists in memory 
            chrome.storage.sync.get('locationName', (result) => {
              console.log('location Name ', result['locationName']);
              if (result['locationName'] != undefined){
                shadowRoot.getElementById('ingrExpZipCode').style.display = 'none';
                shadowRoot.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
                shadowRoot.getElementById('ingrExpPickupAt').textContent = result['locationName']
                shadowRoot.getElementById('change').style.display = '-webkit-box'; 
              }
            });
          }
          shadowRoot.getElementById('ingrExpClose').addEventListener('click', closePopup); 
          shadowRoot.getElementById('minimize').addEventListener('click', minimizeClicked); 
          shadowRoot.getElementById('ingrExpCheckoutButton').addEventListener('click', checkoutButtonClicked); 
          shadowRoot.getElementById('change').addEventListener('click', changeButtonPressed); 
          shadowRoot.getElementById('ingrExpZipCode').addEventListener('keyup', zipCodeEdited); 
          shadowRoot.getElementById('goToCart').addEventListener('click', goToCart); 
          updateCheckoutButton();
        } catch (error) {
          console.error('ERROR in runExtension.js: ', error);
        }
      }
      populateReaderView(recipe); 

    })();
  }
}

function populateReaderView(recipe){
  var title = shadowRoot.getElementById('recipe-title');
  if(recipe.name != null){
    title.style.display = 'block';
    title.textContent = recipe.name;
  }else{
    title.style.display = 'none';
  }
  
  var description = shadowRoot.getElementById('recipe-description');
  if(recipe.description != null){
    description.style.display = 'block';
    description.textContent = recipe.description;
  }else{
    description.style.display = 'none';
  }
  
  var image = shadowRoot.getElementById('recipe-image');
  if(recipe.image != null){
    image.style.display = 'block';
    image.src = recipe.image;
  }else{
    image.style.display = 'none';
  }

  //populate ingredients 
  var ingredients = shadowRoot.getElementById('ingredients');
  const ingredientList = shadowRoot.getElementById('ingredientList');
  // Check if recipe.ingredients is an array
  if (Array.isArray(recipe.ingredients)) {
    // Iterate over the recipe.ingredients array and create <li> elements
    recipe.ingredients.forEach(ingredient => {
      // Create a new <li> element
      const li = document.createElement('li');
      
      // Set the text content of the <li> element
      li.textContent = ingredient;

      // Append the <li> element to the <ul> element
      ingredientList.appendChild(li);
    });

    // Ensure the title and list are visible
    ingredients.style.display = 'block';
    ingredientList.style.display = 'block';
  }else{
    ingredients.style.display = 'none';
    ingredientList.style.display = 'none';
  }

  // Handle Instructions
  const instructionsTitle = shadowRoot.getElementById('instructions');
  const instructionsList = shadowRoot.getElementById('instructionsList');

  // Check if recipe.instructions is an array
  if (Array.isArray(recipe.instructions) && recipe.instructions.length > 0) {
    instructionsList.innerHTML = ''; // Clear any previous content
    recipe.instructions.forEach(instruction => {
      const li = document.createElement('li');
      li.textContent = instruction;
      instructionsList.appendChild(li);
    });

    // Ensure the title and list are visible
    instructionsTitle.style.display = 'block';
    instructionsList.style.display = 'block';
  } else {
    instructionsTitle.style.display = 'none';
    instructionsList.style.display = 'none';
  }

  // Handle Times
  const times = shadowRoot.getElementById('times');
  times.innerHTML = ''; // Clear existing times

  // Function to add a time block
  function addTimeBlock(timeName, timeQuantity) {
    const timeDiv = document.createElement('div');
    const nameP = document.createElement('p');
    nameP.className = 'timeName';
    nameP.textContent = timeName;

    const quantityP = document.createElement('p');
    quantityP.className = 'timeQuantity';
    quantityP.textContent = timeQuantity;

    timeDiv.appendChild(nameP);
    timeDiv.appendChild(quantityP);
    times.appendChild(timeDiv);
  }

  // Add each time if it exists
  if (recipe.prepTime) addTimeBlock('Prep Time', recipe.prepTime);
  if (recipe.performTime) addTimeBlock('Perform Time', recipe.performTime);
  if (recipe.cookTime) addTimeBlock('Cook Time', recipe.cookTime);
  if (recipe.totalTime) addTimeBlock('Total Time', recipe.totalTime);
}

// Listening for messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log("Message received from background:", message);
  if (message.to == 'pinterestPageChanged') {
    console.log('Pinterest page changed');
    closePopup();
    lookForPinterestIngredient(Date.now(), 6000);
  } else if (message.to == '') {

  }
  else {
    console.log('unnhandled message in run extension listener ', message);
}
});

function checkForItemprop() { //returns true if pinterest ingredients found
  const elements = document.querySelectorAll('[itemprop]');
  if (elements.length > 0) {
    console.log("itemprop found");
    ingredients = findRecipeDataOnPage();
    deployExtension();
    return true;
  }
  return false;
}

function lookForPinterestIngredient(startTime, maxDuration) {
  const checkAndTimeout = () => {
    if (checkForItemprop()) {
      return;
    }
    const currentTime = Date.now();
    if (currentTime - startTime < maxDuration) {
      requestAnimationFrame(checkAndTimeout);
    } else {
      console.log("Max duration reached when looking for pinterest ingredients.");
    }
  };
  checkAndTimeout();
}

function warningPopup(warningText, color){
  var popup = shadowRoot.getElementById('ingrExpCheckoutButtonPopup');
  popup.style.display = 'block';
  popup.textContent = warningText; 
  popup.style.backgroundColor = color;
  setTimeout(function () {
      popup.style.display = 'none';
  }, 3000); 
}

function loadFromLocalStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

async function insertEachIngredient(ingredientData){
  let existingNoLocationDiv = shadowRoot.getElementById('noLocationDiv');
  if (existingNoLocationDiv) {
    existingNoLocationDiv.remove();
  }
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
      if(productData[0].brand != undefined){
        nodeClone.querySelector('.ingrExpIngredientBrand').textContent = productData[0].brand; 
        nodeClone.querySelector('.ingrExpIngredientBrand').style.display = '-webkit-box';
      }else{
        nodeClone.querySelector('.ingrExpIngredientBrand').style.display = 'none';
      }
      if(productData[0].description != undefined){
        nodeClone.querySelector('.ingredientDescription').textContent = productData[0].description;
        nodeClone.querySelector('.ingredientDescription').style.display = '-webkit-box';
      }else{
        nodeClone.querySelector('.ingredientDescription').style.display = 'none'; 
      }
      nodeClone.querySelector('.ingrExpSize').textContent = productData[0].size;
      nodeClone.querySelector('.ingrExpOuterContainer').id = 'ingrExpIngredient' + index;
      nodeClone.querySelector('.leftArrow').style.opacity = 0;
      nodeClone.querySelector('.leftArrow').style.visibility = 'hidden';
      nodeClone.querySelector('.leftArrow').style.pointerEvents = 'none';

      var price = productData[0].price;
      if (price !== null){
        nodeClone.querySelector('.ingrExpPriceContainer').style.display = '-webkit-box';
        const dollars = Math.floor(price);
        const cents = Math.round((price - dollars) * 100);
        nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
        nodeClone.querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
      }else{
        nodeClone.querySelector('.ingrExpPriceContainer').style.display = 'none';
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

    elementsWithClass = shadowRoot.querySelectorAll('.leftArrow');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', leftArrowClicked);
    });
    elementsWithClass = shadowRoot.querySelectorAll('.startingPlusButton');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', startingPlusButtonClicked);
    });

    elementsWithClass = shadowRoot.querySelectorAll('.minusButton');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', minusButtonClicked);
    });

    elementsWithClass = shadowRoot.querySelectorAll('.plusButton');
    elementsWithClass.forEach(element => {
      element.addEventListener('click', plusButtonClicked);
    });
  })
  .catch(error => console.error('Error:', error));
}

async function minimizeClicked(event){
  //Hide the main poup. Close location popup if open. 
  console.log('minimize pressed ');
  document.getElementById('ingrExpIngredientExporterPopup').style.display = 'none'; 
  var locationPopup = document.getElementById('ingrExpLocationPopup');
  if (locationPopup){
    locationPopup.remove();
  }

  try{  
    const htmlContents = await Promise.all([
      fetch(chrome.runtime.getURL('minimizePopup.html')).then(response => response.text()),
      fetch(chrome.runtime.getURL('styles.css')).then(response => response.text()),
    ]);
    const [minimizeHtml, minimizeStyles] = htmlContents;

    //insert HTML with shadowroot and css. 
    const containerDiv = document.createElement('div'); 
    containerDiv.id = 'minimizePopup'; 
    minimizeShadowRoot = containerDiv.attachShadow({ mode: 'open', name: 'minimizeShadowRoot'}); 
    //console.log(minimizeHtml);
    minimizeShadowRoot.innerHTML = minimizeHtml; 
    const style = document.createElement('style'); 
    style.textContent = minimizeStyles; 
    minimizeShadowRoot.appendChild(style); 
    document.body.insertAdjacentElement('afterbegin', containerDiv); 
    minimizeShadowRoot.getElementById('ingredientsFound').addEventListener('click', showIngredientsFound); 
    minimizeShadowRoot.getElementById('closeInMinimizePopup').addEventListener('click', closeInMinimizePopup); 
    minimizeShadowRoot.getElementById('ingredientsFound').textContent = allProductData.length + " Ingredients Found";
  }catch (error) { 
    console.error('ERROR in minimized clicked ', error); 
  }
} 

function showIngredientsFound(event){
  closeInMinimizePopup(event);
  document.getElementById('ingrExpIngredientExporterPopup').style.display = 'block'; 
}

function closeInMinimizePopup(event){
  document.getElementById('minimizePopup').remove(); 
}

function closePopup(event) {//closes the main popup or the location popup 
  //mainShadowRoot 
  console.log('close ', event); 
  if (event == undefined || event.target.id === 'ingrExpCloseImage'){
    // Assuming containerDiv is already defined
    var mainPopup = document.getElementById('ingrExpIngredientExporterPopup');
    console.log('main popup ', mainPopup);
    if(mainPopup){
      console.log('remove main popup');
      mainPopup.remove(); 
    }    

    var locationPopup = document.getElementById('ingrExpLocationPopup');
    if (locationPopup){
      locationPopup.remove();
      console.log('remove location popup');
    }
  }else if (event.target.id === "ingrExpCloseImageInPopup"){
    document.getElementById('ingrExpLocationPopup').remove();
    console.log('remove location popup');
  }
}

async function getLocationAndStoreType() {
  return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['locationId', 'storeType'], (result) => {
          if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
          } else {
              resolve(result);
          }
      });
  });
}

async function loadLocationsInPopup(newLocationData){
  let locationPlaceholder = locationShadowRoot.getElementById('ingrExpPlaceholderForLocations');
  const locationResponse = await fetch(chrome.runtime.getURL('location.html'));
  const locationHtml = await locationResponse.text();
  allLocationData = newLocationData; 

  try {
    const { locationId, storeType } = await getLocationAndStoreType();

    for (const index in newLocationData){
      var locationData = newLocationData[index];
      let nodeClone = document.createElement('div');  // Create a new div 
      nodeClone.innerHTML = locationHtml;  // Set the inner HTML of the div 
      nodeClone.querySelector('.ingrExpTopLocationDiv').id = 'ingrExpTopLocationDiv' + index;
      nodeClone.querySelector('.ingrExpLocationName').textContent = locationData["name"];
      nodeClone.querySelector('.groceryLogo').src = "chrome-extension://nckacfgoolkhaedphbknecabckccgffe" + locationData["logo"];
      var addressObject = locationData["address"];
      //console.log('addr obj ', addressObject);
      var formattedAddress = `${addressObject.addressLine1}\n${addressObject.city}, ${addressObject.state} ${addressObject.zipCode}`;
      nodeClone.querySelector('.ingrExpLocationAddress').textContent = formattedAddress
      if (locationData["phone"] != undefined){
        const formattedNumber = `${locationData["phone"].substring(0, 3)}-${locationData["phone"].substring(3, 6)}-${locationData["phone"].substring(6)}`;  
        nodeClone.querySelector('.ingrExpPhoneNumber').textContent = formattedNumber 
      }
      //check if the location is the one selected 
      if(locationData['storeType']==storeType && locationData['id']==locationId){
        nodeClone.querySelector('.ingrExpShopStore').style.backgroundColor = 'rgb(125,120,185)';
        nodeClone.querySelector('.ingrExpShopStore').innerText = 'Currently Shopping';
      }
      console.log(locationData)
      nodeClone.querySelector('.ingrExpShopStore').addEventListener('click', shopStore); 
      locationPlaceholder.appendChild(nodeClone); 
    }
  } catch (error) {
    console.error('Error retrieving data from Chrome storage:', error);
  }
}

async function insertLocations(){
  let backgroundResponse = await chrome.runtime.sendMessage({to: 'locations'}); 
  console.log('background response ', backgroundResponse)
  if(backgroundResponse.locationsFound){
    loadLocationsInPopup(backgroundResponse.locationData); 
    locationShadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'none'; 
  }else{
    locationShadowRoot.getElementById('ingrExpZipCodeInPopup').style.display = '-webkit-box';
    locationShadowRoot.getElementById('ingrExpZipCodeInPopup').addEventListener('keyup', zipCodeInPopupEdited);
    locationShadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'inline-block'; 
  }
}

function changeButtonPressed(){
  var zipCode = shadowRoot.getElementById('ingrExpZipCode').value;
  // Check if the Enter key is pressed and the zip code is not blank
  if (/^\d{5}$/.test(zipCode.trim())) {
    console.log('zip code used ', zipCode.trim());
    chrome.storage.sync.set({['zipCode']: zipCode.trim()}); 
  }
  launchLocationPopup();
}

async function launchLocationPopup() {
  console.log('launch location popup ', locationShadowRoot); 
  //display or hide the zip code in the lcoations popup 
  var pickupAt = shadowRoot.getElementById('ingrExpPickupAt'); //check if the location is being displayed in main popup
  if (document.getElementById('ingrExpLocationPopup') == null){//check if popup is already open 
    try{ //insert the popup       
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
        chrome.storage.sync.get('zipCode', (result) => {
          if (result['zipCode'] != undefined){
            console.log('zip code being used in location popup ', result['zipCode']);
            locationShadowRoot.getElementById('ingrExpZipCodeInPopup').value = result['zipCode'];
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
  // Change cursor to spinning wheel
  document.getElementById('ingrExpLocationPopup').remove(); 
  if (event.target.innerText !== 'Currently Shopping') {
    document.body.classList.add('wait-cursor');
    var id = event.target.closest('[id]').id; 
    var locationIndex = Number(id.replace(/ingrExpTopLocationDiv/g, '')); 
    console.log('shop store pressed ', locationIndex); 
    var locationId = allLocationData[locationIndex]['id'];
    var locationName = allLocationData[locationIndex]['name'];
    console.log('location ID & data ', locationId, allLocationData[locationIndex]);
  
    shadowRoot.getElementById('ingrExpZipCode').style.display = 'none';
    shadowRoot.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
    shadowRoot.getElementById('ingrExpPickupAt').textContent = locationName; 
    chrome.storage.sync.set({['locationId']: locationId});
    chrome.storage.sync.set({['locationName']: locationName});
    chrome.storage.sync.set({['storeType']: allLocationData[locationIndex]['storeType']});
    chrome.storage.sync.set({['currentLocation']: allLocationData[locationIndex]});
  
    allProductData = [];
    updateCheckoutButton();  
  
    //change appears
    shadowRoot.getElementById('change').style.display = '-webkit-box'; 
    
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
  
    // Change cursor back to normal
    document.body.classList.remove('wait-cursor');
  }
}

function displayNewIngredient(id, rightOrLeft, event){ //loads the image and product info when an arrow is clicked 
  console.log('all product Data',  allProductData);
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

  if(ingredientClickedData['productData'][newIngredientIndex]['brand'] != undefined){
    shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').textContent = ingredientClickedData['productData'][newIngredientIndex]['brand'];
    shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').style.display = '-webkit-box';
  }else{
    shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').style.display = 'none';
  }
  if(ingredientClickedData['productData'][newIngredientIndex]['description'] != undefined){
    shadowRoot.getElementById(id).querySelector('.ingredientDescription').textContent = ingredientClickedData['productData'][newIngredientIndex]['description'];
    shadowRoot.getElementById(id).querySelector('.ingredientDescription').style.display = '-webkit-box';
  }else{
    shadowRoot.getElementById(id).querySelector('.ingredientDescription').style.display = 'none';
  }

  shadowRoot.getElementById(id).querySelector('.ingrExpSize').textContent = ingredientClickedData['productData'][newIngredientIndex]['size'];
  updateStartingPlusButton(event); 
  //remove timer from quantity button 
  var quantityButtons = event.target.closest('.ingrExpOuterContainer').querySelector('.quantityButtons');
  clearTimeout(quantityButtons.timeout);
  quantityButtons.style.display = 'none';

  if(ingredientClickedData['productData'][newIngredientIndex]['price'] != null){
    shadowRoot.getElementById(id).querySelector('.ingrExpPriceContainer').style.display = '-webkit-box';
    const dollars = Math.floor(ingredientClickedData['productData'][newIngredientIndex]['price']);
    const cents = Math.round((ingredientClickedData['productData'][newIngredientIndex]['price'] - dollars) * 100);
    shadowRoot.getElementById(id).querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
    shadowRoot.getElementById(id).querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
  }else{
    shadowRoot.getElementById(id).querySelector('.ingrExpPriceContainer').style.display = 'none';
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
  displayNewIngredient(id, 'left', event); 
}

function rightArrowClicked(event){
  var id = event.target.closest('[id]').id; 
  displayNewIngredient(id, 'right', event); 
}

async function updateCheckoutButton() {
  //console.log('update checkout button');
  var totalQuantity = 0;
  var totalPrice = 0.0;
  console.log('allProductData ', allProductData);
  // Iterate through allProductData and get the total quantity and price 
  allProductData.forEach(function (element) {
    element.productData.forEach(function (product) {
      var quantity = product.quantity || 0;
      var price = product.price || 0;
      totalQuantity += quantity;
      totalPrice += price * quantity; // Corrected: Multiply price by quantity
    });
  });
  let goToCartButton = shadowRoot.getElementById('goToCart');
  if (goToCartButton) {
    goToCartButton.style.display = 'none'; // Hide the button
  }

  let checkoutButton = shadowRoot.getElementById('ingrExpCheckoutButton'); 
  if (totalQuantity == 0) {
    checkoutButton.innerHTML = `No Items Selected`;
    checkoutButton.style.cursor = 'default';
    checkoutButton.classList.remove('ingrExpCheckoutButton-hover');
    //remove tooltip
    var tooltipSpan = checkoutButton.querySelector(".tooltip");
    
    if (tooltipSpan) {
        button.removeChild(tooltipSpan);
    }
  } else {
    checkoutButton.innerHTML = `Add <span class="bold">${totalQuantity}</span> Items for <span class="bold">$${totalPrice.toFixed(2)}</span>`;
    checkoutButton.style.cursor = 'pointer';
    checkoutButton.classList.add('ingrExpCheckoutButton-hover');
    checkoutButton.classList.add("grow");
    // Check if the tooltip already exists to avoid duplicates
    if (!checkoutButton.querySelector(".tooltip")) {
        var tooltipSpan = document.createElement("span");
        tooltipSpan.className = "tooltip tooltipUp";

        // Create a list of quantities and descriptions
        let tooltipContent = "<ul>";
        allProductData.forEach(function (element) {
          element.productData.forEach(function (product) {
            if (product.quantity > 0) {
              tooltipContent += `<li>${product.quantity} - ${product.description}</li>`;
            }
          });
        });
        tooltipContent += "</ul>";

        // Apply the desired styles
        tooltipSpan.style.whiteSpace = "normal";
        tooltipSpan.style.minWidth = "350px";
        tooltipSpan.style.textAlign = "left"; // Align the text to the left

        tooltipSpan.innerHTML = tooltipContent; // Set the tooltip content
        checkoutButton.appendChild(tooltipSpan);

    }
    setTimeout(() => {
      checkoutButton.classList.remove("grow");
    }, 300); // Adjust the timing to match the CSS transition duration
  }
}

function startingPlusButtonClicked(event) {
  var id = event.target.closest('[id]').id;
  var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
  var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];

  resetTimeoutOnQuantityButtons(event);

  var quantityButtons = event.target.closest('.ingrExpOuterContainer').querySelector('.quantityButtons');
  quantityButtons.style.display = 'flex';
  quantityButtons.style.width = '108px';
  quantityButtons.style.height = '40px';
  var currentQuantity = allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'];
  var currentQuantityButton = event.target.closest('.ingrExpOuterContainer').querySelector('.quantity');
  currentQuantityButton.innerText = String(currentQuantity);

  //if the quantity is 0 then increment the array of data 
  if (currentQuantity == 0) {
    plusButtonClicked(event);
  }
}

function updateStartingPlusButton(event){ //updates the original plus button with a quantity 
  var startingPlusButton = event.target.closest('.ingrExpOuterContainer').querySelector('.startingPlusButton');
  var id = event.target.closest('[id]').id;
  var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
  var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
  if(startingPlusButton){
    var quantity = allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'];
    if(quantity == 0){
      startingPlusButton.classList.remove('startingPlusButtonNoImage');
      startingPlusButton.innerText = '';
    }else{
      startingPlusButton.innerText = String(quantity);
      startingPlusButton.classList.add('startingPlusButtonNoImage');
    }
  }
}

function minusButtonClicked(event) {
  // Find the quantity element within the closest ancestor
  var quantityElement = event.target.closest('.ingrExpOuterContainer').querySelector('.quantity');
  // Check if the element is found
  var id = event.target.closest('[id]').id;
  var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
  var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];

  // Check if the element is found
  if (quantityElement) {
    // Update the content of the quantity element 
    var currentQuantity = allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] 
    console.log('current quantity ', currentQuantity);
    if (currentQuantity > 0) {
      // Update the content of the quantity element 
      quantityElement.innerText = String(currentQuantity - 1);
      // Update the corresponding data in allProductData
      var id = event.target.closest('[id]').id;
      var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
      var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
      allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity - 1;
      console.log('current quantity updated', currentQuantity); 

      updateStartingPlusButton(event);
      updateCheckoutButton(); 
    }
  }
  resetTimeoutOnQuantityButtons(event);
}

function plusButtonClicked(event) {
  // Find the quantity element within the closest ancestor
  var quantityElement = event.target.closest('.ingrExpOuterContainer').querySelector('.quantity');
  // Check if the element is found
  var id = event.target.closest('[id]').id;
  var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
  var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];

  if (quantityElement) {
    // Update the content of the quantity element 
    var currentQuantity = allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] //Number(quantityElement.innerText);
    quantityElement.innerText = String(currentQuantity + 1);

    // Update the corresponding data in allProductData
    var id = event.target.closest('[id]').id; 
    var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
    console.log('all prod data ', productIndex); 
    var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
    allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity + 1;
    
    updateStartingPlusButton(event);
    updateCheckoutButton(); 
  }
  resetTimeoutOnQuantityButtons(event);
}

function resetTimeoutOnQuantityButtons(event){
  //console.log('reset timeout ');
  var quantityButtons = event.target.closest('.ingrExpOuterContainer').querySelector('.quantityButtons');
  // Clear any existing timeout
  clearTimeout(quantityButtons.timeout);
  // Set new timeout for hiding the button
  quantityButtons.timeout = setTimeout(() => {
    quantityButtons.style.width = '40px';
    quantityButtons.style.height = '40px';
    quantityButtons.style.display = 'none';
  }, 2000);
}

async function checkoutUser(quantityAndUPCArray) {
  let response = await chrome.runtime.sendMessage({ to: 'checkout', data: quantityAndUPCArray }); 
  console.log('Was cart successful? ', response.success, quantityAndUPCArray); 

  if (response.success) { 
    //make all quantities 0 in array 
    allProductData.forEach(outerArray => {
      outerArray.productData.forEach(product => {
          product.quantity = 0;
      });
    });
    //make all quantities 0 in UI
    const elements = shadowRoot.querySelectorAll(`.${'startingPlusButton'}`);
    elements.forEach(element => {
      element.classList.remove('startingPlusButtonNoImage');
      element.innerText = '';
    });
    shadowRoot.getElementById('ingrExpCheckoutButton').innerHTML = 'Items Successfully Added';
    shadowRoot.getElementById('ingrExpCheckoutButton').classList.remove('ingrExpCheckoutButton-hover');
    shadowRoot.getElementById('ingrExpCheckoutButton').style.cursor = 'default';
    shadowRoot.getElementById('goToCart').style.display = 'block';

  } else {
    warningPopup(response.errorMessage, 'rgb(210, 40, 65)');
    console.log('error when trying to add to cart');
  }  
  return response; 
}

async function checkoutButtonClicked() {
  console.log('checkout button clicked ');
  //disable button until products are done being added
  shadowRoot.getElementById("ingrExpCheckoutButton").disabled = true; 

  //get the quantity of items to add to cart 
  const productAndQuantityArray = []; 
  for (const productData of allProductData) {
    for (const product of productData.productData) {
      const quantity = product.quantity;
      if (quantity > 0){
        productAndQuantityArray.push(product);
      }
    }
  }
  
  if (productAndQuantityArray.length != 0) {
    console.log('quantity and product ', productAndQuantityArray); 
    shadowRoot.getElementById("ingrExpCheckoutButton").innerText = 'Adding Items to Cart...'; 

    await checkoutUser(productAndQuantityArray); 
  } else {
    console.log('No items selected. Do nothing.');
  }

  // Re-enable button and reset cursor after everything is done
  shadowRoot.getElementById("ingrExpCheckoutButton").disabled = false;
}

function parseRecipeData(i) {
  if (i == null) {
    return {
      name: null,
      ingredients: null,
      instructions: null,
      totalTime: null,
      performTime: null,
      preTime: null,
      cookTime: null,
      yield: null,
      image: null,
      description: null
    };
  }

  const scriptType = i['@type'] ?? false;
  let result = {
    name: null,
    ingredients: null,
    instructions: null,
    totalTime: null,
    performTime: null,
    preTime: null,
    cookTime: null,
    yield: null,
    image: null,
    description: null
  };

  // Helper function to decode HTML entities
  function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  if (scriptType === 'Recipe' || (Array.isArray(scriptType) && scriptType.includes('Recipe'))) {
    // Get the recipe name
    result.name = i['name'] ? decodeHTML(i['name']) : null;

    // Get the ingredients
    result.ingredients = i['recipeIngredient'] || null;

    // Get the recipe image (assuming it’s a URL or an array of URLs)
    if (typeof i['image'] === 'string') {
      result.image = i['image'];
    } else if (Array.isArray(i['image']) && i['image'].length > 0) {
      result.image = i['image'][0];
    }

    // Get the recipe description
    result.description = i['description'] ? decodeHTML(i['description']) : null;

    // Convert 'recipeInstructions' into an array of strings
    if (Array.isArray(i['recipeInstructions'])) {
      result.instructions = i['recipeInstructions'].map(instruction => {
        if (typeof instruction === 'string') {
          return decodeHTML(instruction);
        } else if (instruction['@type'] === 'HowToStep' && instruction.text) {
          return decodeHTML(instruction.text);
        } else if (instruction['@type'] === 'HowToStep' && instruction.name) {
          return decodeHTML(instruction.name);
        }
        return '';
      }).filter(step => step.trim().length > 0); // Filter out empty strings
    } else if (typeof i['recipeInstructions'] === 'string') {
      result.instructions = [decodeHTML(i['recipeInstructions'])];
    } else {
      result.instructions = null;
    }

    // Parse the times
    result.totalTime = parseISODuration(i['totalTime']) || null;
    result.performTime = parseISODuration(i['performTime']) || null;
    result.preTime = parseISODuration(i['prepTime']) || null;
    result.cookTime = parseISODuration(i['cookTime']) || null;

    // Get the recipe yield
    result.yield = i['recipeYield'] || null;
  }

  return result;
}

// Function to convert ISO 8601 duration (like P0Y0M0DT0H5M0.000S) to a human-readable format
function parseISODuration(duration) {
  if (!duration) return null;

  // Regular expression to match and capture the relevant parts of the duration
  const matches = duration.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T(?:\d+H)?(\d+M)?(?:[\d.]+S)?/);

  if (!matches) return duration; // Return original if it doesn't match the expected format

  const minutes = matches[1] ? parseInt(matches[1]) : 0;

  if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return "0 minutes"; // In case there’s no valid time found, return 0 minutes
  }
}

function findRecipeDataOnPage() {
  var currentUrl = window.location.href;
  console.log("Current URL: " + currentUrl);

  if (currentUrl.includes("pinterest.com")) {
    // The user is on Pinterest
    console.log("You are on Pinterest!");

    var ingredientsArray = [];
    var elementsWithItemprop = document.querySelectorAll('[itemprop]');

    elementsWithItemprop.forEach(function(element) {
      if (element.getAttribute('itemprop') === 'recipeIngredient') {
        var ingredient = element.textContent.trim();
        ingredientsArray.push(ingredient);
      }
    });

    return {
      ingredients: ingredientsArray,
      instructions: null,
      totalTime: null,
      performTime: null,
      preTime: null,
      cookTime: null,
      yield: null,
      image: null,
      description: null
    };
  } else {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      const schema = JSON.parse(script.textContent);
      console.log('Script parsed:', schema);

      let graph = schema['@graph'];
      if (graph != undefined) {
        for (const key in graph) {
          var value = graph[key];
          var recipeData = parseRecipeData(value);
          if (recipeData.ingredients || recipeData.instructions || recipeData.totalTime || recipeData.performTime || recipeData.preTime || recipeData.cookTime || recipeData.yield || recipeData.image || recipeData.description) {
            return recipeData;
          }
        }
      } else {
        var recipeData = parseRecipeData(schema);
        if (recipeData.ingredients || recipeData.instructions || recipeData.totalTime || recipeData.performTime || recipeData.preTime || recipeData.cookTime || recipeData.yield || recipeData.image || recipeData.description) {
          return recipeData;
        }

        for (const key in schema) {
          var value = schema[key];
          if (key === 'recipeIngredient' || key === 'recipeInstructions' || key === 'totalTime' || key === 'performTime' || key === 'prepTime' || key === 'cookTime' || key === 'recipeYield') {
            recipeData[key] = schema[key] || null;
          } else {
            var nestedData = parseRecipeData(value);
            if (nestedData.ingredients || nestedData.instructions || nestedData.totalTime || nestedData.performTime || nestedData.preTime || nestedData.cookTime || nestedData.yield || nestedData.image || nestedData.description) {
              return nestedData;
            }
          }
        }
      }
    }

    // Return nulls if no recipe data is found
    return {
      ingredients: null,
      instructions: null,
      totalTime: null,
      performTime: null,
      preTime: null,
      cookTime: null,
      yield: null,
      image: null,
      description: null
    };
  }
}


async function zipCodeEdited(event) {
  var zipCode = shadowRoot.getElementById('ingrExpZipCode').value;
  // Check if the Enter key is pressed and the zip code is not blank
  if (event.key === 'Enter'){
    console.log('zip code used ', zipCode)
    chrome.storage.sync.set({['zipCode']: zipCode.trim()}); 
    await launchLocationPopup();
  }
}

function zipCodeInPopupEdited(event) {
  console.log('zip code in popup edited ', event.key)
  var zipCode = locationShadowRoot.getElementById('ingrExpZipCodeInPopup').value;
  if (event.key === 'Enter') {
    var elementsToRemove = locationShadowRoot.querySelectorAll('.ingrExpTopLocationDiv'); // Use a dot for class name
    elementsToRemove.forEach(element => {
      element.parentNode.removeChild(element);
    });
    chrome.storage.sync.set({['zipCode']: zipCode.trim()}); 
    insertLocations();
  }
}

async function goToCart(event) {
  console.log('go to cart pressed');
  let goToCartButton = shadowRoot.getElementById('goToCart');
  if (goToCartButton) {
    goToCartButton.style.display = 'none'; // Hide the button
  } else {
    console.error('ERROR goToCart button not found');
  }

  try {
    let success = await chrome.runtime.sendMessage({ to: 'goToCart' });
    if (success) {
      console.log('GoTOCart Message sent successfully');
    } else {
      console.error('GoTOCart Message not successful');
    }
  } catch (error) {
    console.error('Error sending goToCart message:', error);
  }
}
