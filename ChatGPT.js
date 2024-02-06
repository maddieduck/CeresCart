const apiKey = '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';
const endpoint = 'https://api.openai.com/v1/chat/completions';

async function getRefinedIngredients(userInput) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Take this array of ingredients and provide a 
          more concise array of ingredients by stripping out the quantity and unit.
          Only return ingredients that you would search for in an American 
          grocery store API. Only return a comma separated string of ingredients. 
          Remove any unneccessary adjectives and words. If ingredients are separated 
          with an 'or' or 'and' make it two ingredients in the new list. Consolidate duplicates. ${userInput}` }]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`HTTP error! Status: ${response.status}. ChatGPT rate limit exceeded.`);
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }

    const result = await response.json();

    if (!result.choices || result.choices.length === 0 || !result.choices[0].message || !result.choices[0].message.content) {
      throw new Error('Unexpected response format from OpenAI API');
    }

    // Split the comma-separated string into an array of ingredients
    const content = result.choices[0].message.content;
    const ingredientsArray = content.split(',').map(ingredient => ingredient.trim());

    return ingredientsArray;
  } catch (error) {
    console.error('Error in getRefinedIngredients:', error.message);
    throw error; // Re-throw the error for further handling or logging
  }
}

async function prioritizeProductsChatGPT(ingredient, arrayOfProducts) {
  //console.log('ingr ', ingredient, 'array of prod ', arrayOfProducts);
  return new Promise((resolve, reject) => {

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Take this array of data that was returned from 
          a grocery store API for the ingredient` +  ingredient + `. Prioritize these items 
          based on what a user should buy if they are using ` + ingredient + ` in a recipe. 
          Prioritize fresh, high quality ingredients, but prioritize non organic 
          over organic ingredients if they are similar items. It is ok to keep it 
          in the same order. Only return the array of objects and no other text, that way 
          I can parse it easily. Keep all items in the array. ` + JSON.stringify(arrayOfProducts)}]
      })
    })
    .then(res => {
      if (res.ok) {
        return res.json(); 
      } else {
        if (response.status === 429) {
          console.log(`HTTP error! Status: ${response.status}. ChatGPT rate limit exceeded.`);
        } else {
          console.log(`HTTP error! Status: ${response.status}`);
        }
        console.log('ChatGPT prioritize products encountered an error with terms ', ingredient, arrayOfProducts);
        resolve(null);
      }
    })
    .then(data => {
      // Split the comma-separated string into an array of ingredients
      //console.log('data ', data)
      if(data == null){
        console.log('ChatGPT Error. Data is null for ingredient ', ingredient)
        resolve(null);
      }else{
        const content = data.choices[0].message.content; 
        console.log('prioritize prod executed'); 
        resolve([ingredient, JSON.parse(content)]); 
      }
    })
    .catch(error => {
      console.log('ERROR in Kroger Calls Product Search Function', error);
      resolve(null); 
    });
  }); 
}

export {getRefinedIngredients,prioritizeProductsChatGPT};

