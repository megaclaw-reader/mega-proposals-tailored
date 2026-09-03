import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';

/* ─── Logo (embedded as base64 for cross-env compat) ─── */
let LOGO_SRC: string;
try {
  const logoPath = path.join(process.cwd(), 'public', 'mega-wordmark-blue.png');
  const buf = fs.readFileSync(logoPath);
  LOGO_SRC = `data:image/png;base64,${buf.toString('base64')}`;
} catch {
  LOGO_SRC = '';
}

/* ─── Styles ─── */
const BRAND_BLUE = '#2454FF';
const DARK = '#111827';
const GRAY = '#4B5563';
const LIGHT_GRAY = '#9CA3AF';
const BORDER = '#E5E7EB';

const s = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 70,
    paddingHorizontal: 55,
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
    color: GRAY,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_BLUE,
  },
  logo: { width: 110, height: 50, objectFit: 'contain' },
  headerRight: { textAlign: 'right' },
  docTitle: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: DARK, letterSpacing: 0.5 },
  docSubtitle: { fontSize: 9, color: LIGHT_GRAY, marginTop: 2 },

  /* Party info box */
  partyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 20,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  partyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRAND_BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 2 },
  partyDetail: { fontSize: 8.5, color: GRAY },

  /* Sections */
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  body: { fontSize: 9.5, color: GRAY, marginBottom: 6 },
  bodyIndent: { fontSize: 9.5, color: GRAY, marginBottom: 4, paddingLeft: 14 },
  bold: { fontFamily: 'Helvetica-Bold', color: DARK },
  listItem: { fontSize: 9.5, color: GRAY, marginBottom: 3, paddingLeft: 14 },
  subListItem: { fontSize: 9, color: GRAY, marginBottom: 2, paddingLeft: 28 },

  /* Summary table */
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  summaryRowAlt: {
    backgroundColor: '#F9FAFB',
  },
  summaryLabel: { fontSize: 9.5, color: GRAY },
  summaryValue: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: DARK },

  /* Signature */
  signatureSection: { marginTop: 36 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 30 },
  sigBox: { flex: 1 },
  sigPartyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRAND_BLUE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: DARK, marginBottom: 4, marginTop: 40 },
  sigFieldLabel: { fontSize: 8, color: LIGHT_GRAY, marginBottom: 2 },
  sigFieldValue: { fontSize: 9, color: DARK, marginBottom: 8 },
  dateLine: { borderBottomWidth: 1, borderBottomColor: DARK, marginBottom: 4, marginTop: 16 },

  /* Footer */
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 55,
    right: 55,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: LIGHT_GRAY },
  footerPage: { fontSize: 7.5, color: LIGHT_GRAY },
});

