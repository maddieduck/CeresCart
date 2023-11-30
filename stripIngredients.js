//parses the array of ingredients to only return what you want to search in a Korger search 
function stripIngredients(recipeIngredients){ 
    var strippedIngredients = [] 
    const quantityPattern = /^[^a-z]+/; 
    const unitPattern = /\b(?:cup|cups|teaspoon|teaspoons|tbsp|tbsps|tsp|tsps|tablespoon|tablespoons|oz|ozs|ounce|ounces|fluid ounce|fluid ounces|pound|pounds|g|gs|gram|grams|kg|kgs|kilogram|kilogram|pint|pints|quart|quarts|gallon|gallons|liter|liters|litre|litres|scoop|scoops|batch|batches|pinch of|pinch|inch)\b/i; // Case-insensitive units
    const wordsToRemove = ['ice cubes', 'cubed', 'diced', 'sliced', 'slice of', 'fresh', 'slices', "juiced", "chopped", "softened", "small", "medium", "large", "zest", "water", "finely", "cooked", "extra virgin", "extra-virgin", "heaped", "chunks", "hot water", "boiling", "ice", "iced cubes", "melted", "rolled", "peeled", "wedges", "thinly", "flaked", "for serving", "ripe"]; 
    const regExWordsToRemove = new RegExp('\\b(' + wordsToRemove.join('|') + ')\\b', 'gi'); 
    //TODO: If the recipe calls for 'collard greens or kale', consider separating, or searching for both and combining 
    //remove cloves from "cloves garlic" or "cloves of garlic" 
    //change lemon juice to lemon, same for lime. 
    //filter units that look like this '2 cups / 400g dried lentils' 

    for (const index in recipeIngredients) {
        var ingredient = recipeIngredients[index]; 
        ingredient = ingredient.toLowerCase(); 
        // Remove quantity. Removes anything that is not a character. 
        const withoutQuantity = ingredient.replace(quantityPattern, '');
        // Remove unit
        const withoutUnit = withoutQuantity.replace(unitPattern, '');
        //Remove anything after a ',' 
        const removeAfterComma = withoutUnit.split(',');
        const commaRemoved = removeAfterComma[0]; 
        //remove parentheses and everything between them 
        const removeParentheses = commaRemoved.replace(/\([^)]*\)/g, '');
        //remove any erroneous parentheses 
        const removeMoreParentheses = removeParentheses.replace(/[()]/g, '');
        //Remove certain words like "sliced", "diced"
        const removedWords = removeMoreParentheses.replace(regExWordsToRemove, '');
        //remove any period at the begining of a string 
        const noPeriod = removedWords.replace(/^\./, "") 
        //remove anything after an * including * 
        const noAsterisk = noPeriod.split('*')[0]
        //Trim any leading or trailing spaces
        const trimmedWhitespaces = noAsterisk.trim();

        if(trimmedWhitespaces !== ''){
            strippedIngredients.push(trimmedWhitespaces);
        }
    }
    //remove duplicates 
    return Array.from(new Set(strippedIngredients));
}

export{stripIngredients}


