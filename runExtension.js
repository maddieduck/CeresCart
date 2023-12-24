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
          fetch(chrome.runtime.getURL('ingredientContainer.html')).then(response => response.text()),
        ]);
        const [indexHtml, ingredientHtml] = htmlContents;
        
        // insert popup into html
        document.body.insertAdjacentHTML('afterbegin', `<div id="ingredientExporterPopup">${indexHtml}</div>`);

        // insert each ingredient into html 
        let ingredDiv = document.getElementById('placeholderForIngredients');
        for (const index in response.ingredientData){ 
          singularIngredientData = response.ingredientData[index];
          allProductData[index] = {indexOfProductDisplayed: 0, productData: singularIngredientData}; 
          
          let nodeClone = document.createElement('div');  // Create a new div 
          nodeClone.innerHTML = ingredientHtml;  // Set the inner HTML of the div 
          nodeClone.querySelector('.ingredientImage').src = singularIngredientData[0].image; 
          nodeClone.querySelector('.ingredientBrand').textContent = singularIngredientData[0].brand; 
          nodeClone.querySelector('.ingredientDescription').textContent = singularIngredientData[0].description;
          nodeClone.querySelector('.size').textContent = singularIngredientData[0].size;
          nodeClone.querySelector('.paragraphOutline').id = 'Ingredient ' + index;
          nodeClone.querySelector('.leftArrowImage').style.opacity = 0;
          nodeClone.querySelector('.leftArrowImage').style.visibility = 'hidden';
          nodeClone.querySelector('.leftArrowImage').style.pointerEvents = 'none';

          var price = singularIngredientData[0].price;
          if (price !== null){
            const dollars = Math.floor(price);
            const cents = Math.round((price - dollars) * 100);
            const formattedPrice = cents < 10 ? `$${dollars}.<sup>0${cents}</sup>` : `$${dollars}.<sup>${cents}</sup>`;
            nodeClone.querySelector('.price').innerHTML = formattedPrice;
          }else{
            nodeClone.querySelector('.price').innerHTML = '';
          }

          if (singularIngredientData.length == 1){
            nodeClone.querySelector('.rightArrowImage').style.opacity = 0;
            nodeClone.querySelector('.rightArrowImage').style.visibility = 'hidden';
            nodeClone.querySelector('.rightArrowImage').style.pointerEvents = 'none';
          }
          ingredDiv.appendChild(nodeClone);
        }
        //set the location name if it exists in memory 
        chrome.storage.local.get('locationName', (result) => {
          console.log('location Name ', result['locationName']);
          if (result['locationName'] != undefined){
            document.getElementById('zipCode').style.display = 'none';
            document.getElementById('pickupAt').style.display = '-webkit-box';
            document.getElementById('pickupAt').textContent = result['locationName']
          }
        });

        var elem = document.getElementsByClassName('leftArrowImage'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', leftArrowClicked);
        }

        var elem = document.getElementsByClassName('rightArrowImage'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', rightArrowClicked);
        }

        var elem = document.getElementsByClassName('plusButton'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', plusButtonClicked);
        }
        
        var elem = document.getElementsByClassName('minusButton'); 
        for(var i=0; i<elem.length; i++){
          elem[i].addEventListener('click', minusButtonClicked);
        }
        /*
        document.getElementById('minimize').addEventListener('click', minimizePopup); 
        */
        document.getElementById('closeImage').addEventListener('click', closePopup); 
        document.getElementById('checkoutButton').addEventListener('click', checkoutButtonClicked); 
        document.getElementById('downArrow').addEventListener('click', launchLocationPopup); 
        document.getElementById('zipCode').addEventListener('keyup', zipCodeEdited); 

        chrome.runtime.sendMessage({to: 'backgroundWorker', data: ingredients});

      } catch (error) {
        console.error('ERROR in runExtension.js: ', error);
      }
    }
  })();
}

function closePopup(event) {//closes the main popup or the location popup 
  var id = event.target.closest('[id]').id; 
  if (id === 'closeImage'){
    document.getElementById('ingredientExporterPopup').remove();
    var locationPopup = document.getElementById('locationPopup');
    if (locationPopup){
      locationPopup.remove();
    }
  }else if (id === "closeImageLocationPopup"){
    document.getElementById('locationPopup').remove();
  }
}

async function loadLocationsInPopup(allLocationData){
  let locationPlaceholder = document.getElementById('placeholderForLocations');
  const locationResponse = await fetch(chrome.runtime.getURL('location.html'));
  const locationHtml = await locationResponse.text();

  for (const index in allLocationData){
    var locationData = allLocationData[index];
    let nodeClone = document.createElement('div');  // Create a new div 
    nodeClone.innerHTML = locationHtml;  // Set the inner HTML of the div 
    nodeClone.querySelector('.topLocationDiv').id = 'topLocationDiv' + index;
    nodeClone.querySelector('.locationName').textContent = locationData["name"]
    var addressObject = locationData["address"];
    var formattedAddress = `${addressObject.addressLine1}\n${addressObject.city}, ${addressObject.state} ${addressObject.zipCode}`;
    nodeClone.querySelector('.locationAddress').textContent = formattedAddress
    if (locationData["phone"] != undefined){
      const formattedNumber = `${locationData["phone"].substring(0, 3)}-${locationData["phone"].substring(3, 6)}-${locationData["phone"].substring(6)}`;  
      nodeClone.querySelector('.phoneNumber').textContent = formattedNumber 
    }
    nodeClone.querySelector('.shopStore').addEventListener('click', shopStore); 
    locationPlaceholder.appendChild(nodeClone); 
  }
}

