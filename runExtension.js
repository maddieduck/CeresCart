let allProductData = []; 
let ingredients = findIngredientsOnPage();
console.log('ingredients ', ingredients);
if (ingredients != null) {
  (async () => { // Wrap the block in an async function 
    let response = await chrome.runtime.sendMessage({ to: 'ingredients', data: ingredients});
    if (response.launch) {
      try {
        const htmlContents = await Promise.all([
          fetch(chrome.runtime.getURL('index.html')).then(response => response.text()),
          fetch(chrome.runtime.getURL('ingredientContainer.html')).then(response => response.text())
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

        var elem = document.getElementById('closeImage'); 
        elem.addEventListener('click', closePopup); 

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

        var elem = document.getElementById('checkoutButton'); 
        elem.addEventListener('click', checkoutButtonClicked); 
        /*
        var elem = document.getElementById('minimize'); 
        elem.addEventListener('click', minimizePopup); 
        */

        var elem = document.getElementById('downArrow'); 
        elem.addEventListener('click', downArrowPressed); 
        
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
    var mainPopup = document.getElementById('ingredientExporterPopup');
    mainPopup.remove();
    var locationPopup = document.getElementById('locationPopup');
    if (locationPopup){
      locationPopup.remove();
    }
  }else if (id === "closeImageLocationPopup"){
    var locationPopup = document.getElementById('locationPopup');
    locationPopup.remove();
  }
}

function downArrowPressed() {
  // Use chrome.runtime.getURL to get the URL of the extension resource
  var url = chrome.runtime.getURL('locationPopup.html');

  // Fetch the content of the URL
  fetch(url)
    .then(response => response.text())
    .then(html => {
      // Insert the HTML into the top-level div
      document.body.insertAdjacentHTML('afterbegin', `<div id="locationPopup">${html}</div>`);
      var elem = document.getElementById('closeImageLocationPopup'); 
      elem.addEventListener('click', closePopup); 
    })
    .catch(error => console.error('Error fetching locationPopup.html:', error));
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