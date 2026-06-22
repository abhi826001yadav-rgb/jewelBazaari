const carouselInstances = new Map();

function resolveElement(target) {
    if (!target) return null;
    if (typeof target === 'string') {
        return document.querySelector(target);
    }
    return target;
}

function getSlotIndices(length, centerIndex) {
    if (length === 0) {
        return { left: -1, center: -1, right: -1 };
    }

    if (length === 1) {
        return { left: -1, center: 0, right: -1 };
    }

    if (length === 2) {
        if (centerIndex === 0) {
            return { left: -1, center: 0, right: 1 };
        }
        return { left: 0, center: 1, right: -1 };
    }

    return {
        left: (centerIndex + 1) % length,
        center: centerIndex,
        right: (centerIndex + 2) % length
    };
}

function moveCenterLeft(length, centerIndex) {
    if (length <= 1) return centerIndex;
    if (length === 2) return (centerIndex + 1) % 2;
    return (centerIndex + 1) % length;
}

function moveCenterRight(length, centerIndex) {
    if (length <= 1) return centerIndex;
    if (length === 2) return (centerIndex + 1) % 2;
    return (centerIndex + 2) % length;
}

export function initShadowCarousel(rootEl, options = {}) {
    if (!rootEl || typeof options.renderCard !== 'function') {
        return null;
    }

    destroyShadowCarousel(rootEl);

    const stageEl = rootEl.querySelector('.jb-shadow-carousel-stage');
    if (!stageEl) {
        return null;
    }

    let products = Array.isArray(options.products) ? [...options.products] : [];
    let centerIndex = 0;

    function render() {
        if (!products.length) {
            stageEl.innerHTML = options.emptyHtml || '<p class="text-center text-gray-500 py-10">No products to display.</p>';
            return;
        }

        const slots = getSlotIndices(products.length, centerIndex);
        const slotConfig = [
            { key: 'left', index: slots.left, className: 'jb-shadow-card--left' },
            { key: 'center', index: slots.center, className: 'jb-shadow-card--center' },
            { key: 'right', index: slots.right, className: 'jb-shadow-card--right' }
        ];

        stageEl.innerHTML = slotConfig
            .filter((slot) => slot.index >= 0)
            .map((slot) => {
                const product = products[slot.index];
                return `
                    <div class="jb-shadow-card ${slot.className}" data-shadow-slot="${slot.key}" data-product-index="${slot.index}">
                        ${options.renderCard(product, slot.key, slot.index)}
                    </div>
                `;
            })
            .join('');

        requestAnimationFrame(() => {
            const centerCard = stageEl.querySelector('.jb-shadow-card--center');
            if (centerCard) {
                stageEl.style.minHeight = `${centerCard.offsetHeight}px`;
            }
        });

        if (typeof options.onAfterRender === 'function') {
            options.onAfterRender();
        }
    }

    function handlePrev() {
        if (products.length <= 1) return;
        centerIndex = moveCenterLeft(products.length, centerIndex);
        render();
    }

    function handleNext() {
        if (products.length <= 1) return;
        centerIndex = moveCenterRight(products.length, centerIndex);
        render();
    }

    function handleStageClick(event) {
        const card = event.target.closest('[data-shadow-slot]');
        if (!card || card.dataset.shadowSlot === 'center') return;

        if (card.dataset.shadowSlot === 'left') {
            handlePrev();
        } else if (card.dataset.shadowSlot === 'right') {
            handleNext();
        }
    }

    const prevButton = resolveElement(options.prevEl);
    const nextButton = resolveElement(options.nextEl);

    prevButton?.addEventListener('click', handlePrev);
    nextButton?.addEventListener('click', handleNext);
    stageEl.addEventListener('click', handleStageClick);

    const instance = {
        render,
        setProducts(nextProducts = []) {
            products = Array.isArray(nextProducts) ? [...nextProducts] : [];
            centerIndex = 0;
            render();
        },
        destroy() {
            prevButton?.removeEventListener('click', handlePrev);
            nextButton?.removeEventListener('click', handleNext);
            stageEl.removeEventListener('click', handleStageClick);
            stageEl.innerHTML = '';
            carouselInstances.delete(rootEl);
        }
    };

    carouselInstances.set(rootEl, instance);
    render();
    return instance;
}

export function destroyShadowCarousel(rootEl) {
    if (!carouselInstances.has(rootEl)) {
        return;
    }
    carouselInstances.get(rootEl).destroy();
}

export function initFeaturedCarousel(rootEl, options = {}) {
    return initShadowCarousel(rootEl, options);
}

export function destroyFeaturedCarousel(rootEl) {
    destroyShadowCarousel(rootEl);
}