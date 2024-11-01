function stripIngredients(ingredientsArray) {
  // Modify each name within the original ingredient objects
  const strippedIngredients = ingredientsArray.map(ingredient => {
    // Apply replacements and removals to the name
    let productName = ingredient.name;
    productName = replaceWords([productName])[0]; // Modify and get single result
    productName = removeWords([productName])[0];   // Modify and get single result
    
    // Remove special characters and trim whitespace
    productName = productName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
    
    // Return a new object with the cleaned name, keeping other properties the same
    return { ...ingredient, name: productName };
  });

  return strippedIngredients;
}

// Replace words in product names
function replaceWords(products) {
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
    const productWords = product.split(' ');
    
    newWordPairs.forEach(pair => {
      const [oldWord, newWord] = pair;
      
      if (productWords.length > 0 && productWords[0].toLowerCase() === oldWord.toLowerCase()) {
        const regex = new RegExp("\\b" + oldWord + "(?:s)?\\b", "gi");
        product = product.replace(regex, match => {
          const isPlural = match.toLowerCase().endsWith('s');
          return isPlural ? newWord + 's' : newWord;
        });
      }
    });

    return product;
  });
}

// Remove specified words in product names
function removeWords(products) {
  const wordsToRemove = [
    "iced cubes", 'ice cubes', 'cubed', 'ice cube', "ice", 'diced', 'sliced', 'slice of', "filtered water", "warm water",
    'fresh', 'slices', "juiced", "juice", "chopped", "softened", "zest", "water", "finely", "cooked",
    "extra virgin", "extra-virgin", "heaped", "chunks", "hot water", "boiling", "melted", "rolled",
    "peeled", "wedges", "thinly", "flaked", "for serving", "ripe", "crisp", "healthy", "whopping",
    "matchstick", "kosher", "roughly", "freshly", "fat", "dried", "loosely packed",
    "mashed", "very", "of", "for", "optional", "garnish", "toasted", "rounded", "in water", "extravirgin",
    "freerange", "piece", "unbaked", "each", "to taste", "cooked", "bag", "large", "medium", "small"
  ];

  return products.map(product => {
    wordsToRemove.forEach(word => {
      const regex = new RegExp("\\b" + word + "\\b", "gi");
      product = product.replace(regex, '');
    });

    return product.trim(); // Trim any leading or trailing spaces
  });
}

export { stripIngredients };
