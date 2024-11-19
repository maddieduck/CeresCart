const apiKey = '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';
const endpoint = 'https://api.openai.com/v1/chat/completions';

async function getRefinedIngredientsChatGPT(userInput) {
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
          { role: 'user', content: `          
          Take this array of ingredients and create a concise list by extracting the product name, quantity, 
          and units in both metric and customary formats.
          Product Name: Use the core name as you would search for it on an American grocery store website. 
          Exclude non-essential words, adjectives, or descriptors.
          Formatting: If ingredients are separated by 'or' or 'and,' treat them as distinct items. 
          Remove unnecessary symbols, characters (e.g., parentheses), and items made solely of water.
          Indexes: Maintain the original indexes (0-based) in the output. Consolidate duplicates by combining their indexes.
          The final JSON should follow this structure:

          [
            {
              "productName": "sweet potatoes",
              "indexes": [0],
              "customary": {
                "quantity": "1",
                "unit": "cup"
              },
              "metric": {
                "quantity": "240",
                "unit": "milliliters"
              }
            },
            {
              "productName": "almond flour",
              "indexes": [1],
              "customary": {
                "quantity": "1/4",
                "unit": "cup"
              },
              "metric": {
                "quantity": "60",
                "unit": "milliliters"
              }
            }
            // Continue with other products 
          ]

          Return only a valid JSON array with no code block markers, explanations, or extra text. 
          If parsing fails, return an empty array.

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

export {getRefinedIngredientsChatGPT};
