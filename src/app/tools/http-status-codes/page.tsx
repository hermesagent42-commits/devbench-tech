'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Search, Copy, Check, AlertTriangle, CheckCircle, Info, ArrowRight, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

// ── HTTP Status Code Database ──────────────────────────────────────────────

interface StatusCode {
  code: number;
  name: string;
  description: string;
  summary: string;
  mdn?: string; // MDN URL slug
}

interface Category {
  title: string;
  range: string;
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  codes: StatusCode[];
}

const rawCodes: StatusCode[] = [
  // 1xx Informational
  { code: 100, name: 'Continue', summary: 'Everything OK so far, continue the request.', description: 'The initial part of the request has been received and the client should continue with the request or ignore the response if the request is already finished.' },
  { code: 101, name: 'Switching Protocols', summary: 'Server is changing protocols per client request.', description: 'The server understands and is willing to comply with the client\'s request to switch protocols via the Upgrade header.' },
  { code: 102, name: 'Processing', summary: 'Server is processing the request but no response yet.', description: 'Used by WebDAV. The server has received and is processing the request, but no response is available yet. Prevents the client from timing out.' },
  { code: 103, name: 'Early Hints', summary: 'Send some response headers before the full response.', description: 'Used to return some response headers before the final HTTP message. Typically used with the Link header to start preloading resources while the server prepares the full response.' },

  // 2xx Success
  { code: 200, name: 'OK', summary: 'Request succeeded. GET: resource returned. POST: action performed.', description: 'The most common success response. The meaning depends on the HTTP method: GET — resource fetched and returned; POST — action performed, result may be in body; PUT/PATCH — resource updated; DELETE — resource deleted.' },
  { code: 201, name: 'Created', summary: 'New resource created successfully (often after POST/PUT).', description: 'The request succeeded and a new resource was created. The response typically includes a Location header pointing to the new resource\'s URL.' },
  { code: 202, name: 'Accepted', summary: 'Request accepted for processing, but not yet complete.', description: 'The request has been accepted for processing, but the processing has not been completed. Used for async operations like batch processing.' },
  { code: 203, name: 'Non-Authoritative Information', summary: 'Response modified by a transforming proxy.', description: 'The returned metadata is not exactly the same as from the origin server, but collected from a local or third-party copy. Often used by caching proxies.' },
  { code: 204, name: 'No Content', summary: 'Success, but no body in the response.', description: 'The request succeeded, but there is no content to send back. The client should not change its view. Common for DELETE requests or save operations where the page stays the same.' },
  { code: 205, name: 'Reset Content', summary: 'Success; client should reset the document view.', description: 'Like 204, but also tells the client to reset the document view. Used after form submissions to clear the form.' },
  { code: 206, name: 'Partial Content', summary: 'Only part of the resource is returned (range requests).', description: 'The server is delivering only part of the resource due to a Range header sent by the client. Used for resumable downloads and streaming.' },
  { code: 207, name: 'Multi-Status', summary: 'Multiple independent status codes (WebDAV).', description: 'Used by WebDAV. The message body contains XML with multiple independent status codes for different sub-requests.' },

  // 3xx Redirection
  { code: 300, name: 'Multiple Choices', summary: 'Multiple representations available; pick one.', description: 'The request has more than one possible response. The client should choose one. Rarely used; Content Negotiation is preferred.' },
  { code: 301, name: 'Moved Permanently', summary: 'Resource has permanently moved to a new URL.', description: 'The requested resource has been permanently moved to a new URL. Search engines update their index to the new URL. Browsers cache this redirect.' },
  { code: 302, name: 'Found', summary: 'Resource temporarily at a different URL (don\'t change bookmarks).', description: 'The resource is temporarily located at a different URL. Unlike 301, search engines should not update their index. Often misused where 303 or 307 would be more appropriate.' },
  { code: 303, name: 'See Other', summary: 'Use GET on another URL to fetch the response.', description: 'The server sends this response to direct the client to get the requested resource at another URI with a GET request. Ideal for redirecting after a POST to prevent form resubmission.' },
  { code: 304, name: 'Not Modified', summary: 'Resource hasn\'t changed; use cached version.', description: 'Used for caching purposes. The response has not been modified since the version specified by request headers. No body is returned; the client should use its cached copy.' },
  { code: 307, name: 'Temporary Redirect', summary: 'Temporary redirect; preserve the HTTP method.', description: 'Like 302, but the HTTP method must not change when re-sending the request. If the first request was POST, the second must also be POST.' },
  { code: 308, name: 'Permanent Redirect', summary: 'Permanent redirect; preserve the HTTP method.', description: 'Like 301, but the HTTP method must not change when re-sending the request. If the first request was POST, the second must also be POST.' },

  // 4xx Client Errors
  { code: 400, name: 'Bad Request', summary: 'Server can\'t process the request (malformed syntax).', description: 'The server cannot or will not process the request due to something perceived to be a client error — malformed request syntax, invalid message framing, or deceptive request routing.' },
  { code: 401, name: 'Unauthorized', summary: 'Authentication is required (not logged in).', description: 'The client must authenticate itself to get the requested response. Despite the name, "unauthorized" actually means "unauthenticated." The response must include a WWW-Authenticate header.' },
  { code: 402, name: 'Payment Required', summary: 'Reserved for future use; digital payment systems.', description: 'Reserved for future use. Originally intended for digital payment systems. Rarely used, but sometimes seen in APIs requiring payment like Stripe.' },
  { code: 403, name: 'Forbidden', summary: 'Client is authenticated but doesn\'t have permission.', description: 'The server understood the request but refuses to authorize it. Unlike 401, re-authenticating won\'t help. Common for insufficient permissions or IP blocks.' },
  { code: 404, name: 'Not Found', summary: 'Server can\'t find the requested resource.', description: 'The server cannot find the requested resource. This is the most common client error. The resource may be available in the future but is not currently.' },
  { code: 405, name: 'Method Not Allowed', summary: 'HTTP method not allowed on this resource.', description: 'The request method is known by the server but is not supported by the target resource. The response must include an Allow header with valid methods.' },
  { code: 406, name: 'Not Acceptable', summary: 'Cannot produce a response matching Accept headers.', description: 'The server cannot produce a response matching the criteria given by the client\'s Accept headers (content negotiation failure).' },
  { code: 407, name: 'Proxy Authentication Required', summary: 'Must authenticate with a proxy first.', description: 'Similar to 401, but authentication is needed to use a proxy. The proxy must return a Proxy-Authenticate header.' },
  { code: 408, name: 'Request Timeout', summary: 'Server timed out waiting for the request.', description: 'The server timed out waiting for the client to send the full request. The client may repeat the request without modifications at any later time.' },
  { code: 409, name: 'Conflict', summary: 'Request conflicts with current server state.', description: 'The request conflicts with the current state of the server. Common with PUT requests when there\'s a version conflict. The response should include info to resolve it.' },
  { code: 410, name: 'Gone', summary: 'Resource was here but is permanently removed.', description: 'Like 404, but the resource was intentionally removed and will not be available again. Search engines should remove this from their index.' },
  { code: 411, name: 'Length Required', summary: 'Content-Length header is required.', description: 'The server refuses to accept the request without a defined Content-Length header.' },
  { code: 412, name: 'Precondition Failed', summary: 'Condition in request headers not met.', description: 'One or more conditions given in the request header fields evaluated to false on the server. Used with conditional requests (If-Match, If-None-Match, etc.).' },
  { code: 413, name: 'Payload Too Large', summary: 'Request body is larger than server allows.', description: 'The request entity is larger than limits defined by the server. The server may close the connection or return a Retry-After header.' },
  { code: 414, name: 'URI Too Long', summary: 'Request URL is too long for the server.', description: 'The URI provided was too long for the server to process. Often caused by encoding too much data as query parameters in a GET request.' },
  { code: 415, name: 'Unsupported Media Type', summary: 'Server doesn\'t support the requested media format.', description: 'The media format of the requested data is not supported by the server, so the server is rejecting the request. Check the Content-Type header.' },
  { code: 416, name: 'Range Not Satisfiable', summary: 'Range specified is outside the resource bounds.', description: 'The range specified by the Range header field in the request cannot be fulfilled. The byte range may be outside the size of the target resource.' },
  { code: 417, name: 'Expectation Failed', summary: 'Server can\'t meet Expect header requirements.', description: 'The server cannot meet the requirements of the Expect request header field.' },
  { code: 418, name: 'I\'m a Teapot', summary: 'Server refuses to brew coffee with a teapot. ☕', description: 'An April Fools\' joke from RFC 2324 (HTCPCP). The server refuses to brew coffee because it is, permanently, a teapot. A beloved easter egg in the HTTP world.' },
  { code: 421, name: 'Misdirected Request', summary: 'Request sent to wrong server for this resource.', description: 'The request was directed at a server that is not able to produce a response. Used when HTTP/2 connection reuse sends the request to the wrong server.' },
  { code: 422, name: 'Unprocessable Entity', summary: 'Semantic errors in the request (validation failure).', description: 'Used by WebDAV and REST APIs. The server understands the content type and syntax, but was unable to process the contained instructions. Common for validation errors.' },
  { code: 423, name: 'Locked', summary: 'Resource is locked (WebDAV).', description: 'The resource being accessed is locked. Used by WebDAV for resources under exclusive locks.' },
  { code: 424, name: 'Failed Dependency', summary: 'Request failed due to failure of a previous request.', description: 'Used by WebDAV. The request failed because a previous request that it depended on failed.' },
  { code: 425, name: 'Too Early', summary: 'Server won\'t process a possibly replayed request.', description: 'The server is unwilling to risk processing a request that might be replayed. Used with 0-RTT in TLS 1.3 to prevent replay attacks.' },
  { code: 426, name: 'Upgrade Required', summary: 'Client must switch to a different protocol.', description: 'The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol.' },
  { code: 428, name: 'Precondition Required', summary: 'Server requires conditional requests.', description: 'The origin server requires the request to be conditional. Prevents the "lost update" problem where a client GETs a resource, modifies it, and PUTs it back while another party has modified it.' },
  { code: 429, name: 'Too Many Requests', summary: 'Client has sent too many requests. Rate limited!', description: 'The user has sent too many requests in a given amount of time. Intended for rate-limiting schemes. The response should include a Retry-After header.' },
  { code: 431, name: 'Request Header Fields Too Large', summary: 'Headers exceed server limit.', description: 'The server is unwilling to process the request because its header fields are too large. Used when the total header size or individual header size exceeds limits.' },
  { code: 451, name: 'Unavailable For Legal Reasons', summary: 'Access denied due to legal reasons (censorship).', description: 'The server is denying access to the resource as a consequence of a legal demand. Named after Ray Bradbury\'s Fahrenheit 451. Used for censorship, DMCA takedowns, and court orders.' },

  // 5xx Server Errors
  { code: 500, name: 'Internal Server Error', summary: 'Generic server error — something broke.', description: 'The server encountered an unexpected condition that prevented it from fulfilling the request. The catch-all server error. Check server logs for details.' },
  { code: 501, name: 'Not Implemented', summary: 'Server doesn\'t support the functionality.', description: 'The server does not support the functionality required to fulfill the request. Also used when the HTTP method is not recognized.' },
  { code: 502, name: 'Bad Gateway', summary: 'Upstream server returned an invalid response.', description: 'The server, acting as a gateway or proxy, received an invalid response from an upstream server. Common with nginx reverse proxies when the backend is down.' },
  { code: 503, name: 'Service Unavailable', summary: 'Server is temporarily unavailable (overloaded).', description: 'The server is not ready to handle the request. Common causes: server is down for maintenance, overloaded, or being restarted. Usually temporary.' },
  { code: 504, name: 'Gateway Timeout', summary: 'Upstream server didn\'t respond in time.', description: 'The server, acting as a gateway or proxy, did not receive a timely response from the upstream server. The upstream server may be slow, stuck, or unreachable.' },
  { code: 505, name: 'HTTP Version Not Supported', summary: 'Server doesn\'t support the HTTP version.', description: 'The server does not support the HTTP protocol version used in the request. The response should indicate which versions are supported.' },
  { code: 506, name: 'Variant Also Negotiates', summary: 'Server has an internal configuration error.', description: 'Transparent content negotiation for the request results in a circular reference. A configuration error on the server.' },
  { code: 507, name: 'Insufficient Storage', summary: 'Server can\'t store the representation (WebDAV).', description: 'Used by WebDAV. The server is unable to store the representation needed to complete the request. The server is out of disk space.' },
  { code: 508, name: 'Loop Detected', summary: 'Infinite loop detected while processing (WebDAV).', description: 'Used by WebDAV. The server terminated an operation because it encountered an infinite loop while processing a request.' },
  { code: 510, name: 'Not Extended', summary: 'Further extensions to the request are required.', description: 'The policy for accessing the resource has not been met in the request. The server must send back all the info necessary for the client to issue an extended request.' },
  { code: 511, name: 'Network Authentication Required', summary: 'Must authenticate with network (captive portal).', description: 'The client needs to authenticate to gain network access. Designed for use by intercepting proxies that control access to the network (captive portals, WiFi login pages).' },
];

