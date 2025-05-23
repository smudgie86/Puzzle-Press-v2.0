// js/utils.js

/**
 * Generates a simple universally unique identifier (UUID v4).
 * @returns {string} A UUID string.
 */
function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} arr - The array to shuffle.
 * @returns {Array} The shuffled array.
 */
const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/**
 * Gets a random integer between min (inclusive) and max (inclusive).
 * Used by number_search_generator and potentially others.
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Cleans a string to be used as a word in a grid (uppercase, remove non-alpha).
 * @param {string} str
 * @returns {string}
 */
function sanitizeForGrid(str) {
    if (typeof str !== 'string') return '';
    return str.toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Converts inches to points for PDF calculations.
 * @param {number} inches
 * @returns {number} points
 */
function inchesToPoints(inches) {
    return inches * 72;
}

/**
 * Converts points to inches for PDF calculations.
 * @param {number} points
 * @returns {number} inches
 */
function pointsToInches(points) {
    return points / 72;
}


/**
 * A simple debounce function.
 * @param {Function} func The function to debounce.
 * @param {number} delay The delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * A simple throttle function.
 * @param {Function} func The function to throttle.
 * @param {number} limit The time limit in milliseconds.
 * @returns {Function} The throttled function.
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

console.log("utils.js loaded");