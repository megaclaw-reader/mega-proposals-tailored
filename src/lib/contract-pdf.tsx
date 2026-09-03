import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import path from 'path';
import fs from 'fs';

/* ─── Logo (embedded as base64 for cross-env compat) ─── */
let LOGO_SRC: string;
try {
  const logoPath = path.join(process.cwd(), 'public', 'mega-wordmark-clean.png');
  const buf = fs.readFileSync(logoPath);
  LOGO_SRC = `data:image/png;base64,${buf.toString('base64')}`;
} catch {
  LOGO_SRC = '';
}

/* ─── Colors ─── */
const BRAND = '#2454FF';
const DARK = '#111827';
const GRAY = '#4B5563';
const LGRAY = '#9CA3AF';
const BORDER = '#E5E7EB';

const s = StyleSheet.create({
  page: { paddingTop: 45, paddingBottom: 60, paddingHorizontal: 50, fontSize: 8.5, fontFamily: 'Helvetica', lineHeight: 1.5, color: GRAY },
  /* Header */
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: BRAND },
  logo: { width: 90, height: 35, objectFit: 'contain' },
  docTitle: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: DARK },
  docSub: { fontSize: 8, color: LGRAY, marginTop: 2 },
  /* Parties */
  partyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 16 },
  partyBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 3, padding: 8, borderWidth: 0.5, borderColor: BORDER },
  partyLabel: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRAND, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  partyName: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 1 },
  partyDetail: { fontSize: 7.5, color: GRAY },
  /* Sections */
  sec: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 11, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  p: { fontSize: 8.5, color: GRAY, marginBottom: 4 },
  b: { fontFamily: 'Helvetica-Bold', color: DARK },
  li: { fontSize: 8.5, color: GRAY, marginBottom: 2, paddingLeft: 12 },
  /* Summary table */
  tRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tRowAlt: { backgroundColor: '#F9FAFB' },
  tLabel: { fontSize: 8.5, color: GRAY },
  tVal: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: DARK },
  /* Signature */
  sigSection: { marginTop: 24 },
  sigRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 24 },
  sigBox: { flex: 1 },
  sigParty: { fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: BRAND, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: DARK, marginBottom: 3, marginTop: 32 },
  sigLabel: { fontSize: 7, color: LGRAY, marginBottom: 1 },
  sigVal: { fontSize: 8, color: DARK, marginBottom: 6 },
  dateLine: { borderBottomWidth: 1, borderBottomColor: DARK, marginBottom: 3, marginTop: 12 },
  /* Footer */
  footer: { position: 'absolute', bottom: 28, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 6 },
  footerTxt: { fontSize: 7, color: LGRAY },
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
      <Page size="LETTER" style={s.page} wrap>
        {/* ─── HEADER ─── */}
        <View style={s.headerRow} fixed>
          {LOGO_SRC ? <Image src={LOGO_SRC} style={s.logo} /> : <Text style={s.docTitle}>MEGA</Text>}
          <View style={{ textAlign: 'right' }}>
            <Text style={s.docTitle}>SERVICE AGREEMENT</Text>
            <Text style={s.docSub}>Effective Date: {effectiveDate}</Text>
          </View>
        </View>

        {/* ─── PARTIES ─── */}
        <View style={s.partyRow}>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Provider</Text>
            <Text style={s.partyName}>X25Z Media LLC dba MEGA</Text>
            <Text style={s.partyDetail}>gomega.ai · {salesRepName}</Text>
            <Text style={s.partyDetail}>{salesRepEmail}</Text>
          </View>
          <View style={s.partyBox}>
            <Text style={s.partyLabel}>Client</Text>
            <Text style={s.partyName}>{companyName}</Text>
            <Text style={s.partyDetail}>{customerName}</Text>
            <Text style={s.partyDetail}>{customerEmail}</Text>
          </View>
        </View>

        {/* ─── RECITALS ─── */}
        <Text style={s.p}>
          This Service Agreement (&quot;Agreement&quot;) is entered into as of the Effective Date by and between X25Z Media LLC, a Delaware limited liability company doing business as MEGA (&quot;Provider&quot;), and {companyName} (&quot;Client&quot;), collectively the &quot;Parties.&quot;
        </Text>
        <Text style={s.p}>
          WHEREAS Provider offers AI-powered digital marketing services and Client desires to engage Provider on the terms herein, in consideration of the mutual covenants contained herein, the Parties agree as follows:
        </Text>

        {/* 1 */}
        <Text style={s.sec}>1. Scope of Services</Text>
        <Text style={s.p}>Provider shall deliver the following AI-powered marketing services (the &quot;Services&quot;):</Text>
        {selectedAgents.map((a, i) => (
          <Text key={i} style={s.li}>• <Text style={s.b}>{a.name}</Text> — {a.description}</Text>
        ))}
        <Text style={s.p}>Services are limited to those listed above. Additional services require a separate written agreement.</Text>

        {/* 2 */}
        <Text style={s.sec}>2. Term and Renewal</Text>
        <Text style={s.p}><Text style={s.b}>2.1 Initial Term.</Text> This Agreement commences on the Effective Date and continues for {minimumTermMonths} months (the &quot;Initial Term&quot;).</Text>
        <Text style={s.p}><Text style={s.b}>2.2 Renewal.</Text> The Agreement automatically renews for successive {minimumTermMonths}-month periods unless either Party provides 30 days&apos; written notice of non-renewal.</Text>
        <Text style={s.p}><Text style={s.b}>2.3 Early Termination.</Text> If Client terminates before the end of the current term, Client shall immediately pay all remaining fees due through the end of that term.</Text>

        {/* 3 */}
        <Text style={s.sec}>3. Fees and Payment</Text>
        <View style={{ borderWidth: 0.5, borderColor: BORDER, borderRadius: 3, marginBottom: 8, overflow: 'hidden' }}>
          <View style={[s.tRow, s.tRowAlt]}><Text style={s.tLabel}>Monthly Service Fee</Text><Text style={s.tVal}>{fc(monthlyRate)}/month</Text></View>
          <View style={s.tRow}><Text style={s.tLabel}>Minimum Commitment</Text><Text style={s.tVal}>{minimumTermMonths} months</Text></View>
          <View style={[s.tRow, s.tRowAlt]}><Text style={s.tLabel}>Total Minimum Commitment</Text><Text style={s.tVal}>{fc(totalCommitment)}</Text></View>
          <View style={s.tRow}><Text style={s.tLabel}>Billing</Text><Text style={s.tVal}>Monthly, in advance</Text></View>
        </View>
        <Text style={s.p}><Text style={s.b}>3.1</Text> All invoices are due upon receipt. Fees exclude applicable taxes, which are Client&apos;s responsibility.</Text>
        <Text style={s.p}><Text style={s.b}>3.2</Text> Late payments bear interest at the lesser of 1.5%/month or the maximum rate permitted by law. Provider may suspend Services after 5 business days of non-payment with written notice.</Text>
        <Text style={s.p}><Text style={s.b}>3.3</Text> Provider may adjust fees with 30 days&apos; written notice before any Renewal Term. Client may terminate if it does not agree to adjusted fees.</Text>

        {/* 4 */}
        <Text style={s.sec}>4. Client Obligations</Text>
        <Text style={s.p}>Client shall: (a) provide timely access to accounts, platforms, and materials necessary for the Services; (b) designate a primary contact authorized to make decisions; (c) respond to reasonable requests within 5 business days; (d) maintain backups of its data and assets; and (e) ensure materials provided do not infringe third-party rights.</Text>

        {/* 5 */}
        <Text style={s.sec}>5. Intellectual Property</Text>
        <Text style={s.p}><Text style={s.b}>5.1</Text> Client retains all rights in materials and content provided to Provider. <Text style={s.b}>5.2</Text> Upon full payment, Client owns all deliverables created by Provider for Client. <Text style={s.b}>5.3</Text> Provider retains rights in its proprietary tools, AI models, software, and methodologies.</Text>

        {/* 6 */}
        <Text style={s.sec}>6. Confidentiality</Text>
        <Text style={s.p}>Each Party shall hold in confidence all non-public information disclosed by the other Party and use it solely for purposes of this Agreement. This obligation survives for 2 years after termination. Exceptions: (a) publicly available information; (b) information known prior to disclosure; (c) independently developed information.</Text>

        {/* 7 */}
        <Text style={s.sec}>7. Data Protection</Text>
        <Text style={s.p}>Provider shall maintain commercially reasonable safeguards to protect Client data against unauthorized access, disclosure, or destruction, and shall promptly notify Client of any confirmed breach. Provider processes Client data solely for performing the Services and in compliance with applicable data protection laws.</Text>

        {/* 8 */}
        <Text style={s.sec}>8. Warranties</Text>
        <Text style={s.p}><Text style={s.b}>8.1</Text> Each Party warrants it has legal authority to enter into this Agreement. <Text style={s.b}>8.2</Text> Provider warrants Services shall be performed in a professional manner consistent with industry standards.</Text>
        <Text style={[s.p, { fontSize: 7.5 }]}>8.3 EXCEPT AS EXPRESSLY SET FORTH HEREIN, PROVIDER MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. PROVIDER DOES NOT GUARANTEE SPECIFIC MARKETING RESULTS, RANKINGS, OR ROI.</Text>

        {/* 9 */}
        <Text style={s.sec}>9. Limitation of Liability</Text>
        <Text style={[s.p, { fontSize: 7.5 }]}>PROVIDER&apos;S AGGREGATE LIABILITY SHALL NOT EXCEED FEES PAID DURING THE 3 MONTHS PRECEDING THE CLAIM. NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, REVENUE, OR DATA.</Text>

        {/* 10 */}
        <Text style={s.sec}>10. Indemnification</Text>
        <Text style={s.p}>Each Party shall indemnify and hold harmless the other from third-party claims arising from (a) breach of this Agreement or (b) gross negligence or willful misconduct.</Text>

        {/* 11 */}
        <Text style={s.sec}>11. Non-Solicitation</Text>
        <Text style={s.p}>During the term and for 12 months after termination, neither Party shall solicit or hire employees or contractors of the other Party involved in this Agreement without prior written consent.</Text>

        {/* 12 */}
        <Text style={s.sec}>12. Publicity</Text>
        <Text style={s.p}>Neither Party shall use the other&apos;s name, logo, or trademarks in marketing materials without prior written consent.</Text>

        {/* 13 */}
        <Text style={s.sec}>13. Force Majeure</Text>
        <Text style={s.p}>Neither Party is liable for delays caused by events beyond reasonable control, including natural disasters, war, pandemic, government action, or infrastructure failures.</Text>

        {/* 14 */}
        <Text style={s.sec}>14. General Provisions</Text>
        <Text style={s.p}><Text style={s.b}>14.1 Amendments.</Text> No modification is effective unless in writing and signed by both Parties. <Text style={s.b}>14.2 Assignment.</Text> Neither Party may assign without consent, except Provider may assign in connection with a merger or acquisition. <Text style={s.b}>14.3 Severability.</Text> If any provision is unenforceable, the remainder continues in effect. <Text style={s.b}>14.4 Governing Law.</Text> Governed by the laws of Delaware. Disputes resolved by binding arbitration under AAA rules.</Text>

        {/* 15 */}
        <Text style={s.sec}>15. Entire Agreement</Text>
        <Text style={s.p}>This Agreement constitutes the entire understanding between the Parties and supersedes all prior agreements, proposals, and communications.</Text>

        {/* ─── SIGNATURES ─── */}
        <View style={s.sigSection} wrap={false}>
          <Text style={[s.p, { fontFamily: 'Helvetica-Bold', color: DARK, fontSize: 10, marginBottom: 3 }]}>IN WITNESS WHEREOF</Text>
          <Text style={s.p}>The Parties have executed this Agreement as of the Effective Date.</Text>

          <View style={s.sigRow}>
            {/* Provider — pre-signed */}
            <View style={s.sigBox}>
              <Text style={s.sigParty}>Provider</Text>
              <Text style={[s.sigVal, { fontFamily: 'Helvetica-Bold' }]}>X25Z Media LLC dba MEGA</Text>
              <Text style={[s.sigVal, { marginTop: 8 }]}>{salesRepName}</Text>
              <Text style={s.sigLabel}>Account Executive</Text>
              <Text style={[s.sigLabel, { marginTop: 4 }]}>Date: {effectiveDate}</Text>
            </View>

            {/* Client — e-signature lands here */}
            <View style={s.sigBox}>
              <Text style={s.sigParty}>Client</Text>
              <Text style={[s.sigVal, { fontFamily: 'Helvetica-Bold' }]}>{companyName}</Text>
              <Text style={[s.sigLabel, { marginTop: 6 }]}>{customerName} · {customerEmail}</Text>
              {/* Clean open area for OneSpan e-signature stamp */}
              <View style={{ height: 70, marginTop: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 3, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 7, color: LGRAY }}>E-Signature</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── FOOTER ─── */}
        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>X25Z Media LLC dba MEGA · gomega.ai · Confidential</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
