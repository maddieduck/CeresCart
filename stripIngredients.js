function stripIngredients(products) {
  products = replaceWords(products);
  products = removeWords(products);
  
  // Remove null, undefined, blank strings, and duplicates
  const uniqueProducts = [...new Set(products.filter(item => item !== null && item !== undefined && item.trim() !== ''))];

  // Remove special characters from each product in case they slip through ChatGPT
  const cleanProducts = uniqueProducts.map(product => product.replace(/[^a-zA-Z0-9 ]/g, ''));

  return cleanProducts;
}

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

function removeWords(products) {
  const wordsToRemove = [ //if one word is in a group of another words, put it last (ice cubes & ice)
    "iced cubes", 'ice cubes', 'cubed', 'ice cube', "ice", 'diced', 'sliced', 'slice of',
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

export{stripIngredients}


