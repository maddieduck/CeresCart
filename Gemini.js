async function getRefinedIngredientsGemini(userInput){
    // Start by checking if it's possible to create a session based on the availability of the model, and the characteristics of the device.
    const {available, defaultTemperature, defaultTopK, maxTopK } = await ai.languageModel.capabilities();
    console.log('Gemini Available ', available);
    if (available == "readily") {
      console.log('not no');
      const session = await ai.languageModel.create();
      console.log('created language model');
      // Prompt the model and wait for the whole result to come back.  
      const result = await session.prompt(`Take this array of ingredients and produce a 
      concise list where each item contains an object of product name. 

      Product name is the essential name of the product as you would search for it on an 
      American grocery store website. Remove non-essential words, adjectives, descriptors, 
      and unnecessary symbols (e.g., parentheses). 

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

      ${userInput}`); 
      console.log('gemini result ', result);
      return JSON.parse(result);
    }
}

async function testRewriter(userInput){ 
  // Non-streaming
  console.log('test rewriter running');
  const rewriter = await ai.rewriter.create(); 
  const result = await rewriter.rewrite(reviewEl.textContent, {
    context: `Take this array of ingredients and produce a 
    concise list where each item contains an object of product name. 

    Product name is the essential name of the product as you would search for it on an 
    American grocery store website. Remove non-essential words, adjectives, descriptors, 
    and unnecessary symbols (e.g., parentheses). 

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
    If parsing fails, return an empty array. ${userInput}`

  });
  console.log('result ', result);  
}


export {getRefinedIngredientsGemini, testRewriter};
