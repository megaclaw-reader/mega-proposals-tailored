const SLUG = 'grooved-learning';

function decodeProposal(encoded) {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(json);
}

function encodeProposal(payload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64url');
}

async function main() {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  const listRes = await fetch(`https://blob.vercel-storage.com?prefix=proposals/${SLUG}.json`, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });
  const listData = await listRes.json();
  const blob = listData.blobs?.find(b => b.pathname === `proposals/${SLUG}.json`);
  
  const blobRes = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${blobToken}` },
  });
  const blobData = await blobRes.json();
  
  const payload = decodeProposal(blobData.encodedProposal);
  
  // Fix template from leads to ecom
  console.log('Current template:', payload.t);
  payload.t = 'ecom';
  console.log('Updated template:', payload.t);
  
  const newEncoded = encodeProposal(payload);
  
  const updateRes = await fetch(`https://mega-proposals-tailored.vercel.app/api/proposals/update/${SLUG}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encodedProposal: newEncoded }),
  });
  
  console.log('Update result:', await updateRes.json());
}

main().catch(console.error);
