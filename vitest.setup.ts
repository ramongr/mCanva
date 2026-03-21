import 'vitest-canvas-mock'
import '@testing-library/jest-dom'

// jsdom does not implement ResizeObserver — provide a no-op polyfill
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverStub
