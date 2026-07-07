import { IMAGE_UPLOAD_LIMITS, validateImageFile } from '../utils/image-compress.js';

/**
 * Reusable vendor image picker helpers for preview + validation.
 * Used by vendor-upload.html and registered-vendors.html.
 */

export function createImagePickerState() {
    return {
        selectedFiles: [],
        existingImages: []
    };
}

export function totalSelectedImages(state) {
    return state.existingImages.length + state.selectedFiles.length;
}

export function canAddMoreImages(state) {
    return totalSelectedImages(state) < IMAGE_UPLOAD_LIMITS.maxImages;
}

export function addFilesToPicker(state, incomingFiles = []) {
    const accepted = [];
    const errors = [];

    for (const file of incomingFiles) {
        if (!canAddMoreImages({ ...state, selectedFiles: [...state.selectedFiles, ...accepted] })) {
            errors.push('Only 5 photos are allowed per jewellery item.');
            break;
        }

        try {
            validateImageFile(file);
            accepted.push(file);
        } catch (error) {
            errors.push(error.message);
        }
    }

    state.selectedFiles = [...state.selectedFiles, ...accepted].slice(0, IMAGE_UPLOAD_LIMITS.maxImages);
    return { acceptedCount: accepted.length, errors };
}

export function removeSelectedFile(state, index) {
    state.selectedFiles = state.selectedFiles.filter((_, itemIndex) => itemIndex !== index);
}

export function removeExistingImage(state, index) {
    state.existingImages = state.existingImages.filter((_, itemIndex) => itemIndex !== index);
}

export function resetImagePicker(state) {
    state.selectedFiles = [];
    state.existingImages = [];
}

export function getTriggerLabel(state) {
    const total = totalSelectedImages(state);
    if (!total) {
        return '📷 Choose up to 5 photos';
    }
    if (total >= IMAGE_UPLOAD_LIMITS.maxImages) {
        return 'Maximum 5 photos selected';
    }
    return `📷 Add more photos (${total}/5)`;
}

export { IMAGE_UPLOAD_LIMITS };