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
    const LIMIT = 20;

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

    function ucFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function getProduct(articleno) {
        fetchApi(`${URL}/products/${articleno}`)
            .then((data) => {
                const productImage = document.querySelector('#productImage');
                productImage.src = `${IMAGE_DOMAIN}${data.images.medium}`;
                const productName = document.querySelector('#productName');
                productName.innerHTML = data.nameDisplay || data.name;
                const updateFields = ['brand', 'itemCategory', 'retailPrice', 'color', 'size', 'availability', 'retailCurrency',
                    'description', 'features'];
                for (let i = 0, l = updateFields.length; i < l; i += 1) {
                    const field = updateFields[i];
                    const element = document.querySelector(`#product${ucFirst(field)}`);
                    if (element) {
                        element.innerHTML = data[field];
                    }
                }
            });
    }

    function getProductList($brand, $maingroup, $limit = LIMIT, $offset = 0) {
        let brand;
        let maingroup;
        let limit;
        let offset;
        if (typeof $brand === 'object') {
            brand = $brand.brand;
            maingroup = $brand.maingroup;
            limit = $brand.limit;
            offset = $brand.offset;
        } else {
            brand = $brand;
            maingroup = $maingroup;
            limit = $limit;
            offset = $offset;
        }
        fetchApi(`${URL}/products/?brand=${brand}&maingroup=${maingroup}&limit=${limit}&offset=${offset}`)
            .then((data) => {
                if (Array.isArray(data)) {
                    const productList = document.querySelector('#productList');
                    productList.innerHTML = '';
                    for (let i = 0, l = data.length; i < l; i += 1) {
                        const prod = data[i];
                        const elChild = document.createElement('div');
                        elChild.setAttribute('class', 'product');
                        elChild.innerHTML = `<a href="#${prod.brand}:${prod.maingroupno}:${prod.articleno}" onclick="FFE.getProduct('${prod.articleno}');">
                            <img src="${IMAGE_DOMAIN}${prod.images.small}">
                            ${prod.nameDisplay || prod.name}</a>`;
                        productList.appendChild(elChild);
                    }
                    // Load pagination
                    getPages(brand, maingroup, limit, offset, data.length);
                    if (!maingroup) {
                        // Get category list if only brand is selected.
                        getCategoryList(brand);
                    }
                }
            });
    }

    function getCategoryList($brand, $limit = LIMIT, $offset = 0) {
        let brand;
        let limit;
        let offset;
        if (typeof $brand === 'object') {
            brand = $brand.brand;
            limit = $brand.limit;
            offset = $brand.offset;
        } else {
            brand = $brand;
            limit = $limit;
            offset = $offset;
        }
        fetchApi(`${URL}/categories/?brand=${brand}&limit=${limit}&offset=${offset}`)
            .then((data) => {
                if (Array.isArray(data)) {
                    const categoryList = document.querySelector('#categoryList');
                    categoryList.innerHTML = '';
                    for (let i = 0, l = data.length; i < l; i += 1) {
                        const category = data[i];
                        const elChild = document.createElement('a');
                        elChild.innerHTML = category.name;
                        elChild.setAttribute('href', `#${brand}:${category.categoryno}`);
                        elChild.setAttribute('onclick', `FFE.getProductList('', ${category.categoryno});`);
                        categoryList.appendChild(elChild);
                        // Add separator
                        const elSep = document.createElement('span');
                        elSep.innerHTML = ' | ';
                        categoryList.appendChild(elSep);
                    }
                }
            });
    }

    function pagination($current, $last) {
        const current = $current;
        const last = $last;
        const delta = 2;
        const left = current - delta;
        const right = current + delta + 1;
        const range = [];
        const rangeWithDots = [];
        let loop;

        for (let i = 1; i <= last; i++) {
            if (i === 1 || i === last || i >= left && i < right) {
                range.push(i);
            }
        }
        for (let i = 0, l = range.length; i < l; i += 1) {
            const page = range[i];
            if (loop) {
                if (page - loop === 2) {
                    rangeWithDots.push(loop + 1);
                } else if (page - loop !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(page);
            loop = page;
        }
        return rangeWithDots;
    }

    function getPages($brand, $maingroup, $limit = LIMIT, $offset = 0, $total) {
        let brand;
        let maingroup;
        let limit;
        let offset;
        if (typeof $brand === 'object') {
            brand = $brand.brand;
            maingroup = $brand.maingroup;
            limit = $brand.limit;
            offset = $brand.offset;
        } else {
            brand = $brand;
            maingroup = $maingroup;
            limit = $limit;
            offset = $offset;
        }
        const productPagination = document.querySelector('#productPagination');
        productPagination.innerHTML = '';

        const totalPages = parseInt(offset / limit, 10) + 1;
        const pages = pagination(totalPages, totalPages);

        for (let i = 0, l = pages.length; i < l; i += 1) {
            const page = pages[i];
            const elChild = document.createElement('a');
            elChild.innerHTML = page;
            elChild.setAttribute('href', `#${brand}:${maingroup}`);
            elChild.setAttribute('onclick', `FFE.getProductList('${brand}', ${maingroup}, ${limit}, ${i * limit});`);
            productPagination.appendChild(elChild);
            // Add separator
            const elSep = document.createElement('span');
            elSep.innerHTML = ' | ';
            productPagination.appendChild(elSep);
        }
        if ($total >= $limit) {
            // Next arrow
            const elChild = document.createElement('a');
            elChild.innerHTML = 'Next >>';
            elChild.setAttribute('href', `#${brand}`);
            elChild.setAttribute('onclick', `FFE.getProductList('${brand}', ${maingroup}, ${limit}, ${offset + limit});`);
            productPagination.appendChild(elChild);
        }
    }

    return {
        getCategoryList,
        getProduct,
        getProductList,
        getPages,
    };
})();
