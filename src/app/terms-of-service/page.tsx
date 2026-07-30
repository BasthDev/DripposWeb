import { AlertTriangle, CreditCard, FileText, Gavel, Shield, Users } from "lucide-react";

export const metadata = {
  title: "Terms of Service - DripPOS",
  description: "Read the terms and conditions for using DripPOS services",
};

export default function TermsOfServicePage() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        {/* Header */}
        <div className="legal-header">
          <div className="legal-header-icon">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="legal-title">Terms of Service</h1>
            <p className="legal-date">Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <p className="legal-intro">
          Welcome to DripPOS. By using our Point of Sale (POS) application, you agree to these Terms of Service ("Terms"). Please read them carefully as they govern your use of our service.
        </p>
      </div>

      {/* Content Sections */}
      <div className="legal-content">
        {/* Introduction */}
        <Section
          title="1. Introduction"
          icon={<FileText className="w-6 h-6" />}
          content={
            <p className="legal-text">
              Welcome to DripPOS. By using our Point of Sale (POS) application, you agree to these Terms of Service ("Terms"). Please read them carefully as they govern your use of our service.
            </p>
          }
        />

        {/* Acceptance of Terms */}
        <Section
          title="2. Acceptance of Terms"
          icon={<Shield className="w-6 h-6" />}
          content={
            <p className="legal-text">
              By downloading, accessing, or using DripPOS, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use our service.
            </p>
          }
        />

        {/* Service Description */}
        <Section
          title="3. Service Description"
          icon={<FileText className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">DripPOS is a mobile Point of Sale application designed for businesses to:</p>
              <ul className="legal-list">
                <li>Process sales transactions</li>
                <li>Manage product inventory</li>
                <li>Track orders and customer information</li>
                <li>Generate reports and analytics</li>
                <li>Sync data across devices</li>
                <li>Manage staff accounts and permissions</li>
              </ul>
            </div>
          }
        />

        {/* User Accounts */}
        <Section
          title="4. User Accounts"
          icon={<Users className="w-6 h-6" />}
          content={
            <div className="legal-subsection">
              <Subsection title="4.1 Account Creation" content={
                <div>
                  <p className="legal-text mb-4">To use DripPOS, you must create an account. You are responsible for:</p>
                  <ul className="legal-list">
                    <li>Providing accurate and complete information</li>
                    <li>Maintaining the security of your account credentials</li>
                    <li>All activities that occur under your account</li>
                    <li>Notifying us immediately of unauthorized access</li>
                  </ul>
                </div>
              } />

              <Subsection title="4.2 Staff Accounts" content={
                <div>
                  <p className="legal-text mb-4">Business owners can create staff accounts with limited permissions. Staff members must:</p>
                  <ul className="legal-list">
                    <li>Use only their assigned PIN for authentication</li>
                    <li>Not share their PIN with others</li>
                    <li>Use the system only for authorized business purposes</li>
                  </ul>
                </div>
              } />
            </div>
          }
        />

        {/* Subscription and Payment */}
        <Section
          title="5. Subscription and Payment"
          icon={<CreditCard className="w-6 h-6" />}
          content={
            <div className="legal-subsection">
              <Subsection title="5.1 Subscription Plans" content={
                <p className="legal-text">
                  DripPOS offers various subscription plans with different features and pricing. Subscription fees are charged on a recurring basis (monthly or annually) as specified in the plan details.
                </p>
              } />

              <Subsection title="5.2 Free Trial" content={
                <p className="legal-text">
                  New users may be eligible for a free trial period. After the trial ends, you will be automatically charged according to your selected plan unless you cancel before the trial expires.
                </p>
              } />

              <Subsection title="5.3 Payment Processing" content={
                <p className="legal-text">
                  Payments are processed securely through third-party payment providers (Paddle, RevenueCat). By subscribing, you agree to their terms and conditions.
                </p>
              } />

              <Subsection title="5.4 Cancellation" content={
                <p className="legal-text">
                  You may cancel your subscription at any time. Cancellation will take effect at the end of the current billing period. No refunds will be provided for partial months or unused portions of your subscription.
                </p>
              } />

              <Subsection title="5.5 Price Changes" content={
                <p className="legal-text">
                  We reserve the right to modify subscription prices at any time. Price changes will be communicated to you at least 30 days in advance and will apply to subsequent billing periods.
                </p>
              } />
            </div>
          }
        />

        {/* User Responsibilities */}
        <Section
          title="6. User Responsibilities"
          icon={<Shield className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">As a user of DripPOS, you agree to:</p>
              <ul className="legal-list">
                <li>Use the service only for legitimate business purposes</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Not attempt to reverse engineer or hack the application</li>
                <li>Not use the service for fraudulent activities</li>
                <li>Maintain accurate business records and inventory</li>
                <li>Respect the privacy and security of customer data</li>
                <li>Not interfere with the operation of the service</li>
              </ul>
            </div>
          }
        />

        {/* Intellectual Property */}
        <Section
          title="7. Intellectual Property"
          icon={<Shield className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">DripPOS and all related content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws. You may not:</p>
              <ul className="legal-list">
                <li>Copy, modify, or distribute the application</li>
                <li>Remove any copyright or proprietary notices</li>
                <li>Use our trademarks without permission</li>
                <li>Create derivative works based on our service</li>
              </ul>
            </div>
          }
        />

        {/* Data Ownership */}
        <Section
          title="8. Data Ownership"
          icon={<FileText className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">You retain ownership of all business data you input into DripPOS, including:</p>
              <ul className="legal-list">
                <li>Product information and inventory data</li>
                <li>Customer information and order history</li>
                <li>Sales transactions and financial records</li>
                <li>Business settings and preferences</li>
              </ul>
              <p className="legal-text mt-4">
                We provide tools for you to export your data at any time. Upon account termination, you may request your data to be exported or deleted.
              </p>
            </div>
          }
        />

        {/* Service Availability */}
        <Section
          title="9. Service Availability"
          icon={<AlertTriangle className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">We strive to maintain high service availability but do not guarantee:</p>
              <ul className="legal-list">
                <li>Uninterrupted or error-free operation</li>
                <li>That defects will be corrected</li>
                <li>Compatibility with all devices or platforms</li>
              </ul>
              <p className="legal-text mt-4">
                We may temporarily suspend the service for maintenance, updates, or other operational reasons. We will provide advance notice when possible.
              </p>
            </div>
          }
        />

        {/* Limitation of Liability */}
        <Section
          title="10. Limitation of Liability"
          icon={<Gavel className="w-6 h-6" />}
          content={
            <div>
              <p className="legal-text mb-4">To the maximum extent permitted by law, DripPOS shall not be liable for:</p>
              <ul className="legal-list">
                <li>Any indirect, incidental, or consequential damages</li>
                <li>Loss of data, revenue, or business opportunities</li>
                <li>Damages exceeding the amount you paid for the service</li>
              </ul>
              <p className="legal-text mt-4">
                In no event shall our total liability exceed the amount paid by you for the service in the twelve months preceding the claim.
              </p>
            </div>
          }
        />

        {/* Termination */}
        <Section
          title="11. Termination"
          icon={<AlertTriangle className="w-6 h-6" />}
          content={
            <div className="legal-subsection">
              <Subsection title="11.1 Termination by You" content={
                <p className="legal-text">
                  You may terminate your account at any time by contacting us or using the account deletion feature in the app.
                </p>
              } />

              <Subsection title="11.2 Termination by Us" content={
                <div>
                  <p className="legal-text mb-4">We reserve the right to suspend or terminate your account if:</p>
                  <ul className="legal-list">
                    <li>You violate these Terms of Service</li>
                    <li>Your payment method fails</li>
                    <li>You engage in fraudulent activities</li>
                    <li>We cease to offer the service</li>
                  </ul>
                </div>
              } />
            </div>
          }
        />

        {/* Governing Law */}
        <Section
          title="12. Governing Law"
          icon={<Gavel className="w-6 h-6" />}
          content={
            <p className="legal-text">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which DripPOS is headquartered, without regard to its conflict of law provisions.
            </p>
          }
        />

        {/* Contact Information */}
        <Section
          title="13. Contact Information"
          icon={<Shield className="w-6 h-6" />}
          content={
            <div className="legal-contact">
              <p className="legal-text mb-4">For questions about these Terms of Service, please contact us:</p>
              <div className="legal-contact-info">
                <p className="legal-contact-item">Email: legal@drippos.com</p>
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