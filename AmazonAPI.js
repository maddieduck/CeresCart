async function addToCart(accessToken, items) { //returns true if added successfully 
    console.log('items to add to cart', items)
    const formData = new FormData();
    formData.append('AssociateTag', 'Associate Tag');//TODO Change
    formData.append('ASIN.1', 'ProductASIN1');
    return new Promise((resolve, reject) => {
      fetch("https://www.amazon.com/gp/aws/cart/add.html" + '?' + new URLSearchParams(formData))
      .then(res => {
        if (res.ok) {
          console.log('Amazon APIs. Add to cart successful', res)
          resolve(true);
        } else {
          console.log('Amazon APIs. Add to Cart was unsuccessful. ', res);
          resolve(null);
        }
      })
      .catch(error => {
        console.log('ERROR in Amazon API Calls Add to Cart Function', error);
        resolve(null);
      });
    });
}