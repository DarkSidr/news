import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArxivSource } from './arxiv-source';

describe('ArxivSource', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  it('should construct correct URL with categories', () => {
    const source = new ArxivSource('AI Research', ['cs.AI', 'cs.LG']);
    expect(source.url).toContain('search_query=cat:cs.AI+OR+cat:cs.LG');
    expect(source.url).toContain('sortBy=submittedDate');
  });

  it('should return empty array if inactive', async () => {
    const source = new ArxivSource('Test', ['cs.AI'], { isActive: false });
    const results = await source.fetch(fetchMock);
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should fetch and transform items', async () => {
    const mockXml = `
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Allowed Paper</title>
          <link href="http://arxiv.org/abs/1234.5678"/>
          <link title="pdf" href="http://arxiv.org/pdf/1234.5678" rel="related"/>
          <arxiv:license>http://creativecommons.org/licenses/by/4.0/</arxiv:license>
          <summary>This is allowed.</summary>
          <published>2023-01-01T00:00:00Z</published>
        </entry>
        <entry>
          <title>Restricted Paper</title>
          <link href="http://arxiv.org/abs/9999.9999"/>
          <link title="pdf" href="http://arxiv.org/pdf/9999.9999" rel="related"/>
          <summary>This is restricted.</summary>
          <published>2023-01-01T00:00:00Z</published>
        </entry>
      </feed>
    `;

    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => mockXml
    });

    const source = new ArxivSource('Test', ['cs.AI']);
    const results = await source.fetch(fetchMock);

    expect(results).toHaveLength(2);
    expect(results[0].title).toContain('Allowed Paper');
    expect(results[0].source).toBe('Test');
  });

  it('should handle API errors', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500
    });

    const source = new ArxivSource('Test', ['cs.AI']);
    await expect(source.fetch(fetchMock)).rejects.toThrow('ArXiv API error: 500');
  });
});
