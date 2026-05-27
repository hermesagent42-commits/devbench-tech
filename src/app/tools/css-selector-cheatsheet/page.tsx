'use client';

import { useState, useCallback, useMemo } from 'react';
import { ToolLayout } from '@/components/ToolLayout';
import { Search, Copy, Check, Tag, Hash, Asterisk, ChevronRight, Layers, Code } from 'lucide-react';
import toast from 'react-hot-toast';

interface Selector {
  selector: string;
  name: string;
  summary: string;
  example: string;
  description: string;
  css?: string; // CSS code example
}

interface Category {
  title: string;
  icon: typeof Tag;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  selectors: Selector[];
}

const rawSelectors: Selector[] = [
  // ── Basic Selectors ──
  { selector: '*', name: 'Universal', summary: 'Selects all elements', example: '* { margin: 0; }', description: 'The universal selector matches every element in the document. Often used in CSS resets to zero out margins and padding. Can also be combined: *.warning matches any element with class "warning".' },
  { selector: 'div', name: 'Type Selector', summary: 'Selects all elements of a type', example: 'p { line-height: 1.6; }', description: 'Matches all elements with the given tag name. This is the simplest and most widely used selector type.' },
  { selector: '.class', name: 'Class Selector', summary: 'Selects elements with a specific class', example: '.card { border-radius: 8px; }', description: 'Matches all elements that have the specified class attribute. Prefixed with a dot. Classes can be combined: .btn.primary targets elements with both classes.' },
  { selector: '#id', name: 'ID Selector', summary: 'Selects a single element by its ID', example: '#header { position: sticky; }', description: 'Matches the element with the given id attribute. Prefixed with a hash. IDs must be unique in a document. Use sparingly — high specificity makes them hard to override.' },

  // ── Combinators ──
  { selector: 'A B', name: 'Descendant Combinator', summary: 'Selects B nested inside A at any depth', example: 'article p { color: #333; }', description: 'Matches all B elements that are descendants of A — regardless of nesting depth. This is the most common combinator and what people mean by "space-separated selectors".' },
  { selector: 'A > B', name: 'Child Combinator', summary: 'Selects B that is a direct child of A', example: 'ul > li { list-style: none; }', description: 'Matches B only if it is an immediate child of A. Unlike the descendant combinator, it does not match nested descendants. Useful for avoiding deep cascade issues.' },
  { selector: 'A + B', name: 'Adjacent Sibling', summary: 'Selects B immediately following A', example: 'h2 + p { margin-top: 0; }', description: 'Matches B only if it directly follows A in the DOM and they share the same parent. Used for spacing and layout contexts — e.g., reducing margin on a paragraph directly after a heading.' },
  { selector: 'A ~ B', name: 'General Sibling', summary: 'Selects all B siblings after A', example: 'h2 ~ p { color: #666; }', description: 'Matches all B elements that are siblings of A and come after it (not before). Less common than adjacent sibling but useful for styling sibling groups.' },

  // ── Attribute Selectors ──
  { selector: '[attr]', name: 'Has Attribute', summary: 'Elements with the specified attribute', example: '[disabled] { opacity: 0.5; }', description: 'Matches any element that has the specified attribute, regardless of its value. Perfect for styling based on state attributes like disabled, checked, required, hidden, etc.' },
  { selector: '[attr=value]', name: 'Exact Match', summary: 'Attribute equals a specific value', example: '[type="submit"] { background: blue; }', description: 'Matches elements where the attribute value is exactly equal to the given string. Case-sensitive by default; add i before closing bracket for case-insensitive: [type="submit" i].' },
  { selector: '[attr~=value]', name: 'Contains Word', summary: 'Attribute contains value as a whole word', example: '[class~="featured"] { border: gold; }', description: 'Matches when the attribute value contains the given word, delimited by spaces. Like class matching but for any attribute. Example: [data-tags~="trending"] matches data-tags="trending hot new".' },
  { selector: '[attr|=value]', name: 'Starts With (Hyphen)', summary: 'Attribute starts with value followed by hyphen', example: '[lang|="en"] { font-family: serif; }', description: 'Matches when the attribute is exactly the value or starts with the value followed by a hyphen. Designed for language subcodes: [lang|="en"] matches lang="en" and lang="en-US".' },
  { selector: '[attr^=value]', name: 'Starts With', summary: 'Attribute starts with the value', example: '[href^="https"] { /* external link */ }', description: 'Matches when the attribute value begins with the given string. Common use: style external links differently — [href^="http"] or [href^="//"].' },
  { selector: '[attr$=value]', name: 'Ends With', summary: 'Attribute ends with the value', example: '[href$=".pdf"]::after { content: " 📄"; }', description: 'Matches when the attribute value ends with the given string. Common use: add icons after links to specific file types — [href$=".pdf"], [src$=".svg"].' },
  { selector: '[attr*=value]', name: 'Contains Substring', summary: 'Attribute contains the value anywhere', example: '[src*="hero-"] { width: 100%; }', description: 'Matches when the attribute value contains the given string anywhere. The most flexible attribute selector. Use case: match any URL containing a specific path segment.' },

  // ── Pseudo-classes: User Action ──
  { selector: ':hover', name: 'Hover', summary: 'When the user points at the element', example: 'button:hover { background: #0055cc; }', description: 'Matches when the user designates the element with a pointing device, but does not activate it. Typically triggered by mouse hover. Important for accessibility: always pair with :focus for keyboard users.' },
  { selector: ':focus', name: 'Focus', summary: 'When the element has focus', example: 'input:focus { outline: 2px solid blue; }', description: 'Matches when the element has focus (clicked, tapped, or tabbed to). Essential for keyboard accessibility. :focus-visible is often preferred because it only shows the ring when keyboard-navigating.' },
  { selector: ':focus-visible', name: 'Focus Visible', summary: 'Focus only when keyboard-navigating', example: 'button:focus-visible { outline: 2px solid blue; }', description: 'Matches when the element has focus AND the UA determines the focus should be visible. The browser heuristically determines if the user is navigating by keyboard. This is now the recommended focus style for buttons and interactive elements.' },
  { selector: ':focus-within', name: 'Focus Within', summary: 'When element or child has focus', example: 'form:focus-within { border-color: blue; }', description: 'Matches when the element or any descendant has focus. Great for highlighting a form or card that contains a focused input — gives visual context to where the user is.' },
  { selector: ':active', name: 'Active', summary: 'When the element is being activated', example: 'button:active { transform: scale(0.97); }', description: 'Matches when the element is being activated by the user — typically during a mouse click (between mousedown and mouseup). Used for "pressed" states.' },
  { selector: ':visited', name: 'Visited', summary: 'Links the user has already visited', example: 'a:visited { color: purple; }', description: 'Matches links that the user has already visited. Limited to a subset of CSS properties for privacy reasons — color, background-color, border-color, outline-color.' },

  // ── Pseudo-classes: Form State ──
  { selector: ':checked', name: 'Checked', summary: 'Checked radio/checkbox/option', example: 'input:checked + label { font-weight: bold; }', description: 'Matches radio buttons, checkboxes, and option elements that are checked or selected. Essential for custom-styled form controls without JavaScript.' },
  { selector: ':disabled', name: 'Disabled', summary: 'Disabled form elements', example: 'input:disabled { opacity: 0.5; }', description: 'Matches form elements that are in a disabled state. Always communicate disabled state visually — reduced opacity, gray text, not-allowed cursor.' },
  { selector: ':enabled', name: 'Enabled', summary: 'Enabled form elements', example: 'input:enabled { background: white; }', description: 'Matches form elements that are enabled (not disabled). The default state for all form elements.' },
  { selector: ':required', name: 'Required', summary: 'Inputs with the required attribute', example: 'input:required { border-left: 3px solid red; }', description: 'Matches form elements that have the required attribute set. Useful for visually indicating mandatory fields.' },
  { selector: ':optional', name: 'Optional', summary: 'Inputs without required', example: 'input:optional::after { content: " (optional)"; }', description: 'Matches form elements that do not have the required attribute. The complement of :required.' },
  { selector: ':valid', name: 'Valid', summary: 'Inputs with valid content', example: 'input:valid { border-color: green; }', description: 'Matches form elements whose contents validate successfully according to the element\'s constraints (type, pattern, min, max, etc.).' },
  { selector: ':invalid', name: 'Invalid', summary: 'Inputs with validation errors', example: 'input:invalid { border-color: red; }', description: 'Matches form elements whose contents fail validation. Be careful: :invalid matches even before the user has interacted with the field. Use with :not(:placeholder-shown) or :user-invalid for better UX.' },
  { selector: ':user-invalid', name: 'User Invalid', summary: 'Invalid after user interaction', example: 'input:user-invalid { border-color: red; }', description: 'Like :invalid, but only matches after the user has interacted with the field. Much better UX — no red borders before the user has had a chance to fill in the field. Baseline 2025.' },
  { selector: ':in-range', name: 'In Range', summary: 'Number input within min/max', example: 'input:in-range { background: #f0fff0; }', description: 'Matches number/range inputs whose value is within the specified min and max bounds.' },
  { selector: ':out-of-range', name: 'Out of Range', summary: 'Number input outside min/max', example: 'input:out-of-range { border-color: red; }', description: 'Matches number/range inputs whose value is outside the min/max bounds. Like :invalid, consider pairing with user interaction checks.' },
  { selector: ':placeholder-shown', name: 'Placeholder Shown', summary: 'Input showing placeholder text', example: 'input:placeholder-shown { background: #fafafa; }', description: 'Matches input/textarea elements that are currently displaying their placeholder text. Useful for detecting empty inputs before the user types anything.' },

  // ── Pseudo-classes: Structural ──
  { selector: ':first-child', name: 'First Child', summary: 'Element that is the first child of its parent', example: 'li:first-child { font-weight: bold; }', description: 'Matches elements that are the first child of their parent. The element must be the very first child — not just the first of its type.' },
  { selector: ':last-child', name: 'Last Child', summary: 'Element that is the last child', example: 'li:last-child { border-bottom: none; }', description: 'Matches elements that are the last child of their parent. Common for removing the last border in lists.' },
  { selector: ':first-of-type', name: 'First of Type', summary: 'First element of its type in parent', example: 'p:first-of-type { font-size: 1.25rem; }', description: 'Matches the first element of its type among its parent\'s children. More forgiving than :first-child — if there\'s an h2 before your first p, :first-of-type still matches.' },
  { selector: ':last-of-type', name: 'Last of Type', summary: 'Last element of its type in parent', example: 'p:last-of-type { margin-bottom: 0; }', description: 'Matches the last element of its type among its parent\'s children. Often used to remove margin on the last paragraph in a section.' },
  { selector: ':nth-child(n)', name: 'nth Child', summary: 'Elements based on position in parent', example: 'tr:nth-child(even) { background: #f5f5f5; }', description: 'Matches elements based on their position. Accepts keyword (odd/even), functional notation an+b, or integer. Most powerful structural selector. Examples: :nth-child(2n+1), :nth-child(3), :nth-child(-n+3) (first 3).' },
  { selector: ':nth-of-type(n)', name: 'nth of Type', summary: 'nth element of its type', example: 'img:nth-of-type(odd) { float: left; }', description: 'Like :nth-child, but only counts elements of the same type. :nth-of-type(2) matches the second occurrence of that element type.' },
  { selector: ':nth-last-child(n)', name: 'nth Last Child', summary: 'Counting from the end', example: 'li:nth-last-child(1) { font-style: italic; }', description: 'Same as :nth-child but counts from the end. :nth-last-child(1) is equivalent to :last-child.' },
  { selector: ':nth-last-of-type(n)', name: 'nth Last of Type', summary: 'nth of type, counting from end', example: 'p:nth-last-of-type(2) { color: #999; }', description: 'Same as :nth-of-type but counts from the end. Useful for styling the penultimate item of a given type.' },
  { selector: ':only-child', name: 'Only Child', summary: 'Element with no siblings', example: 'div:only-child { width: 100%; }', description: 'Matches elements that are the only child of their parent. Equivalent to :first-child:last-child.' },
  { selector: ':only-of-type', name: 'Only of Type', summary: 'Only element of its type in parent', example: 'img:only-of-type { max-width: 100%; }', description: 'Matches elements that are the only element of their type among siblings. There may be other types, but only one of this type.' },
  { selector: ':empty', name: 'Empty', summary: 'Elements with no children', example: 'p:empty { display: none; }', description: 'Matches elements that have no children — no text nodes, no element nodes, nothing. Not even whitespace. Useful for hiding empty container elements.' },

  // ── Pseudo-classes: Relational / Modern ──
  { selector: ':has()', name: 'Has (Relational)', summary: 'Parent contains matching children', example: 'article:has(img) { padding: 1rem; }', description: 'The "parent selector" — matches the element if any of its descendants match the selector inside :has(). This is the most powerful selector introduced to CSS. Use cases: style a card that contains an image, a form that has invalid fields, or a section that follows another section. Now Baseline 2024+.' },
  { selector: ':is()', name: 'Is (Matches Any)', summary: 'Matches any of the selectors in the list', example: ':is(h1, h2, h3) { font-family: sans-serif; }', description: 'Takes a selector list and matches if any of the selectors match. The specificity is the highest specificity in the list. Use case: group selectors without repeating properties. Unlike old grouping, :is() forgives invalid selectors.' },
  { selector: ':where()', name: 'Where (Zero-specificity)', summary: 'Like :is() but with zero specificity', example: ':where(h1, h2, h3) { margin-top: 0; }', description: 'Works exactly like :is() but always contributes zero specificity. Perfect for base/reset styles you want to be easy to override. Every selector inside :where() has specificity of 0.' },
  { selector: ':not()', name: 'Not (Negation)', summary: 'Elements that do NOT match the selector', example: 'button:not(.primary) { background: gray; }', description: 'Matches elements that do not match the given selector. Now accepts selector lists: :not(h1, h2, h3). Useful for styling "everything except" patterns.' },

  // ── Pseudo-elements ──
  { selector: '::before', name: 'Before', summary: 'Insert content before the element', example: '.icon::before { content: "→"; }', description: 'Creates a pseudo-element that is the first child of the selected element. Requires the content property. Used for decorative content, icons, and visual effects without adding extra HTML.' },
  { selector: '::after', name: 'After', summary: 'Insert content after the element', example: 'a[href^="http"]::after { content: " ↗"; }', description: 'Creates a pseudo-element as the last child. Like ::before, requires content. Common uses: clearfix, external link indicators, required field asterisks.' },
  { selector: '::first-letter', name: 'First Letter', summary: 'Styles the first letter of text', example: 'p::first-letter { font-size: 200%; }', description: 'Applies styles to the first letter of the first line of a block element. Classic use: drop caps in articles.' },
  { selector: '::first-line', name: 'First Line', summary: 'Styles the first line of text', example: 'p::first-line { font-weight: bold; }', description: 'Styles the first formatted line of a block. Dynamically updates as the line length changes with viewport width. Limited to font, color, background, word-spacing, letter-spacing, text-decoration, text-transform, and line-height properties.' },
  { selector: '::selection', name: 'Selection', summary: 'Styles the user-selected text', example: '::selection { background: yellow; }', description: 'Applies styles to the portion of the document highlighted by the user (e.g., with mouse drag). Only color, background-color, text-decoration, text-shadow, and a few others are allowed.' },
  { selector: '::marker', name: 'Marker', summary: 'Styles list item markers/bullets', example: 'li::marker { color: blue; }', description: 'Styles the marker box of a list item — typically the bullet or number. Supports color, font properties, content, and a few more. Great for custom list styling without extra elements.' },
  { selector: '::placeholder', name: 'Placeholder', summary: 'Styles input placeholder text', example: 'input::placeholder { color: #999; }', description: 'Styles the placeholder text of input and textarea elements. Only accepts a limited subset of CSS properties. Always ensure sufficient contrast for accessibility.' },
  { selector: '::backdrop', name: 'Backdrop', summary: 'Background behind modal elements', example: 'dialog::backdrop { background: rgba(0,0,0,0.5); }', description: 'Styles the backdrop behind a dialog or element in fullscreen mode. Used to create overlay effects for modals and popovers.' },
  { selector: '::file-selector-button', name: 'File Selector Button', summary: 'Styles the file input button', example: 'input::file-selector-button { background: blue; }', description: 'Styles the "Choose File" button of a file input. This is the standardized name (replacing the old vendor-prefixed ::-webkit-file-upload-button).' },
  { selector: '::details-content', name: 'Details Content', summary: 'Animates details open/close', example: '::details-content { transition: height 0.3s; }', description: 'Represents the expandable content wrapper inside a <details> element. Enables animating the open/close transition. Baseline 2025. Use with interpolate-size: allow-keywords for height: auto animation.' },
  { selector: '::view-transition', name: 'View Transition', summary: 'Root of view transition tree', example: '::view-transition-old(root) { animation: fade 0.3s; }', description: 'The root of the view transition pseudo-element tree. Used with the View Transitions API to customize page transition animations. Includes ::view-transition-group, ::view-transition-image-pair, ::view-transition-old, ::view-transition-new.' },
];

