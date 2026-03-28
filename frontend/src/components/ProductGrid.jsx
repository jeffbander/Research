const products = [
  {
    id: 1,
    name: 'Air Max Pulse',
    category: 'Running',
    price: 189,
    originalPrice: 249,
    rating: 4.9,
    reviews: 128,
    colors: ['#1a1a1a', '#ffffff', '#dc2626'],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 2,
    name: 'Ultra Boost 24',
    category: 'Lifestyle',
    price: 199,
    originalPrice: null,
    rating: 4.8,
    reviews: 89,
    colors: ['#ffffff', '#f5f5f4', '#78716c'],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 3,
    name: 'Cloud Runner Pro',
    category: 'Performance',
    price: 165,
    originalPrice: 220,
    rating: 4.7,
    reviews: 256,
    colors: ['#0ea5e9', '#1a1a1a', '#22c55e'],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 4,
    name: 'Street Elite X',
    category: 'Basketball',
    price: 215,
    originalPrice: null,
    rating: 4.9,
    reviews: 312,
    colors: ['#1a1a1a', '#dc2626', '#ffffff'],
    isNew: false,
    isBestseller: true,
  },
  {
    id: 5,
    name: 'Vapor Glide',
    category: 'Running',
    price: 175,
    originalPrice: null,
    rating: 4.6,
    reviews: 67,
    colors: ['#f97316', '#1a1a1a', '#a855f7'],
    isNew: true,
    isBestseller: false,
  },
  {
    id: 6,
    name: 'Classic Retro 90',
    category: 'Lifestyle',
    price: 145,
    originalPrice: 180,
    rating: 4.8,
    reviews: 423,
    colors: ['#ffffff', '#1a1a1a', '#059669'],
    isNew: false,
    isBestseller: true,
  },
];

const ProductCard = ({ product }) => {
  return (
    <div className="card-product group cursor-pointer">
      {/* Image Container */}
      <div className="relative aspect-square bg-gradient-to-br from-neutral-100 to-neutral-200 p-6 overflow-hidden">
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {product.isNew && (
            <span className="px-3 py-1 text-xs font-semibold bg-neutral-900 text-white rounded-full">
              New
            </span>
          )}
          {product.isBestseller && (
            <span className="px-3 py-1 text-xs font-semibold bg-primary-500 text-white rounded-full">
              Bestseller
            </span>
          )}
          {product.originalPrice && (
            <span className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
              Sale
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-neutral-900 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>

        {/* Product Image Placeholder */}
        <div className="w-full h-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-500">
          <div className="w-3/4 h-3/4 bg-gradient-to-br from-neutral-300 to-neutral-400 rounded-2xl flex items-center justify-center shadow-xl transform -rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l1.5 1.5L3 12l1.5 1.5L3 15l9-6 9 6-1.5-1.5L21 12l-1.5-1.5L21 9l-9 6-9-6z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6">
        <p className="text-sm text-neutral-500 mb-1">{product.category}</p>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{product.name}</h3>

        {/* Colors */}
        <div className="flex items-center gap-2 mb-3">
          {product.colors.map((color, index) => (
            <button
              key={index}
              className="w-5 h-5 rounded-full border-2 border-neutral-200 hover:border-neutral-400 transition-colors"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-neutral-200'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <span className="text-sm text-neutral-500">({product.reviews})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-neutral-900">${product.price}</span>
          {product.originalPrice && (
            <span className="text-sm text-neutral-400 line-through">${product.originalPrice}</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button className="w-full mt-4 py-3 bg-neutral-900 text-white rounded-full font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-neutral-800">
          Add to Cart
        </button>
      </div>
    </div>
  );
};

const ProductGrid = () => {
  return (
    <section id="new" className="section-padding bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 text-sm font-semibold text-neutral-700 bg-neutral-100 rounded-full mb-4">
            Featured Products
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Trending Now
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Discover our most popular sneakers, handpicked for style-conscious individuals who demand both comfort and aesthetics.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {['All', 'Running', 'Lifestyle', 'Basketball', 'Performance'].map((tab, index) => (
            <button
              key={tab}
              className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                index === 0
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {/* Load More Button */}
        <div className="text-center mt-16">
          <button className="btn-secondary">
            View All Products
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
