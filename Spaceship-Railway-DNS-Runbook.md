# Spaceship + Railway Custom Domain Runbook

This guide documents the exact process to connect a domain managed in Spaceship to a Railway service.

Use this when you want both:
- beoksmart.com (apex/root)
- www.beoksmart.com (www subdomain)

## Goal

- Keep domain management and nameservers on Spaceship
- Point both root and www to Railway
- Verify domains in Railway
- Enable SSL on both domains
- Set production site URL variable and redeploy once

## Prerequisites

- Domain exists in Spaceship
- Railway service is running
- You can open Railway service Networking page

## Important Rules

- Do not change nameservers if they are already Spaceship nameservers
- Do not paste full URLs in DNS values
- DNS Value must be hostname only, for example: r16dq4qh.up.railway.app
- Do not include https://
- Do not include trailing slash /

## Step 1: Confirm Nameservers in Spaceship

In Spaceship:
1. Domains
2. Select your domain
3. DNS
4. Confirm nameservers are Spaceship nameservers

Expected pattern:
- launch1.spaceship.net
- launch2.spaceship.net

If nameservers are correct, continue.

## Step 2: Add Both Custom Domains in Railway

In Railway:
1. Open Project
2. Open the target Service
3. Networking
4. Click Custom Domain
5. Add beoksmart.com
6. Add www.beoksmart.com

After adding each domain, Railway shows Configure DNS Records.

## Step 3: Copy Railway DNS Records

You must copy record instructions for both domains.

Typical output is 4 records total:

For www.beoksmart.com:
1. CNAME
2. TXT verification

For beoksmart.com (apex):
1. CNAME at @
2. TXT verification

## Step 4: Add Records in Spaceship DNS

In Spaceship:
1. Domain Manager
2. Select beoksmart.com
3. DNS Records
4. Add record for each line from Railway

### Record Mapping Template

Map every Railway line to Spaceship fields exactly:

- Type -> Type
- Name -> Host
- Value -> Value
- TTL -> 30 min or Auto

### Example Final Shape (replace values with Railway values)

1. CNAME | Host: www | Value: <www-target>.up.railway.app
2. TXT   | Host: _railway-verify.www | Value: railway-verify=<www-token>
3. CNAME | Host: @ | Value: <apex-target>.up.railway.app
4. TXT   | Host: _railway-verify | Value: railway-verify=<apex-token>

Notes:
- If a wrong www CNAME exists, replace it with Railway value
- If Spaceship rejects @ for root host, try empty host field
- If still rejected, try host as beoksmart.com
- Copy TXT values fully, do not trim

## Step 5: Wait for DNS Propagation

In Railway Networking:
- www may turn green before apex
- Apex can take longer

Expected temporary message:
- Waiting for DNS update

This is normal during propagation.

## Step 6: Verify No Root Conflicts

In Spaceship, ensure there are no conflicting root records for @:
- Remove old parking records only if they conflict
- Avoid duplicate or conflicting A/AAAA/CNAME for the same host

## Step 7: Set Production URL in Railway

In Railway Variables, set:

NEXT_PUBLIC_SITE_URL=https://beoksmart.com

Then redeploy once.

## Step 8: Confirm SSL and Live Access

When Railway shows green on both:
- beoksmart.com
- www.beoksmart.com

Test both URLs in browser.

## Troubleshooting

### Problem: www is green, apex is still waiting

Actions:
1. Open Railway DNS records for apex and re-check exact values
2. Confirm root CNAME target matches exactly
3. Confirm root TXT token matches exactly
4. Wait 15 to 60 minutes and refresh

### Problem: DNS value entered as full URL

Fix:
- Replace value with hostname only
- Wrong: https://beokbg-production.up.railway.app/
- Correct: beokbg-production.up.railway.app

### Problem: Railway still not verifying after 2+ hours

Actions:
1. Re-open all 4 records in Spaceship and compare character by character
2. Check for accidental spaces at start or end of TXT values
3. Check there is only one active CNAME for www
4. Check root host mapping format (@ or empty) matches provider requirements

### Optional local DNS check on Windows

Use Command Prompt or PowerShell:

nslookup beoksmart.com
nslookup www.beoksmart.com

The returned canonical target should match Railway targets.

## Quick Checklist

1. Nameservers remain on Spaceship
2. Added both domains in Railway
3. Added all Railway DNS records in Spaceship
4. No conflicting root records
5. Railway shows both domains verified
6. Set NEXT_PUBLIC_SITE_URL=https://beoksmart.com
7. Redeployed once
8. SSL active for apex and www

## Reuse Notes

For future projects, repeat same flow:
1. Add both apex and www in Railway
2. Mirror Railway DNS records exactly in registrar DNS
3. Wait for verification
4. Set app base URL variable and redeploy