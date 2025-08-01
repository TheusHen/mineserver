const axios = require('axios');

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DOMAIN = process.env.DOMAIN;

async function createOrUpdateSubdomain(username, ip, db) {
    const subdomain = `${username}.${DOMAIN}`;

    const existingRecordsRes = await axios.get(
        `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
            headers: {
                Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                type: 'A',
                name: subdomain
            }
        }
    );

    if (!existingRecordsRes.data.success) {
        throw new Error('Error querying existing DNS: ' + JSON.stringify(existingRecordsRes.data.errors));
    }

    const existingRecords = existingRecordsRes.data.result;
    if (existingRecords.length > 0) {
        if (existingRecords[0].content !== ip) {
            await axios.put(
                `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${existingRecords[0].id}`,
                {
                    type: 'A',
                    name: subdomain,
                    content: ip,
                    ttl: parseInt(process.env.CLOUDFLARE_TTL),
                    proxied: process.env.CLOUDFLARE_PROXIED === 'true'
                },
                {
                    headers: {
                        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        }
    } else {
        await axios.post(
            `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`,
            {
                type: 'A',
                name: subdomain,
                content: ip,
                ttl: 120,
                proxied: true
            },
            {
                headers: {
                    Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
    }

    await db.collection('users').updateOne(
        { username },
        { $set: { ip } }
    );
}

async function removeSubdomain(username) {
    const subdomain = `${username}.${DOMAIN}`;
    const dnsRes = await axios.get(
        `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records`, {
            headers: {
                Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            params: {
                type: 'A',
                name: subdomain
            }
        }
    );
    if (dnsRes.data.success && dnsRes.data.result.length > 0) {
        for (const record of dnsRes.data.result) {
            await axios.delete(
                `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/dns_records/${record.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        }
    }
}

async function cleanupUserAndDNS(username, db) {
    await removeSubdomain(username);
    await db.collection('users').deleteOne({ username });
}

module.exports = { createOrUpdateSubdomain, removeSubdomain, cleanupUserAndDNS };

