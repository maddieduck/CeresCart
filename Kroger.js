import {clientCredentials, cartWriteAuthorizationCode, productSearch,locationSearchByZipcode, locationSearchByLongLat, addToCart, getAuthToken, getRefreshToken} from './KrogerAPICalls.js'
import { GroceryStore } from './GroceryStore.js';

class Kroger extends GroceryStore {

    
    getProducts(strippedIngredients){  
        productSearch(); 
        return {}; 
    }  
} 

export{Kroger}