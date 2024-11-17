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
      product names that you would search for in an American grocery store API. Return 
      ONLY an array of comma-separated objects like the JSON below. 

      The final JSON structure should look like this:
      [
        {
          "productName": "sweet potatoes"
        },
        {
          "productName": "almond flour"
        }
        // Continue with other products 
      ]

      ${userInput}`); 
      console.log('gemini result ', result);
      return JSON.parse(result);
    }
}

export {getRefinedIngredientsGemini};
