/* Landing page preserved from the original application. */
export default function LandingPage({ navigateAuth }) {
  return (
        <div className="landing-site">
          <section className="landing-hero">
            <header className="public-header">
              <a
                className="public-brand"
                href="/"
                onClick={(event) => {
                  event.preventDefault();
                  navigateAuth("landing");
                }}
              >
                <img
                  className="public-logo"
                  src="/bizbuddy-logo.png"
                  alt="BizBuddy — Every chat. One inbox. Done for you."
                />
              </a>
              <nav aria-label="Main navigation">
                <a href="#features">Platform</a>
                <a href="#how-it-works">How it works</a>
                <a href="#about">About</a>
              </nav>
              <div className="public-header-actions">
                <button
                  className="public-signin"
                  onClick={() => navigateAuth("signin")}
                >
                  Sign in
                </button>
                <button
                  className="public-start"
                  onClick={() => navigateAuth("register")}
                >
                  Get started <span>↗</span>
                </button>
              </div>
            </header>

            <main className="landing-hero-main">
              <div className="landing-copy">
                <p className="landing-eyebrow">
                  <span /> THE BUSINESS OS FOR INDEPENDENT RETAILERS
                </p>
                <h1>
                  Make room for
                  <br />
                  <em>better business.</em>
                </h1>
                <p className="landing-description">
                  Keep orders moving, care for your customers, and let your AI
                  concierge take busywork off your hands.
                </p>
                <div className="landing-hero-actions">
                  <button
                    className="hero-primary"
                    onClick={() => navigateAuth("register")}
                  >
                    Get started for free <span>↗</span>
                  </button>
                  <a className="hero-secondary" href="#features">
                    Explore the platform <span>↓</span>
                  </a>
                </div>
              </div>

              <div
                className="hero-showcase"
                aria-label="BizBuddy platform features"
              >
                <article className="showcase-card showcase-orders">
                  <div className="showcase-card-heading">
                    <span className="showcase-icon">↗</span>
                    <span>ORDER FLOW</span>
                  </div>
                  <div className="order-flow">
                    <span>New</span>
                    <i />
                    <span>Confirmed</span>
                    <i />
                    <span>Complete</span>
                  </div>
                  <small>Keep every order moving forward.</small>
                </article>
                <article className="showcase-card showcase-concierge">
                  <div className="showcase-card-heading">
                    <span className="showcase-icon sparkle">✳</span>
                    <span>AI CONCIERGE</span>
                  </div>
                  <p>Thoughtful customer replies, right when you need them.</p>
                  <span className="showcase-link">
                    A little more time for you <b>↗</b>
                  </span>
                </article>
                <article className="showcase-card showcase-workspace">
                  <span className="workspace-label">YOUR WORKSPACE</span>
                  <strong>
                    Everything in
                    <br />
                    its right place.
                  </strong>
                  <div className="workspace-pills">
                    <span>Orders</span>
                    <span>Profiles</span>
                    <span>AI</span>
                  </div>
                </article>
              </div>
              <div className="landing-hero-footer">
                <span>Thoughtful tools for the way you work.</span>
                <a href="#features">SCROLL TO EXPLORE ↓</a>
              </div>
            </main>
          </section>

          <div className="landing-trust-strip" aria-label="BizBuddy tools">
            <span>One workspace for</span>
            <b>ORDERS</b>
            <i />
            <b>CLIENTS</b>
            <i />
            <b>AI CONCIERGE</b>
            <i />
            <b>YOUR BUSINESS</b>
          </div>

          <section className="landing-features" id="features">
            <div className="landing-section-heading" id="about">
              <p className="section-eyebrow">
                A CALMER WAY TO RUN YOUR BUSINESS
              </p>
              <h2>
                Less juggling.
                <br />
                <span>More of what matters.</span>
              </h2>
              <p>
                BizBuddy brings the everyday work of your business into one
                clear, connected workspace.
              </p>
            </div>
            <div className="landing-feature-cards" id="how-it-works">
              <article className="landing-feature-card feature-orders">
                <span className="feature-number">01 / ORDERS</span>
                <div className="feature-visual order-visual">
                  <span>Order received</span>
                  <i>→</i>
                  <b>Keep it moving</b>
                </div>
                <h3>Stay on top of every order.</h3>
                <p>
                  Create orders, update their status, and see what needs your
                  attention.
                </p>
              </article>
              <article className="landing-feature-card feature-profiles">
                <span className="feature-number">02 / WORKSPACE</span>
                <div className="feature-visual profile-visual">
                  <img
                    className="profile-dot"
                    src="/bizbuddy-icon.png"
                    alt=""
                  />
                  <span>
                    Your details, your business,
                    <br />
                    all in one place.
                  </span>
                </div>
                <h3>Your business, your way.</h3>
                <p>
                  Keep your account and business details connected to your
                  workspace.
                </p>
              </article>
              <article className="landing-feature-card feature-ai">
                <span className="feature-number">03 / AI CONCIERGE</span>
                <div className="feature-visual ai-visual">
                  <span>✳</span>
                  <b>A helpful hand, on demand.</b>
                </div>
                <h3>Meet your AI concierge.</h3>
                <p>
                  Get help drafting customer replies and handling everyday
                  questions.
                </p>
              </article>
            </div>
          </section>

          <footer className="landing-footer">
            <a
              className="public-brand"
              href="/"
              onClick={(event) => {
                event.preventDefault();
                navigateAuth("landing");
              }}
            >
              <img
                className="public-logo"
                src="/bizbuddy-logo.png"
                alt="BizBuddy — Every chat. One inbox. Done for you."
              />
            </a>
            <button onClick={() => navigateAuth("signin")}>
              Sign in <span>↗</span>
            </button>
          </footer>
        </div>
  );
}
