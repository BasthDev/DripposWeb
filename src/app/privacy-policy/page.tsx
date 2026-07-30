import { Cloud, Database, Eye, Lock, Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - DripPOS",
  description: "Learn how DripPOS collects, uses, and protects your data",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Header */}
        <div className="legal-header">
          <div className="legal-header-icon">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="legal-title">Privacy Policy</h1>
            <p className="legal-date">Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <p className="legal-intro">
          DripPOS is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Point of Sale (POS) application.
        </p>
      </div>

      {/* Content Sections */}
      <div className="legal-content">
        {/* Introduction */}
        <Section
          title="1. Introduction"
          icon={<Shield className="w-6 h-6" />}
          content={
            <p className="legal-text">
              DripPOS ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Point of Sale (POS) application.
            </p>
          }
        />

        {/* Information We Collect */}
        <Section
          title="2. Information We Collect"
          icon={<Database className="w-6 h-6" />}
          content={
            <div className="legal-subsection">
              <Subsection title="2.1 Personal Information" content={
                <p className="legal-text">We collect information you provide directly to us:</p>
              } />
              <ul className="legal-list">
                <li>Account information: Name, email address</li>
                <li>Staff information: Name, PIN for authentication</li>
                <li>Customer information: Names for order tracking</li>
                <li>Contact details: Phone numbers (if provided)</li>
              </ul>

              <Subsection title="2.2 Business Data" content={
                <p className="legal-text">We collect data related to your business operations:</p>
              } />
              <ul className="legal-list">
                <li>Orders and transactions</li>
                <li>Product inventory and pricing</li>
                <li>Payment information (processed securely)</li>
                <li>Staff schedules and activities</li>
                <li>Store settings and preferences</li>
              </ul>

              <Subsection title="2.3 Technical Data" content={
                <p className="legal-text">We automatically collect certain technical information:</p>
              } />
              <ul className="legal-list">
                <li>Device information and app usage data</li>
                <li>Crash reports and performance data</li>
                <li>IP address and location data (approximate)</li>
              </ul>
            </div>
          }
        />

        {/* How We Use Your Information */}
        <Section
          title="3. How We Use Your Information"
          icon={<Lock className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text">We use your information for the following purposes:</p>
              <ul className="legal-list">
                <li>To provide and maintain our POS services</li>
                <li>To process transactions and manage orders</li>
                <li>To authenticate users and secure accounts</li>
                <li>To sync data across your devices via Appwrite</li>
                <li>To manage subscriptions and payments via RevenueCat</li>
                <li>To improve our app functionality and user experience</li>
                <li>To provide customer support</li>
                <li>To comply with legal obligations</li>
              </ul>
            </div>
          }
        />

        {/* Data Storage and Security */}
        <Section
          title="4. Data Storage and Security"
          icon={<Cloud className="w-6 h-6" />}
          content={
            <div className="legal-subsection">
              <Subsection title="4.1 Local Storage" content={
                <p className="legal-text">
                  Your business data is stored locally on your device using SQLite database. This includes orders, products, inventory, and settings. Local data remains on your device and is not automatically transmitted to our servers.
                </p>
              } />

              <Subsection title="4.2 Cloud Storage" content={
                <p className="legal-text">
                  For syncing and backup purposes, we use Appwrite (a secure backend service). Your data is encrypted in transit and at rest. Only you have access to your cloud-stored data through your authenticated account.
                </p>
              } />

              <Subsection title="4.3 Security Measures" content={
                <div>
                  <p className="legal-text">We implement industry-standard security measures:</p>
                  <ul className="legal-list">
                    <li>End-to-end encryption for data transmission</li>
                    <li>Secure authentication with PIN codes</li>
                    <li>Regular security updates and monitoring</li>
                    <li>Access controls and audit logging</li>
                  </ul>
                </div>
              } />
            </div>
          }
        />

        {/* Third-Party Services */}
        <Section
          title="5. Third-Party Services"
          icon={<Database className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text">We use the following third-party services:</p>
              <div className="legal-services">
                <ServiceCard
                  name="Appwrite"
                  description="Backend-as-a-Service for authentication, database, and cloud storage."
                  privacyUrl="https://appwrite.io/privacy"
                />
                <ServiceCard
                  name="RevenueCat"
                  description="Subscription and payment management."
                  privacyUrl="https://www.revenuecat.com/privacy"
                />
                <ServiceCard
                  name="Paddle"
                  description="Payment processing for subscriptions."
                  privacyUrl="https://www.paddle.com/privacy-policy"
                />
              </div>
            </div>
          }
        />

        {/* Data Retention */}
        <Section
          title="6. Data Retention"
          icon={<Database className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">We retain your data for as long as necessary to provide our services:</p>
              <ul className="legal-list">
                <li>Business data: Retained until you delete it</li>
                <li>Account data: Retained until account deletion</li>
                <li>Transaction logs: Retained for 2 years for compliance</li>
                <li>Analytics data: Retained for 1 year</li>
              </ul>
            </div>
          }
        />

        {/* Your Rights */}
        <Section
          title="7. Your Rights"
          icon={<Eye className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">You have the following rights regarding your data:</p>
              <ul className="legal-list">
                <li>Access: Request a copy of your data</li>
                <li>Correction: Update or correct your information</li>
                <li>Deletion: Request deletion of your data</li>
                <li>Export: Export your data in a portable format</li>
                <li>Opt-out: Disable cloud sync and data collection</li>
              </ul>
            </div>
          }
        />

        {/* Contact Information */}
        <Section
          title="8. Contact Us"
          icon={<Shield className="w-6 h-6" />}
          content={
            <div className="legal-contact">
              <p className="legal-text mb-4">If you have questions about this Privacy Policy or your data, please contact us:</p>
              <div className="legal-contact-info">
                <p className="legal-contact-item">Email: privacy@drippos.com</p>
                <p className="legal-contact-item">Website: www.drippos.com</p>
              </div>
            </div>
          }
        />
      </div>

      {/* Footer */}
      <div className="legal-footer">
        <p>© {new Date().getFullYear()} DripPOS. All rights reserved.</p>
      </div>
    </div>
  );
}

function Section({ title, icon, content, children }: { title: string; icon: React.ReactNode; content?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="legal-section">
      <div className="legal-section-header">
        <div className="legal-section-icon">
          {icon}
        </div>
        <h2 className="legal-section-title">{title}</h2>
      </div>
      {content || children}
    </div>
  );
}

function Subsection({ title, content }: { title: string; content: React.ReactNode }) {
  return (
    <div className="legal-subsection">
      <h3 className="legal-subsection-title">{title}</h3>
      {content}
    </div>
  );
}

function ServiceCard({ name, description, privacyUrl }: { name: string; description: string; privacyUrl: string }) {
  return (
    <div className="legal-service-card">
      <h4 className="legal-service-name">{name}</h4>
      <p className="legal-service-description">{description}</p>
      <a href={privacyUrl} target="_blank" rel="noopener noreferrer" className="legal-service-link">
        View Privacy Policy →
      </a>
    </div>
  );
}