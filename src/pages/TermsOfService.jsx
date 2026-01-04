import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import ScreenContainer from '@/components/layout/ScreenContainer';
import PageHeader from '@/components/ui/PageHeader';

export default function TermsOfService() {
  return (
    <ScreenContainer>
      <PageHeader title="Terms of Service" subtitle="Last updated: January 4, 2026" />

      <Card>
        <CardContent className="p-6 space-y-6 text-sm">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using SteelBuild Pro, you accept and agree to be bound by these Terms of Service. 
              If you do not agree, discontinue use immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Service Description</h2>
            <p className="text-muted-foreground">
              SteelBuild Pro provides construction management software for structural steel projects, 
              including scheduling, financial tracking, document management, RFI/change order processing, 
              and resource allocation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>You must provide accurate registration information</li>
              <li>You are responsible for maintaining account security</li>
              <li>Accounts are non-transferable</li>
              <li>Admins control user access and permissions</li>
              <li>Unauthorized account sharing is prohibited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Upload malicious code or viruses</li>
              <li>Attempt unauthorized access to systems or data</li>
              <li>Use the service for illegal purposes</li>
              <li>Interfere with service operation or other users</li>
              <li>Reverse engineer or copy the application</li>
              <li>Store data unrelated to construction projects</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Ownership and License</h2>
            <p className="text-muted-foreground mb-3">
              You retain ownership of all project data, drawings, and documents uploaded to the system. 
              You grant us a limited license to process and store this data to provide services.
            </p>
            <p className="text-muted-foreground">
              We do not claim ownership of your project information, schedules, or financial data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Service Availability</h2>
            <p className="text-muted-foreground mb-3">
              We strive for high availability but do not guarantee uninterrupted service. Scheduled 
              maintenance will be communicated in advance when possible.
            </p>
            <p className="text-muted-foreground">
              We are not liable for service interruptions, data transmission delays, or connectivity issues.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Data Backup and Loss</h2>
            <p className="text-muted-foreground">
              While we implement backup procedures, you are responsible for maintaining separate backups 
              of critical project data. We are not liable for data loss due to user error, service failure, 
              or other causes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Professional Responsibility</h2>
            <p className="text-muted-foreground">
              This software is a tool for project management. You remain responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Engineering decisions and calculations</li>
              <li>Safety planning and compliance</li>
              <li>Contractual obligations and deadlines</li>
              <li>Accuracy of cost estimates and schedules</li>
              <li>Regulatory and code compliance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              We provide the service "as is" without warranties of any kind. We are not liable for 
              project delays, cost overruns, safety incidents, or business losses resulting from use 
              or inability to use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Modifications to Service</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify, suspend, or discontinue features at any time. 
              Significant changes will be communicated to users.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Account Termination</h2>
            <p className="text-muted-foreground mb-3">
              We may suspend or terminate accounts for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Violation of these terms</li>
              <li>Non-payment (if applicable)</li>
              <li>Fraudulent or illegal activity</li>
              <li>Prolonged inactivity</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              Upon termination, you have 30 days to export your data before permanent deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify and hold harmless SteelBuild Pro from claims arising from your 
              use of the service, violation of terms, or infringement of third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by applicable laws. Disputes will be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">14. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms periodically. Continued use after changes constitutes acceptance. 
              Material changes will be communicated via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">15. Contact</h2>
            <p className="text-muted-foreground">
              For questions regarding these terms, contact your system administrator.
            </p>
          </section>
        </CardContent>
      </Card>
    </ScreenContainer>
  );
}