// ── Build categories ────────────────────────────────────────────────────────

const categories: Category[] = [
  {
    title: '1xx Informational',
    range: '100–103',
    icon: Info,
    color: 'blue',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    codes: rawCodes.filter((c) => c.code >= 100 && c.code < 200),
  },
  {
    title: '2xx Success',
    range: '200–207',
    icon: CheckCircle,
    color: 'green',
    bgColor: 'bg-green-950/30',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    codes: rawCodes.filter((c) => c.code >= 200 && c.code < 300),
  },
  {
    title: '3xx Redirection',
    range: '300–308',
    icon: ArrowRight,
    color: 'cyan',
    bgColor: 'bg-cyan-950/30',
    borderColor: 'border-cyan-500/30',
    textColor: 'text-cyan-400',
    codes: rawCodes.filter((c) => c.code >= 300 && c.code < 400),
  },
  {
    title: '4xx Client Errors',
    range: '400–451',
    icon: AlertTriangle,
    color: 'orange',
    bgColor: 'bg-amber-950/30',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-400',
    codes: rawCodes.filter((c) => c.code >= 400 && c.code < 500),
  },
  {
    title: '5xx Server Errors',
    range: '500–511',
    icon: AlertTriangle,
    color: 'red',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-400',
    codes: rawCodes.filter((c) => c.code >= 500 && c.code < 600),
  },
];

