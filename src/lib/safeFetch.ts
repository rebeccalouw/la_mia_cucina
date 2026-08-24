import dns from 'dns';
import net from 'net';

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
};

/** A URL the server refuses to fetch. Callers should surface these as a 400, not a 500. */
export class UnsafeUrlError extends Error {}

/**
 * True for addresses that must never be reachable through a user-supplied URL: loopback,
 * private, carrier-grade NAT, link-local (which covers cloud metadata at 169.254.169.254),
 * unique-local and multicast ranges. Unrecognised formats are refused rather than allowed.
 */
function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  if (net.isIPv6(ip)) {
    const addr = ip.toLowerCase();
    if (addr === '::' || addr === '::1') return true;
    if (addr.startsWith('fe80')) return true;
    if (/^f[cd]/.test(addr)) return true;
    const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }

  return true;
}

/** Parses a URL and resolves its host, rejecting anything that points inside the network. */
async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError('That does not look like a valid URL.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http and https addresses can be imported.');
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs containing a username or password cannot be imported.');
  }

  const host = url.hostname.replace(/^\[|\]$/g, '');

  let addresses: { address: string }[];
  if (net.isIP(host)) {
    addresses = [{ address: host }];
  } else {
    try {
      addresses = await dns.promises.lookup(host, { all: true });
    } catch {
      throw new UnsafeUrlError('That address could not be found.');
    }
  }

  // Every resolved address must be public: a host with one public and one private record is
  // still a way in. (The name is resolved again by fetch itself, so a hostile DNS server could
  // in principle answer differently the second time; pinning the address would require a
  // custom agent, which is more than this import feature warrants.)
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new UnsafeUrlError('That address points inside a private network, so it cannot be imported.');
    }
  }

  return url;
}

/** Reads a response body as text, refusing anything over MAX_BYTES. */
async function readCapped(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length'));
  if (declared && declared > MAX_BYTES) {
    throw new UnsafeUrlError('That page is too large to import.');
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new UnsafeUrlError('That page is too large to import.');
    }
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

/**
 * Fetches a user-supplied page for scraping. Redirects are followed by hand so that every hop
 * is validated — a public host redirecting to 169.254.169.254 is the usual way past a check
 * that only looks at the original URL.
 */
export async function safeFetchHtml(raw: string): Promise<{ html: string; finalUrl: string }> {
  let target = raw;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(target);

    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new UnsafeUrlError('That page redirected without saying where to.');
      }
      target = new URL(location, url).toString();
      continue;
    }

    if (!response.ok) {
      const error: any = new Error(`Failed to fetch URL: ${response.statusText}`);
      error.status = response.status;
      throw error;
    }

    return { html: await readCapped(response), finalUrl: url.toString() };
  }

  throw new UnsafeUrlError('That page redirected too many times.');
}