async function insertLocations(){
  let backgroundResponse = await chrome.runtime.sendMessage({to: 'locations'}); 
  console.log('background response ', backgroundResponse)
  allLocationData = backgroundResponse.locationData; 
  if(backgroundResponse.locationsFound){
    loadLocationsInPopup(backgroundResponse.locationData); 
  }else{
    console.log('locations not found')
    //TODO: Launch a popup that the location is not found 
  }
}

async function launchLocationPopup() {
  var locationPopup = document.getElementById('locationPopup'); 
  console.log('down arrow '); 
  //display or hide the zip code in the lcoations popup 
  var pickupAt = document.getElementById('pickupAt'); //check if the location is being displayed in main popup
  console.log('pickup at ', pickupAt.style.display)
  if (locationPopup == null){//check if popup is already open 
    try{ //insert the popup
      const locationPopupResponse = await fetch(chrome.runtime.getURL('locationPopup.html'));
      const locationPopupHtml = await locationPopupResponse.text();
      document.body.insertAdjacentHTML('afterbegin', `<div id="locationPopup">${locationPopupHtml}</div>`); 
      document.getElementById('closeImageLocationPopup').addEventListener('click', closePopup); 
      if (pickupAt.style.display == '-webkit-box'){ //The store location is showing, show the zip code 
        document.getElementById('zipCodeInPopup').style.display = '-webkit-box';
        chrome.storage.local.get('zipCode', (result) => {
          if (result['zipCode'] != undefined){
            console.log('zip code being used in location popup ', result['zipCode']);
            document.getElementById('zipCodeInPopup').value = result['zipCode']
            document.getElementById('zipCodeInPopup').addEventListener('keyup', zipCodeInPopupEdited);
          } 
        }); 
      }else{ 
        document.getElementById('zipCodeInPopup').style.display = 'none';
      }
      insertLocations()
    }catch (error) {
      console.error('ERROR in launch location popup: ', error);
    }
  }else{
    console.log('Popup is already open. Do not launch.')
  }
}

function shopStore(event){ //a location has been selected from the location popup.
  document.getElementById('locationPopup').remove(); 
  var id = event.target.closest('[id]').id; 
  var locationIndex = Number(id.replace(/topLocationDiv/g, '')); 
  console.log('shop store pressed ', locationIndex);
  var locationId = allLocationData[locationIndex]['id'];
  var locationName = allLocationData[locationIndex]['name'];
  document.getElementById('zipCode').style.display = 'none';
  document.getElementById('pickupAt').style.display = '-webkit-box';
  document.getElementById('pickupAt').textContent = locationName; 
  chrome.storage.local.set({['locationId']: locationId});
  chrome.storage.local.set({['locationName']: locationName});
}

function minimizePopup() {//TODO: commented out for now, but need to add 
  var popupContainer = document.getElementById('ingredientExporterPopup');
  if (popupContainer) {
    popupContainer.remove();
  }
  //TODO: make new screen to display
}

