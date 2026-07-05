export function formatProductPrice(price) {
    const amount = Number(price);
    if (!amount) {
        return 'Price on request';
    }
    return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatCartPrice(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}