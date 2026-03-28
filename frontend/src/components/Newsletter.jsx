const Newsletter = () => {
  return (
    <section className="section-padding bg-neutral-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Stay in the Loop
            </h2>
            <p className="text-lg text-neutral-400 mb-8 max-w-lg">
              Subscribe to our newsletter and be the first to know about new releases, exclusive drops, and special offers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 bg-neutral-800 border border-neutral-700 rounded-full text-white placeholder-neutral-500 focus:outline-none focus:border-white transition-colors"
              />
              <button className="px-8 py-4 bg-white text-neutral-900 font-semibold rounded-full hover:bg-neutral-100 transition-colors">
                Subscribe
              </button>
            </div>
            <p className="text-sm text-neutral-500 mt-4">
              By subscribing, you agree to our Privacy Policy and consent to receive updates.
            </p>
          </div>

          {/* Right Content - Stats/Social Proof */}
          <div className="lg:pl-12">
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-neutral-800 rounded-3xl p-8">
                <p className="text-4xl font-bold text-white mb-2">100K+</p>
                <p className="text-neutral-400">Newsletter Subscribers</p>
              </div>
              <div className="bg-neutral-800 rounded-3xl p-8">
                <p className="text-4xl font-bold text-white mb-2">Weekly</p>
                <p className="text-neutral-400">Exclusive Drops</p>
              </div>
              <div className="bg-neutral-800 rounded-3xl p-8">
                <p className="text-4xl font-bold text-white mb-2">Early</p>
                <p className="text-neutral-400">Access to Sales</p>
              </div>
              <div className="bg-neutral-800 rounded-3xl p-8">
                <p className="text-4xl font-bold text-white mb-2">15%</p>
                <p className="text-neutral-400">First Order Discount</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
