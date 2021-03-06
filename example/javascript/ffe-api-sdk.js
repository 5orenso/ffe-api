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
            cache: 'default',
        };
        const myRequest = new Request(url, myInit);
        return fetch(myRequest)
            .then(response => response.json());
    }

    function ucFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function pad(num) {
        let r = String(num);
        if (r.length === 1) {
            r = `0${r}`;
        }
        return r;
    }

    function ffeDate(date) {
        let day = pad(date.getDate());
        let month = pad(date.getMonth() + 1);
        let year = String(date.getFullYear());
        year = year.slice(2);
        return `${day}.${month}.${year}`;
    }

    function getProduct(articleno) {
        fetchApi(`${URL}/products/${articleno}`)
            .then((data) => {
                const product = document.querySelector('#product');
                product.style.display = 'block';
                const productImage = document.querySelector('#productImage');
                let img = '';
                if (data.images.medium) {
                    img = data.images.medium;
                }
                productImage.src = img;
                const productName = document.querySelector('#productName');
                productName.innerHTML = data.nameDisplay || data.name;
                const updateFields = ['brand', 'itemCategory', 'retailPrice', 'color', 'size', 'availability', 'retailCurrency',
                    'description', 'features'];
                for (let i = 0, l = updateFields.length; i < l; i += 1) {
                    const field = updateFields[i];
                    const element = document.querySelector(`#product${ucFirst(field)}`);
                    if (element && data[field]) {
                        element.innerHTML = data[field];
                    }
                }
            });
    }

    function getProductList($brand, $maingroup, $limit = LIMIT, $offset = 0, $unique = true) {
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
        fetchApi(`${URL}/products/?brand=${brand}&mainCat=${maingroup}&limit=${limit}&offset=${offset}&unique=${$unique}`)
            .then((data) => {
                if (Array.isArray(data)) {
                    const product = document.querySelector('#product');
                    product.style.display = 'none';
                    const productList = document.querySelector('#productList');
                    productList.innerHTML = '';
                    for (let i = 0, l = data.length; i < l; i += 1) {
                        const prod = data[i];
                        let availabilityText;
                        let availabilityClass;
                        if (typeof prod.availability === 'string') {
                            if (prod.availability.match(/Yes/)) {
                                availabilityText = 'YES';
                                availabilityClass = 'yes';
                            } else if (prod.availability.match(/No/)) {
                                availabilityText = 'NO';
                                availabilityClass = 'no';
                            } else if (prod.availability.match(/\d{4}-\d{2}-\d{2}/)) {
                                const date = new Date(prod.availability);
                                availabilityText = ffeDate(date);
                                availabilityClass = 'soon';
                            } else {
                                availabilityText = String(prod.availability);
                                availabilityClass = 'yes';
                            }
                        } else if (typeof prod.availability === 'number') {
                            availabilityText = String(prod.availability);
                            availabilityClass = 'yes';
                        }
                        let img = '';
                        if (prod.images.small) {
                            img = `<img src="${prod.images.small}">`
                        }
                        const elChild = document.createElement('div');
                        elChild.setAttribute('class', 'product');
                        elChild.innerHTML = `<a href="#${prod.brand}:${prod.maingroupno}:${prod.articleno}" onclick="FFE.getProduct('${prod.articleno}');">
                            ${img}</a>
                            <div class="info">
                                <span class="name"><a href="#${prod.brand}:${prod.maingroupno}:${prod.articleno}" onclick="FFE.getProduct('${prod.articleno}');">${prod.name}</a></span>
                                <span class="category">${prod.mainCategory || ''} / ${prod.intermediateCategory || ''}</span><br clear="all">
                                <span class="price">${prod.retailCurrency || ''} ${prod.retailPrice || 'n/a'}</span>
                                <span class="availability ${availabilityClass}">${availabilityText}</span>
                            </div>
                        `;
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
                    const product = document.querySelector('#product');
                    product.style.display = 'none';
                    const productlist = document.querySelector('#productList');
                    productlist.innerHTML = '';
                    const categoryList = document.querySelector('#categoryList');
                    categoryList.innerHTML = '';
                    for (let i = 0, l = data.length; i < l; i += 1) {
                        const category = data[i];
                        const elChild = document.createElement('a');
                        elChild.innerHTML = category.name;
                        elChild.setAttribute('href', `#${brand}:${category.categoryno}`);
                        elChild.setAttribute('onclick', `FFE.getProductList('${brand}', ${category.categoryno});`);
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
