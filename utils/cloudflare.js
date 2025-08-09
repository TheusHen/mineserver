'use strict'

const axios = require('axios')

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID
const DOMAIN = process.env.DOMAIN

const api = axios.create({
    baseURL: `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}`,
    headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
    }
})

async function getDnsRecords(type, name) {
    const res = await api.get('/dns_records', { params: { type, name } })
    return res.data.result
}

async function deleteRecords(records) {
    for (const rec of records) {
        await api.delete(`/dns_records/${rec.id}`)
    }
}

async function createOrUpdateDNS(username, ip, type, port, db) {
    const subdomain = `${username}.${DOMAIN}`

    if (type === "java") {
        const recordsA = await getDnsRecords('A', subdomain)
        await deleteRecords(recordsA)
        const recordsSRV = await getDnsRecords('SRV', subdomain)
        await deleteRecords(recordsSRV)

        // Create A record
        await api.post('/dns_records', {
            type: 'A',
            name: subdomain,
            content: ip,
            ttl: 120,
            proxied: false
        })

        // Create SRV record
        await api.post('/dns_records', {
            type: 'SRV',
            data: {
                service: "_minecraft",
                proto: "_tcp",
                name: subdomain,
                priority: 0,
                weight: 5,
                port: parseInt(port, 10) || 25565,
                target: subdomain
            },
            ttl: 120,
            proxied: false
        })

    } else if (type === "bedrock") {
        const isIp = (/^\d+\.\d+\.\d+\.\d+$/).test(process.env.BEDROCK_TARGET || ip)
        const recordType = isIp ? 'A' : 'CNAME'
        const records = await getDnsRecords(recordType, subdomain)
        await deleteRecords(records)

        await api.post('/dns_records', {
            type: recordType,
            name: subdomain,
            content: process.env.BEDROCK_TARGET || ip,
            ttl: 120,
            proxied: false
        })

    } else {
        throw new Error('Tipo de servidor desconhecido')
    }

    await db.collection('users').updateOne({ username }, { $set: { ip, port, type } })
}

module.exports = { createOrUpdateDNS }
