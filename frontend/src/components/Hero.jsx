const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-200 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-neutral-200 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left animate-slide-up">
            <span className="inline-block px-4 py-2 text-sm font-semibold text-neutral-700 bg-neutral-100 rounded-full mb-6">
              New Collection 2026
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-neutral-900 leading-tight mb-6">
              Step Into
              <br />
              <span className="gradient-text">Your Future</span>
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 mb-8 max-w-lg leading-relaxed">
              Discover the perfect blend of style and performance. Premium sneakers designed for those who move forward.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-primary">
                Shop Now
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
              <button className="btn-secondary">
                Explore Collection
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-12 pt-12 border-t border-neutral-200">
              <div>
                <p className="text-3xl font-bold text-neutral-900">50K+</p>
                <p className="text-sm text-neutral-500 mt-1">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-neutral-900">200+</p>
                <p className="text-sm text-neutral-500 mt-1">Unique Styles</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-neutral-900">4.9</p>
                <p className="text-sm text-neutral-500 mt-1">Customer Rating</p>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Sneaker Image */}
          <div className="relative lg:pl-12">
            <div className="relative">
              {/* Main Sneaker Image Placeholder */}
              <div className="relative bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-3xl p-8 aspect-square flex items-center justify-center animate-float">
                <div className="text-center">
                  <div className="w-64 h-64 md:w-80 md:h-80 mx-auto bg-gradient-to-br from-neutral-300 to-neutral-400 rounded-3xl flex items-center justify-center shadow-2xl transform -rotate-12 hover:rotate-0 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l1.5 1.5L3 12l1.5 1.5L3 15l9-6 9 6-1.5-1.5L21 12l-1.5-1.5L21 9l-9 6-9-6z" />
                    </svg>
                  </div>
                  <p className="mt-8 text-neutral-500 font-medium">Air Max Pulse</p>
                  <p className="text-2xl font-bold text-neutral-900 mt-2">$189</p>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-neutral-700">In Stock</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-neutral-900 text-white rounded-2xl shadow-xl p-4 animate-fade-in">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold">25%</span>
                  <span className="text-sm">OFF</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