// ── Color helpers for code badges ──────────────────────────────────────────

function getCodeBadgeStyle(code: number): string {
  if (code < 200) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (code < 300) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (code < 400) return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  if (code < 500) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-red-500/20 text-red-400 border-red-500/30';
}

// ── Main component ─────────────────────────────────────────────────────────

export default function HttpStatusCodesPage() {
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [expandedCode, setExpandedCode] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Filter codes
  const filteredCategories = useMemo(() => {
    if (!search.trim() && activeCategory === 'all') return categories;

    return categories
      .map((cat) => {
        let filtered = cat.codes;
        if (search.trim()) {
          const q = search.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.code.toString().includes(q) ||
              c.name.toLowerCase().includes(q) ||
              c.summary.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q),
          );
        }
        return { ...cat, codes: filtered };
      })
      .filter((cat) => cat.codes.length > 0);
  }, [search, activeCategory]);

  const handleCopy = useCallback(async (code: StatusCode) => {
    const text = `${code.code} ${code.name}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(code.code);
      toast.success(`${code.code} ${code.name} copied!`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  // Category filter buttons
  const categoryFilters = [
    { key: 'all', label: 'All Codes', color: 'text-slate-300' },
    { key: '1xx', label: '1xx Info', color: 'text-blue-400' },
    { key: '2xx', label: '2xx Success', color: 'text-green-400' },
    { key: '3xx', label: '3xx Redirect', color: 'text-cyan-400' },
    { key: '4xx', label: '4xx Client Error', color: 'text-amber-400' },
    { key: '5xx', label: '5xx Server Error', color: 'text-red-400' },
  ];

  return (
    <ToolLayout
      title="HTTP Status Codes"
      description="Complete reference for every HTTP status code. Search by code number, name, or description. Category filters, copy-to-clipboard, and detailed explanations."
    >
      {/* Search + Filter Bar */}
      <div className="card mb-6">
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code (404), name (Not Found), or keyword..."
              className="input-field pl-10 font-mono text-sm w-full"
              spellCheck={false}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setActiveCategory(f.key);
                  setSearch('');
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === f.key
                    ? `${f.color} border-current/30 bg-surface-lighter`
                    : 'text-slate-500 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results summary */}
      {search && (
        <p className="text-sm text-slate-400 mb-4">
          Found {filteredCategories.reduce((sum, cat) => sum + cat.codes.length, 0)} matching status code(s)
        </p>
      )}

      {/* Categories */}
      <div className="space-y-8">
        {filteredCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <section key={cat.title}>
              {/* Category header */}
              <div className={`${cat.bgColor} border ${cat.borderColor} rounded-xl px-5 py-3 mb-4`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${cat.textColor}`} />
                  <h2 className="text-white font-semibold text-lg">{cat.title}</h2>
                  <span className={`text-xs font-mono ${cat.textColor} bg-slate-900/50 px-2 py-0.5 rounded`}>
                    {cat.range}
                  </span>
                  <span className="text-xs text-slate-500 ml-auto">
                    {cat.codes.length} codes
                  </span>
                </div>
              </div>

              {/* Code cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cat.codes.map((code) => {
                  const isExpanded = expandedCode === code.code;
                  const isCopied = copiedCode === code.code;
                  return (
                    <div
                      key={code.code}
                      className={`card group cursor-pointer transition-all duration-200 ${
                        isExpanded ? 'ring-1 ring-brand-500/30' : ''
                      } hover:border-slate-600/50`}
                      onClick={() => setExpandedCode(isExpanded ? null : code.code)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Number badge */}
                        <span
                          className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg border font-mono font-bold text-sm shrink-0 min-w-[4rem] ${getCodeBadgeStyle(code.code)}`}
                        >
                          {code.code}
                        </span>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-white font-semibold text-sm">
                              {code.name}
                            </h3>
                            {code.code === 418 && (
                              <span role="img" aria-label="teapot">🫖</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                            {code.summary}
                          </p>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                              <p className="text-slate-300 text-sm leading-relaxed">
                                {code.description}
                              </p>
                              <div className="flex items-center gap-3 mt-3">
                                <a
                                  href={`https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/${code.code}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                                >
                                  <Globe className="w-3 h-3" />
                                  MDN Docs
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Copy button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(code);
                          }}
                          className={`shrink-0 p-2 rounded-lg transition-all ${
                            isCopied
                              ? 'bg-green-500/20 text-green-400'
                              : 'text-slate-600 group-hover:text-slate-400 hover:text-white hover:bg-surface-lighter'
                          }`}
                          title="Copy to clipboard"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* No results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No status codes found</h3>
            <p className="text-slate-500 text-sm">
              Try searching for a different term or clear the filter.
            </p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('all'); }}
              className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-12 pt-6 border-t border-slate-700/50">
        <p className="text-xs text-slate-500 text-center">
          All status code definitions are based on the{' '}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-400 hover:text-brand-300 transition-colors"
          >
            MDN HTTP Status Code Reference
          </a>
          . Click any code for detailed explanations and MDN links.
        </p>
      </div>
    </ToolLayout>
  );
}
