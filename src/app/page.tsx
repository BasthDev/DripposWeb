import { ArrowRight, BarChart2, CheckCircle2, CreditCard, Lock, Printer, Shield, ShoppingBag, Smartphone, TrendingUp, Users, Zap } from "lucide-react";
import Link from "next/link";
import React from "react";

// Plan configurations matching mobile app
const PLAN_CONFIGS = [
  // Basic Plans - Offline only
  {
    id: "basic_1month",
    tier: "basic",
    name: "Basic - 1 Month",
    description: "Offline only",
    duration: 1,
    price: 3.5,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "basic_3month",
    tier: "basic",
    name: "Basic - 3 Months",
    description: "Offline only (Save 10%)",
    duration: 3,
    price: 9.45,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "basic_6month",
    tier: "basic",
    name: "Basic - 6 Months",
    description: "Offline only (Save 15%)",
    duration: 6,
    price: 17.85,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  {
    id: "basic_12month",
    tier: "basic",
    name: "Basic - 12 Months",
    description: "Offline only (Save 20%)",
    duration: 12,
    price: 33.6,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
  },
  // Pro Plans - Full features
  {
    id: "pro_1month",
    tier: "pro",
    name: "Pro - 1 Month",
    description: "Full features with sync",
    duration: 1,
    price: 10.5,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
  {
    id: "pro_3month",
    tier: "pro",
    name: "Pro - 3 Months",
    description: "Full features (Save 10%)",
    duration: 3,
    price: 28.35,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
  {
    id: "pro_6month",
    tier: "pro",
    name: "Pro - 6 Months",
    description: "Full features (Save 15%)",
    duration: 6,
    price: 53.55,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
  {
    id: "pro_12month",
    tier: "pro",
    name: "Pro - 12 Months",
    description: "Full features (Save 20%)",
    duration: 12,
    price: 100.8,
    currency: "USD",
    features: [
      "Full POS functionality",
      "Offline mode",
      "Local data storage",
      "Basic reporting",
    ],
    proFeatures: [
      "Cloud sync across devices",
      "Web analytics dashboard",
      "Employee management",
      "Advanced management tools",
      "Priority support",
    ],
  },
];

function formatPrice(price: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(price);
}

function calculateMonthlyPrice(price: number, duration: number): string {
  const monthly = price / duration;
  return formatPrice(monthly, "USD") + "/month";
}

export const metadata = {
  title: "DripPOS - Modern Point of Sale System",
  description: "Powerful, user-friendly POS system for cafes, restaurants, and retail businesses. Manage orders, inventory, and staff with ease.",
};

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Zap className="w-4 h-4" />
            <span>Fast • Reliable • Secure</span>
          </div>
          <h1 className="hero-title">
            Modern POS for Your <span className="hero-highlight">Growing Business</span>
          </h1>
          <p className="hero-subtitle">
            Streamline your operations with our powerful point of sale system. 
            Perfect for cafes, restaurants, and retail businesses of all sizes.
          </p>
          <div className="hero-cta">
            <Link href="/login" className="btn btn-primary btn-lg">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link href="#features" className="btn btn-secondary btn-lg">
              Learn More
            </Link>
          </div>
          <div className="hero-trust">
            <div className="trust-item">
              <Shield className="w-5 h-5" />
              <span>Bank-Level Security</span>
            </div>
            <div className="trust-item">
              <TrendingUp className="w-5 h-5" />
              <span>Real-time Analytics</span>
            </div>
            <div className="trust-item">
              <Smartphone className="w-5 h-5" />
              <span>Works Offline</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Powerful Features</h2>
            <p className="section-subtitle">Everything you need to run your business efficiently</p>
          </div>
          <div className="features-grid">
            <FeatureCard
              icon={<ShoppingBag className="w-8 h-8" />}
              title="Easy Order Management"
              description="Process orders quickly with our intuitive interface. Track sales, manage tables, and handle takeaways seamlessly."
            />
            <FeatureCard
              icon={<BarChart2 className="w-8 h-8" />}
              title="Real-time Analytics"
              description="Get instant insights into your business performance. Track sales, inventory, and staff productivity in real-time."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8" />}
              title="Staff Management"
              description="Manage your team with ease. Create staff accounts, track hours, and control access permissions."
            />
            <FeatureCard
              icon={<Printer className="w-8 h-8" />}
              title="Smart Printing"
              description="Print receipts and kitchen orders automatically. Support for multiple printers and customizable templates."
            />
            <FeatureCard
              icon={<Lock className="w-8 h-8" />}
              title="Secure Data Storage"
              description="Your data is encrypted and stored securely. Works offline and syncs when you're online."
            />
            <FeatureCard
              icon={<CreditCard className="w-8 h-8" />}
              title="Payment Integration"
              description="Accept payments via QRIS, cash, and transfer. Integrated with popular payment providers."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Get started in minutes, not hours</p>
          </div>
          <div className="steps">
            <Step
              number={1}
              title="Create Your Account"
              description="Sign up for free and set up your business profile. No credit card required for trial."
            />
            <Step
              number={2}
              title="Configure Your Store"
              description="Add your products, set prices, and configure your business settings. Import from CSV if needed."
            />
            <Step
              number={3}
              title="Start Taking Orders"
              description="Begin processing orders immediately. Your staff can use PIN-based access for quick service."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Choose Your Plan</h2>
            <p className="section-subtitle">Start with a 30-day free trial, upgrade when you grow</p>
          </div>
          <div className="pricing-grid">
            {/* Free Trial Card */}
            <PricingCard
              title="Free Trial"
              price="0"
              period="30 days"
              features={[
                "All core features",
                "Pro features",
                "Cloud sync",
                "Web analytics dashboard",
                "Employee management",
                "Priority support",
              ]}
              cta="Start Free Trial"
              href="/login"
              popular={false}
            />
            {/* Popular Pro Plan */}
            <PricingCard
              title="Pro - 1 Month"
              price={formatPrice(10.5)}
              period="month"
              features={[
                "Full POS functionality",
                "Offline mode",
                "Local data storage",
                "Basic reporting",
              ]}
              proFeatures={[
                "Cloud sync across devices",
                "Web analytics dashboard",
                "Employee management",
                "Advanced management tools",
                "Priority support",
              ]}
              cta="Get Started"
              href="/login"
              popular={true}
            />
            {/* Best Value Pro Plan */}
            <PricingCard
              title="Pro - 12 Months"
              price={formatPrice(100.8)}
              period="year"
              features={[
                "Full POS functionality",
                "Offline mode",
                "Local data storage",
                "Basic reporting",
              ]}
              proFeatures={[
                "Cloud sync across devices",
                "Web analytics dashboard",
                "Employee management",
                "Advanced management tools",
                "Priority support",
              ]}
              badge="Save 20%"
              cta="Get Started"
              href="/login"
              popular={false}
            />
          </div>
          
          {/* Additional Plan Options */}
          <div className="section-header" style={{ marginTop: "60px" }}>
            <h3 className="section-title">More Plan Options</h3>
            <p className="section-subtitle">Choose the duration that works for you</p>
          </div>
          
          <div className="pricing-grid">
            {PLAN_CONFIGS.filter(plan => plan.tier === "basic").map((plan) => (
              <PricingCard
                key={plan.id}
                title={plan.name}
                price={formatPrice(plan.price)}
                period={plan.duration === 1 ? "month" : `${plan.duration} months`}
                features={plan.features}
                badge={plan.duration >= 6 ? `Save ${plan.duration === 3 ? "10%" : plan.duration === 6 ? "15%" : "20%"}` : undefined}
                cta="Get Started"
                href="/login"
                popular={false}
              />
            ))}
          </div>
          
          <div className="pricing-grid" style={{ marginTop: "30px" }}>
            {PLAN_CONFIGS.filter(plan => plan.tier === "pro" && plan.duration !== 1 && plan.duration !== 12).map((plan) => (
              <PricingCard
                key={plan.id}
                title={plan.name}
                price={formatPrice(plan.price)}
                period={plan.duration === 1 ? "month" : `${plan.duration} months`}
                features={plan.features}
                proFeatures={plan.proFeatures}
                badge={plan.duration >= 6 ? `Save ${plan.duration === 3 ? "10%" : plan.duration === 6 ? "15%" : "20%"}` : undefined}
                cta="Get Started"
                href="/login"
                popular={false}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section section-alt">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Trusted by Businesses</h2>
            <p className="section-subtitle">See what our customers say about DripPOS</p>
          </div>
          <div className="testimonials-grid">
            <TestimonialCard
              quote="DripPOS transformed how we manage our cafe. The staff can take orders quickly and we've reduced errors by 80%."
              author="Sarah Chen"
              business="The Coffee Corner"
            />
            <TestimonialCard
              quote="The inventory management is a game-changer. We always know what's in stock and when to reorder."
              author="Michael Brown"
              business="Fresh Market"
            />
            <TestimonialCard
              quote="Customer support is excellent. They helped us set up everything and are always quick to respond."
              author="Emily Rodriguez"
              business="Urban Kitchen"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section">
        <div className="container">
          <div className="cta-section">
            <h2 className="cta-title">Ready to Transform Your Business?</h2>
            <p className="cta-subtitle">
              Join hundreds of businesses already using DripPOS to streamline their operations
            </p>
            <Link href="/login" className="btn btn-primary btn-xl">
              Start Your Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>DripPOS</h3>
              <p>Modern Point of Sale System</p>
            </div>
            <div className="footer-links">
              <Link href="/privacy-policy" className="footer-link">Privacy Policy</Link>
              <Link href="/terms-of-service" className="footer-link">Terms of Service</Link>
              <Link href="/login" className="footer-link">Login</Link>
            </div>
            <div className="footer-copy">
              <p>© {new Date().getFullYear()} DripPOS. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="step">
      <div className="step-number">{number}</div>
      <div className="step-content">
        <h3 className="step-title">{title}</h3>
        <p className="step-description">{description}</p>
      </div>
    </div>
  );
}

function PricingCard({ 
  title, 
  price, 
  period, 
  features, 
  proFeatures, 
  badge, 
  cta, 
  href, 
  popular 
}: { 
  title: string; 
  price: string; 
  period: string; 
  features: string[]; 
  proFeatures?: string[];
  badge?: string;
  cta: string; 
  href: string; 
  popular: boolean 
}) {
  return (
    <div className={`pricing-card ${popular ? 'pricing-card-popular' : ''}`}>
      {badge && <div className="pricing-badge">{badge}</div>}
      {popular && !badge && <div className="pricing-badge">Most Popular</div>}
      <h3 className="pricing-title">{title}</h3>
      <div className="pricing-price">
        <span className="pricing-amount">{price}</span>
        <span className="pricing-period">/{period}</span>
      </div>
      <ul className="pricing-features">
        {features.map((feature, index) => (
          <li key={index} className="pricing-feature">
            <CheckCircle2 className="w-4 h-4" />
            {feature}
          </li>
        ))}
        {proFeatures && proFeatures.map((feature, index) => (
          <li key={`pro-${index}`} className="pricing-feature pro-feature">
            <Zap className="w-4 h-4" />
            {feature}
          </li>
        ))}
      </ul>
      <Link href={href} className={`btn ${popular ? 'btn-primary' : 'btn-secondary'} btn-block`}>
        {cta}
      </Link>
    </div>
  );
}

function TestimonialCard({ quote, author, business }: { quote: string; author: string; business: string }) {
  return (
    <div className="testimonial-card">
      <p className="testimonial-quote">"{quote}"</p>
      <div className="testimonial-author">
        <div className="testimonial-name">{author}</div>
        <div className="testimonial-business">{business}</div>
      </div>
    </div>
  );
}