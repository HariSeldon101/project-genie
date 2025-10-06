# Semantic HTML Guidelines for LLMs

## 🚨 CRITICAL: Why Semantic HTML Matters in 2025

Semantic HTML is the foundation for:
- **Accessibility**: Native screen reader and keyboard support
- **SEO Optimization**: Better search engine understanding and rich snippets
- **AI Readability**: Machine learning models can better understand content structure
- **Future-Proofing**: Compatible with emerging technologies and standards
- **Performance**: Less JavaScript needed for basic functionality

## Core Principle: Meaning Over Styling

**ALWAYS choose HTML elements based on their semantic meaning, not their visual appearance.**

❌ **WRONG:**
```html
<div class="header">
  <div class="title">Page Title</div>
  <div class="navigation">...</div>
</div>
```

✅ **CORRECT:**
```html
<header>
  <h1>Page Title</h1>
  <nav>...</nav>
</header>
```

## 📋 Essential Semantic Elements Reference

### Document Structure
| Element | Purpose | Usage Rules |
|---------|---------|-------------|
| `<header>` | Page or section header | One per page/section, contains intro content |
| `<nav>` | Navigation links | Use for major navigation blocks |
| `<main>` | Main content | Only ONE per page, unique content |
| `<article>` | Self-contained content | Blog posts, news articles, comments |
| `<section>` | Thematic grouping | Chapters, tabbed content, grouped content |
| `<aside>` | Related but separate | Sidebars, pull quotes, ads |
| `<footer>` | Footer content | Copyright, links, author info |

### Content Elements
| Element | Purpose | Usage Rules |
|---------|---------|-------------|
| `<h1>-<h6>` | Headings | Only ONE `<h1>` per page, maintain hierarchy |
| `<p>` | Paragraphs | Text blocks, never empty |
| `<ul>/<ol>` | Lists | Unordered/ordered lists, use `<li>` for items |
| `<dl>` | Definition lists | Terms and descriptions |
| `<figure>` | Self-contained media | Images, diagrams with `<figcaption>` |
| `<blockquote>` | Quotations | Extended quotes with optional `<cite>` |
| `<time>` | Dates/times | Use `datetime` attribute for machine reading |
| `<address>` | Contact info | Author/owner contact information |
| `<mark>` | Highlighted text | Search results, important text |
| `<details>` | Collapsible content | With `<summary>` for expandable sections |

### Interactive Elements
| Element | Purpose | Usage Rules |
|---------|---------|-------------|
| `<button>` | Clickable actions | Actions that don't navigate |
| `<a>` | Links | Navigation, use `href` attribute |
| `<form>` | User input | Always with proper `<label>` elements |
| `<input>` | Form fields | Use correct `type` attribute |
| `<select>` | Dropdowns | With `<option>` elements |
| `<textarea>` | Multi-line text | For longer text input |
| `<dialog>` | Modal dialogs | Native modal functionality |

## 🎯 Mandatory Rules for LLMs

### 1. Heading Hierarchy
```html
<!-- ✅ CORRECT: Proper hierarchy -->
<h1>Main Title</h1>
  <h2>Section Title</h2>
    <h3>Subsection Title</h3>

<!-- ❌ WRONG: Skipping levels -->
<h1>Main Title</h1>
  <h3>Section Title</h3> <!-- Skipped h2! -->
```

### 2. Lists for Related Items
```html
<!-- ✅ CORRECT: Semantic list -->
<nav>
  <ul>
    <li><a href="/home">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>

<!-- ❌ WRONG: Divs for list items -->
<nav>
  <div><a href="/home">Home</a></div>
  <div><a href="/about">About</a></div>
</nav>
```

### 3. Forms with Proper Labels
```html
<!-- ✅ CORRECT: Accessible form -->
<form>
  <label for="email">Email:</label>
  <input type="email" id="email" name="email" required>

  <fieldset>
    <legend>Preferences</legend>
    <label>
      <input type="checkbox" name="newsletter">
      Subscribe to newsletter
    </label>
  </fieldset>

  <button type="submit">Submit</button>
</form>

<!-- ❌ WRONG: Missing labels and semantic structure -->
<form>
  <input type="text" placeholder="Email">
  <div onclick="submit()">Submit</div>
</form>
```

### 4. Buttons vs Links
```html
<!-- ✅ CORRECT: Proper usage -->
<a href="/page">Navigate to page</a>
<button onclick="deleteItem()">Delete</button>

<!-- ❌ WRONG: Misused elements -->
<div onclick="navigate()">Go to page</div>
<a href="#" onclick="deleteItem()">Delete</a>
```

### 5. Time Elements with Machine-Readable Format
```html
<!-- ✅ CORRECT: Machine and human readable -->
<time datetime="2025-01-13T10:00:00Z">
  January 13, 2025 at 10:00 AM
</time>

<!-- ❌ WRONG: No machine-readable format -->
<span>Jan 13, 2025</span>
```

## 🏗️ Component Templates