function displayNewIngredient(id, rightOrLeft){ //loads the image and product info when an arrow is clicked 
  console.log('all product Data', allProductData);
  var productIndex = Number(id.replace(/Ingredient/g, '')); 
  var ingredientClickedData = allProductData[productIndex]; 
  if (rightOrLeft == 'right'){
    var newIngredientIndex = Number(ingredientClickedData['indexOfProductDisplayed']) + 1;
  }else if (rightOrLeft == 'left'){
    var newIngredientIndex = Number(ingredientClickedData['indexOfProductDisplayed']) - 1;
  }
  allProductData[productIndex]['indexOfProductDisplayed'] = newIngredientIndex 
  //display the new ingredient 
  document.getElementById(id).querySelector('.ingredientImage').src = ingredientClickedData['productData'][newIngredientIndex]['image'];
  document.getElementById(id).querySelector('.ingredientBrand').textContent = ingredientClickedData['productData'][newIngredientIndex]['brand'];
  document.getElementById(id).querySelector('.ingredientDescription').textContent = ingredientClickedData['productData'][newIngredientIndex]['description'];
  document.getElementById(id).querySelector('.size').textContent = ingredientClickedData['productData'][newIngredientIndex]['size'];
  document.getElementById(id).querySelector('.quantity').innerText = String(ingredientClickedData['productData'][newIngredientIndex]['quantity']);
  if(ingredientClickedData['productData'][newIngredientIndex]['price'] != null){
    const dollars = Math.floor(ingredientClickedData['productData'][newIngredientIndex]['price']);
    const cents = Math.round((ingredientClickedData['productData'][newIngredientIndex]['price'] - dollars) * 100);
    const formattedPrice = cents < 10 ? `$${dollars}.<sup>0${cents}</sup>` : `$${dollars}.<sup>${cents}</sup>`;
    document.getElementById(id).querySelector('.price').innerHTML = formattedPrice;
  }

  //check if arrow should be removed or shown 
  var totalIndexes = allProductData[productIndex]['productData'].length 
  if (rightOrLeft == 'right'){
    document.getElementById(id).querySelector('.leftArrowImage').style.visibility = 'visible';
    document.getElementById(id).querySelector('.leftArrowImage').style.pointerEvents = 'auto';
    document.getElementById(id).querySelector('.leftArrowImage').style.opacity = '1';
    if ((newIngredientIndex + 1) >= totalIndexes) {
      document.getElementById(id).querySelector('.rightArrowImage').style.visibility = 'hidden';
      document.getElementById(id).querySelector('.rightArrowImage').style.pointerEvents = 'none';
      document.getElementById(id).querySelector('.rightArrowImage').style.opacity = '0';
    }else{
      document.getElementById(id).querySelector('.rightArrowImage').style.visibility = 'visible';
      document.getElementById(id).querySelector('.rightArrowImage').style.pointerEvents = 'auto';
      document.getElementById(id).querySelector('.rightArrowImage').style.opacity = '1';
    }
  }else if (rightOrLeft == 'left'){ 
    document.getElementById(id).querySelector('.rightArrowImage').style.visibility = 'visible';
    document.getElementById(id).querySelector('.rightArrowImage').style.pointerEvents = 'auto';
    document.getElementById(id).querySelector('.rightArrowImage').style.opacity = '1';
    if (newIngredientIndex == 0) {
      document.getElementById(id).querySelector('.leftArrowImage').style.visibility = 'hidden';
      document.getElementById(id).querySelector('.leftArrowImage').style.pointerEvents = 'none';
      document.getElementById(id).querySelector('.leftArrowImage').style.opacity = '0';
    }else{
      document.getElementById(id).querySelector('.leftArrowImage').style.visibility = 'visible';
      document.getElementById(id).querySelector('.leftArrowImage').style.pointerEvents = 'auto';
      document.getElementById(id).querySelector('.leftArrowImage').style.opacity = '1';
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

function minusButtonClicked(event) {
  // Find the quantity element within the closest ancestor
  var quantityElement = event.target.closest('.mainDiv').querySelector('.quantity');

  // Check if the element is found
  if (quantityElement) {
    // Update the content of the quantity element (decrement, for example)
    var currentQuantity = Number(quantityElement.innerText);
    if (currentQuantity > 0) {
      quantityElement.innerText = String(currentQuantity - 1);

      // Update the corresponding data in allProductData
      var id = event.target.closest('[id]').id;
      var productIndex = Number(id.replace(/Ingredient/g, ''));
      var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
      allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity - 1;
    }
  }
}

function plusButtonClicked(event) {
  // Find the quantity element within the closest ancestor
  var quantityElement = event.target.closest('.mainDiv').querySelector('.quantity');
  // Check if the element is found
  if (quantityElement) {
    // Update the content of the quantity element (increment, for example)
    var currentQuantity = Number(quantityElement.innerText);
    quantityElement.innerText = String(currentQuantity + 1);

    // Update the corresponding data in allProductData
    var id = event.target.closest('[id]').id;
    var productIndex = Number(id.replace(/Ingredient/g, ''));
    var indexOfProductDisplayed = allProductData[productIndex]['indexOfProductDisplayed'];
    allProductData[productIndex]['productData'][indexOfProductDisplayed]['quantity'] = currentQuantity + 1;
  }
}

function checkoutButtonClicked(){
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
  chrome.runtime.sendMessage({ to: 'checkout', data: quantityAndUPCArray}); //get auth url to call 
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
  var zipCode = document.getElementById('zipCode').value;
  // Check if the Enter key is pressed and the zip code is not blank
  if (event.key === 'Enter' && zipCode.trim() !== '') {
    console.log('zip code used ', zipCode)
    chrome.storage.local.set({['zipCode']: zipCode.trim()}); 
    launchLocationPopup();
  }
}

function zipCodeInPopupEdited(event) {
  console.log('zip code in popup edited')
  var zipCode = document.getElementById('zipCodeInPopup').value;
  if (event.key === 'Enter' && zipCode.trim() !== '') {
    //remove all existing locations before running again
    var elementsToRemove = document.getElementsByClassName('topLocationDiv'); //Get elements by class name
    var elementsArray = Array.from(elementsToRemove); // Convert HTMLCollection to an array
    elementsArray.forEach(function(element) { //Remove each element
      element.parentNode.removeChild(element);
    });

    chrome.storage.local.set({['zipCode']: zipCode.trim()}); 
    insertLocations();
    //loadLocationsInPopup();
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