import { getAllProducts, updateProduct, deleteProduct } from './firebase-product-service.js';
        import { getProductImageAssets, getProductImages } from './product-images.js';
        import {
            getAllCustomerQueries,
            updateCustomerQuery,
            deleteCustomerQuery
        } from './customer-query-service.js';
        import { escapeHtml, sanitizeImageUrl } from './security-utils.js';
        import {
            IMAGE_UPLOAD_LIMITS,
            addFilesToPicker,
            getTriggerLabel,
            removeExistingImage,
            removeSelectedFile,
            resetImagePicker,
            totalSelectedImages
        } from './components/vendor-image-picker.js';
        import {
            mapUploadsToProductFields,
            uploadImages
        } from './services/cloudinary-upload-service.js';
        import { formatImageSize } from './utils/image-compress.js';
        import {
            composeMetalType,
            formatMetalTypeLabel,
            parseMetalType
        } from './metal-type-utils.js';

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
        const modifyImageInput = document.getElementById('m-images');
        const modifyImageTrigger = document.getElementById('m-images-trigger');
        const modifyImagePreviewGrid = document.getElementById('m-image-preview-grid');
        const modifyClearPhotosBtn = document.getElementById('m-clear-photos-btn');
        const modifyImageProgressTrack = document.getElementById('m-image-upload-progress-track');
        const modifyImageProgressFill = document.getElementById('m-image-upload-progress-fill');
        const searchWrap = document.getElementById('search-wrap');
        const searchInput = document.getElementById('admin-search');
        const noSearchResults = document.getElementById('no-search-results');
        const tabProducts = document.getElementById('tab-products');
        const productsView = document.getElementById('products-view');
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
        let queriesCache = [];
        let modifyImageState = {
            existingImages: [],
            selectedFiles: [],
            /** Cloudinary folder id (sanitized). */
            uploadVendorId: '',
            /** Original Firestore vendorId (do not invent one on save). */
            vendorId: '',
            vendorName: ''
        };
        const modifyPreviewObjectUrls = new Set();
        const metalSelect = document.getElementById('m-metal');
        const goldPurityWrap = document.getElementById('m-gold-purity-wrap');
        const goldColorWrap = document.getElementById('m-gold-color-wrap');
        const goldPuritySelect = document.getElementById('m-gold-purity');
        const goldColorSelect = document.getElementById('m-gold-color');
        const metalPreview = document.getElementById('m-metal-preview');

        function syncAdminGoldMetalFields() {
            if (!metalSelect || !goldPurityWrap || !goldColorWrap || !goldPuritySelect || !goldColorSelect) {
                return;
            }

            const isGold = metalSelect.value === 'gold';
            goldPurityWrap.classList.toggle('hidden', !isGold);
            if (!isGold) {
                goldPuritySelect.value = '';
                goldColorSelect.value = '';
                goldColorWrap.classList.add('hidden');
                if (metalPreview) {
                    metalPreview.classList.add('hidden');
                    metalPreview.textContent = '';
                }
                return;
            }

            const hasPurity = Boolean(goldPuritySelect.value);
            goldColorWrap.classList.toggle('hidden', !hasPurity);
            if (!hasPurity) {
                goldColorSelect.value = '';
            }

            const composed = composeMetalType('gold', goldPuritySelect.value, goldColorSelect.value);
            if (metalPreview) {
                if (composed) {
                    metalPreview.classList.remove('hidden');
                    metalPreview.textContent = `Metal type: ${formatMetalTypeLabel(composed)}`;
                } else {
                    metalPreview.classList.add('hidden');
                    metalPreview.textContent = '';
                }
            }
        }

        if (metalSelect) {
            metalSelect.addEventListener('change', syncAdminGoldMetalFields);
        }
        if (goldPuritySelect) {
            goldPuritySelect.addEventListener('change', syncAdminGoldMetalFields);
        }
        if (goldColorSelect) {
            goldColorSelect.addEventListener('change', syncAdminGoldMetalFields);
        }

        function loadAdminDashboard() {
            loadProducts();
            loadCustomerQueries();
        }

        window.addEventListener('jb:admin-authenticated', () => {
            loadAdminDashboard();
        });

        function switchAdminTab(tab) {
            tabProducts.classList.toggle('is-active', tab === 'products');
            tabQueries.classList.toggle('is-active', tab === 'queries');
            tabProducts.setAttribute('aria-selected', tab === 'products' ? 'true' : 'false');
            tabQueries.setAttribute('aria-selected', tab === 'queries' ? 'true' : 'false');
            productsView.classList.toggle('is-active', tab === 'products');
            queriesView.classList.toggle('is-active', tab === 'queries');
            productsView.hidden = tab !== 'products';
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
                const products = await getAllProducts({ forceRefresh: true });
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

        function revokeModifyPreviewUrls() {
            modifyPreviewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
            modifyPreviewObjectUrls.clear();
        }

        function resetModifyImageProgress() {
            if (!modifyImageProgressTrack || !modifyImageProgressFill) return;
            modifyImageProgressTrack.classList.add('hidden');
            modifyImageProgressFill.style.width = '0%';
        }

        function renderModifyImagePreviews() {
            if (!modifyImagePreviewGrid || !modifyImageTrigger) return;

            revokeModifyPreviewUrls();
            modifyImagePreviewGrid.innerHTML = '';
            modifyImageTrigger.textContent = getTriggerLabel(modifyImageState);
            modifyImageTrigger.disabled = totalSelectedImages(modifyImageState) >= IMAGE_UPLOAD_LIMITS.maxImages;

            const total = totalSelectedImages(modifyImageState);
            if (modifyClearPhotosBtn) {
                modifyClearPhotosBtn.classList.toggle('hidden', total === 0);
            }

            if (!total) {
                modifyImagePreviewGrid.classList.add('hidden');
                return;
            }

            modifyImagePreviewGrid.classList.remove('hidden');

            modifyImageState.existingImages.forEach((asset, index) => {
                const card = document.createElement('div');
                card.className = 'jb-image-upload-card';

                const image = document.createElement('img');
                image.src = sanitizeImageUrl(asset.url, asset.url);
                image.alt = `Current product photo ${index + 1}`;

                const meta = document.createElement('div');
                meta.className = 'jb-image-upload-meta';
                meta.textContent = `Current photo ${index + 1}`;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'jb-image-remove-btn';
                removeBtn.setAttribute('aria-label', `Remove photo ${index + 1}`);
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', () => {
                    removeExistingImage(modifyImageState, index);
                    renderModifyImagePreviews();
                });

                card.append(image, meta, removeBtn);
                modifyImagePreviewGrid.appendChild(card);
            });

            modifyImageState.selectedFiles.forEach((file, index) => {
                const card = document.createElement('div');
                card.className = 'jb-image-upload-card';

                const objectUrl = URL.createObjectURL(file);
                modifyPreviewObjectUrls.add(objectUrl);

                const image = document.createElement('img');
                image.src = objectUrl;
                image.alt = `New product photo ${index + 1}`;

                const meta = document.createElement('div');
                meta.className = 'jb-image-upload-meta';
                meta.textContent = `New • ${formatImageSize(file.size)}`;

                const removeBtn = document.createElement('button');
                removeBtn.type = 'button';
                removeBtn.className = 'jb-image-remove-btn';
                removeBtn.setAttribute('aria-label', `Remove new photo ${index + 1}`);
                removeBtn.textContent = '×';
                removeBtn.addEventListener('click', () => {
                    removeSelectedFile(modifyImageState, index);
                    renderModifyImagePreviews();
                });

                card.append(image, meta, removeBtn);
                modifyImagePreviewGrid.appendChild(card);
            });
        }

        function openModifyModal(product) {
            const productId = product.productId || product.productCode || product.id || '';
            document.getElementById('m-id').value = product.id;
            document.getElementById('m-category').value = product.category || 'all-jewellery';
            const parsedMetal = parseMetalType(product.metalType || 'none');
            if (metalSelect) metalSelect.value = parsedMetal.base || 'none';
            if (goldPuritySelect) goldPuritySelect.value = parsedMetal.purity || '';
            if (goldColorSelect) goldColorSelect.value = parsedMetal.color || '';
            syncAdminGoldMetalFields();
            // Restore purity/color after sync (sync clears when not gold)
            if (parsedMetal.base === 'gold') {
                if (goldPuritySelect) goldPuritySelect.value = parsedMetal.purity || '';
                if (goldColorSelect) goldColorSelect.value = parsedMetal.color || '';
                syncAdminGoldMetalFields();
            }
            document.getElementById('m-stone').value = product.stoneType || '';
            document.getElementById('m-name').value = product.name || '';
            document.getElementById('m-description').value = product.description || '';
            document.getElementById('m-price').value = product.price || '';
            document.getElementById('m-vendor').value = product.vendor || '';

            resetImagePicker(modifyImageState);
            modifyImageState.existingImages = getProductImageAssets(product)
                .map((asset) => ({
                    url: asset.url,
                    publicId: asset.publicId || ''
                }))
                .filter((asset) => asset.url);
            modifyImageState.selectedFiles = [];
            modifyImageState.vendorId = String(product.vendorId || '').trim().toLowerCase();
            modifyImageState.vendorName = product.vendor || '';
            modifyImageState.uploadVendorId = String(product.vendorId || product.vendor || 'admin')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'admin';

            if (modifyImageInput) modifyImageInput.value = '';
            resetModifyImageProgress();
            renderModifyImagePreviews();

            modifyProductIdLabel.textContent = `Product ID: ${productId}`;
            modifyStatus.classList.add('hidden');
            modifyModal.classList.add('is-open');
        }

        function closeModifyModal() {
            modifyModal.classList.remove('is-open');
            modifyForm.reset();
            resetImagePicker(modifyImageState);
            modifyImageState.vendorId = '';
            modifyImageState.uploadVendorId = '';
            modifyImageState.vendorName = '';
            if (modifyImageInput) modifyImageInput.value = '';
            revokeModifyPreviewUrls();
            resetModifyImageProgress();
            if (modifyImagePreviewGrid) {
                modifyImagePreviewGrid.innerHTML = '';
                modifyImagePreviewGrid.classList.add('hidden');
            }
            if (modifyClearPhotosBtn) modifyClearPhotosBtn.classList.add('hidden');
            if (modifyImageTrigger) {
                modifyImageTrigger.textContent = getTriggerLabel(modifyImageState);
                modifyImageTrigger.disabled = false;
            }
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

        if (modifyImageTrigger && modifyImageInput) {
            modifyImageTrigger.addEventListener('click', () => {
                if (totalSelectedImages(modifyImageState) >= IMAGE_UPLOAD_LIMITS.maxImages) {
                    setModifyStatus(
                        `You can keep a maximum of ${IMAGE_UPLOAD_LIMITS.maxImages} photos per product.`,
                        'error'
                    );
                    return;
                }
                modifyImageInput.click();
            });

            modifyImageInput.addEventListener('change', () => {
                const incoming = Array.from(modifyImageInput.files || []);
                modifyImageInput.value = '';
                if (!incoming.length) return;

                const { acceptedCount, errors } = addFilesToPicker(modifyImageState, incoming);
                if (errors.length) {
                    setModifyStatus(errors[0], errors[0].includes('allowed') ? 'info' : 'error');
                } else if (acceptedCount < incoming.length) {
                    setModifyStatus(
                        `Only the first ${IMAGE_UPLOAD_LIMITS.maxImages} photos were kept. Remove a photo to add another.`,
                        'info'
                    );
                } else {
                    modifyStatus.classList.add('hidden');
                }
                renderModifyImagePreviews();
            });
        }

        if (modifyClearPhotosBtn) {
            modifyClearPhotosBtn.addEventListener('click', () => {
                if (!totalSelectedImages(modifyImageState)) return;
                const confirmed = window.confirm(
                    'Remove all photos from this product?\n\nYou must add at least one photo before saving.'
                );
                if (!confirmed) return;
                resetImagePicker(modifyImageState);
                if (modifyImageInput) modifyImageInput.value = '';
                renderModifyImagePreviews();
                setModifyStatus('All photos removed. Add at least one photo before saving.', 'info');
            });
        }

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
            const deleteBtn = document.getElementById('modify-delete-btn');

            if (!totalSelectedImages(modifyImageState)) {
                setModifyStatus('Please keep or upload at least one product photo.', 'error');
                modifyImageTrigger?.focus();
                return;
            }

            const metalBase = metalSelect?.value || '';
            const metalValue = composeMetalType(
                metalBase,
                goldPuritySelect?.value || '',
                goldColorSelect?.value || ''
            );

            if (!metalBase) {
                setModifyStatus('Please select a metal type.', 'error');
                metalSelect?.focus();
                return;
            }

            if (metalBase === 'gold') {
                if (!goldPuritySelect?.value) {
                    setModifyStatus('Please select gold purity (9kt, 14kt, 18kt, or 22kt).', 'error');
                    goldPuritySelect?.focus();
                    return;
                }
                if (!goldColorSelect?.value) {
                    setModifyStatus('Please select gold colour (rose, white, or yellow gold).', 'error');
                    goldColorSelect?.focus();
                    return;
                }
            }

            if (!metalValue) {
                setModifyStatus('Please complete the metal type selection.', 'error');
                return;
            }

            try {
                saveBtn.disabled = true;
                deleteBtn.disabled = true;
                resetModifyImageProgress();

                let uploadedAssets = [];
                if (modifyImageState.selectedFiles.length) {
                    setModifyStatus('Uploading new photos...', 'info');
                    if (modifyImageProgressTrack && modifyImageProgressFill) {
                        modifyImageProgressTrack.classList.remove('hidden');
                        modifyImageProgressFill.style.width = '0%';
                    }

                    uploadedAssets = await uploadImages(
                        modifyImageState.selectedFiles,
                        modifyImageState.uploadVendorId || modifyImageState.vendorId || 'admin',
                        {
                            onProgress: (progress) => {
                                if (modifyImageProgressFill) {
                                    modifyImageProgressFill.style.width = `${progress.overallPercent || 0}%`;
                                }
                                setModifyStatus(
                                    `Uploading photos ${progress.currentIndex}/${progress.total} (${progress.overallPercent}%)...`,
                                    'info'
                                );
                            }
                        }
                    );
                }

                setModifyStatus('Saving updated product to the website...', 'info');

                const finalAssets = [
                    ...modifyImageState.existingImages.map((asset) => ({
                        url: asset.url,
                        publicId: asset.publicId || ''
                    })),
                    ...uploadedAssets.map((asset) => ({
                        url: asset.url,
                        publicId: asset.publicId || ''
                    }))
                ].slice(0, IMAGE_UPLOAD_LIMITS.maxImages);

                if (!finalAssets.length) {
                    throw new Error('Please keep or upload at least one product photo.');
                }

                const imageFields = mapUploadsToProductFields(finalAssets);

                await updateProduct(productId, {
                    name: document.getElementById('m-name').value,
                    description: document.getElementById('m-description').value,
                    price: document.getElementById('m-price').value,
                    category: document.getElementById('m-category').value,
                    metalType: metalValue,
                    stoneType: document.getElementById('m-stone').value,
                    vendor: document.getElementById('m-vendor').value,
                    vendorId: modifyImageState.vendorId || '',
                    ...imageFields,
                    // Explicit empty slots so Firestore clears removed photos.
                    imageUrl2: imageFields.imageUrl2 || '',
                    imageUrl3: imageFields.imageUrl3 || '',
                    imagePublicId: imageFields.imagePublicId || '',
                    imagePublicId2: imageFields.imagePublicId2 || '',
                    imagePublicId3: imageFields.imagePublicId3 || ''
                });

                setModifyStatus('Product updated successfully. Changes are live on the website.', 'success');
                closeModifyModal();
                await loadProducts();
            } catch (error) {
                console.error('Failed to update product:', error);
                setModifyStatus(error.message || 'Failed to update product.', 'error');
            } finally {
                saveBtn.disabled = false;
                deleteBtn.disabled = false;
                resetModifyImageProgress();
            }
        });

        searchInput.addEventListener('input', () => {
            renderProductsTable(filterProducts(searchInput.value));
        });

        tabProducts.addEventListener('click', () => switchAdminTab('products'));
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

        adminLogoutBtn.addEventListener('click', () => {
            if (typeof window.__jbAdminLock === 'function') {
                window.__jbAdminLock();
            }
        });

        if (document.getElementById('admin-section')?.classList.contains('is-visible')) {
            loadAdminDashboard();
        }