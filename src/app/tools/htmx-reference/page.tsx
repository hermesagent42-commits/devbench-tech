'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Search, Copy, ExternalLink, Code, Zap, Layout, Repeat, Link2, MousePointer2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

// ── HTMX Attribute Database ─────────────────────────────────────────────────

interface HtmxAttr {
  attr: string;
  name: string;
  summary: string;
  description: string;
  values: string;
  defaults: string;
}

interface Category {
  title: string;
  icon: typeof Code;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  attrs: HtmxAttr[];
}

const rawAttrs: HtmxAttr[] = [
  // Core Request Attributes
  { attr: 'hx-get', name: 'GET Request', summary: 'Issues a GET request to the specified URL.', description: 'The most common HTMX attribute. Clicking the element fires an HTTP GET request to the given URL. The response HTML is swapped into the target element. Ideal for loading content, navigation, and search-as-you-type.', values: 'URL or path', defaults: '' },
  { attr: 'hx-post', name: 'POST Request', summary: 'Issues a POST request to the specified URL.', description: 'Fires an HTTP POST request when triggered. Commonly used for form submissions, creating resources, and any operation that modifies server state. Form values within the element are automatically serialized and included in the request body.', values: 'URL or path', defaults: '' },
  { attr: 'hx-put', name: 'PUT Request', summary: 'Issues a PUT request to the specified URL.', description: 'Fires an HTTP PUT request, typically for full resource updates. Like hx-post, form values are included as JSON in the request body.', values: 'URL or path', defaults: '' },
  { attr: 'hx-patch', name: 'PATCH Request', summary: 'Issues a PATCH request to the specified URL.', description: 'Fires an HTTP PATCH request for partial resource updates. Only changed fields need to be sent.', values: 'URL or path', defaults: '' },
  { attr: 'hx-delete', name: 'DELETE Request', summary: 'Issues a DELETE request to the specified URL.', description: 'Fires an HTTP DELETE request. Typically used to delete resources. Often combined with hx-confirm for safety.', values: 'URL or path', defaults: '' },

  // Target & Swap Attributes
  { attr: 'hx-target', name: 'Target Element', summary: 'Specifies which element will be updated with the response.', description: 'A CSS selector that specifies the target element for the swap. The response HTML replaces the content of this element. Common values: #id, .class, or relative CSS selectors like next, closest, find combined with CSS. Supports extended selectors: next <css>, previous <css>, closest <css>, find <css>.', values: 'CSS selector or extended selector', defaults: 'the element itself' },
  { attr: 'hx-swap', name: 'Swap Strategy', summary: 'Controls how the response content is swapped into the DOM.', description: 'Defines how the response will be swapped relative to the target. Options: innerHTML (replace contents), outerHTML (replace entire element), afterbegin, beforebegin, beforeend, afterend, delete, none. Can include modifiers like swap:100ms for CSS transition timing, settle:500ms for settling period, show:top, scroll:bottom, focus-scroll:true for accessibility.', values: 'innerHTML | outerHTML | beforebegin | afterbegin | beforeend | afterend | delete | none', defaults: 'innerHTML' },
  { attr: 'hx-swap-oob', name: 'Out-of-Band Swap', summary: 'Allows response elements to target elements outside the current target.', description: 'Marks elements in the response HTML to be swapped out-of-band — directly into any element matching a CSS selector, regardless of the current hx-target. Add hx-swap-oob="true" to an element in the response HTML to swap it into its id. Add a CSS selector value to target a specific element: hx-swap-oob="innerHTML:#sidebar". Multiple OOB elements supported per response. Use case: update a sidebar or notification bar alongside the main content in one request.', values: 'true | CSS selector or swap:selector', defaults: '' },
  { attr: 'hx-select', name: 'Select Content', summary: 'Selects a subset of the response to be swapped.', description: 'A CSS selector that filters the response HTML — only the matching element(s) from the response are used for swapping. The rest is discarded. Useful when the server returns a full HTML page but you only need a specific section.', values: 'CSS selector', defaults: 'full response' },
  { attr: 'hx-select-oob', name: 'Select OOB', summary: 'Selects elements from the response for out-of-band swaps.', description: 'A CSS selector or comma-separated list of selectors. Matching elements in the response will be treated as out-of-band swaps and placed into the DOM by their id, regardless of the current swap target.', values: 'CSS selector(s)', defaults: '' },

  // Trigger & Events
  { attr: 'hx-trigger', name: 'Trigger', summary: 'Specifies what event triggers the request.', description: 'The most powerful HTMX attribute. Default triggers: input/textarea/select = change, form = submit, everything else = click. Modifiers: once (only trigger once), changed (only if value changed), delay:500ms (debounce), throttle:1s (rate limit), from:<selector> (listen on another element), target:<selector> (filter by target), consume (stop propagation), queue:first/last/all/none. Multiple triggers can be comma-separated. Custom events: hx-trigger="my-event". Polling: hx-trigger="every 2s". Load: hx-trigger="load". Revealed: hx-trigger="revealed" (intersection observer).', values: 'event name with optional modifiers', defaults: 'click (or change/input on form elements)' },
  { attr: 'hx-on', name: 'Inline Event Handler', summary: 'Handle any HTMX event inline with scripting expressions.', description: 'Allows you to respond to HTMX events directly on the element. Each event is prefixed with the event name followed by a colon: hx-on:htmx:after-request="console.log(\'done\')" or hx-on:click="alert(\'clicked\')". Supports multiple events. The event, this, and element variables are available in scope. Use case: fire-and-forget actions, analytics tracking, client-side side effects without writing separate JS.', values: 'event:expression pairs', defaults: '' },

  // Request Configuration
  { attr: 'hx-params', name: 'Request Parameters', summary: 'Controls which parameters are included with the request.', description: 'Filters which parameters are submitted. Options: * (all), none, not <param-list>, or a comma-separated list of specific parameter names. Also accepts an asterisk wildcard: hx-params="user_*" includes all params starting with user_.', values: '* | none | not ... | comma-separated names | wildcard', defaults: '*' },
  { attr: 'hx-vals', name: 'Additional Values', summary: 'Adds extra values to request parameters in JSON format.', description: 'JSON-encoded additional values to include with the request. These are merged with any serialized form values. Use case: add hidden fields, CSRF tokens, or computed values without hidden inputs. Example: hx-vals=\'{"sort": "desc", "page": 2}\'. Can be dynamic with JavaScript: hx-vals=\'js:{lastKey: event.key}\'.', values: 'JSON object | js:{...expression}', defaults: '' },
  { attr: 'hx-vars', name: 'Dynamic Variables', summary: 'Declares JavaScript variables available during hx-vals/js evaluation.', description: 'A comma-separated list of variable declarations (var1:expression, var2:expression) computed at trigger time and made available in hx-vals js: expressions. Use case: pre-compute values once and reuse across multiple js: expressions.', values: 'comma-separated name:value', defaults: '' },
  { attr: 'hx-include', name: 'Include Elements', summary: 'Includes additional element values in the request.', description: 'A CSS selector for elements whose values should be included in the request. Use case: include form fields from outside the current form, or gather input from multiple form sections into one POST.', values: 'CSS selector', defaults: 'only the triggering element' },
  { attr: 'hx-ext', name: 'Extensions', summary: 'Enables HTMX extensions for this element.', description: 'A comma-separated list of HTMX extension names to enable for this element and its children. Extensions add custom functionality: json-enc for JSON bodies, ws for WebSocket, sse for Server-Sent Events, preload for pre-fetching, class-tools for CSS class manipulation.', values: 'comma-separated extension names', defaults: 'none' },
  { attr: 'hx-headers', name: 'Custom Headers', summary: 'Adds custom HTTP headers to the request.', description: 'JSON-encoded additional headers to send with the request. Example: hx-headers=\'{"X-Requested-With": "XMLHttpRequest"}\' (this is sent by default). Use case: API version headers, authentication tokens, content negotiation.', values: 'JSON object', defaults: '' },

  // Request Indicators
  { attr: 'hx-indicator', name: 'Loading Indicator', summary: 'Shows a loading indicator during the request.', description: 'A CSS selector for the element to show during the request lifecycle. This element gets the htmx-request class added during the request. Typically the indicator element starts hidden (via CSS class), and a CSS rule shows it when the htmx-request class is present.', values: 'CSS selector', defaults: '' },
  { attr: 'hx-disable', name: 'Disable Element', summary: 'Disables HTMX processing for this element and its children.', description: 'When set to true, HTMX completely ignores this element and all its descendants. No attributes are processed, no events are listened to. Use case: temporarily disabling HTMX behavior on a section during custom JS operations.', values: 'true', defaults: '' },
  { attr: 'hx-disabled-elt', name: 'Disabled Element', summary: 'Adds the disabled attribute to specified elements during requests.', description: 'A CSS selector for elements that should be disabled (get the \'disabled\' attribute) while the request is in flight. Use case: disable the submit button during form submission to prevent double-clicks.', values: 'CSS selector', defaults: '' },

  // History & Navigation
  { attr: 'hx-push-url', name: 'Push URL', summary: 'Pushes a new URL into the browser history.', description: 'Pushes the URL from the response or a specified URL into the browser location bar and history. Creates a new history entry so the back button works. Use \'false\' to prevent pushing. Can be set to a specific URL string. HTMX automatically extracts the URL from Link or HX-Push response headers.', values: 'true | false | URL string', defaults: 'false' },
  { attr: 'hx-replace-url', name: 'Replace URL', summary: 'Replaces the current URL in the browser location bar.', description: 'Like hx-push-url but replaces the current history entry instead of creating a new one. Useful for search/filter pages where you do not want every keystroke in history. Use case: updating the URL bar after a search without polluting browser history.', values: 'true | false | URL string', defaults: 'false' },

  // Confirmation & Validation
  { attr: 'hx-confirm', name: 'Confirm Action', summary: 'Shows a confirm dialog before issuing the request.', description: 'Displays a browser confirm() dialog before the request is sent. If the user cancels, the request is aborted. Use case: destructive actions (delete, archive). Example: hx-confirm="Are you sure you want to delete this item?"', values: 'message string', defaults: '' },
  { attr: 'hx-prompt', name: 'Prompt for Value', summary: 'Shows a prompt dialog to collect user input.', description: 'Displays a browser prompt() dialog. The user\'s response is included in the request as the hx-prompt parameter. Use case: collecting a filename or tag before saving.', values: 'prompt message', defaults: '' },
  { attr: 'hx-validate', name: 'Validate Form', summary: 'Forces HTML5 form validation before request.', description: 'When set to true, HTMX runs the browser\'s native form validation (checkValidity()) on the element or any form it belongs to before issuing the request. Prevents requests from invalid forms. Works with hx-post on forms or any element within a form.', values: 'true', defaults: 'false' },

  // Swap & Morph
  { attr: 'hx-swap-settle', name: 'Settle Delay', summary: 'Overrides the default settle delay for this element.', description: 'The settle delay is the time HTMX waits after swapping content before considering the element "settled." During settlement, CSS transitions from adding new content can complete. This overrides the global default (20ms).', values: 'milliseconds', defaults: '20ms' },
  { attr: 'hx-swap-transition', name: 'Swap Transition', summary: 'Adds a CSS transition during the swap.', description: 'When set, HTMX applies a temporary CSS class during the swap that you can target with CSS transitions. Set hx-swap-transition="true" to use the default swap class, or specify a custom class name. The class is added before the new content arrives, then removed after settle. Classic pattern: fade out old content, swap new content while invisible, then fade in.', values: 'true | class name', defaults: '' },

  // Preserve & Focus
  { attr: 'hx-preserve', name: 'Preserve Element', summary: 'Preserves an element across swaps (maintains state).', description: 'When set to true, this element is preserved during a swap — it is not replaced even if it is contained within the target of a swap. HTMX stores it in a temporary location and reinserts it after the swap completes. Use case: preserving video player state, active tab selection, or scroll position during navigation.', values: 'true', defaults: '' },
  { attr: 'hx-focus-scroll', name: 'Focus/Scroll', summary: 'Controls focus and scroll after swap.', description: 'When true, HTMX focuses the swapped element and scrolls it into view. Use case: accessibility — ensures screen readers and keyboard users land on the new content. Use false to disable the behavior. Set on hx-swap as a modifier for fine-grained control.', values: 'true | false', defaults: 'false' },

  // Sync & Boosting
  { attr: 'hx-sync', name: 'Synchronize Requests', summary: 'Synchronizes requests between elements.', description: 'Controls how multiple requests from the same or different elements interact. Options: hx-sync="closest form:abort" aborts current form requests, hx-sync="this:replace" replaces the current request, hx-sync="closest form:queue" queues requests. Use drop to cancel if another request is in flight. The CSS selector determines the scope.', values: 'selector:strategy', defaults: '' },
  { attr: 'hx-boost', name: 'Boost Links/Forms', summary: 'Progressively enhances anchors and forms to use AJAX.', description: 'When set to true on an element, all descendant anchors and forms are "boosted" — they use AJAX instead of full page loads. The body tag is swapped with the response by default. Boosting preserves the head tag merge (for title, scripts, styles). Use case: making a multi-page app feel like an SPA without changing any server-side code. Set hx-boost="true" on the body for a full-site AJAX experience.', values: 'true', defaults: 'false' },

  // Encoding
  { attr: 'hx-encoding', name: 'Form Encoding', summary: 'Controls the encoding type for form submissions.', description: 'Sets the enctype for form data serialization. Options: application/x-www-form-urlencoded (default), multipart/form-data (for file uploads). Use case: uploading files with HTMX without switching to fetch/FormData manually.', values: 'application/x-www-form-urlencoded | multipart/form-data', defaults: 'application/x-www-form-urlencoded' },

  // Custom
  { attr: 'hx-history-elt', name: 'History Element', summary: 'Specifies the element to snapshot for history restoration.', description: 'A CSS selector for the element to snapshot and restore when navigating browser history. When restoring history, HTMX finds this element in the cached page and swaps it. Use case: specify a narrower element than the default body to make history restoration faster.', values: 'CSS selector', defaults: 'body' },
  { attr: 'hx-history', name: 'History Control', summary: 'Controls whether an element participates in history snapshots.', description: 'When set to false, the element is excluded from history cache snapshots. Use case: preventing sensitive or dynamic content from being cached in history, reducing cache size.', values: 'true | false', defaults: 'true' },
];