/* ─── Component ─── */
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
  const fc = (n: number) => `$${n.toLocaleString()}`;

  return (
    <Document>
      {/* ─── PAGE 1: Agreement Terms ─── */}
      <Page size="LETTER" style={s.page}>
        {/* Header with logo */}
        <View style={s.headerRow}>
          <Image src={LOGO_SRC} style={s.logo} />
          <View style={s.headerRight}>
            <Text style={s.docTitle}>SERVICE AGREEMENT</Text>
            <Text style={s.docSubtitle}>Effective Date: {effectiveDate}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={s.partyRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Provider</Text>
            <Text style={s.partyName}>X25Z Media LLC dba MEGA</Text>
            <Text style={s.partyDetail}>gomega.ai</Text>
            <Text style={s.partyDetail}>{salesRepName} · {salesRepEmail}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Client</Text>
            <Text style={s.partyName}>{companyName}</Text>
            <Text style={s.partyDetail}>{customerName}</Text>
            <Text style={s.partyDetail}>{customerEmail}</Text>
          </View>
        </View>

        {/* Recitals */}
        <Text style={s.body}>
          This Service Agreement (&quot;Agreement&quot;) is entered into as of the Effective Date by and between
          X25Z Media LLC, a Delaware limited liability company doing business as MEGA (&quot;Provider&quot;),
          and {companyName} (&quot;Client&quot;). Provider and Client may each be referred to as a
          &quot;Party&quot; and collectively as the &quot;Parties.&quot;
        </Text>
        <Text style={s.body}>
          WHEREAS, Provider offers AI-powered digital marketing services; and WHEREAS, Client desires to
          engage Provider to perform such services on the terms set forth herein; NOW, THEREFORE, in
          consideration of the mutual covenants and agreements contained herein, the Parties agree as follows:
        </Text>

        {/* 1. Services */}
        <Text style={s.sectionTitle}>1. Scope of Services</Text>
        <Text style={s.body}>
          Provider shall deliver the following AI-powered marketing services to Client during the Term
          (collectively, the &quot;Services&quot;):
        </Text>
        {selectedAgents.map((agent, i) => (
          <Text key={i} style={s.listItem}>
            {i + 1}.{i + 1}  <Text style={s.bold}>{agent.name}</Text> — {agent.description}
          </Text>
        ))}
        <Text style={s.body}>
          Services are limited to those expressly listed above. Any additional services shall require a
          separate written agreement or an amendment to this Agreement executed by both Parties.
        </Text>

        {/* 2. Term */}
        <Text style={s.sectionTitle}>2. Term and Renewal</Text>
        <Text style={s.body}>
          <Text style={s.bold}>2.1 Initial Term.</Text> This Agreement shall commence on the Effective Date
          and continue for a minimum period of {minimumTermMonths} months (the &quot;Initial Term&quot;).
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>2.2 Automatic Renewal.</Text> Upon expiration of the Initial Term, this
          Agreement shall automatically renew for successive periods of {minimumTermMonths} months each
          (each a &quot;Renewal Term&quot;), unless either Party provides written notice of non-renewal at
          least thirty (30) days prior to the expiration of the then-current term.
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>2.3 Early Termination.</Text> If Client terminates this Agreement prior to the
          expiration of the Initial Term or any Renewal Term, Client shall be liable for and shall immediately
          pay all remaining fees due through the end of the then-current term.
        </Text>

        {/* 3. Fees and Payment */}
        <Text style={s.sectionTitle}>3. Fees and Payment</Text>

        {/* Summary table */}
        <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}>
          <View style={[s.summaryRow, s.summaryRowAlt]}>
            <Text style={s.summaryLabel}>Monthly Service Fee</Text>
            <Text style={s.summaryValue}>{fc(monthlyRate)}/month</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Minimum Commitment Period</Text>
            <Text style={s.summaryValue}>{minimumTermMonths} months</Text>
          </View>
          <View style={[s.summaryRow, s.summaryRowAlt]}>
            <Text style={s.summaryLabel}>Total Minimum Commitment</Text>
            <Text style={s.summaryValue}>{fc(totalCommitment)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Billing Frequency</Text>
            <Text style={s.summaryValue}>Monthly</Text>
          </View>
        </View>

        <Text style={s.body}>
          <Text style={s.bold}>3.1 Invoicing.</Text> Provider shall invoice Client monthly in advance.
          All invoices are due and payable upon receipt. Fees are exclusive of applicable taxes, which
          shall be Client&apos;s responsibility.
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>3.2 Late Payment.</Text> Any amounts not paid when due shall bear interest
          at the lesser of 1.5% per month or the maximum rate permitted by applicable law. Provider
          reserves the right to suspend Services after five (5) business days of non-payment with written
          notice to Client.
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>3.3 Fee Adjustments.</Text> Provider may adjust fees upon thirty (30) days&apos;
          written notice prior to the start of any Renewal Term. If Client does not agree to the adjusted
          fees, Client may terminate this Agreement by providing written notice before the Renewal Term begins.
        </Text>

        {/* 4. Client Obligations */}
        <Text style={s.sectionTitle}>4. Client Obligations</Text>
        <Text style={s.body}>Client agrees to:</Text>
        <Text style={s.listItem}>a) Provide timely access to all accounts, platforms, credentials, and materials reasonably necessary for Provider to perform the Services;</Text>
        <Text style={s.listItem}>b) Designate a primary point of contact authorized to make decisions and provide approvals on behalf of Client;</Text>
        <Text style={s.listItem}>c) Respond to Provider&apos;s reasonable requests for information, feedback, or approvals within five (5) business days;</Text>
        <Text style={s.listItem}>d) Maintain backups of Client&apos;s own data, website content, and digital assets; and</Text>
        <Text style={s.listItem}>e) Ensure that all materials provided to Provider do not infringe upon any third-party intellectual property rights.</Text>

        <Text style={s.footer ? s.footerText : s.body}></Text>
        <View style={s.footer} fixed>
          <Text style={s.footerText}>X25Z Media LLC dba MEGA · gomega.ai · Confidential</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ─── PAGE 2: Legal Terms ─── */}
      <Page size="LETTER" style={s.page}>
        {/* Mini header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER }}>
          <Image src={LOGO_SRC} style={{ width: 70, height: 32, objectFit: 'contain' }} />
          <Text style={{ fontSize: 8, color: LIGHT_GRAY }}>Service Agreement — {companyName}</Text>
        </View>

        {/* 5. Intellectual Property */}
        <Text style={s.sectionTitle}>5. Intellectual Property</Text>
        <Text style={s.body}>
          <Text style={s.bold}>5.1 Client Materials.</Text> Client retains all right, title, and interest
          in and to any materials, data, trademarks, and content provided by Client to Provider
          (&quot;Client Materials&quot;).
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>5.2 Deliverables.</Text> Upon full payment, Client shall own all content,
          creative assets, campaign data, reports, and other work product created by Provider specifically
          for Client in the course of performing the Services (&quot;Deliverables&quot;).
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>5.3 Provider Tools.</Text> Provider retains all rights in its proprietary
          tools, AI models, software, methodologies, and know-how used in performing the Services. Nothing
          in this Agreement grants Client any license to Provider&apos;s proprietary technology.
        </Text>

        {/* 6. Confidentiality */}
        <Text style={s.sectionTitle}>6. Confidentiality</Text>
        <Text style={s.body}>
          Each Party agrees to hold in confidence all non-public information disclosed by the other Party
          in connection with this Agreement (&quot;Confidential Information&quot;) and to use such
          information solely for the purposes contemplated herein. This obligation shall survive termination
          of this Agreement for a period of two (2) years. Confidential Information does not include
          information that: (a) is or becomes publicly available through no fault of the receiving Party;
          (b) was rightfully known to the receiving Party prior to disclosure; or (c) is independently
          developed without use of the disclosing Party&apos;s Confidential Information.
        </Text>

        {/* 7. Data Protection */}
        <Text style={s.sectionTitle}>7. Data Protection and Security</Text>
        <Text style={s.body}>
          Provider shall implement and maintain commercially reasonable administrative, technical, and
          physical safeguards designed to protect Client data against unauthorized access, disclosure,
          alteration, or destruction. Provider shall promptly notify Client of any confirmed data breach
          affecting Client data. Provider shall process Client data solely for the purpose of performing
          the Services and in compliance with applicable data protection laws.
        </Text>

        {/* 8. Representations and Warranties */}
        <Text style={s.sectionTitle}>8. Representations and Warranties</Text>
        <Text style={s.body}>
          <Text style={s.bold}>8.1</Text> Each Party represents and warrants that it has the legal power
          and authority to enter into this Agreement and to perform its obligations hereunder.
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>8.2</Text> Provider warrants that the Services shall be performed in a
          professional and workmanlike manner consistent with generally accepted industry standards.
        </Text>
        <Text style={s.body}>
          <Text style={s.bold}>8.3</Text> EXCEPT AS EXPRESSLY SET FORTH IN THIS AGREEMENT, PROVIDER
          MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. PROVIDER DOES NOT
          GUARANTEE SPECIFIC MARKETING RESULTS, RANKINGS, TRAFFIC LEVELS, OR RETURN ON INVESTMENT.
        </Text>

        {/* 9. Limitation of Liability */}
        <Text style={s.sectionTitle}>9. Limitation of Liability</Text>
        <Text style={s.body}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, PROVIDER&apos;S TOTAL AGGREGATE LIABILITY ARISING OUT
          OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL FEES ACTUALLY PAID BY CLIENT TO
          PROVIDER DURING THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
          IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS
          OPPORTUNITY, REGARDLESS OF WHETHER SUCH PARTY WAS ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </Text>

        {/* 10. Indemnification */}
        <Text style={s.sectionTitle}>10. Indemnification</Text>
        <Text style={s.body}>
          Each Party shall indemnify, defend, and hold harmless the other Party from and against any
          third-party claims, damages, losses, and expenses (including reasonable attorneys&apos; fees)
          arising out of or related to: (a) a breach of this Agreement by the indemnifying Party; or
          (b) the indemnifying Party&apos;s gross negligence or willful misconduct.
        </Text>

        {/* 11. Non-Solicitation */}
        <Text style={s.sectionTitle}>11. Non-Solicitation</Text>
        <Text style={s.body}>
          During the term of this Agreement and for twelve (12) months following its termination, neither
          Party shall directly or indirectly solicit or hire any employee or contractor of the other Party
          who was involved in providing or receiving Services under this Agreement, without the prior written
          consent of the other Party.
        </Text>

        {/* 12. Publicity */}
        <Text style={s.sectionTitle}>12. Publicity</Text>
        <Text style={s.body}>
          Neither Party shall use the other Party&apos;s name, logo, or trademarks in any marketing,
          advertising, or promotional materials without the prior written consent of the other Party.
        </Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>X25Z Media LLC dba MEGA · gomega.ai · Confidential</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ─── PAGE 3: General Provisions + Signatures ─── */}
      <Page size="LETTER" style={s.page}>
        {/* Mini header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: BORDER }}>
          <Image src={LOGO_SRC} style={{ width: 70, height: 32, objectFit: 'contain' }} />
          <Text style={{ fontSize: 8, color: LIGHT_GRAY }}>Service Agreement — {companyName}</Text>
        </View>

        {/* 13. Force Majeure */}
        <Text style={s.sectionTitle}>13. Force Majeure</Text>
        <Text style={s.body}>
          Neither Party shall be liable for any failure or delay in performing its obligations under this
          Agreement where such failure or delay results from circumstances beyond the reasonable control
          of that Party, including but not limited to acts of God, natural disasters, war, terrorism,
          pandemic, government actions, internet or infrastructure failures, or third-party platform outages.
        </Text>

        {/* 14. Modifications */}
        <Text style={s.sectionTitle}>14. Amendments</Text>
        <Text style={s.body}>
          No amendment, modification, or waiver of any provision of this Agreement shall be effective unless
          made in writing and signed by authorized representatives of both Parties.
        </Text>

        {/* 15. Assignment */}
        <Text style={s.sectionTitle}>15. Assignment</Text>
        <Text style={s.body}>
          Neither Party may assign or transfer this Agreement or any rights or obligations hereunder without
          the prior written consent of the other Party, except that Provider may assign this Agreement to
          a successor in connection with a merger, acquisition, or sale of substantially all of its assets.
        </Text>

        {/* 16. Governing Law */}
        <Text style={s.sectionTitle}>16. Governing Law and Dispute Resolution</Text>
        <Text style={s.body}>
          This Agreement shall be governed by and construed in accordance with the laws of the State of
          Delaware, without regard to its conflict of laws principles. Any dispute arising out of or relating
          to this Agreement shall be resolved by binding arbitration administered in accordance with the
          rules of the American Arbitration Association. The arbitration shall be conducted in the English
          language, and the decision of the arbitrator shall be final and binding on both Parties.
        </Text>

        {/* 17. Severability */}
        <Text style={s.sectionTitle}>17. Severability</Text>
        <Text style={s.body}>
          If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining
          provisions shall continue in full force and effect. The invalid provision shall be modified to the
          minimum extent necessary to make it valid and enforceable.
        </Text>

        {/* 18. Entire Agreement */}
        <Text style={s.sectionTitle}>18. Entire Agreement</Text>
        <Text style={s.body}>
          This Agreement, together with any exhibits, schedules, or addenda attached hereto, constitutes
          the entire agreement between the Parties with respect to the subject matter hereof and supersedes
          all prior and contemporaneous agreements, proposals, negotiations, representations, and
          communications, whether oral or written.
        </Text>

        {/* ─── SIGNATURE BLOCK ─── */}
        <View style={s.signatureSection}>
          <Text style={[s.body, { fontFamily: 'Helvetica-Bold', color: DARK, fontSize: 11, marginBottom: 4 }]}>
            IN WITNESS WHEREOF
          </Text>
          <Text style={s.body}>
            The Parties have executed this Agreement as of the Effective Date first written above.
          </Text>

          <View style={s.signatureRow}>
            {/* Provider */}
            <View style={s.sigBox}>
              <Text style={s.sigPartyLabel}>Provider</Text>
              <Text style={[s.sigFieldValue, { fontFamily: 'Helvetica-Bold' }]}>X25Z Media LLC dba MEGA</Text>
              <View style={s.sigLine} />
              <Text style={s.sigFieldLabel}>Authorized Signature</Text>
              <Text style={s.sigFieldValue}>{salesRepName}</Text>
              <Text style={s.sigFieldLabel}>Title</Text>
              <Text style={s.sigFieldValue}>Account Executive</Text>
              <View style={s.dateLine} />
              <Text style={s.sigFieldLabel}>Date</Text>
            </View>

            {/* Client */}
            <View style={s.sigBox}>
              <Text style={s.sigPartyLabel}>Client</Text>
              <Text style={[s.sigFieldValue, { fontFamily: 'Helvetica-Bold' }]}>{companyName}</Text>
              <View style={s.sigLine} />
              <Text style={s.sigFieldLabel}>Authorized Signature</Text>
              <Text style={s.sigFieldValue}>{customerName}</Text>
              <Text style={s.sigFieldLabel}>Title</Text>
              <Text style={s.sigFieldValue}>___________________________</Text>
              <View style={s.dateLine} />
              <Text style={s.sigFieldLabel}>Date</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>X25Z Media LLC dba MEGA · gomega.ai · Confidential</Text>
          <Text style={s.footerPage} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
