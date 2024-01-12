//parses the array of ingredients to only return what you want to search in a Korger search 
function stripIngredients(recipeIngredients){ 
    var strippedIngredients = [] 
    const quantityPattern = /^[^a-z]+/; 
    const unitPattern = /\b(?:cup|cups|teaspoon|teaspoons|tbsp|tbsps|tsp|tsps|tablespoon|tablespoons|oz|ozs|ounce|ounces|fluid ounce|fluid ounces|pound|pounds|g|gs|gram|grams|kg|kgs|kilogram|kilogram|pint|pints|quart|quarts|gallon|gallons|liter|liters|litre|litres|scoop|scoops|batch|batches|pinch of|pinch|inch|package|head|heads|bunch|ml|thumb-sized piece)\b/i; // Case-insensitive units
    const wordsToRemove = ['ice cubes', 'cubed', 'diced', 'sliced', 'slice of', 'fresh', 'slices', "juiced", "chopped", "softened", "small", "medium", "large", "zest", "water", "finely", "cooked", "extra virgin", "extra-virgin", "heaped", "chunks", "hot water", "boiling", "ice", "iced cubes", "melted", "rolled", "peeled", "wedges", "thinly", "flaked", "for serving", "ripe", "crisp", "healthy", "whopping", "matchstick", "kosher", "roughly", "strip", "strips", "freshly", "fat", "dried"]; 
    const regExWordsToRemove = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi'); 
    const wordPairs = [ //replace the first word with the second
        ["spring onions", "green onions"],
        ["garlic cloves", "garlic"],
        ["garlic clove", "garlic"],
        ["clove garlic", "garlic"],
        ["cloves garlic", "garlic"],
        ["white sugar", "sugar"],
        ["granulated sugar", "sugar"]
        ];
    const wordPairsWithException = [// replace word pairs, unless they belong to a specific word
        ["sweet", "sweet potato"]
        ]

    for (const index in recipeIngredients) {
        var ingredient = recipeIngredients[index]; 
        ingredient = ingredient.toLowerCase(); 
        //remove parentheses and everything between them. Do this before removing anything after a comma in case there are commas in ()
        const removeParentheses = ingredient.replace(/\([^)]*\)/g, '');
        //remove any erroneous parentheses 
        const removeMoreParentheses = removeParentheses.replace(/[()]/g, '');
        //Remove certain words like "sliced", "diced". Remove this before quantity in case it's something like "1 whopping tablespoon"
        const removedWords = removeMoreParentheses.replace(regExWordsToRemove, '');
        // Remove quantity. Removes anything that is not a character. 
        const withoutQuantity = removedWords.replace(quantityPattern, '');
        // Remove unit
        const withoutUnit = withoutQuantity.replace(unitPattern, '');
        //remove leading commas and spaces 
        const leadingChars = withoutUnit.replace(/^\s*,+/g, '');
        //Remove anything after a ',' 
        const removeAfterComma = leadingChars.split(',');
        const commaRemoved = removeAfterComma[0]; 
        //remove any period at the begining of a string 
        const noPeriod = commaRemoved.replace(/^\./, "") 
        //remove anything after an * including * 
        const noAsterisk = noPeriod.split('*')[0]
        //remove anything after and 'or' 
        const noOr = noAsterisk.replace(/\sor.*$/, '');
        //remove anythnig after plus
        const noPlus = noOr.replace(/\splus.*$/, '');
        //Trim any leading or trailing spaces
        const trimmedWhitespaces = noPlus.trim();
        const replacedWords = replaceWords(trimmedWhitespaces, wordPairs);

        if(replacedWords !== ''){
            strippedIngredients.push(replacedWords);
        }
    }
    //remove duplicates 
    return Array.from(new Set(strippedIngredients));
}

function replaceWords(inputString, wordPairs) {
    let resultString = inputString;
    // Iterate through each word pair
    wordPairs.forEach(pair => {
      const [oldWord, newWord] = pair;
      // Create a regular expression to match the old word globally
      const regex = new RegExp("\\b" + oldWord + "\\b", "g");
      // Replace occurrences of the old word with the new word
      resultString = resultString.replace(regex, newWord);
    });
    return resultString;
  }

export{stripIngredients}


