Use this exact flow with Spaceship:

Keep domain management on Spaceship.
In Railway, add both domains:
beoksmart.com
www.beoksmart.com
In Spaceship DNS zone, create exactly the records Railway gives you.
Remove any conflicting default parking records if Railway says they conflict.
In Railway Variables, set:
NEXT_PUBLIC_SITE_URL = https://beoksmart.com
Redeploy once.
Wait for SSL and propagation.
Spaceship panel path:

Domains
beoksmart.com
DNS
Manage DNS records
If you share the Railway DNS record list, I will map it line-by-line into the exact Spaceship fields (Type, Name/Host, Value, TTL).