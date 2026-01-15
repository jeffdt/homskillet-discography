import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('RequestCache', () => {
  let requestCache: any;
  let mockXHRInstance: any;
  let originalXMLHttpRequest: any;

  beforeEach(async () => {
    // Save original XMLHttpRequest
    originalXMLHttpRequest = global.XMLHttpRequest;

    // Create mock XHR instance
    mockXHRInstance = {
      status: 200,
      response: { test: 'data' },
      responseType: '',
      open: vi.fn(),
      send: vi.fn(),
      abort: vi.fn(),
    };

    // Mock XMLHttpRequest constructor
    global.XMLHttpRequest = vi.fn(() => mockXHRInstance) as any;

    // Clear module cache and reimport to get fresh instance
    vi.resetModules();

    // Mock promisify-xhr
    vi.doMock('../promisify-xhr', () => ({
      default: (xhr: any) => {
        const sendFn = xhr.send;
        xhr.send = () => {
          return new Promise((resolve, reject) => {
            if (sendFn) sendFn.call(xhr);
            setTimeout(() => {
              if (xhr.status >= 200 && xhr.status < 400) {
                resolve(xhr);
              } else {
                reject(new Error(`HTTP ${xhr.status}`));
              }
            }, 0);
          });
        };
        return xhr;
      },
    }));

    // Import RequestCache after mocking
    const module = await import('../RequestCache');
    requestCache = module.default;

    // Reset cache state
    // @ts-ignore - accessing private property for testing
    requestCache.data = {};
    // @ts-ignore
    requestCache.request = null;
  });

  afterEach(() => {
    // Restore original XMLHttpRequest
    global.XMLHttpRequest = originalXMLHttpRequest;
    vi.restoreAllMocks();
  });

  it('should fetch and cache data on first request', async () => {
    const url = '/test/url';
    const testData = { message: 'test data' };
    mockXHRInstance.response = testData;

    const result = await requestCache.fetchCached(url);

    expect(mockXHRInstance.open).toHaveBeenCalledWith('GET', url);
    // send is wrapped by promisify, so we just verify the result
    expect(result).toEqual(testData);
  });

  it('should return cached data on subsequent requests', async () => {
    const url = '/test/url';
    const testData = { message: 'test data' };
    mockXHRInstance.response = testData;

    // First request
    await requestCache.fetchCached(url);

    // Reset mock to verify it's not called again
    vi.clearAllMocks();

    // Second request
    const result = await requestCache.fetchCached(url);

    // XHR should not be called for cached data
    expect(global.XMLHttpRequest).not.toHaveBeenCalled();
    expect(result).toEqual(testData);
  });

  it('should abort previous request when new request comes in', async () => {
    const url1 = '/test/url1';
    const url2 = '/test/url2';

    // Start first request (don't await)
    const promise1 = requestCache.fetchCached(url1);

    // Start second request immediately
    const promise2 = requestCache.fetchCached(url2);

    // Abort should have been called on the first request
    expect(mockXHRInstance.abort).toHaveBeenCalled();

    // Wait for second request to complete
    await promise2;
  });

  it('should throw error on HTTP error status', async () => {
    const url = '/test/url';
    mockXHRInstance.status = 404;

    await expect(requestCache.fetchCached(url)).rejects.toThrow('HTTP 404');
  });

  it('should throw error on 500 status', async () => {
    const url = '/test/url';
    mockXHRInstance.status = 500;

    await expect(requestCache.fetchCached(url)).rejects.toThrow('HTTP 500');
  });

  it('should cache different URLs separately', async () => {
    const url1 = '/test/url1';
    const url2 = '/test/url2';
    const data1 = { message: 'data 1' };
    const data2 = { message: 'data 2' };

    // First request
    mockXHRInstance.response = data1;
    const result1 = await requestCache.fetchCached(url1);

    // Second request with different URL
    mockXHRInstance.response = data2;
    const result2 = await requestCache.fetchCached(url2);

    expect(result1).toEqual(data1);
    expect(result2).toEqual(data2);

    // Verify both are cached
    vi.clearAllMocks();
    const cachedResult1 = await requestCache.fetchCached(url1);
    const cachedResult2 = await requestCache.fetchCached(url2);

    expect(global.XMLHttpRequest).not.toHaveBeenCalled();
    expect(cachedResult1).toEqual(data1);
    expect(cachedResult2).toEqual(data2);
  });

  it('should set responseType to json', async () => {
    const url = '/test/url';
    await requestCache.fetchCached(url);

    expect(mockXHRInstance.responseType).toBe('json');
  });
});
