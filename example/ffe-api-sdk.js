var FFE = (function () {
    const TOKEN = FFE_TOKEN;
    const URL = FFE_URL || 'https://dealer.flyfisheurope.com/api';
    let IMAGE_DOMAIN = FFE_IMAGE_DOMAIN;
    if (typeof IMAGE_DOMAIN === 'undefined') {
        IMAGE_DOMAIN = 'https://dealer.flyfisheurope.com';
    }

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
