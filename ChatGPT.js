async function getRefinedIngredientsChatGPT(userInput) { // userInput is passed as a parameter
  const attemptFetch = async (retryCount) => {
    try {
      // Encode the userInput to safely pass it in the URL
      const encodedUserInput = encodeURIComponent(userInput);
      const url = `https://cerescartapis.onrender.com/ChatGPTCall?userInput=${encodedUserInput}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const data = await response.json(); // Assuming response is JSON
      return data; // Process the JSON response data here
    } catch (error) {
      if (retryCount > 0) {
        console.warn(`Retrying fetch... ${retryCount} attempts left`);
        return attemptFetch(retryCount - 1);
      } else {
        throw new Error(`Fetch error when generating refined ingredients: ${error.message}`);
      }
    }
  };

  return attemptFetch(2); // Attempt up to 3 times (initial call + 2 retries)
}

export {getRefinedIngredientsChatGPT};