import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia, which some layout code queries.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom lacks IntersectionObserver; navigation and reveal effects must not crash.
if (!('IntersectionObserver' in window)) {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
    root = null;
    rootMargin = '';
    thresholds = [];
  }
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: Observer });
}

window.scrollTo = (() => {}) as unknown as typeof window.scrollTo;
