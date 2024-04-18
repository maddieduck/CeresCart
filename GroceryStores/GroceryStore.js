// Parent class
class GroceryStore {

    constructor() {
    }

    async getProducts(finalIngredients, locationExists){
        throw new Error('Method getProducts() in GroceryStore must be implemented');
    }    

    async checkout(itemsToCheckout){
        throw new Error('Method checkout() in GroceryStore must be implemented');
    }

    async locations(zipCode){
        throw new Error('Method locations() in GroceryStore must be implemented');
    }

}

export{GroceryStore}