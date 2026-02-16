import Parser from 'rss-parser';
import type { NewsSource, RawNewsItem } from '../types';

// ArXiv Atom feed structure
interface ArxivItem {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  categories?: string[];
  authors?: { name: string }[];
  'arxiv:primary_category'?: { $: { term: string } };
  'arxiv:journal_ref'?: string;
  'arxiv:doi'?: string;
  links?: any[]; // rss-parser might return array of links
  'arxiv:license'?: string;
}

const parser = new Parser({
  customFields: {
    item: [
      ['arxiv:primary_category', 'primaryCategory'],
      ['arxiv:journal_ref', 'journalRef'],
      ['arxiv:doi', 'doi'],
      ['arxiv:license', 'arxiv:license'],
      ['link', 'links'] // Capture all links to find license
    ]
  }
});

export class ArxivSource implements NewsSource {
  name: string;
  type: 'rss' = 'rss'; // It's technically Atom/RSS
  language: string;
  isActive: boolean;
  url: string; // We'll construct the query URL dynamically but store base here
  categories: string[];

  private baseUrl = 'http://export.arxiv.org/api/query';

  constructor(
    name: string,
    categories: string[],
    options: { language?: string; isActive?: boolean } = {}
  ) {
    this.name = name;
    this.categories = categories;
    this.language = options.language || 'en';
    this.isActive = options.isActive ?? true;
    this.url = this.buildUrl();
  }

  private buildUrl(): string {
    // Construct query for specific categories
    // sortBy=submittedDate ensures we get latest
    // max_results=20 to match fetching batch size roughly
    const catQuery = this.categories.map(c => `cat:${c}`).join('+OR+');
    return `${this.baseUrl}?search_query=${catQuery}&sortBy=submittedDate&sortOrder=descending&max_results=30`;
  }

  async fetch(fetchFn: typeof fetch): Promise<RawNewsItem[]> {
    if (!this.isActive) {
      return [];
    }

    try {
      const response = await fetchFn(this.url, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status}`);
      }

      const xml = await response.text();
      const feed = await parser.parseString(xml);

      // Filter and map items
      const validItems: RawNewsItem[] = [];

      for (const item of feed.items as unknown as ArxivItem[]) {
        // License check
        // ArXiv Atom feed usually puts license in a link with title="license" or rel="license"
        // <link title="license" href="http://creativecommons.org/licenses/by/4.0/" rel="license"/>
        // rss-parser with 'links' custom field should give us an array of link objects
        
        // Note: rss-parser structure for Atom links can be tricky.
        // Usually item.links is used if we map it. 
        // Let's assume item['links'] is an array of { $: { href:..., rel:..., title:... } } 
        // or just objects depending on xml2js parsing mode.
        
        // Debugging locally showed rss-parser on Atom returns link as an array if multiple,
        // or object if single. We mapped 'link' to 'links'.
        
        // License check disabled: ArXiv API often returns items without explicit license metadata
        // and we want to show ArXiv content regardless of explicit CC tag for now.
        /*
        if (!this.isCreativeCommons(item)) {
            continue;
        }
        */

        const authors = item.authors?.map(a => a.name).join(', ') || 'Unknown Authors';
        const primaryCat = item['arxiv:primary_category']?.['$']?.term || this.categories[0];
        
        // Create title with category prefix for clarity
        const title = `[${primaryCat}] ${item.title.replace(/\n/g, ' ').trim()}`;
        
        // Content: Abstract + Authors
        const content = `
          <p><strong>Authors:</strong> ${authors}</p>
          <p><strong>Abstract:</strong> ${item.contentSnippet || item.content}</p>
          <p><a href="${item.link}">Read full paper on ArXiv</a></p>
        `;

        validItems.push({
          title: title,
          link: item.link,
          pubDate: item.pubDate,
          content: content,
          contentSnippet: item.contentSnippet || item.content,
          guid: item.guid,
          source: 'ArXiv AI Research',
          // ArXiv doesn't have images in feed usually
        });
      }

      return validItems;

    } catch (error) {
      console.error(`[ArxivSource] Error fetching ${this.name}:`, error);
      return [];
    }
  }

  private isCreativeCommons(item: any): boolean {
    // Check for CC BY or CC BY-SA links
    // Structure of links in parsed item depends on rss-parser/xml2js
    // Typically: item.links = [ { '$': { title: 'pdf', href: '...', rel: 'related' } }, ... ]
    
    // Fallback: check content/summary for license text if links fail (less reliable)
    
    // We need to robustly check both "link" property (standard RSS/Atom mapped) 
    // and our custom "links" if "link" is just the string URL.
    
    const links = Array.isArray(item.links) ? item.links : [];
    
    // Also check standard item.link if it's an object with attributes (rare in simple parser)

    // Keywords in href
    const allowedLicenses = [
      'creativecommons.org/licenses/by/4.0',
      'creativecommons.org/licenses/by-sa/4.0',
      'creativecommons.org/licenses/by/3.0',
      'creativecommons.org/licenses/by-sa/3.0'
    ];

    for (const linkObj of links) {
        // specific to how xml2js might parse attributes
        const href = linkObj['$']?.href || linkObj.href; 
        if (href && allowedLicenses.some(l => href.includes(l))) {
            return true;
        }
    }
    
    // Explicit arxiv:license tag if available (not standard in all responses but worth checking)
    if (item['arxiv:license']) {
         const license = item['arxiv:license'];
         if (allowedLicenses.some(l => license.includes(l))) return true;
    }

    return false;
  }
}
