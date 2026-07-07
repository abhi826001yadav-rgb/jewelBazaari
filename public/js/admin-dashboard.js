import { getAllProducts, updateProduct, deleteProduct } from './firebase-product-service.js?v=20260707l';
        import { getProductImages } from './product-images.js';
        import {
            getAllVendorRequests,
            approveVendor,
            syncAllVendorEmailIndexes,
            rejectVendor,
            discontinueVendor,
            VENDOR_STATUS
        } from './vendor-service.js?v=20260707l';
        import {
            getAllCustomerQueries,
            updateCustomerQuery,
            deleteCustomerQuery
        } from './customer-query-service.js?v=20260707l';
        import { auth } from './firebase-config.js?v=20260707l';
        import { escapeHtml, sanitizeImageUrl } from './security-utils.js';
        import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

        const adminLogoutBtn = document.getElementById('admin-logout-btn');
        const loadingState = document.getElementById('loading-state');
        const errorState = document.getElementById('error-state');
        const emptyState = document.getElementById('empty-state');
        const tableContainer = document.getElementById('table-container');
        const tableBody = document.getElementById('products-table-body');
        const modifyModal = document.getElementById('modify-modal');
        const modifyForm = document.getElementById('modify-form');
        const modifyCloseBtn = document.getElementById('modify-close-btn');
        const modifyStatus = document.getElementById('modify-status');
        const modifyProductIdLabel = document.getElementById('modify-product-id-label');
        const searchWrap = document.getElementById('search-wrap');
        const searchInput = document.getElementById('admin-search');
        const noSearchResults = document.getElementById('no-search-results');
        const tabProducts = document.getElementById('tab-products');
        const tabVendors = document.getElementById('tab-vendors');
        const productsView = document.getElementById('products-view');
        const vendorsView = document.getElementById('vendors-view');
        const vendorsLoading = document.getElementById('vendors-loading');
        const vendorsError = document.getElementById('vendors-error');
        const vendorsEmpty = document.getElementById('vendors-empty');
        const vendorsTableContainer = document.getElementById('vendors-table-container');
        const vendorsTableBody = document.getElementById('vendors-table-body');
        const pendingVendorCount = document.getElementById('pending-vendor-count');
        const tabQueries = document.getElementById('tab-queries');
        const queriesView = document.getElementById('queries-view');
        const queriesLoading = document.getElementById('queries-loading');
        const queriesError = document.getElementById('queries-error');
        const queriesEmpty = document.getElementById('queries-empty');
        const queriesTableContainer = document.getElementById('queries-table-container');
        const queriesTableBody = document.getElementById('queries-table-body');
        const queryCount = document.getElementById('query-count');
        const queryModifyModal = document.getElementById('query-modify-modal');
        const queryModifyForm = document.getElementById('query-modify-form');
        const queryModifyCloseBtn = document.getElementById('query-modify-close-btn');
        const queryModifyStatus = document.getElementById('query-modify-status');
        const queryModifyIdLabel = document.getElementById('query-modify-id-label');
        let productsCache = [];
        let vendorsCache = [];
        let queriesCache = [];

        function loadAdminDashboard() {
            loadProducts();
            loadVendorRequests();
            loadCustomerQueries();
        }

        window.addEventListener('jb:admin-authenticated', () => {
            loadAdminDashboard();
        });

        function switchAdminTab(tab) {
            tabProducts.classList.toggle('is-active', tab === 'products');
            tabVendors.classList.toggle('is-active', tab === 'vendors');
            tabQueries.classList.toggle('is-active', tab === 'queries');
            tabProducts.setAttribute('aria-selected', tab === 'products' ? 'true' : 'false');
            tabVendors.setAttribute('aria-selected', tab === 'vendors' ? 'true' : 'false');
            tabQueries.setAttribute('aria-selected', tab === 'queries' ? 'true' : 'false');
            productsView.classList.toggle('is-active', tab === 'products');
            vendorsView.classList.toggle('is-active', tab === 'vendors');
            queriesView.classList.toggle('is-active', tab === 'queries');
            productsView.hidden = tab !== 'products';
            vendorsView.hidden = tab !== 'vendors';
            queriesView.hidden = tab !== 'queries';
        }

        function formatQueryDate(query) {
            const ts = query?.createdAt;
            if (!ts) return 'â€”';
            const date = typeof ts.toDate === 'function'
                ? ts.toDate()
                : new Date((ts.seconds || 0) * 1000);
            if (Number.isNaN(date.getTime())) return 'â€”';
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }

        function renderQueryRow(query, index) {
            return `
                <tr>
                    <td class="font-semibold text-[#4A0E17]">${index}</td>
                    <td class="text-xs text-gray-600 whitespace-nowrap">${escapeHtml(formatQueryDate(query))}</td>
                    <td class="font-semibold text-gray-800">${escapeHtml(query.name || 'â€”')}</td>
                    <td class="text-xs text-gray-600">${escapeHtml(query.email || 'â€”')}</td>
                    <td class="text-sm text-gray-800">${escapeHtml(query.subject || 'â€”')}</td>
                    <td><div class="query-message-preview" title="${escapeHtml(query.message || '')}">${escapeHtml(query.message || 'â€”')}</div></td>
                    <td>
                        <button type="button" class="admin-modify-btn" data-modify-query-id="${escapeHtml(query.id)}">Modify</button>
                    </td>
                </tr>
            `;
        }

        function updateQueryCount() {
            queryCount.textContent = queriesCache.length ? `(${queriesCache.length})` : '';
        }

        function bindQueryModifyButtons() {
            queriesTableBody.querySelectorAll('[data-modify-query-id]').forEach((button) => {
                button.addEventListener('click', () => {
                    const query = queriesCache.find((item) => item.id === button.dataset.modifyQueryId);
                    if (query) openQueryModifyModal(query);
                });
            });
        }

        async function loadCustomerQueries() {
            try {
                queriesLoading.classList.remove('hidden');
                queriesError.classList.add('hidden');
                queriesEmpty.classList.add('hidden');
                queriesTableContainer.classList.add('hidden');

                const queries = await getAllCustomerQueries();
                queriesCache = queries;
                updateQueryCount();
                queriesLoading.classList.add('hidden');

                if (!queries.length) {
                    queriesEmpty.classList.remove('hidden');
                    return;
                }

                queriesTableBody.innerHTML = queries.map((query, index) => renderQueryRow(query, index + 1)).join('');
                queriesTableContainer.classList.remove('hidden');
                bindQueryModifyButtons();
            } catch (error) {
                console.error('Failed to load customer queries:', error);
                queriesLoading.classList.add('hidden');
                queriesError.textContent = 'Failed to load customer queries. Please refresh and try again.';
                queriesError.classList.remove('hidden');
            }
        }

        function setQueryModifyStatus(message, type = 'info') {
            queryModifyStatus.textContent = message;
            queryModifyStatus.classList.remove('hidden', 'text-green-700', 'text-red-600', 'text-gray-600');
            if (type === 'success') queryModifyStatus.classList.add('text-green-700');
            else if (type === 'error') queryModifyStatus.classList.add('text-red-600');
            else queryModifyStatus.classList.add('text-gray-600');
        }

        function openQueryModifyModal(query) {
            document.getElementById('q-id').value = query.id;
            document.getElementById('q-name').value = query.name || '';
            document.getElementById('q-email').value = query.email || '';
            document.getElementById('q-phone').value = query.phone || '';
            document.getElementById('q-subject').value = query.subject || '';
            document.getElementById('q-message').value = query.message || '';
            queryModifyIdLabel.textContent = `Query ID: ${query.id}`;
            queryModifyStatus.classList.add('hidden');
            queryModifyModal.classList.add('is-open');
        }

        function closeQueryModifyModal() {
            queryModifyModal.classList.remove('is-open');
            queryModifyForm.reset();
        }

        function formatVendorStatus(status) {
            const normalized = String(status || 'pending').toLowerCase();
            const labels = {
                pending: 'Pending',
                approved: 'Approved',
                rejected: 'Rejected',
                discontinued: 'Discontinued'
            };
            const safeKey = labels[normalized] ? normalized : 'pending';
            const label = labels[safeKey];
            return `<span class="vendor-status-badge vendor-status-${escapeHtml(safeKey)}">${escapeHtml(label)}</span>`;
        }

        function renderVendorActions(vendor) {
            const status = vendor.status || VENDOR_STATUS.PENDING;
            const id = escapeHtml(vendor.id);
            const actions = [];

            if (status === VENDOR_STATUS.PENDING) {
                actions.push(`<button type="button" class="vendor-approve-btn" data-approve-id="${id}">Approve</button>`);
                actions.push(`<button type="button" class="vendor-reject-btn" data-reject-id="${id}">Reject</button>`);
            } else if (status === VENDOR_STATUS.APPROVED) {
                actions.push(`<button type="button" class="vendor-discontinue-btn" data-discontinue-id="${id}">Discontinue</button>`);
            } else if (status === VENDOR_STATUS.REJECTED || status === VENDOR_STATUS.DISCONTINUED) {
                actions.push(`<button type="button" class="vendor-approve-btn" data-approve-id="${id}">Approve</button>`);
            }

            if (!actions.length) {
                return 'â€”';
            }

            return `<div class="vendor-actions">${actions.join('')}</div>`;
        }

        function renderVendorRow(vendor, index) {
            return `
                <tr>
                    <td class="font-semibold text-[#4A0E17]">${index}</td>
                    <td class="font-semibold text-gray-800">${escapeHtml(vendor.shopName || 'â€”')}</td>
                    <td class="text-xs text-gray-700 whitespace-nowrap">${escapeHtml(vendor.vendorId || vendor.id || 'â€”')}</td>
                    <td class="text-xs text-gray-600">${escapeHtml(vendor.email || 'â€”')}</td>
                    <td>${formatVendorStatus(vendor.status)}</td>
                    <td>${renderVendorActions(vendor)}</td>
                </tr>
            `;
        }

        function updatePendingVendorCount() {
            const pendingCount = vendorsCache.filter((vendor) => vendor.status === VENDOR_STATUS.PENDING).length;
            pendingVendorCount.textContent = pendingCount ? `(${pendingCount})` : '';
        }

        function bindVendorActionButtons() {
            vendorsTableBody.querySelectorAll('[data-approve-id]').forEach((button) => {
                button.addEventListener('click', async () => {
                    const vendor = vendorsCache.find((item) => item.id === button.dataset.approveId);
                    if (!vendor) return;

                    const confirmed = window.confirm(
                        `Approve "${vendor.shopName}" (${vendor.vendorId})?\n\nThey will be able to log in and upload jewellery.`
                    );
                    if (!confirmed) return;

                    try {
                        button.disabled = true;
                        await approveVendor(vendor.id);
                        await loadVendorRequests();
                    } catch (error) {
                        console.error('Approve vendor failed:', error);
                        alert(error.message || 'Failed to approve vendor.');
                        button.disabled = false;
                    }
                });
            });

            vendorsTableBody.querySelectorAll('[data-reject-id]').forEach((button) => {
                button.addEventListener('click', async () => {
                    const vendor = vendorsCache.find((item) => item.id === button.dataset.rejectId);
                    if (!vendor) return;

                    const confirmed = window.confirm(
                        `Reject "${vendor.shopName}" (${vendor.vendorId})?\n\nThey will not be able to upload jewellery.`
                    );
                    if (!confirmed) return;

                    try {
                        button.disabled = true;
                        await rejectVendor(vendor.id);
                        await loadVendorRequests();
                    } catch (error) {
                        console.error('Reject vendor failed:', error);
                        alert(error.message || 'Failed to reject vendor.');
                        button.disabled = false;
                    }
                });
            });

            vendorsTableBody.querySelectorAll('[data-discontinue-id]').forEach((button) => {
                button.addEventListener('click', async () => {
                    const vendor = vendorsCache.find((item) => item.id === button.dataset.discontinueId);
                    if (!vendor) return;

                    const confirmed = window.confirm(
                        `Discontinue "${vendor.shopName}" (${vendor.vendorId})?\n\nThey will immediately lose access to upload jewellery on jewelBazaari.`
                    );
                    if (!confirmed) return;

                    try {
                        button.disabled = true;
                        await discontinueVendor(vendor.id);
                        await loadVendorRequests();
                    } catch (error) {
                        console.error('Discontinue vendor failed:', error);
                        alert(error.message || 'Failed to discontinue vendor.');
                        button.disabled = false;
                    }
                });
            });
        }

        async function loadVendorRequests() {
            try {
                vendorsLoading.classList.remove('hidden');
                vendorsError.classList.add('hidden');
                vendorsEmpty.classList.add('hidden');
                vendorsTableContainer.classList.add('hidden');

                const vendors = await getAllVendorRequests();
                await syncAllVendorEmailIndexes(vendors).catch((error) => {
                    console.warn('Vendor email index sync skipped:', error);
                });
                vendorsCache = vendors;
                updatePendingVendorCount();
                vendorsLoading.classList.add('hidden');

                if (!vendors.length) {
                    vendorsEmpty.classList.remove('hidden');
                    return;
                }

                vendorsTableBody.innerHTML = vendors.map((vendor, index) => renderVendorRow(vendor, index + 1)).join('');
                vendorsTableContainer.classList.remove('hidden');
                bindVendorActionButtons();
            } catch (error) {
                console.error('Failed to load vendor requests:', error);
                vendorsLoading.classList.add('hidden');
                vendorsError.textContent = 'Failed to load vendor requests. Please refresh and try again.';
                vendorsError.classList.remove('hidden');
            }
        }

        function renderRow(product, index) {
            const images = getProductImages(product);
            const cover = sanitizeImageUrl(images[0] || '', '');
            const productId = product.productId || product.productCode || product.id || 'â€”';

            return `
                <tr>
                    <td class="font-semibold text-[#4A0E17]">${index}</td>
                    <td>
                        ${cover
                            ? `<a href="${escapeHtml(cover)}" target="_blank" rel="noopener noreferrer">
                                <img src="${escapeHtml(cover)}" alt="${escapeHtml(product.name)}" class="admin-photo">
                               </a>`
                            : 'â€”'}
                    </td>
                    <td class="font-semibold text-gray-800" title="${escapeHtml(product.name || '')}">${escapeHtml(product.name || 'â€”')}</td>
                    <td>
                        <button type="button" class="admin-modify-btn" data-modify-id="${escapeHtml(product.id)}">Modify</button>
                    </td>
                    <td class="text-xs text-gray-600 whitespace-nowrap">${escapeHtml(productId)}</td>
                </tr>
            `;
        }

        function getCreatedAtMillis(product) {
            const ts = product?.createdAt;
            if (!ts) return 0;
            if (typeof ts.toMillis === 'function') return ts.toMillis();
            if (ts.seconds) return ts.seconds * 1000;
            return 0;
        }

        function getProductSearchText(product) {
            const images = getProductImages(product);
            return [
                product.id,
                product.productId,
                product.productCode,
                product.name,
                product.vendor,
                product.category,
                product.metalType,
                product.stoneType,
                product.description,
                product.price,
                product.addToCartCount,
                product.cartCount,
                ...images
            ]
                .filter((value) => value !== undefined && value !== null && value !== '')
                .join(' ')
                .toLowerCase();
        }

        function filterProducts(query) {
            const normalized = query.trim().toLowerCase();
            if (!normalized) return productsCache;

            return productsCache.filter((product) =>
                getProductSearchText(product).includes(normalized)
            );
        }

        function renderProductsTable(products) {
            const query = searchInput.value.trim();

            emptyState.classList.add('hidden');
            noSearchResults.classList.add('hidden');
            tableContainer.classList.add('hidden');

            if (!productsCache.length) {
                emptyState.classList.remove('hidden');
                searchWrap.classList.add('hidden');
                return;
            }

            searchWrap.classList.remove('hidden');

            if (!products.length) {
                noSearchResults.classList.remove('hidden');
                return;
            }

            tableBody.innerHTML = products.map((product, index) => renderRow(product, index + 1)).join('');
            tableContainer.classList.remove('hidden');
            bindModifyButtons();
        }

        async function loadProducts() {
            try {
                const products = await getAllProducts();
                const sorted = [...products].sort(
                    (a, b) => getCreatedAtMillis(a) - getCreatedAtMillis(b)
                );

                loadingState.classList.add('hidden');
                productsCache = sorted;
                searchInput.value = '';
                renderProductsTable(sorted);
            } catch (error) {
                console.error('Failed to load admin products:', error);
                loadingState.classList.add('hidden');
                errorState.textContent = 'Failed to load jewellery records. Please refresh and try again.';
                errorState.classList.remove('hidden');
            }
        }

        function setModifyStatus(message, type = 'info') {
            modifyStatus.textContent = message;
            modifyStatus.classList.remove('hidden', 'text-green-700', 'text-red-600', 'text-gray-600');
            if (type === 'success') modifyStatus.classList.add('text-green-700');
            else if (type === 'error') modifyStatus.classList.add('text-red-600');
            else modifyStatus.classList.add('text-gray-600');
        }

        function openModifyModal(product) {
            const productId = product.productId || product.productCode || product.id || '';
            document.getElementById('m-id').value = product.id;
            document.getElementById('m-category').value = product.category || 'all-jewellery';
            document.getElementById('m-metal').value = product.metalType || 'none';
            document.getElementById('m-stone').value = product.stoneType || '';
            document.getElementById('m-name').value = product.name || '';
            document.getElementById('m-description').value = product.description || '';
            document.getElementById('m-image-url-1').value = product.imageUrl || '';
            document.getElementById('m-image-url-2').value = product.imageUrl2 || '';
            document.getElementById('m-image-url-3').value = product.imageUrl3 || '';
            document.getElementById('m-price').value = product.price || '';
            document.getElementById('m-vendor').value = product.vendor || '';
            modifyProductIdLabel.textContent = `Product ID: ${productId}`;
            modifyStatus.classList.add('hidden');
            modifyModal.classList.add('is-open');
        }

        function closeModifyModal() {
            modifyModal.classList.remove('is-open');
            modifyForm.reset();
        }

        function bindModifyButtons() {
            tableBody.querySelectorAll('[data-modify-id]').forEach((button) => {
                button.addEventListener('click', () => {
                    const product = productsCache.find((item) => item.id === button.dataset.modifyId);
                    if (product) openModifyModal(product);
                });
            });
        }

        modifyCloseBtn.addEventListener('click', closeModifyModal);
        modifyModal.addEventListener('click', (event) => {
            if (event.target === modifyModal) closeModifyModal();
        });

        document.getElementById('modify-delete-btn').addEventListener('click', async () => {
            const productId = document.getElementById('m-id').value;
            const productName = document.getElementById('m-name').value.trim() || 'this product';
            const deleteBtn = document.getElementById('modify-delete-btn');
            const saveBtn = document.getElementById('modify-save-btn');

            const confirmed = window.confirm(
                `Delete "${productName}" permanently?\n\nThis will remove the product from the website and Firebase database. This cannot be undone.`
            );
            if (!confirmed) return;

            try {
                deleteBtn.disabled = true;
                saveBtn.disabled = true;
                setModifyStatus('Deleting product...', 'info');

                await deleteProduct(productId);

                closeModifyModal();
                await loadProducts();
            } catch (error) {
                console.error('Failed to delete product:', error);
                setModifyStatus(error.message || 'Failed to delete product.', 'error');
            } finally {
                deleteBtn.disabled = false;
                saveBtn.disabled = false;
            }
        });

        modifyForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const productId = document.getElementById('m-id').value;
            const saveBtn = document.getElementById('modify-save-btn');

            try {
                saveBtn.disabled = true;
                setModifyStatus('Saving changes...', 'info');

                await updateProduct(productId, {
                    name: document.getElementById('m-name').value,
                    description: document.getElementById('m-description').value,
                    price: document.getElementById('m-price').value,
                    category: document.getElementById('m-category').value,
                    metalType: document.getElementById('m-metal').value,
                    stoneType: document.getElementById('m-stone').value,
                    imageUrl: document.getElementById('m-image-url-1').value,
                    imageUrl2: document.getElementById('m-image-url-2').value,
                    imageUrl3: document.getElementById('m-image-url-3').value,
                    vendor: document.getElementById('m-vendor').value
                });

                setModifyStatus('Product updated successfully.', 'success');
                closeModifyModal();
                await loadProducts();
            } catch (error) {
                console.error('Failed to update product:', error);
                setModifyStatus(error.message || 'Failed to update product.', 'error');
            } finally {
                saveBtn.disabled = false;
            }
        });

        searchInput.addEventListener('input', () => {
            renderProductsTable(filterProducts(searchInput.value));
        });

        tabProducts.addEventListener('click', () => switchAdminTab('products'));
        tabVendors.addEventListener('click', () => {
            switchAdminTab('vendors');
            loadVendorRequests();
        });
        tabQueries.addEventListener('click', () => {
            switchAdminTab('queries');
            loadCustomerQueries();
        });

        queryModifyCloseBtn.addEventListener('click', closeQueryModifyModal);
        queryModifyModal.addEventListener('click', (event) => {
            if (event.target === queryModifyModal) closeQueryModifyModal();
        });

        document.getElementById('query-modify-delete-btn').addEventListener('click', async () => {
            const queryId = document.getElementById('q-id').value;
            const subject = document.getElementById('q-subject').value.trim() || 'this query';
            const deleteBtn = document.getElementById('query-modify-delete-btn');
            const saveBtn = document.getElementById('query-modify-save-btn');

            const confirmed = window.confirm(
                `Delete query "${subject}" permanently?\n\nThis cannot be undone.`
            );
            if (!confirmed) return;

            try {
                deleteBtn.disabled = true;
                saveBtn.disabled = true;
                setQueryModifyStatus('Deleting query...', 'info');

                await deleteCustomerQuery(queryId);

                closeQueryModifyModal();
                await loadCustomerQueries();
            } catch (error) {
                console.error('Failed to delete query:', error);
                setQueryModifyStatus(error.message || 'Failed to delete query.', 'error');
            } finally {
                deleteBtn.disabled = false;
                saveBtn.disabled = false;
            }
        });

        queryModifyForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const queryId = document.getElementById('q-id').value;
            const saveBtn = document.getElementById('query-modify-save-btn');

            try {
                saveBtn.disabled = true;
                setQueryModifyStatus('Saving changes...', 'info');

                await updateCustomerQuery(queryId, {
                    name: document.getElementById('q-name').value,
                    email: document.getElementById('q-email').value,
                    phone: document.getElementById('q-phone').value,
                    subject: document.getElementById('q-subject').value,
                    message: document.getElementById('q-message').value
                });

                setQueryModifyStatus('Query updated successfully.', 'success');
                closeQueryModifyModal();
                await loadCustomerQueries();
            } catch (error) {
                console.error('Failed to update query:', error);
                setQueryModifyStatus(error.message || 'Failed to update query.', 'error');
            } finally {
                saveBtn.disabled = false;
            }
        });

        adminLogoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            if (typeof window.__jbAdminLock === 'function') {
                window.__jbAdminLock();
            }
        });

        if (document.getElementById('admin-section')?.classList.contains('is-visible')) {
            loadAdminDashboard();
        }