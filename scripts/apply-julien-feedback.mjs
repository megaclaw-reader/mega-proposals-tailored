const SLUG = 'grooved-learning';

function decodeProposal(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
}

function encodeProposal(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

async function main() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  const listRes = await fetch(`https://blob.vercel-storage.com?prefix=proposals/${SLUG}.json`, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });
  const listData = await listRes.json();
  const blob = listData.blobs?.find(b => b.pathname === `proposals/${SLUG}.json`);
  const blobRes = await fetch(blob.url, { headers: { Authorization: `Bearer ${blobToken}` } });
  const blobData = await blobRes.json();
  const payload = decodeProposal(blobData.encodedProposal);

  // 1. Update governing law from Georgia to New York
  const govLawIdx = payload.as.findIndex(s => s.title.includes('Governing Law'));
  if (govLawIdx !== -1) {
    payload.as[govLawIdx].description = "This agreement shall be governed by and construed in accordance with the laws of the State of New York, United States, without regard to conflict of law principles. In the event of any dispute, both parties agree to first attempt resolution through good-faith negotiation. If the dispute cannot be resolved within 30 days, either party may pursue mediation or binding arbitration in accordance with the rules of the American Arbitration Association, with proceedings held in the State of New York.";
  }

  // 2. Update Account Manager name to Jeremy Hass + offer intro call
  const teamIdx = payload.as.findIndex(s => s.title.includes('Team & Point of Contact'));
  if (teamIdx !== -1) {
    payload.as[teamIdx].description = "Your dedicated Account Manager will be Jeremy Hass — an experienced paid ads specialist who will serve as your primary human point of contact for all day-to-day communication, approvals, and strategic discussions. Jeremy will be introduced during onboarding and will be your single point of accountability throughout the engagement. If you'd like, we're happy to arrange an introductory call with Jeremy before finalizing so you can get a feel for who you'll be working with.";
  }

  // 3. Keep all 4 pricing options (confirmed)

  // 4. Update sales rep title — this isn't in agreementSections, it's just a note for the email

  console.log('Updated governing law to New York');
  console.log('Updated Account Manager to Jeremy Hass');

  const newEncoded = encodeProposal(payload);
  
  const updateRes = await fetch(`https://mega-proposals-tailored.vercel.app/api/proposals/update/${SLUG}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encodedProposal: newEncoded }),
  });
  
  console.log('Update result:', await updateRes.json());
}

main().catch(console.error);
