async function getRefinedIngredientsGemini(userInput){
    // Start by checking if it's possible to create a session based on the availability of the model, and the characteristics of the device.
    const {available, defaultTemperature, defaultTopK, maxTopK } = await ai.languageModel.capabilities();
    console.log('awaited ai ');
    if (available !== "no") {
      console.log('not no');
      const session = await ai.languageModel.create();
      console.log('created language model');
      // Prompt the model and wait for the whole result to come back.  
      const result = await session.prompt(`Take this array of ingredients and provide a more 
      concise list by stripping out the quantity and unit. Only include essential 
      product names that you would search for in an American grocery store API. Return ONLY a 
      comma-separated object of string of ingredients like the JSON below. 

      The final JSON structure should look like this:
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

      ${userInput}`); 
      console.log('gemini result ', result);
    }
}

export {getRefinedIngredientsGemini};
