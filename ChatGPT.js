const k = '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';
const endpoint = 'https://api.openai.com/v1/chat/completions';

async function getRefinedIngredientsChatGPT(userInput) {
  console.log('ChatGPT Running')
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${k}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',//'gpt-4', // 'gpt-4o-mini'
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `          
          Take this array of ingredients and produce a concise list where each item contains an object of product name. 

          Product name is the essential name of the product as you would search for it on an American grocery store website. 
          Remove non-essential words, adjectives, descriptors, and unnecessary symbols (e.g., parentheses).

          Special rules:
          
          If ingredients are connected by "or" or "and," split them into separate items in the new list.
          Remove items that consist solely of water.
          Consolidate duplicate products into a single entry, combining their indexes.
          The final output should be a valid JSON array in this format:

          [
            {
              "productName": "sweet potatoes",
            },
            {
              "productName": "almond flour",
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

        // Check for token usage in the response
        /*
        if (result.usage) {
          console.log('Token Usage:', result.usage);
          console.log(`Prompt Tokens: ${result.usage.prompt_tokens}`);
          console.log(`Completion Tokens: ${result.usage.completion_tokens}`);
          console.log(`Total Tokens: ${result.usage.total_tokens}`);
        } else {
          console.warn('Token usage data not available in the response.');
        }*/ 

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

/*
          Take this array of ingredients and produce a concise list where each item contains:

          Product Name: The essential name of the product as you would search for it on an American grocery store website. 
          Remove non-essential words, adjectives, descriptors, and unnecessary symbols (e.g., parentheses).
          
          Indexes: The original zero-based index (or indices) in the input array where the item appeared. 
          If one product corresponds to multiple input items (e.g., duplicates or consolidated items), 
          list all relevant indexes for that product.

          Quantities and Units: Parse the quantities and units in both customary and metric systems.
          If no unit is provided, use null.

          Special rules:
          
          If ingredients are connected by "or" or "and," split them into separate items in the new list.
          Remove items that consist solely of water.
          Consolidate duplicate products into a single entry, combining their indexes.
          The final output should be a valid JSON array in this format:

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
*/