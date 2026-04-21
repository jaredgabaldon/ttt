import { useEffect, useState } from "react";
import type { Category, Item } from "./api";
import { getCategories, getItems, resolveAssetUrl } from "./api";

const DESCRIPTION_LIMIT = 150;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const fallbackImages = [
  "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1606001072882-90d9dcf1d9d1?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=900&q=80"
];

function imageFor(item: Item): string {
  if (item.image) return resolveAssetUrl(item.image);
  return fallbackImages[item.id % fallbackImages.length];
}

function conditionLabel(condition: Item["condition"]): string {
  return condition.replace("_", " ");
}

export default function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(
    new Set()
  );
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [ordering, setOrdering] = useState("name");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadCategories() {
      try {
        const nextCategories = await getCategories();
        if (!ignore) setCategories(nextCategories);
      } catch {
        if (!ignore) {
          setError("Categories could not load. Start the Django API and refresh.");
        }
      }
    }

    void loadCategories();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const nextItems = await getItems({
          category,
          featured: featuredOnly,
          search: search.trim(),
          ordering
        });

        if (!ignore) setItems(nextItems);
      } catch {
        if (!ignore) {
          setError("Items could not load. Start the Django API and refresh.");
          setItems([]);
        }
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    void loadItems();

    return () => {
      ignore = true;
    };
  }, [category, featuredOnly, ordering, search]);

  function toggleDescription(itemId: number) {
    setExpandedDescriptions((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Teri's Toys and Trinkets home">
          <img src="/header-dragon.png" alt="" />
          <span>Teri's Toys and Trinkets</span>
        </a>
        <nav className="header-links" aria-label="Teri's Toys and Trinkets links">
          <a href="https://ebay.us/m/w68zvy" target="_blank" rel="noreferrer">
            eBay
          </a>
          <a
            href="https://www.facebook.com/share/1BZNrSXU5V/"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
          <a href="mailto:teristoysandtrinkets@gmail.com">Email</a>
        </nav>
      </header>

      <section className="storefront" aria-labelledby="storefront-title">
        <div className="intro">
          <p className="eyebrow">Toys, trinkets, artwork, and curious keepsakes</p>
          <h1 id="storefront-title">A little magic for every collection.</h1>
          <p className="intro-copy">
            Browse dragon-guarded treasures, nostalgic toys, shiny little oddities,
            and display-worthy finds.
          </p>
          <p className="intro-copy">
            <span className="contact-highlight">Contact me through email or Facebook messenger.</span>
          </p>
          <p className="intro-copy">
            Payment is accepted by cash, card, PayPal, or Venmo. Items can be
            picked up locally in the Layton, UT area, and shipping is available
            starting at $7 depending on weight and size.
          </p>
        </div>

        <div className="logo-feature" aria-hidden="true">
          <img src="/teris-toys-and-trinkets-logo.png" alt="" />
        </div>

        <form className="filters" onSubmit={(event) => event.preventDefault()}>
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="naruto, grogu, fairies..."
            />
          </label>

          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((nextCategory) => (
                <option key={nextCategory.id} value={nextCategory.slug}>
                  {nextCategory.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sort
            <select
              value={ordering}
              onChange={(event) => setOrdering(event.target.value)}
            >
              <option value="name">Name</option>
              <option value="price">Price low to high</option>
              <option value="-price">Price high to low</option>
              <option value="-created_at">Newest</option>
            </select>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(event) => setFeaturedOnly(event.target.checked)}
            />
            Featured only
          </label>
        </form>
      </section>

      {error && <p className="notice">{error}</p>}

      <section className="catalog" aria-label="Products">
        <div className="section-heading">
          <p className="eyebrow">Current treasures</p>
        </div>

        <div className="products" aria-live="polite">
          {isLoading ? (
            <p className="empty">Gathering the sparkly stuff...</p>
          ) : items.length ? (
            items.map((item) => {
              const description = item.description || "Freshly cataloged and ready.";
              const isLongDescription = description.length > DESCRIPTION_LIMIT;
              const isExpanded = expandedDescriptions.has(item.id);
              const descriptionId = `item-${item.id}-description`;

              return (
                <article className="product" key={item.id}>
                  <img src={imageFor(item)} alt={item.name} />
                  <div className="product-body">
                    <div>
                      <p className="category">{item.category_name}</p>
                      <h3>{item.name}</h3>
                      <p
                        id={descriptionId}
                        className={`description${
                          isLongDescription && !isExpanded ? " collapsed" : ""
                        }`}
                      >
                        {description}
                      </p>
                      {isLongDescription && (
                        <button
                          className="description-toggle"
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={descriptionId}
                          onClick={() => toggleDescription(item.id)}
                        >
                          {isExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>

                    <div className="product-meta">
                      <span>{conditionLabel(item.condition)}</span>
                      <span>{item.stock} available</span>
                    </div>

                    <div className="product-footer">
                      <strong>{money.format(Number(item.price))}</strong>
                      {item.is_featured && <span>Featured</span>}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty">No matching treasures yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
