var allProductData = []; // 2D array of all data from grocery store
var allLocationData = []; 
var shadowRoot; 
var minimizeShadowRoot; 
var currentUrl = window.location.href;
console.log("run extension " + currentUrl);
console.log("Current URL: " + currentUrl);

var recipe = findRecipeDataOnPage(); 
console.log('recipe ', recipe);
var ingredients = recipe.ingredients; 
console.log('ingredients ', ingredients);

if (!currentUrl.includes("pinterest.com")) {
  deployExtension(); 
  console.log('ext deployed');
}

async function deployExtension(){  
  console.log('deploy ');
  const mainPopup = document.getElementById('ingrExpIngredientExporterPopup');
  const minimizedPopup = document.getElementById('minimizePopup');
  if (ingredients != null && ingredients.length > 0) {
    console.log('deploy ext '); 
    try {
      //insert index.html 
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

      // Now that shadowRoot is ready, populate the reader view
      populateReaderView(recipe);

      //make the extension the correct size 
      loadFromLocalStorage('lastPosition')
      .then(lastPosition => {
        console.log('last position ', lastPosition); 
        if(lastPosition == 'productsOnly'){
          collapseLeft(); 
          shadowRoot.getElementById('ingrExpTopLevelDiv').style.display = 'flex';
        }else if(lastPosition == 'readerViewOnly'){
          collapseRight(); 
          shadowRoot.getElementById('ingrExpTopLevelDiv').style.display = 'flex';
        }else{
          //'full' view, do nothing
          shadowRoot.getElementById('ingrExpTopLevelDiv').style.display = 'flex';
        }
      })

      //check if location exists 
      var locationExists = await loadFromLocalStorage('locationName');
      console.log('location exists ', locationExists);
      // Set the location name if it exists in memory 
      if (locationExists != undefined){
        shadowRoot.getElementById('ingrExpZipCode').style.display = 'none';
        shadowRoot.getElementById('ingrExpPickupAt').style.display = '-webkit-box';
        shadowRoot.getElementById('ingrExpPickupAt').textContent = locationExists;
        shadowRoot.getElementById('change').style.display = '-webkit-box'; 
        shadowRoot.getElementById('loadingContainer').style.display = 'block';
      }

      // Add event listeners after the HTML is injected
      shadowRoot.getElementById('ingrExpClose').addEventListener('click', closePopup); 
      shadowRoot.getElementById('minimize').addEventListener('click', minimizeClicked); 
      shadowRoot.getElementById('ingrExpCheckoutButton').addEventListener('click', checkoutButtonClicked); 
      shadowRoot.getElementById('change').addEventListener('click', changeButtonPressed); 
      shadowRoot.getElementById('ingrExpZipCode').addEventListener('keyup', zipCodeEdited); 
      shadowRoot.getElementById('goToCart').addEventListener('click', goToCart); 
      shadowRoot.getElementById('collapseLeft').addEventListener('click', collapseLeft); 
      shadowRoot.getElementById('collapseRight').addEventListener('click', collapseRight); 
      shadowRoot.getElementById('cookModeToggle').addEventListener('click', cookMode); 

      updateCheckoutButton();

      let backgroundResponse = await chrome.runtime.sendMessage({to: 'ingredients', data: ingredients, locationExists: locationExists}); 

      if(backgroundResponse.noLocation){
        // Add the no location HTML
        fetch(chrome.runtime.getURL('noLocation.html'))
        .then(response => response.text())
        .then(ingredientHtml => {
          // Insert each ingredient into HTML 
          shadowRoot.getElementById('loadingContainer').style.display = 'none';
          let ingredDiv = shadowRoot.getElementById('ingrExpPlaceholderForIngredients');
          let nodeClone = document.createElement('div'); // Create a new div 
          nodeClone.innerHTML = ingredientHtml;  // Set the inner HTML of the div 
          nodeClone.id = 'noLocationDiv';  // Set the id of the new div 
          ingredDiv.appendChild(nodeClone);
        });
      } else {
        // Insert each ingredient into the popup
        insertEachIngredient(backgroundResponse.ingredientData);
        shadowRoot.getElementById('loadingContainer').style.display = 'none';
      }

    } catch (error) {
      console.error('ERROR in runExtension.js: ', error);
    }
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

  // Populate ingredients
  var ingredients = shadowRoot.getElementById('ingredients');
  const ingredientList = shadowRoot.getElementById('ingredientList');

  // Check if recipe.ingredients is an array
  if (Array.isArray(recipe.ingredients)) {
    // Iterate over the recipe.ingredients array and create <li> elements
    recipe.ingredients.forEach((ingredient, index) => {
      // Create a new <li> element
      const li = document.createElement('li');
      
      // Set the text content of the <li> element
      li.textContent = ingredient;
      
      // Set a unique id for each <li> element
      li.id = `ingredient${index}`;
      
      // Append the <li> element to the <ul> element
      ingredientList.appendChild(li);
    });

    // Ensure the title and list are visible
    ingredients.style.display = 'block';
    ingredientList.style.display = 'block';
  } else {
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

  // Define time properties and their labels
  const timeProperties = [
    { name: 'Prep Time', value: recipe.prepTime },
    { name: 'Perform Time', value: recipe.performTime },
    { name: 'Cook Time', value: recipe.cookTime },
    { name: 'Total Time', value: recipe.totalTime }
  ];

  // Track if any times exist
  let timeExists = false;

  // Loop through each time property and add a block if it exists
  timeProperties.forEach(time => {
    if (time.value && time.value != '0 minutes') {
      addTimeBlock(time.name, time.value);
      timeExists = true;
    }
  });

  // Set time display based on whether any times exist
  times.style.display = timeExists ? 'flex' : 'none';

  // Populate author
  const authorDiv = shadowRoot.getElementById('authorDiv');
  const authorText = shadowRoot.getElementById('authorText');
  
  if (recipe.author != null) {
    authorDiv.style.display = 'flex';
    authorText.textContent = recipe.author;
  } else {
    authorDiv.style.display = 'none';
  }  
  
  // Handle Servings/Yield (display only the first value if it's an array)
  
  var servingsDiv = shadowRoot.getElementById('servingsDiv');
  servingsDiv.style.display = 'none';
  /*
  var servingsText = shadowRoot.getElementById('servingsText');
  if (Array.isArray(recipe.yield) && recipe.yield.length > 0) {
    servingsDiv.style.display = 'flex';
    servingsText.textContent = recipe.yield[0] + ' Servings';
  } else if (recipe.yield != null) {
    servingsDiv.style.display = 'flex';
    servingsText.textContent = recipe.yield + ' Servings';
  } else {
    servingsDiv.style.display = 'none';
  }*/ 

  // Handle Calories
  
  var caloriesDiv = shadowRoot.getElementById('caloriesDiv');
  caloriesDiv.style.display = 'none';
  /*
  var caloriesText = shadowRoot.getElementById('caloriesText');
  if (recipe.calories != null) {
    caloriesDiv.style.display = 'flex';
    caloriesText.textContent = recipe.calories + ' Calories';
  } else {
    caloriesDiv.style.display = 'none';
  }
  */ 
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
    recipe = findRecipeDataOnPage();
    ingredients = recipe.ingredients; 
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
  var popup = shadowRoot.getElementById('goToCart');
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

async function insertEachIngredient(ingredientData) {
  console.log('ingredient data ', ingredientData);
  let existingNoLocationDiv = shadowRoot.getElementById('noLocationDiv');
  if (existingNoLocationDiv) {
    existingNoLocationDiv.remove();
  }

  fetch(chrome.runtime.getURL('ingredientContainer.html'))
    .then(response => response.text())
    .then(ingredientHtml => {
      let ingredDiv = shadowRoot.getElementById('ingrExpPlaceholderForIngredients');
      allProductData = [];
      
      ingredientData.forEach((ingredient, index) => {
        const productData = ingredient.products; 

        allProductData[index] = { indexOfProductDisplayed: 0, ...ingredient };

        let nodeClone = document.createElement('div'); 
        nodeClone.innerHTML = ingredientHtml;
        nodeClone.querySelector('.ingrExpIngredientImage').src = productData[0].image;

        if (productData[0].brand) {
          nodeClone.querySelector('.ingrExpIngredientBrand').textContent = productData[0].brand;
          nodeClone.querySelector('.ingrExpIngredientBrand').style.display = '-webkit-box';
        } else {
          nodeClone.querySelector('.ingrExpIngredientBrand').style.display = 'none';
        }

        if (productData[0].description) {
          nodeClone.querySelector('.ingredientDescription').textContent = productData[0].description;
          nodeClone.querySelector('.ingredientDescription').style.display = '-webkit-box';
        } else {
          nodeClone.querySelector('.ingredientDescription').style.display = 'none';
        }

        nodeClone.querySelector('.ingredientName').textContent = ingredient.productName;
        nodeClone.querySelector('.ingrExpSize').textContent = productData[0].size;
        nodeClone.querySelector('.ingrExpOuterContainer').id = 'ingrExpIngredient' + index;

        nodeClone.querySelector('.leftArrow').style.opacity = 0;
        nodeClone.querySelector('.leftArrow').style.visibility = 'hidden';
        nodeClone.querySelector('.leftArrow').style.pointerEvents = 'none';

        let price = productData[0].price;
        if (price !== null) {
          nodeClone.querySelector('.ingrExpPriceContainer').style.display = '-webkit-box';
          const dollars = Math.floor(price);
          const cents = Math.round((price - dollars) * 100);
          nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
          nodeClone.querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0');
        } else {
          nodeClone.querySelector('.ingrExpPriceContainer').style.display = 'none';
          nodeClone.querySelector('.ingrExpIngrExpPrice').innerHTML = '';
          nodeClone.querySelector('.ingrExpCents').innerHTML = '';
        }

        if (productData.length === 1) {
          nodeClone.querySelector('.rightArrow').style.opacity = 0;
          nodeClone.querySelector('.rightArrow').style.visibility = 'hidden';
          nodeClone.querySelector('.rightArrow').style.pointerEvents = 'none';
        }

        ingredDiv.appendChild(nodeClone);
        /*
        nodeClone.addEventListener('mouseover', (event) => {
          highlightIngredient(event);
        });
        
        nodeClone.addEventListener('mouseout', (event) => {
          const outerContainer = event.target.closest('.ingrExpOuterContainer');
          if (outerContainer && !outerContainer.contains(event.relatedTarget)) {
            // Only unhighlight if the mouse has left the entire container
            unhighlightIngredient(event);
          }
        });       */   

      });
      
      // Additional event listeners for other elements (arrows, buttons, etc.)
      let elementsWithClass = shadowRoot.querySelectorAll('.ingrExpLeftArrow');
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

// Functions to handle highlight/unhighlight
function highlightIngredient(event) {
  const outerContainer = event.target.closest('.ingrExpOuterContainer');
  if (!outerContainer) {
    console.error('No outer container found for event:', event);
    return;
  }

  const elementId = outerContainer.id;
  if (!elementId) {
    console.error('Outer container has no ID:', outerContainer);
    return;
  }

  const indexStr = elementId.replace('ingrExpIngredient', '');
  const index = parseInt(indexStr, 10);
  if (!isNaN(index)) {
    const indexes = allProductData[index]?.indexes;
    if (indexes) {
      indexes.forEach(i => {
        const ingredientElement = shadowRoot.getElementById(`ingredient${i}`);
        if (ingredientElement) {
          ingredientElement.classList.add('highlight');
        }
      });
    } else {
      console.error(`Indexes not found for index: ${index}`);
    }
  } else {
    console.error(`Invalid index parsed from element ID: ${elementId}`);
  }
}

// Function to remove highlight when unhovered
function unhighlightIngredient(event) {
  const outerContainer = event.target.closest('.ingrExpOuterContainer');
  if (!outerContainer) {
    console.error('No outer container found for event:', event);
    return;
  }

  const elementId = outerContainer.id;
  if (!elementId) {
    console.error('Outer container has no ID:', outerContainer);
    return;
  }

  const indexStr = elementId.replace('ingrExpIngredient', '');
  const index = parseInt(indexStr, 10);
  if (!isNaN(index)) {
    const indexes = allProductData[index]?.indexes;
    if (indexes) {
      indexes.forEach(i => {
        const ingredientElement = shadowRoot.getElementById(`ingredient${i}`);
        if (ingredientElement) {
          ingredientElement.classList.remove('highlight');
        }
      });
    } else {
      console.error(`Indexes not found for index: ${index}`);
    }
  } else {
    console.error(`Invalid index parsed from element ID: ${elementId}`);
  }
}

async function minimizeClicked(event){
  //Hide the main poup. Close location popup if open. 
  console.log('minimize pressed ');
  document.getElementById('ingrExpIngredientExporterPopup').style.display = 'none'; 
  var locationPopup = shadowRoot.getElementById('ingrExpLocationPopup');
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
    minimizeShadowRoot.getElementById('ingredientsFound').textContent = " Recipe Found!";
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

    var locationPopup = shadowRoot.getElementById('ingrExpLocationPopup');
    if (locationPopup){
      locationPopup.remove();
      console.log('remove location popup');
    }
  }else if (event.target.id === "ingrExpCloseImageInPopup"){
    shadowRoot.getElementById('ingrExpLocationPopup').remove();
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
  let locationPlaceholder = shadowRoot.getElementById('ingrExpPlaceholderForLocations');
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
  //console.log('background response load locations', backgroundResponse)
  if(backgroundResponse.locationsFound){
    loadLocationsInPopup(backgroundResponse.locationData); 
    shadowRoot.getElementById('loadingContainerLocationPopup').style.display = 'none';
    shadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'none'; 
  }else{
    shadowRoot.getElementById('ingrExpZipCodeInPopup').style.display = '-webkit-box';
    shadowRoot.getElementById('ingrExpZipCodeInPopup').addEventListener('keyup', zipCodeInPopupEdited);
    shadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'inline-block'; 
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
  console.log('launch location popup'); 

  var pickupAt = shadowRoot.getElementById('ingrExpPickupAt'); //check if the location is being displayed in main popup
  if (shadowRoot.getElementById('ingrExpLocationPopup') == null){ //check if popup is already open 
    try { 
      // Fetch the HTML and CSS contents
      const htmlContents = await Promise.all([
        fetch(chrome.runtime.getURL('locationPopup.html')).then(response => response.text()),
        fetch(chrome.runtime.getURL('styles.css')).then(response => response.text()),
      ]);
      const [locationHtml, cssStyle] = htmlContents;

      // Create a container for the popup
      const containerDiv = document.createElement('div');
      containerDiv.id = 'ingrExpLocationPopup';
      containerDiv.innerHTML = locationHtml;

      // Insert the CSS styles within a <style> tag
      const style = document.createElement('style');
      style.textContent = cssStyle;
      containerDiv.appendChild(style);

      // Insert the containerDiv into the placeholderForLocationPopup div
      const placeholder = shadowRoot.getElementById('placeholderForLocationPopup');
      if (placeholder) {
        placeholder.appendChild(containerDiv); // insert popup into the placeholder element
      }

      // Add event listener for close button
      shadowRoot.getElementById('ingrExpCloseInPopup').addEventListener('click', closePopup);
      console.log('display style ', pickupAt.style.display);
      if (pickupAt.style.display == '-webkit-box') { // Show the zip code if location is displayed
        console.log('show zip code');

        const zipCodeInput = shadowRoot.getElementById('ingrExpZipCodeInPopup');
        zipCodeInput.style.display = '-webkit-box';

        chrome.storage.sync.get('zipCode', (result) => {
          if (result['zipCode'] !== undefined) {
            console.log('zip code being used in location popup ', result['zipCode']);
            zipCodeInput.value = result['zipCode'];
            zipCodeInput.addEventListener('keyup', zipCodeInPopupEdited);
          }
        });
      } else {
        console.log('dont display zipcode');
        shadowRoot.getElementById('ingrExpZipCodeInPopup').style.display = 'none';
      }

      // Insert location-specific elements (if necessary)
      insertLocations();
      
    } catch (error) {
      console.error('ERROR in launch location popup: ', error);
    }
  } else {
    console.log('Popup is already open. Do not launch.');
  }
}


async function shopStore(event){ //a location has been selected from the location popup.
  shadowRoot.getElementById('ingrExpLocationPopup').remove(); 
  if (event.target.innerText !== 'Currently Shopping') {
    let existingNoLocationDiv = shadowRoot.getElementById('noLocationDiv');
    if (existingNoLocationDiv) {
      existingNoLocationDiv.remove();
    }
    shadowRoot.getElementById('loadingContainer').style.display = 'block'; //hide loading wheel 

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
    console.log('ingreditents ', ingredients);
    let backgroundResponse = await chrome.runtime.sendMessage({ to: 'ingredients', data: ingredients, locationExists: true});
    if(backgroundResponse.launch){
      insertEachIngredient(backgroundResponse.ingredientData);  
    }else{
      //TODO: throw error why it couldn't launch 
    }

    shadowRoot.getElementById('loadingContainer').style.display = 'none'; //hide loading wheel 
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
  shadowRoot.getElementById(id).querySelector('.ingrExpIngredientImage').src = ingredientClickedData['products'][newIngredientIndex]['image'];

  if(ingredientClickedData['products'][newIngredientIndex]['brand'] != undefined){
    shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').textContent = ingredientClickedData['products'][newIngredientIndex]['brand'];
    shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').style.display = '-webkit-box';
  }else{
    shadowRoot.getElementById(id).querySelector('.ingrExpIngredientBrand').style.display = 'none';
  }
  if(ingredientClickedData['products'][newIngredientIndex]['description'] != undefined){
    shadowRoot.getElementById(id).querySelector('.ingredientDescription').textContent = ingredientClickedData['products'][newIngredientIndex]['description'];
    shadowRoot.getElementById(id).querySelector('.ingredientDescription').style.display = '-webkit-box';
  }else{
    shadowRoot.getElementById(id).querySelector('.ingredientDescription').style.display = 'none';
  }

  shadowRoot.getElementById(id).querySelector('.ingrExpSize').textContent = ingredientClickedData['products'][newIngredientIndex]['size'];
  updateStartingPlusButton(event); 
  //remove timer from quantity button 
  var quantityButtons = event.target.closest('.ingrExpOuterContainer').querySelector('.quantityButtons');
  clearTimeout(quantityButtons.timeout);
  quantityButtons.style.display = 'none';

  if(ingredientClickedData['products'][newIngredientIndex]['price'] != null){
    shadowRoot.getElementById(id).querySelector('.ingrExpPriceContainer').style.display = '-webkit-box';
    const dollars = Math.floor(ingredientClickedData['products'][newIngredientIndex]['price']);
    const cents = Math.round((ingredientClickedData['products'][newIngredientIndex]['price'] - dollars) * 100);
    shadowRoot.getElementById(id).querySelector('.ingrExpIngrExpPrice').innerHTML = "$" + dollars + ".";
    shadowRoot.getElementById(id).querySelector('.ingrExpCents').innerHTML = String(cents).padStart(2, '0'); 
  }else{
    shadowRoot.getElementById(id).querySelector('.ingrExpPriceContainer').style.display = 'none';
    shadowRoot.getElementById(id).querySelector('.ingrExpIngrExpPrice').innerHTML = "";
    shadowRoot.getElementById(id).querySelector('.ingrExpCents').innerHTML = "";
  }

  //check if arrow should be removed or shown 
  var totalIndexes = allProductData[productIndex]['products'].length 
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
  var totalQuantity = 0;
  var totalPrice = 0.0;
  console.log('allProductData ', allProductData);

  // Iterate through allProductData and get the total quantity and price 
  allProductData.forEach(function (element) {
    element.products.forEach(function (product) {
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
    
    // Remove tooltip if it exists
    var tooltipSpan = checkoutButton.querySelector(".tooltip");
    if (tooltipSpan) {
        checkoutButton.removeChild(tooltipSpan);
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
          element.products.forEach(function (product) {
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
  console.log('all prod ', allProductData);
  var currentQuantity = allProductData[productIndex]['products'][indexOfProductDisplayed]['quantity'];
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
    var quantity = allProductData[productIndex]['products'][indexOfProductDisplayed]['quantity'];
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
    var currentQuantity = allProductData[productIndex]['products'][indexOfProductDisplayed]['quantity'] 
    console.log('current quantity ', currentQuantity);
    if (currentQuantity > 0) {
      // Update the content of the quantity element 
      quantityElement.innerText = String(currentQuantity - 1);
      // Update the corresponding data in allProductData
      var id = event.target.closest('[id]').id;
      var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
      var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
      allProductData[productIndex]['products'][indexOfProductDisplayed]['quantity'] = currentQuantity - 1;
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
    var currentQuantity = allProductData[productIndex]['products'][indexOfProductDisplayed]['quantity'] //Number(quantityElement.innerText);
    quantityElement.innerText = String(currentQuantity + 1);

    // Update the corresponding data in allProductData
    var id = event.target.closest('[id]').id; 
    var productIndex = Number(id.replace(/ingrExpIngredient/g, ''));
    console.log('all prod data ', productIndex); 
    var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
    allProductData[productIndex]['products'][indexOfProductDisplayed]['quantity'] = currentQuantity + 1;
    
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
    // Make all quantities 0 in `allProductData`
    allProductData.forEach(outerArray => {
      outerArray.products.forEach(product => { // Updated `outerArray.productData` to `outerArray.products`
          product.quantity = 0;
      });
    });

    // Make all quantities 0 in UI
    const elements = shadowRoot.querySelectorAll('.startingPlusButton');
    elements.forEach(element => {
      element.classList.remove('startingPlusButtonNoImage');
      element.innerText = '';
    });

    // Update checkout button and show cart button
    const checkoutButton = shadowRoot.getElementById('ingrExpCheckoutButton');
    checkoutButton.innerHTML = 'Items Successfully Added';
    checkoutButton.classList.remove('ingrExpCheckoutButton-hover');
    checkoutButton.style.cursor = 'default';

    const goToCartButton = shadowRoot.getElementById('goToCart');
    goToCartButton.style.display = 'block';

  } else {
    warningPopup(response.errorMessage, 'rgb(210, 40, 65)');
    console.log('Error when trying to add to cart');
  }  
  return response; 
}

async function checkoutButtonClicked() {
  console.log('checkout button clicked');
  
  // Get reference to the checkout button and disable it until products are added
  const checkoutButton = shadowRoot.getElementById("ingrExpCheckoutButton");
  checkoutButton.disabled = true; 

  // Get the quantity of items to add to cart
  const productAndQuantityArray = []; 
  for (const productData of allProductData) {
    for (const product of productData.products) { // Updated `productData.productData` to `productData.products`
      const quantity = product.quantity;
      if (quantity > 0) {
        productAndQuantityArray.push(product);
      }
    }
  }
  
  if (productAndQuantityArray.length !== 0) {
    console.log('quantity and product ', productAndQuantityArray); 
    checkoutButton.innerText = 'Adding Items to Cart...'; 

    await checkoutUser(productAndQuantityArray); 
  } else {
    console.log('No items selected. Do nothing.');
  }

  // Re-enable button and reset cursor after everything is done
  checkoutButton.disabled = false;
}

function parseRecipeData(i) {
  if (i == null) {
    return {
      name: null,
      ingredients: null,
      instructions: null,
      totalTime: null,
      performTime: null,
      prepTime: null,
      cookTime: null,
      yield: null,
      image: null,
      description: null,
      author: null,
      calories: null
    };
  }

  const scriptType = i['@type'] ?? false;
  let result = {
    name: null,
    ingredients: null,
    instructions: null,
    totalTime: null,
    performTime: null,
    prepTime: null,
    cookTime: null,
    yield: null,
    image: null,
    description: null,
    author: null,
    calories: null
  };
  

  // Helper function to decode HTML entities
  function decodeHTML(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  // Function to sanitize characters in strings
  function sanitizeString(str) {
    return str
      .replace(/&#8211;/g, '-')  // En dash
      .replace(/&#8212;/g, '-')  // Em dash
      .replace(/&#8220;/g, '"')  // Left double quotation mark
      .replace(/&#8221;/g, '"')  // Right double quotation mark
      .replace(/&#8216;/g, "'")   // Left single quotation mark
      .replace(/&#8217;/g, "'")   // Right single quotation mark
      .replace(/&nbsp;/g, ' ')     // Non-breaking space
      .replace(/&#x27;/g, "'")    // Apostrophe
      .replace(/&lt;/g, '<')       // Less than
      .replace(/&gt;/g, '>')       // Greater than
      .replace(/&amp;/g, '&');     // Ampersand
      // Add more replacements as needed for other characters
  }

  // Function to convert decimal numbers to fractions
  // Function to convert decimal numbers to fractions
  function decimalToFraction(num) {
    if (isNaN(num)) return num; // Return if not a number

    // Define a maximum denominator
    const maxDenominator = 100; // You can adjust this value to limit the complexity of fractions

    // Function to find the closest fraction
    function findClosestFraction(value, maxDenominator) {
      let closestNumerator = 0;
      let closestDenominator = 1;
      let closestDifference = Infinity;

      for (let denominator = 1; denominator <= maxDenominator; denominator++) {
        const numerator = Math.round(value * denominator);
        const fractionValue = numerator / denominator;
        const difference = Math.abs(value - fractionValue);

        if (difference < closestDifference) {
          closestDifference = difference;
          closestNumerator = numerator;
          closestDenominator = denominator;
        }
      }

      return { numerator: closestNumerator, denominator: closestDenominator };
    }

    const tolerance = 1.0E-6; // Small tolerance for comparison
    let wholeNumber = Math.floor(num);
    let fractionalPart = num - wholeNumber;

    if (Math.abs(fractionalPart) < tolerance) {
      return wholeNumber.toString(); // Return whole number if no fraction
    }

    // Find the closest fraction
    const { numerator, denominator } = findClosestFraction(fractionalPart, maxDenominator);

    // Return in "whole numerator/denominator" format
    if (wholeNumber > 0) {
      return `${wholeNumber} ${numerator}/${denominator}`;
    }
    return `${numerator}/${denominator}`;
  }

  // Helper function to handle image extraction
  function extractImage(image) {
    if (typeof image === 'string') {
      return image;
    }
    
    if (Array.isArray(image)) {
      for (const img of image) {
        const extracted = extractImage(img);
        if (extracted) return extracted;
      }
    }
    
    if (typeof image === 'object' && image.url) {
      return image.url;
    }

    return null;
  }

  // Enhanced image extraction function to choose the best image
  function getBestImage(imageData) {
    if (!imageData) return null;

    if (typeof imageData === 'string') {
      return imageData;
    }

    if (Array.isArray(imageData)) {
      let bestImage = null;
      let highestResolution = 0;

      imageData.forEach(imgObj => {
        const img = extractImage(imgObj);

        if (typeof img === 'object' && img.width && img.height) {
          const resolution = parseInt(img.width) * parseInt(img.height);
          if (resolution > highestResolution) {
            highestResolution = resolution;
            bestImage = img.url;
          }
        } else if (typeof img === 'string' && !bestImage) {
          bestImage = img;
        }
      });

      return bestImage;
    }

    if (typeof imageData === 'object' && imageData.url) {
      return imageData.url;
    }

    return null;
  }

  // Function to parse instructions
  function parseInstructions(instructions, schema) {
    if (!instructions) {
      instructions = schema;
    }

    function extractStepsFromSchema(steps) {
      return steps.flatMap(step => {
        if (typeof step === 'string') {
          return decodeHTML(step);
        } else if (step['@type'] === 'HowToStep' && (step.text || step.name)) {
          return decodeHTML(step.text || step.name);
        } else if (step['@type'] === 'HowToSection' && step.itemListElement) {
          return extractStepsFromSchema(step.itemListElement);
        }
        return [];
      });
    }

    if (typeof instructions === 'string') {
      return [decodeHTML(instructions)];
    } else if (Array.isArray(instructions)) {
      return extractStepsFromSchema(instructions).filter(step => step.trim().length > 0);
    } else if (typeof instructions === 'object') {
      if (instructions['@type'] === 'HowToStep' || instructions['@type'] === 'HowToSection') {
        return extractStepsFromSchema([instructions]);
      }
    }

    return null;
  }

  if (scriptType === 'Recipe' || (Array.isArray(scriptType) && scriptType.includes('Recipe'))) {
    // Get the recipe name
    result.name = i['name'] ? decodeHTML(i['name']) : null;

    // Get the ingredients
    if (i['recipeIngredient']) {
      result.ingredients = i['recipeIngredient'].map(ingredient => {
        // Sanitize after decoding
        const sanitizedIngredient = sanitizeString(decodeHTML(ingredient));
        // Convert decimal numbers to fractions
        return sanitizedIngredient.replace(/(\d*\.?\d+)/g, (match) => decimalToFraction(parseFloat(match)));
      });
    } else {
      result.ingredients = null;
    }

    // Handle the image extraction
    result.image = getBestImage(i['image']);

    // Get the recipe description
    result.description = i['description'] ? decodeHTML(i['description']) : null;

    // Get the author
    if (typeof i['author'] === 'string') {
      result.author = decodeHTML(i['author']);
    } else if (Array.isArray(i['author'])) {
      result.author = i['author'].map(author => decodeHTML(author.name || author)).join(', ');
    } else if (i['author'] && i['author'].name) {
      result.author = decodeHTML(i['author'].name);
    }else{
      const authorMeta = document.querySelector('meta[name="author"]');
      result.author = authorMeta ? authorMeta.getAttribute('content') : null;
    }

    // Get the calories
    result.calories = i['nutrition'] && i['nutrition']['calories'] ? decodeHTML(i['nutrition']['calories']) : null;

    // Parse the instructions
    result.instructions = parseInstructions(i['recipeInstructions'], i);

    // Parse the times
    result.totalTime = parseISODuration(i['totalTime']) || null;
    result.performTime = parseISODuration(i['performTime']) || null;
    result.prepTime = parseISODuration(i['prepTime']) || null;
    result.cookTime = parseISODuration(i['cookTime']) || null;

    // Get the recipe yield
    result.yield = i['recipeYield'] || null;
  }

  return result;
}

function parseISODuration(duration) {
  if (!duration) return null;

  // Regex to capture hours, minutes, and seconds from ISO 8601 format
  const matches = duration.match(/P(?:\d+Y)?(?:\d+M)?(?:\d+D)?T(\d+H)?(\d+M)?([\d.]+S)?/);

  if (!matches) return duration;

  const hours = matches[1] ? parseInt(matches[1]) : 0;
  let minutes = matches[2] ? parseInt(matches[2]) : 0;
  const seconds = matches[3] ? parseFloat(matches[3]) : 0;

  // Convert seconds to additional minutes
  minutes += Math.floor(seconds / 60);

  // Convert any minutes over 60 to hours and remaining minutes
  const additionalHours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const totalHours = hours + additionalHours;

  // Format the output based on hours and remaining minutes
  let result = '';
  if (totalHours > 0) {
    result += `${totalHours} hour${totalHours > 1 ? 's' : ''}`;
  }
  if (remainingMinutes > 0) {
    result += `${totalHours > 0 ? ' and ' : ''}${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
  }

  return result || "0 minutes";
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
      prepTime: null,
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
          if (recipeData.ingredients || recipeData.instructions || recipeData.totalTime || recipeData.performTime || recipeData.prepTime || recipeData.cookTime || recipeData.yield || recipeData.image || recipeData.description) {
            return recipeData;
          }
        }
      } else {
        var recipeData = parseRecipeData(schema);
        if (recipeData.ingredients || recipeData.instructions || recipeData.totalTime || recipeData.performTime || recipeData.prepTime || recipeData.cookTime || recipeData.yield || recipeData.image || recipeData.description) {
          return recipeData;
        }

        for (const key in schema) {
          var value = schema[key];
          if (key === 'recipeIngredient' || key === 'recipeInstructions' || key === 'totalTime' || key === 'performTime' || key === 'prepTime' || key === 'cookTime' || key === 'recipeYield') {
            recipeData[key] = schema[key] || null;
          } else {
            var nestedData = parseRecipeData(value);
            if (nestedData.ingredients || nestedData.instructions || nestedData.totalTime || nestedData.performTime || nestedData.prepTime || nestedData.cookTime || nestedData.yield || nestedData.image || nestedData.description) {
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
      prepTime: null,
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

async function zipCodeInPopupEdited(event) {
  console.log('zip code in popup edited ', event.key)
  var zipCode = shadowRoot.getElementById('ingrExpZipCodeInPopup').value;
  if (event.key === 'Enter') {
    shadowRoot.getElementById('ingrExpNoLocationsFound').style.display = 'none'; 
    shadowRoot.getElementById('loadingContainerLocationPopup').style.display = 'block';
    var elementsToRemove = shadowRoot.querySelectorAll('.ingrExpTopLocationDiv');
    elementsToRemove.forEach(element => {
      element.parentNode.removeChild(element);
    });
    chrome.storage.sync.set({['zipCode']: zipCode.trim()}); 
    await insertLocations();
    shadowRoot.getElementById('loadingContainerLocationPopup').style.display = 'none';
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

function collapseLeft(event){ //products only 
  chrome.storage.sync.set({ lastPosition: 'productsOnly' }, function() {
    console.log('Position saved left arrow');
  });
  shadowRoot.getElementById('collapseContainer').style.display = 'none';
  shadowRoot.getElementById('readerView').style.display = 'none';
  shadowRoot.getElementById('expandArrow').style.display = 'block';
  shadowRoot.getElementById("expandArrowImage").src = 'chrome-extension://nckacfgoolkhaedphbknecabckccgffe/images/left arrow.png';
  shadowRoot.getElementById("expandArrowImage").classList.remove('ingrExpRightArrowImage');
  shadowRoot.getElementById("expandArrowImage").classList.add('ingrExpLeftArrowImage');
  shadowRoot.getElementById('overlay').style.display = 'none';
  shadowRoot.getElementById('expandArrow').addEventListener('click', expandArrowClicked); 
  shadowRoot.getElementById("expandArrowTooltipText").innerHTML = 'expand<br>reader view';
  //resize extension
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.remove('fullReaderView');
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.add('productsOnly');
}

function collapseRight(event){ //reader view only 
  chrome.storage.sync.set({ lastPosition: 'readerViewOnly' }, function() {
    console.log('Position saved left arrow');
  });
  shadowRoot.getElementById('collapseContainer').style.display = 'none';
  shadowRoot.getElementById('productSearch').style.display = 'none';
  shadowRoot.getElementById('expandArrow').style.display = 'block';
  shadowRoot.getElementById("expandArrowImage").src = 'chrome-extension://nckacfgoolkhaedphbknecabckccgffe/images/right arrow.png';
  shadowRoot.getElementById("expandArrowImage").classList.remove('ingrExpLeftArrowImage');
  shadowRoot.getElementById("expandArrowImage").classList.add('ingrExpRightArrowImage');
  shadowRoot.getElementById('expandArrow').addEventListener('click', expandArrowClicked); 
  shadowRoot.getElementById("expandArrowTooltipText").innerHTML = 'expand<br>products';
  //resize extension
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.remove('fullReaderView');
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.add('readerViewOnly');

  var locationPopup = shadowRoot.getElementById('ingrExpLocationPopup');
  if (locationPopup){
    locationPopup.remove();
    console.log('remove location popup');
  }
}

function expandArrowClicked(event) {
  chrome.storage.sync.set({ lastPosition: 'full' }, function() {
    console.log('Position saved expand arrow.');
  });
  shadowRoot.getElementById('expandArrow').style.display = 'none';
  shadowRoot.getElementById('collapseContainer').style.display = 'flex';
  const arrowImageSrc = shadowRoot.getElementById("expandArrowImage").src;
  //resize extension
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.add('fullReaderView');
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.remove('productsOnly');
  shadowRoot.getElementById('ingrExpTopLevelDiv').classList.remove('readerViewOnly');


  if (arrowImageSrc.includes('left%20arrow.png')) {
    shadowRoot.getElementById('readerView').style.display = 'block';
    shadowRoot.getElementById('overlay').style.display = 'block';
  } else {
    shadowRoot.getElementById('productSearch').style.display = 'flex';
  }
}

async function cookMode(event) {
  console.log('Cook mode pressed');
  let wakeLock = null;
  const toggleButton = shadowRoot.getElementById('cookModeToggle');

  if (!toggleButton) {
    console.error("Toggle button not found in shadowRoot");
    return;
  }

  // Function to request wake lock
  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
        console.log("Wake lock is active");
        wakeLock.addEventListener('release', () => {
          console.log("Wake lock was released");
        });
      } catch (err) {
        console.error(`Failed to activate wake lock: ${err.message}`);
      }
    } else {
      console.warn("Wake Lock API is not supported in this browser.");
    }
  }

  // Function to release wake lock
  async function releaseWakeLock() {
    if (wakeLock !== null) {
      try {
        await wakeLock.release();
        wakeLock = null;
        console.log("Wake lock is released");
      } catch (err) {
        console.error(`Failed to release wake lock: ${err.message}`);
      }
    }
  }

  // Toggle button logic
  toggleButton.classList.toggle('active');
  if (toggleButton.classList.contains('active')) {
    console.log("Activating cook mode");
    await requestWakeLock(); // Enable wake lock
  } else {
    console.log("Deactivating cook mode");
    await releaseWakeLock(); // Release wake lock
  }
}
