//parses the array of ingredients to only return what you want to search in a Korger search 
function stripIngredients(recipeIngredients){ 
    var strippedIngredients = [] 
    const quantityPattern = /^\s*\d+(?:\.\d+|\s*\d*\/\d+)?(?:\s+(?:to|\-)\s*\d+(?:\s*\d*\/\d+)?)?(?:\s+and\s+\d+(?:\s*\d*\/\d+)?)?(?:\/\d+)?\s*/;
    const unitPattern = /\b(?:cup|cups|c|teaspoon|teaspoons|tbsp|tbsps|tsp|tsps|tablespoon|tablespoons|oz|ozs|ounce|ounces|fluid ounce|fluid ounces|pound|pounds|g|gs|gram|grams|kg|kgs|kilogram|kilogram|pint|pints|quart|quarts|gallon|gallons|liter|liters|litre|litres|scoop|scoops|batch|batches|pinch of|pinch|inch|package|head|heads|bunch|ml|thumb-sized piece|large|medium|small|sticks)\b/i; // Case-insensitive units
    const wordsToRemove = ['ice cubes', 'cubed', 'diced', 'sliced', 'slice of', 'fresh', 'slices', "juiced", "chopped", "softened", "zest", "water", "finely", "cooked", "extra virgin", "extra-virgin", "heaped", "chunks", "hot water", "boiling", "ice", "iced cubes", "melted", "rolled", "peeled", "wedges", "thinly", "flaked", "for serving", "ripe", "crisp", "healthy", "whopping", "matchstick", "kosher", "roughly", "strip", "strips", "freshly", "fat", "dried", "loosely packed", "mashed", "very", "of", "for", "optional", "garnish", "toasted", "rounded", "in water", "extravirgin", "freerange", "piece"]; 
    const regExWordsToRemove = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi');  

    for (const index in recipeIngredients) {
        var ingredient = recipeIngredients[index]; 
        ingredient = ingredient.toLowerCase(); 
        //remove parentheses and everything between them. Do this before removing anything after a comma in case there are commas in ()
        const removeParentheses = ingredient.replace(/\([^)]*\)/g, '');
        //remove any erroneous parentheses and dashes 
        const removeMoreParentheses = removeParentheses.replace(/[()\-\u2013\u2014]/g, '');
        //Remove certain words like "sliced", "diced". Remove this before quantity in case it's something like "1 whopping tablespoon"
        const removedWords = removeMoreParentheses.replace(regExWordsToRemove, '');
        // Remove quantity. Removes anything that is not a character. 
        const withoutQuantity = removedWords.replace(quantityPattern, '');
        //remove any erroneous numbers, like 1/4 1/8 
        const nofract = withoutQuantity.replace(/^\s*[\d\s/¼½⅓⅔¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+\s*/, '').replace(/^\s*/, '');
        // Remove unit
        const withoutUnit = nofract.replace(unitPattern, '');
        //remove leading commas and spaces 
        const leadingChars = withoutUnit.replace(/^\s*,+/g, '');
        //Remove anything after a ',' 
        const removeAfterComma = leadingChars.split(',');
        const commaRemoved = removeAfterComma[0]; 
        //remove any period at the begining of a string 
        const noPeriod = commaRemoved.replace(/^\./, "") 
        //remove anything after an * including * 
        const noAsterisk = noPeriod.split('*')[0]
        //remove anything after an 'or' 
        const noOr = noAsterisk.replace(/\sor\b.*$/, '');
        //remove anythnig after plus
        const noPlus = noOr.replace(/\splus\b.*$/, '');
        //remove special characters like ñ with normal characters like n
        const noSpecial = noPlus.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        //Trim any leading or trailing spaces
        const trimmedWhitespaces = noSpecial.trim();
        const replacedWords = replaceWords(trimmedWhitespaces);
        const replaceWithException = removeFirstWordWithException(replacedWords);

        //splits anything with an 'and' into two so you can search for both
        if (replaceWithException.includes(' and ')) {
            // Split the ingredient by "and"
            const splitIngredients = replacedWords.split(' and ');
            const firstWord = splitIngredients[0].trim();
            const secondWord = splitIngredients[1].trim();
            // Check if words are not blank before appending
            if (firstWord !== '') {
              strippedIngredients.push(firstWord);
            }
            if (secondWord !== '') {
              strippedIngredients.push(secondWord);
            }
        } else {
            // No "and" in the ingredient, simply push it to the resulting array if not blank
            if (replaceWithException !== '') {
              strippedIngredients.push(replaceWithException);
            }
        }
    }
    //remove duplicates 
    return Array.from(new Set(strippedIngredients));
}

function replaceWords(inputString) {
    const wordPairs = [ //replace the first word with the second. Have singular word (no s at end). 
    ["spring onion", "green onion"],
    ["garlic clove", "garlic"],
    ["clove garlic", "garlic"],
    ["cloves garlic", "garlic"],
    ["white sugar", "sugar"],
    ["granulated sugar", "sugar"],
    ["egg yolk", "egg"],
    ["great northern bean", "cannellini bean"],
    ["bramley", "green"],
    ["frozen banana", "banana"]
    ];

    let resultString = inputString;
  
    // Iterate through each word pair
    wordPairs.forEach(pair => {
      const [oldWord, newWord] = pair;
      // Create a regular expression to match the old word globally
      const regex = new RegExp("\\b" + oldWord + "(?:s)?\\b", "gi");
      // Replace occurrences of the old word with the new word
      resultString = resultString.replace(regex, (match) => {
        // Check if the matched word is in plural form (ends with "s")
        const isPlural = match.toLowerCase().endsWith('s');
        // If it's plural, replace with the new word in singular form
        return isPlural ? newWord + 's' : newWord;
      });
    });
  
    return resultString;
} 

function removeFirstWordWithException(ingredient) {
    const wordPairsWithException = [// remove the first word unless one of the second words exist
    ["sweet", ["potato", "corn", "tea", "onion"]],
    ["grated", ["cheese", "monterey jack"]]
    ]

    const lowerCasedIngredient = ingredient.toLowerCase();
  
    // Iterate through each word pair with exception
    wordPairsWithException.forEach(pair => {
      const [firstWord, exceptionWords] = pair;
      
      // Check if the ingredient starts with the first word exactly
      if (lowerCasedIngredient.startsWith(firstWord.toLowerCase())) {
        
        // Check if the ingredient contains any of the exception words
        const containsExceptionWord = exceptionWords.some(exceptionWord =>
          lowerCasedIngredient.includes(exceptionWord.toLowerCase())
        );
        
        // Remove the first word unless an exception word exists
        if (!containsExceptionWord) {
          // Remove the first word and trim any leading spaces
          ingredient = ingredient.replace(new RegExp(`^${firstWord}\\s*`, 'i'), '');
        }
      }
    });
  
    return ingredient.trim();
}
  
export{stripIngredients}