// ── Categories ──
const categories: Category[] = [
  { title: 'Basic Selectors', icon: Tag, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-300', selectors: rawSelectors.slice(0, 4) },
  { title: 'Combinators', icon: ChevronRight, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', textColor: 'text-purple-300', selectors: rawSelectors.slice(4, 8) },
  { title: 'Attribute Selectors', icon: Code, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-300', selectors: rawSelectors.slice(8, 15) },
  { title: 'User Action Pseudo-classes', icon: Hash, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', textColor: 'text-green-300', selectors: rawSelectors.slice(15, 22) },
  { title: 'Form State Pseudo-classes', icon: Hash, color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30', textColor: 'text-amber-300', selectors: rawSelectors.slice(22, 35) },
  { title: 'Structural Pseudo-classes', icon: Layers, color: 'text-rose-400', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30', textColor: 'text-rose-300', selectors: rawSelectors.slice(35, 45) },
  { title: 'Modern Relational Pseudo-classes', icon: Asterisk, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30', textColor: 'text-indigo-300', selectors: rawSelectors.slice(45, 49) },
  { title: 'Pseudo-elements', icon: Code, color: 'text-pink-400', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30', textColor: 'text-pink-300', selectors: rawSelectors.slice(49) },
];

export default function CssSelectorCheatsheet() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedSelector, setExpandedSelector] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!search && !selectedCategory) return categories;
    
    return categories
      .map((cat) => {
        const filtered = cat.selectors.filter(
          (s) =>
            (!search || s.selector.toLowerCase().includes(search.toLowerCase()) || s.name.toLowerCase().includes(search.toLowerCase()) || s.summary.toLowerCase().includes(search.toLowerCase())) &&
            (!selectedCategory || cat.title === selectedCategory)
        );
        return { ...cat, selectors: filtered };
      })
      .filter((cat) => cat.selectors.length > 0);
  }, [search, selectedCategory]);

  const totalSelectors = useMemo(() => rawSelectors.length, []);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied!');
  }, []);

  return (
    <ToolLayout
      title="CSS Selector Cheatsheet"
      description={`Complete searchable reference of all CSS selectors — ${totalSelectors} selectors with real-world examples, organized by category. Basic, combinator, attribute, pseudo-class, and pseudo-element selectors.`}
    >
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search selectors, names, or descriptions..."
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 outline-none"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            !selectedCategory ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.title}
            onClick={() => setSelectedCategory(cat.title === selectedCategory ? null : cat.title)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              cat.title === selectedCategory ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {cat.title} ({cat.selectors.length})
          </button>
        ))}
      </div>

      {/* Selectors List */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => (
          <div key={cat.title}>
            <div className="flex items-center gap-2 mb-3">
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              <h3 className={`text-sm font-semibold uppercase tracking-wider ${cat.color}`}>{cat.title}</h3>
              <span className="text-xs text-slate-500">({cat.selectors.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {cat.selectors.map((s) => {
                const isExpanded = expandedSelector === s.selector;
                return (
                  <div
                    key={s.selector}
                    className={`rounded-lg border transition-all ${
                      isExpanded ? cat.borderColor : 'border-slate-700/30'
                    } bg-slate-900/80 hover:bg-slate-900 overflow-hidden`}
                  >
                    {/* Header Row */}
                    <button
                      onClick={() => setExpandedSelector(isExpanded ? null : s.selector)}
                      className="w-full text-left p-3 flex items-start gap-3"
                    >
                      <code
                        className="font-mono text-sm font-semibold text-brand-400 whitespace-nowrap cursor-pointer hover:text-brand-300 select-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(s.selector);
                        }}
                        title="Click to copy"
                      >
                        {s.selector}
                      </code>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200">{s.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{s.summary}</div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-500 flex-shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-slate-700/30">
                        <p className="text-sm text-slate-300 leading-relaxed mb-3 mt-3">{s.description}</p>
                        <div className="bg-slate-950 rounded-lg border border-slate-700/50 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Example</span>
                            <button
                              onClick={() => handleCopy(s.example)}
                              className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy
                            </button>
                          </div>
                          <code className="font-mono text-xs text-green-400 block">{s.example}</code>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No selectors match &quot;{search}&quot;</p>
          </div>
        )}
      </div>

      {/* Specificity Quick Reference */}
      <div className="mt-10 p-5 bg-slate-900 border border-slate-700/30 rounded-xl">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">CSS Specificity Quick Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { weight: '0,0,0,0', selector: '*', desc: 'Universal selector (0)', example: '*' },
            { weight: '0,0,0,1', selector: 'Type & ::pseudo-elements', desc: 'Element name, ::before, ::after', example: 'div', css: 'div { ... }' },
            { weight: '0,0,1,0', selector: 'Class, [attr], :pseudo-class', desc: '.class, [type], :hover', example: '.card', css: '.card { ... }' },
            { weight: '0,0,1,0', selector: ':where()', desc: 'Zero specificity wrapper', example: ':where(div) { ... }' },
            { weight: '0,1,0,0', selector: '#id', desc: 'ID selector', example: '#header', css: '#header { ... }' },
            { weight: '1,0,0,0', selector: 'style=""', desc: 'Inline style attribute', example: '<div style="...">' },
            { weight: '1,0,0,0,0', selector: '!important', desc: 'Overrides all (use sparingly)', example: 'div { color: red !important; }' },
          ].map((item) => (
            <div key={item.selector} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
              <div className="font-mono text-xs text-brand-400 font-semibold">{item.weight}</div>
              <div className="text-sm font-medium text-slate-200 mt-1">{item.selector}</div>
              <div className="text-xs text-slate-500 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
