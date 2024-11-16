function stripIngredients(ingredientsArray) {
  if (!Array.isArray(ingredientsArray)) {
    console.error("Expected an array of ingredients, but received:", ingredientsArray);
    return [];
  }

  // Modify each product name within the original ingredient objects
  const strippedIngredients = ingredientsArray.map(ingredient => {
    if (!ingredient || typeof ingredient !== 'object') {
      console.error("Invalid ingredient object:", ingredient);
      return null; // Skip invalid entries
    }

    // Extract and transform product name
    let productName = ingredient.productName || '';
    productName = replaceWords([productName])[0] || ''; // Modify and get single result or empty string
    productName = removeWords([productName])[0] || '';  // Modify and get single result or empty string
    
    // Clean special characters and trim whitespace
    productName = productName.replace(/[^a-zA-Z0-9 ]/g, '').trim();

    // Return a new object with the cleaned product name, keeping other properties the same
    return { ...ingredient, productName: productName };
  });

  // Filter out any objects where productName is blank
  const filteredIngredients = strippedIngredients.filter(ingredient => ingredient && ingredient.productName);

  console.log("Post Stripped Ingredients Function ", filteredIngredients);
  return filteredIngredients;
}

// Replace words in product names
function replaceWords(products) {
  if (!Array.isArray(products)) {
    console.error("Expected an array in replaceWords but received:", products);
    return [];
  }

  const newWordPairs = [
    ["spring onion", "green onion"],
    ["great northern bean", "cannellini bean"],
    ["bramley", "granny smith"],
    ["swede", "rutabaga"],
    ["heavy cream", "heavy whipping cream"],
    ["fennel bulb", "fennel"],
    ["suet", "beef"],
    ["white sugar", "sugar"],
    ["pepper", "black pepper"],
    ["chive", "green onion"]
  ];

  return products.map(product => {
    if (typeof product !== 'string') {
      console.error("Expected a string in replaceWords but received:", product);
      return ''; // Skip invalid entries
    }

    let modifiedProduct = product;
    newWordPairs.forEach(([oldWord, newWord]) => {
      const regex = new RegExp(`\\b${oldWord}(?:s)?\\b`, "gi");
      modifiedProduct = modifiedProduct.replace(regex, match => {
        const isPlural = match.toLowerCase().endsWith('s');
        return isPlural ? newWord + 's' : newWord;
      });
    });

    return modifiedProduct;
  });
}

// Remove specified words in product names
function removeWords(products) {
  if (!Array.isArray(products)) {
    console.error("Expected an array in removeWords but received:", products);
    return [];
  }

  const wordsToRemove = [
    "iced cubes", "ice cubes", "cubed", "ice cube", "ice", "diced", "sliced", "slice of", "filtered water", "warm water",
    "fresh", "slices", "juiced", "juice", "chopped", "softened", "zest", "water", "finely", "cooked",
    "extra virgin", "extra-virgin", "heaped", "chunks", "hot water", "boiling", "melted", "rolled",
    "peeled", "wedges", "thinly", "flaked", "for serving", "ripe", "crisp", "healthy", "whopping",
    "matchstick", "kosher", "roughly", "freshly", "fat", "dried", "loosely packed",
    "mashed", "very", "of", "for", "optional", "garnish", "toasted", "rounded", "in water", "extravirgin",
    "freerange", "piece", "unbaked", "each", "to taste", "cooked", "bag", "large", "medium", "small"
  ];

  return products.map(product => {
    if (typeof product !== 'string') {
      console.error("Expected a string in removeWords but received:", product);
      return ''; // Skip invalid entries
    }

    let modifiedProduct = product;
    wordsToRemove.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      modifiedProduct = modifiedProduct.replace(regex, '');
    });

    return modifiedProduct.trim(); // Trim any leading or trailing spaces
  });
}

export { stripIngredients };
