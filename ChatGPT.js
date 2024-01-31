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
          Only return the main ingredients that you would use to search in an American 
          grocery store API. Only return a comma separated string of ingredients. 
          Remove any unneccessary adjectives and words. If ingredients are separated 
          with an 'or' make it two ingredients in the new list. ${userInput}` }]
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

async function prioritizeProducts(products) {
  const productsString = JSON.stringify(Array.from(products.entries()));
  //console.log('prioritze prods ', productsString);
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
          { role: 'user', content: `Take this javascript map of key values, 
          where the keys are every ingredient in a recipe and the value is an array of product data from a grocery store API. 
          Organize each array in order of what you think a user would purchase when making the recipe. Return only a map of the 
          prioritized ingredients.` + productsString}]
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
    console.log('CHAT result ', result)
    if (!result.choices || result.choices.length === 0 || !result.choices[0].message || !result.choices[0].message.content) {
      throw new Error('Unexpected response format from OpenAI API');
    }

    // Return the result as a map
    const objectData = JSON.parse(result);
    const mapOfIngredients = new Map(Object.entries(objectData));

    return mapOfIngredients;
  } catch (error) {
    console.error('Error in Prioritize products from Chat GPT:', error.message);
    throw error; // Re-throw the error for further handling or logging
  }
}

export {getRefinedIngredients,prioritizeProducts};
