/**
 * Wraps image URLs through backend proxy to bypass CDN hotlink protection (Referer check).
 * HentaiVNX and SayHentai CDNs block direct access without proper Referer headers.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL;

const PROXY_DOMAINS = ['2tcdn', 'sayhentai', 'pubtranxzyzz'];

export function proxyImageUrl(url) {
    if (!url) return url;
    const needsProxy = PROXY_DOMAINS.some(domain => url.includes(domain));
    if (needsProxy) {
        return `${API_BASE}/proxy/image?url=${encodeURIComponent(url)}`;
    }
    return url;
}