// ── Category Organization ───────────────────────────────────────────────────

const categories: Category[] = [
  {
    title: 'Core Request Attributes',
    icon: Zap,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    textColor: 'text-amber-400',
    attrs: rawAttrs.filter(a => ['hx-get','hx-post','hx-put','hx-patch','hx-delete'].includes(a.attr)),
  },
  {
    title: 'Target & Swap',
    icon: Repeat,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    textColor: 'text-emerald-400',
    attrs: rawAttrs.filter(a => ['hx-target','hx-swap','hx-swap-oob','hx-select','hx-select-oob'].includes(a.attr)),
  },
  {
    title: 'Triggers & Events',
    icon: MousePointer2,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/20',
    textColor: 'text-violet-400',
    attrs: rawAttrs.filter(a => ['hx-trigger','hx-on'].includes(a.attr)),
  },
  {
    title: 'Request Configuration',
    icon: Code,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    textColor: 'text-cyan-400',
    attrs: rawAttrs.filter(a => ['hx-params','hx-vals','hx-vars','hx-include','hx-ext','hx-headers','hx-encoding'].includes(a.attr)),
  },
  {
    title: 'Loading & Indicators',
    icon: Eye,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    textColor: 'text-rose-400',
    attrs: rawAttrs.filter(a => ['hx-indicator','hx-disable','hx-disabled-elt'].includes(a.attr)),
  },
  {
    title: 'History & Navigation',
    icon: Link2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    textColor: 'text-blue-400',
    attrs: rawAttrs.filter(a => ['hx-push-url','hx-replace-url','hx-boost','hx-history-elt','hx-history'].includes(a.attr)),
  },
  {
    title: 'Confirmation & Validation',
    icon: Layout,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    textColor: 'text-orange-400',
    attrs: rawAttrs.filter(a => ['hx-confirm','hx-prompt','hx-validate'].includes(a.attr)),
  },
  {
    title: 'Swap Fine-Tuning',
    icon: Repeat,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20',
    textColor: 'text-teal-400',
    attrs: rawAttrs.filter(a => ['hx-swap-settle','hx-swap-transition','hx-preserve','hx-focus-scroll','hx-sync'].includes(a.attr)),
  },
];

