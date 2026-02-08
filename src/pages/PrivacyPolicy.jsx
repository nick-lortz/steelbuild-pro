import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ScreenContainer from '@/components/layout/ScreenContainer';
import PageHeader from '@/components/ui/PageHeader';

export default function PrivacyPolicy() {
  return (
    <ScreenContainer>
      <PageHeader title="Privacy Policy" subtitle="Last updated: January 4, 2026" />

      <Card>
        <CardContent className="p-6 space-y-6 text-sm">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground mb-3">
              We collect information necessary to provide construction management services:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Account information (name, email, role)</li>
              <li>Project data (schedules, budgets, drawings, RFIs, change orders)</li>
              <li>Resource and labor information</li>
              <li>Financial and cost tracking data</li>
              <li>Documents and files uploaded to projects</li>
              <li>Usage data and analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide and maintain construction management services</li>
              <li>Process and track project data, schedules, and financials</li>
              <li>Generate reports, analytics, and insights</li>
              <li>Send notifications about project updates and activities</li>
              <li>Improve application functionality and user experience</li>
              <li>Ensure data security and prevent unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Data Storage and Security</h2>
            <p className="text-muted-foreground mb-3">
              Your data is stored securely on Base44 infrastructure with industry-standard encryption. 
              We implement appropriate technical and organizational measures to protect your information 
              against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">
              We do not sell your data. Information is shared only:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>With team members assigned to your projects</li>
              <li>With service providers necessary for app functionality (Base44 platform)</li>
              <li>When required by law or legal process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground">
              Project data is retained as long as your account is active. Upon account deletion, 
              data is removed within 30 days unless retention is required for legal or regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Access your personal data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your project data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Cookies and Tracking</h2>
            <p className="text-muted-foreground">
              We use essential cookies for authentication and session management. Analytics cookies 
              help us improve the application. You can control cookie preferences in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Third-Party Services</h2>
            <p className="text-muted-foreground">
              This application integrates with Google Calendar for scheduling. Their privacy policies apply 
              to data shared with those services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Changes to Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this policy periodically. Significant changes will be communicated via 
              email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground">
              For privacy-related questions or requests, contact your system administrator.
            </p>
          </section>
        </CardContent>
      </Card>
    </ScreenContainer>
  );
}