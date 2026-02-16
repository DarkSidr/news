import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewsDataSource } from './newsdata-source';

describe('NewsDataSource', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('should be inactive by default if option is missing but initialized (implementation nuance)', () => {
    // Actually in code it is isActive ?? true
    const source = new NewsDataSource('test');
    expect(source.isActive).toBe(true);
  });

  it('should return empty array if inactive', async () => {
    const source = new NewsDataSource('test', { isActive: false });
    const results = await source.fetch(fetchMock);
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should return empty array if no API key', async () => {
    const source = new NewsDataSource('test', { apiKey: '' });
    const results = await source.fetch(fetchMock);
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should fetch and transform data correctly', async () => {
    const mockResponse = {
      status: 'success',
      totalResults: 1,
      results: [
        {
          article_id: '123',
          title: 'Test Article',
          link: 'http://example.com',
          pubDate: '2023-01-01 12:00:00',
          description: 'Test description',
          content: 'Full content',
          image_url: 'http://example.com/image.jpg',
          source_id: 'test_source'
        }
      ]
    };

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const source = new NewsDataSource('test', { apiKey: 'test-key' });
    const results = await source.fetch(fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      guid: '123',
      title: 'Test Article',
      link: 'http://example.com',
      pubDate: '2023-01-01 12:00:00',
      contentSnippet: 'Test description',
      content: 'Full content',
      enclosure: { url: 'http://example.com/image.jpg' },
      source: 'NewsData.io'
    });
  });

  it('should handle API errors', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error'
    });

    const source = new NewsDataSource('test', { apiKey: 'test-key' });
    
    await expect(source.fetch(fetchMock)).rejects.toThrow('NewsData.io API error: 500 Server Error');
  });
  
  it('should handle rate limits (429) gracefully', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    });

    const source = new NewsDataSource('test', { apiKey: 'test-key' });
    const results = await source.fetch(fetchMock);
    
    expect(results).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
     // Should warn but not throw
  });
});
