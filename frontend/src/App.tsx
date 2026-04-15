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
        <a className="brand" href="/">
          Collector Shop
        </a>
        <span className="catalog-pill">Browse catalog</span>
      </header>

      <section className="storefront" aria-labelledby="storefront-title">
        <div className="intro">
          <p className="eyebrow">Cards, figures, prints, and rare finds</p>
          <h1 id="storefront-title">Find the piece your shelf is missing.</h1>
        </div>

        <form className="filters" onSubmit={(event) => event.preventDefault()}>
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pokemon, signed, sealed..."
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
        <div className="products" aria-live="polite">
          {isLoading ? (
            <p className="empty">Loading the good stuff...</p>
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
                      <h2>{item.name}</h2>
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
                      <span>{item.stock} in stock</span>
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
            <p className="empty">No matching items yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
