var FFE = (function () {
    if (typeof FFE_TOKEN === 'undefined') {
        console.error('FFE_TOKEN missing. Please add this to your html page and try again.');
    }
    if (typeof FFE_URL === 'undefined') {
        FFE_URL = 'https://dealer.flyfisheurope.com/api';
    }
    if (typeof FFE_IMAGE_DOMAIN === 'undefined') {
        FFE_IMAGE_DOMAIN = 'https://dealer.flyfisheurope.com';
    }
    const TOKEN = FFE_TOKEN;
    const URL = FFE_URL;
    const IMAGE_DOMAIN = FFE_IMAGE_DOMAIN;

    function fetchApi(url) {
        const jwtToken = TOKEN;
        const myInit = {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${jwtToken}`
            },
            mode: 'cors',
            cache: 'default'
        };
        const myRequest = new Request(url, myInit);
        return fetch(myRequest)
            .then((response) => response.json());
    }

    function getProduct(articleno) {
        fetchApi(`${URL}/products/${articleno}`)
            .then((data) => {
                const productImage = document.querySelector('#productImage');
                productImage.src = `${IMAGE_DOMAIN}${data.images.medium}`;
                const productName = document.querySelector('#productName');
                productName.innerHTML = data.nameDisplay || data.name;
                const productPrice = document.querySelector('#productPrice');
                productPrice.innerHTML = `${data.retailCurrency} ${data.retailPrice}`;
            });
    }

    function getProductList(brand) {
        fetchApi(`${URL}/products/?brand=${brand}&limit=100`)
            .then((data) => {
                if (Array.isArray(data)) {
                    const productList = document.querySelector('#productList');
                    productList.innerHTML = '';
                    for (let i = 0, l = data.length; i < l; i += 1) {
                        const prod = data[i];
                        const elChild = document.createElement('div');
                        elChild.innerHTML = `<a href="#${prod.articleno}" onclick="FFE.getProduct('${prod.articleno}');">
                            <img src="${IMAGE_DOMAIN}${prod.images.small}">
                            ${prod.nameDisplay || prod.name}</a>`;
                        productList.appendChild(elChild);
                    }
                }
            });
    }

    return {
        getProduct,
        getProductList,
    };
})();
