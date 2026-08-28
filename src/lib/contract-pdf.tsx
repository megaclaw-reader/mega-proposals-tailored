import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', lineHeight: 1.5 },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#2454FF', paddingBottom: 10 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666' },
  sectionTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginTop: 16, marginBottom: 6 },
  body: { fontSize: 10, color: '#333', marginBottom: 4 },
  bold: { fontFamily: 'Helvetica-Bold' },
  listItem: { fontSize: 10, color: '#333', marginBottom: 2, paddingLeft: 12 },
  signatureBlock: { marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' },
  sigBox: { width: '45%' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#333', marginTop: 30, marginBottom: 4 },
  sigLabel: { fontSize: 8, color: '#666' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, fontSize: 8, color: '#999', textAlign: 'center' },
});

interface ContractProps {
  customerName: string;
  companyName: string;
  selectedAgents: { name: string; description: string }[];
  monthlyRate: number;
  minimumTermMonths: number;
  totalCommitment: number;
  salesRepName: string;
  salesRepEmail: string;
  customerEmail: string;
  effectiveDate: string;
}

export function ServiceAgreementPDF({
  customerName, companyName, selectedAgents, monthlyRate, minimumTermMonths,
  totalCommitment, salesRepName, salesRepEmail, customerEmail, effectiveDate,
}: ContractProps) {
  const formatCurrency = (n: number) => `$${n.toLocaleString()}`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SERVICE AGREEMENT</Text>
          <Text style={styles.subtitle}>
            Between X25Z Media LLC dba MEGA (&quot;Provider&quot;) and {companyName} (&quot;Client&quot;)
          </Text>
          <Text style={styles.subtitle}>Effective Date: {effectiveDate}</Text>
        </View>

        {/* 1. Services */}
        <Text style={styles.sectionTitle}>1. Services Provided</Text>
        <Text style={styles.body}>
          Provider agrees to deliver the following AI-powered marketing services to Client:
        </Text>
        {selectedAgents.map((agent, i) => (
          <Text key={i} style={styles.listItem}>• {agent.name} — {agent.description}</Text>
        ))}

        {/* 2. Term & Payment */}
        <Text style={styles.sectionTitle}>2. Term &amp; Payment</Text>
        <Text style={styles.body}>
          Client agrees to a minimum engagement period of {minimumTermMonths} months at {formatCurrency(monthlyRate)} per month
          (total minimum commitment: {formatCurrency(totalCommitment)}). Payments are billed monthly.
        </Text>
        <Text style={styles.body}>
          If Client elects to discontinue services before the completion of the minimum term, the remaining
          balance for the full minimum term shall be due and payable immediately.
        </Text>
        <Text style={styles.body}>
          Upon completion of the minimum term, this Agreement shall automatically renew for successive
          periods of {minimumTermMonths} months under the same terms and monthly rate, unless Client provides
          written cancellation notice at least thirty (30) days prior to the end of the then-current term.
        </Text>

        {/* 3. Ownership */}
        <Text style={styles.sectionTitle}>3. Ownership &amp; Rights</Text>
        <Text style={styles.body}>
          Client retains full ownership of all content, creative assets, data, and materials created by Provider
          in the course of delivering services under this Agreement.
        </Text>

        {/* 4. Customer Responsibilities */}
        <Text style={styles.sectionTitle}>4. Customer Responsibilities</Text>
        <Text style={styles.body}>
          Client is responsible for maintaining backups of their own data and website content. Client shall
          provide timely access to accounts, platforms, and approvals necessary for Provider to perform services.
        </Text>

        {/* 5. Payment Terms */}
        <Text style={styles.sectionTitle}>5. Payment Terms</Text>
        <Text style={styles.body}>
          Invoices are due upon receipt. Late payments may incur a fee of 1.5% per month on the outstanding
          balance. Provider reserves the right to suspend services after five (5) business days of non-payment.
        </Text>

        {/* 6. Publicity */}
        <Text style={styles.sectionTitle}>6. Publicity Rights</Text>
        <Text style={styles.body}>
          Provider shall not use Client&apos;s name, logo, or likeness in any marketing or promotional materials
          without prior written consent from Client.
        </Text>

        {/* 7. Non-Solicitation */}
        <Text style={styles.sectionTitle}>7. Non-Solicitation</Text>
        <Text style={styles.body}>
          During the term and for one (1) year following termination, neither party shall directly solicit or
          hire any employee or contractor of the other party who was involved in providing or receiving services
          under this Agreement.
        </Text>

        {/* 8. Scope */}
        <Text style={styles.sectionTitle}>8. Scope of Services</Text>
        <Text style={styles.body}>
          Services are limited to those explicitly listed in Section 1. Any additional services require a
          separate written agreement or amendment to this Agreement.
        </Text>

        {/* 9. Modifications */}
        <Text style={styles.sectionTitle}>9. Modifications</Text>
        <Text style={styles.body}>
          No modification to this Agreement shall be effective unless made in writing and signed by both parties.
        </Text>

        {/* 10. Data Security */}
        <Text style={styles.sectionTitle}>10. Data Security</Text>
        <Text style={styles.body}>
          Provider shall implement reasonable administrative, technical, and physical safeguards to protect
          Client data against unauthorized access, disclosure, or destruction.
        </Text>

        {/* 11. Force Majeure */}
        <Text style={styles.sectionTitle}>11. Force Majeure</Text>
        <Text style={styles.body}>
          Neither party shall be liable for delays or failures in performance resulting from events beyond
          their reasonable control, including natural disasters, acts of government, or internet outages.
        </Text>

        {/* 12. Limitation of Liability */}
        <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
        <Text style={styles.body}>
          Provider&apos;s total aggregate liability under this Agreement shall not exceed the fees paid by Client
          during the three (3) months preceding the event giving rise to the claim. In no event shall either
          party be liable for indirect, incidental, special, or consequential damages.
        </Text>

        {/* 13. Governing Law */}
        <Text style={styles.sectionTitle}>13. Governing Law</Text>
        <Text style={styles.body}>
          This Agreement shall be governed by the laws of the State of Delaware. Any disputes shall be resolved
          by binding arbitration in accordance with the terms at gomega.ai/terms.
        </Text>

        {/* 14. Entire Agreement */}
        <Text style={styles.sectionTitle}>14. Entire Agreement</Text>
        <Text style={styles.body}>
          This Agreement constitutes the entire understanding between the parties and supersedes all prior
          agreements, representations, and understandings relating to the subject matter hereof.
        </Text>

        {/* Signature Blocks */}
        <View style={styles.signatureBlock}>
          <View style={styles.sigBox}>
            <Text style={[styles.body, styles.bold]}>Provider: X25Z Media LLC dba MEGA</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Name: {salesRepName}</Text>
            <Text style={styles.sigLabel}>Email: {salesRepEmail}</Text>
            <Text style={styles.sigLabel}>Date: _______________</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={[styles.body, styles.bold]}>Client: {companyName}</Text>
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Name: {customerName}</Text>
            <Text style={styles.sigLabel}>Email: {customerEmail}</Text>
            <Text style={styles.sigLabel}>Date: _______________</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          X25Z Media LLC dba MEGA · gomega.ai · agents@gomega.ai
        </Text>
      </Page>
    </Document>
  );
}
