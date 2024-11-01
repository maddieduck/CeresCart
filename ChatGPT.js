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
        model: 'gpt-3.5-turbo',//'gpt-4', // 'gpt-4o-mini'
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Take this array of ingredients and provide a more 
          concise list by stripping out the quantity and unit. Only include essential 
          product names that you would search for in an American grocery store API. Return ONLY a 
          comma-separated string of ingredients. Exclude any non-essential words, adjectives or descriptors 
          that don't represent the core product you want to buy. If ingredients are separated with 'or' or 
          'and,' make them two distinct items in the new list. Consolidate duplicates. Remove
          any unnecessary symbols or characters like parentheses. Remove anything that is made of just water. 
          I want the end result to be json data and the json data includes quantity, unit, stripped  
          product name as well as an array of indexes of where that product was in the original list.

          The final JSON structure should look like this:
          [
            {
              "quantity": "2/3",
              "unit": "cup",
              "productName": "Japanese sweet potatoes",
              "indexes": [1]
            },
            {
              "quantity": "1/4",
              "unit": "cup",
              "productName": "almond flour",
              "indexes": [2]
            }
            // Continue with similar objects
          ]

          Respond ONLY with JSON in this structure. Do not include explanations or extra text.

          ${userInput}` }]
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(`HTTP error! Status: ${response.status}. ChatGPT rate limit exceeded.`);
      } else {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
    }
    //console.log('Chat GPT Ingredient response ', response);

    const result = await response.json();

    if (!result.choices || result.choices.length === 0 || !result.choices[0].message || !result.choices[0].message.content) {
      throw new Error('Unexpected response format from OpenAI API');
    }

    // Split the comma-separated string into an array of ingredients
    const content = result.choices[0].message.content;
    //console.log('ChatGPT response ', content);
    const jsonData = JSON.parse(content);

    return jsonData;
  } catch (error) {
    console.error('Error in getRefinedIngredients:', error.message);
    throw error; // Re-throw the error for further handling or logging
  }
}

export {getRefinedIngredients};