const categoryFilters = [
  { key: 'all', label: 'All Attributes' },
  { key: 'Core Request', label: 'Core' },
  { key: 'Target & Swap', label: 'Swap' },
  { key: 'Triggers & Events', label: 'Triggers' },
  { key: 'Request Configuration', label: 'Config' },
  { key: 'Loading & Indicators', label: 'Loading' },
  { key: 'History & Navigation', label: 'History' },
  { key: 'Confirmation & Validation', label: 'Confirm' },
  { key: 'Swap Fine-Tuning', label: 'Fine-Tune' },
];

// ── Page Component ──────────────────────────────────────────────────────────

export default function HtmxReferencePage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    let cats = [...categories];

    if (activeCategory !== 'all') {
      cats = cats.filter(cat => cat.title.startsWith(activeCategory));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      cats = cats.map(cat => ({
        ...cat,
        attrs: cat.attrs.filter(a =>
          a.attr.toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.values.toLowerCase().includes(q)
        ),
      })).filter(cat => cat.attrs.length > 0);
    }

    return cats;
  }, [search, activeCategory]);

  const handleCopy = useCallback((attr: HtmxAttr) => {
    navigator.clipboard.writeText(attr.attr);
    toast.success(`${attr.attr} copied!`);
  }, []);

  const getBadgeStyle = (attr: string): string => {
    if (attr.startsWith('hx-get') || attr.startsWith('hx-post') || attr.startsWith('hx-put') || attr.startsWith('hx-patch') || attr.startsWith('hx-delete'))
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (attr.startsWith('hx-target') || attr.startsWith('hx-swap'))
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (attr.startsWith('hx-trigger') || attr.startsWith('hx-on'))
      return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    if (attr.startsWith('hx-push') || attr.startsWith('hx-replace') || attr.startsWith('hx-boost'))
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
  };

  return (
    <ToolLayout
      title="HTMX Attribute Reference"
      description="Complete reference for every HTMX attribute — from core requests to advanced swap strategies. Search, filter by category, and copy attributes."
    >
      <div className="space-y-8">
        {/* Search + Category Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search attributes by name, description, or example values..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value) setActiveCategory('all'); }}
              className="input-field pl-10 pr-4 py-3 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categoryFilters.map(f => (
              <button
                key={f.key}
                onClick={() => { setActiveCategory(f.key); setSearch(''); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  activeCategory === f.key
                    ? 'text-brand-400 border-brand-500/30 bg-brand-500/10'
                    : 'text-slate-500 border-slate-700/50 hover:text-slate-300 hover:border-slate-600/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {search && (
            <p className="text-sm text-slate-400">
              Found {filteredCategories.reduce((sum, cat) => sum + cat.attrs.length, 0)} matching attribute(s)
            </p>
          )}
        </div>

        {/* No Results */}
        {filteredCategories.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">No attributes found</h3>
            <p className="text-slate-500 text-sm">Try searching for a different term or clear the filter.</p>
            <button onClick={() => { setSearch(''); setActiveCategory('all'); }}
                    className="mt-4 text-brand-400 hover:text-brand-300 text-sm font-medium">
              Reset all filters
            </button>
          </div>
        )}

        {/* Categories */}
        {filteredCategories.map(cat => (
          <div key={cat.title}>
            {/* Category Header */}
            <div className={`${cat.bgColor} border ${cat.borderColor} rounded-xl px-5 py-3 mb-4`}>
              <div className="flex items-center gap-3">
                <cat.icon className={`w-5 h-5 ${cat.textColor}`} />
                <h2 className="text-white font-semibold text-lg">{cat.title}</h2>
                <span className={`text-xs font-mono ${cat.textColor} bg-slate-900/50 px-2 py-0.5 rounded`}>
                  {cat.attrs.length} {cat.attrs.length === 1 ? 'attr' : 'attrs'}
                </span>
              </div>
            </div>

            {/* Attribute Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.attrs.map(attr => {
                const isExpanded = expandedAttr === attr.attr;
                return (
                  <div
                    key={attr.attr}
                    onClick={() => setExpandedAttr(isExpanded ? null : attr.attr)}
                    className={`card group cursor-pointer transition-all ${
                      isExpanded ? 'ring-1 ring-brand-500/30' : ''
                    } hover:border-slate-600/50`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Attribute badge */}
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg border font-mono font-bold text-xs shrink-0 ${getBadgeStyle(attr.attr)}`}>
                        {attr.attr}
                      </span>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm">{attr.name}</h3>
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{attr.summary}</p>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
                            <p className="text-slate-300 text-sm leading-relaxed">{attr.description}</p>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-slate-800/50 rounded-lg p-2.5">
                                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Accepted Values</p>
                                <p className="text-slate-300 text-xs font-mono leading-relaxed">{attr.values}</p>
                              </div>
                              <div className="bg-slate-800/50 rounded-lg p-2.5">
                                <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Default</p>
                                <p className="text-slate-300 text-xs font-mono">{attr.defaults}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Copy button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopy(attr); }}
                        className="shrink-0 p-2 rounded-lg text-slate-600 group-hover:text-slate-400 hover:text-white hover:bg-surface-lighter transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 text-center">
            Based on the{' '}
            <a href="https://htmx.org/reference/" target="_blank" rel="noopener noreferrer"
               className="text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-1">
              HTMX Reference Documentation
              <ExternalLink className="w-3 h-3" />
            </a>.
            HTMX is a library that gives you access to AJAX, CSS Transitions, WebSockets, and Server Sent Events directly in HTML.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