### Blog Post Article
```html
<article>
  <header>
    <h2>Article Title</h2>
    <time datetime="2025-01-13">January 13, 2025</time>
    <address>By <a href="/author">Author Name</a></address>
  </header>

  <section>
    <p>Article content...</p>
  </section>

  <footer>
    <p>Tags: <a href="/tag/web">Web</a>, <a href="/tag/html">HTML</a></p>
  </footer>
</article>
```

### Navigation Menu
```html
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/products">Products</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

### Card Component
```html
<article class="card">
  <header>
    <h3>Card Title</h3>
  </header>
  <img src="image.jpg" alt="Descriptive text">
  <p>Card description text...</p>
  <footer>
    <button type="button">Action</button>
  </footer>
</article>
```

### Modal Dialog
```html
<dialog id="modal" aria-labelledby="modal-title">
  <header>
    <h2 id="modal-title">Modal Title</h2>
    <button type="button" aria-label="Close" onclick="closeModal()">×</button>
  </header>
  <main>
    <p>Modal content...</p>
  </main>
  <footer>
    <button type="button" onclick="closeModal()">Cancel</button>
    <button type="button" onclick="confirm()">Confirm</button>
  </footer>
</dialog>
```

## 🚀 React/Next.js Semantic Components

### Semantic React Component Example
```tsx
const ArticleCard: React.FC<ArticleProps> = ({ title, date, author, content, tags }) => {
  return (
    <article className="border rounded-lg p-4">
      <header className="mb-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex gap-4 text-sm text-gray-600">
          <time dateTime={date}>
            {new Date(date).toLocaleDateString()}
          </time>
          <address className="not-italic">
            By <a href={`/author/${author.id}`}>{author.name}</a>
          </address>
        </div>
      </header>

      <section className="prose">
        {content}
      </section>

      <footer className="mt-4 pt-4 border-t">
        <nav aria-label="Article tags">
          <ul className="flex gap-2">
            {tags.map(tag => (
              <li key={tag}>
                <a href={`/tag/${tag}`} className="text-blue-600 hover:underline">
                  #{tag}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </article>
  );
};
```

## 🎨 Accessibility Enhancements

### ARIA Labels (Use Only When Necessary)
```html
<!-- ✅ Use semantic HTML first -->
<nav>...</nav>

<!-- ✅ Add ARIA only for clarification -->
<nav aria-label="Breadcrumb">...</nav>
<nav aria-label="Main navigation">...</nav>

<!-- ❌ Don't use ARIA to fix bad HTML -->
<div role="navigation">...</div> <!-- Just use <nav>! -->
```

### Landmark Roles (Implicit in Semantic HTML)
| Element | Implicit Role | Notes |
|---------|--------------|-------|
| `<header>` | banner | When not in article/section |
| `<nav>` | navigation | Always |
| `<main>` | main | Always |
| `<aside>` | complementary | Always |
| `<footer>` | contentinfo | When not in article/section |
| `<form>` | form | When has accessible name |
| `<section>` | region | When has accessible name |

## 📊 Structured Data Enhancement

### Add JSON-LD for Rich Snippets
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title",
  "datePublished": "2025-01-13",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  }
}
</script>
```

## ✅ Validation Checklist

Before generating HTML, verify:

- [ ] Only ONE `<h1>` per page
- [ ] Heading hierarchy is maintained (no skipped levels)
- [ ] All form inputs have associated `<label>` elements
- [ ] Images have meaningful `alt` attributes
- [ ] Links have descriptive text (not "click here")
- [ ] Lists are used for grouped items
- [ ] Buttons are used for actions, links for navigation
- [ ] Time elements include `datetime` attribute
- [ ] Main content is wrapped in `<main>`
- [ ] Navigation is wrapped in `<nav>`
- [ ] Self-contained content uses `<article>`
- [ ] Thematic sections use `<section>`
- [ ] No empty elements (especially headings and paragraphs)

## 🚫 Anti-Patterns to Avoid

### Never Do This:
```html
<!-- ❌ Div soup -->
<div class="container">
  <div class="header">
    <div class="nav">...</div>
  </div>
  <div class="content">...</div>
</div>

<!-- ❌ Meaningless classes instead of semantic elements -->
<span class="heading-large">Title</span>

<!-- ❌ Click handlers on non-interactive elements -->
<div onclick="doSomething()">Click me</div>

<!-- ❌ Empty elements for styling -->
<p>&nbsp;</p>
<h2></h2>

<!-- ❌ Tables for layout -->
<table>
  <tr>
    <td>Navigation</td>
    <td>Content</td>
  </tr>
</table>
```

## 📚 Resources

- [MDN HTML Elements Reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Element)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Schema.org Structured Data](https://schema.org/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)

## Implementation Date
**Created**: January 13, 2025
**Purpose**: Ensure all LLM-generated HTML follows semantic best practices for accessibility, SEO, and future-proofing.

---

**Remember**: Semantic HTML is not optional—it's the foundation of professional, accessible, and future-proof web development.