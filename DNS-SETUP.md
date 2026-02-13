# DNS Configuration Fix for averroes.cloud

## Issue
Currently, `averroes.cloud` is still pointing to Hostinger servers instead of the Cloudflare Tunnel.

## Solution

### Option 1: Change Nameservers to Cloudflare (Recommended)

1. Go to your **Hostinger** domain control panel
2. Find **averroes.cloud** domain settings
3. Change nameservers to Cloudflare:
   ```
   ns1.cloudflare.com
   ns2.cloudflare.com
   ```
4. Wait 24-48 hours for propagation (usually faster)

### Option 2: Add CNAME Records (Faster)

If you can't change nameservers, add these DNS records in Hostinger:

1. **Delete existing A records** for `@` and `www`
2. **Add CNAME records:**

   | Type | Name | Target |
   |------|------|--------|
   | CNAME | @ | `<tunnel-id>.cfargotunnel.com` |
   | CNAME | www | `<tunnel-id>.cfargotunnel.com` |
   | CNAME | archie | `<tunnel-id>.cfargotunnel.com` |

3. Your tunnel ID: `19ba598f-74b8-448a-be9c-cfbec44830b1`

   So the target would be: `19ba598f-74b8-448a-be9c-cfbec44830b1.cfargotunnel.com`

### Option 3: Use Cloudflare DNS Only

1. Log into Cloudflare dashboard
2. Go to DNS → Records
3. Add these records:

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | CNAME | @ | `19ba598f-74b8-448a-be9c-cfbec44830b1.cfargotunnel.com` | Proxied ☁️ |
   | CNAME | www | `19ba598f-74b8-448a-be9c-cfbec44830b1.cfargotunnel.com` | Proxied ☁️ |
   | CNAME | archie | `19ba598f-74b8-448a-be9c-cfbec44830b1.cfargotunnel.com` | Proxied ☁️ |

## Verify Setup

After DNS changes, test with:
```bash
# Check DNS resolution
dig averroes.cloud
dig archie.averroes.cloud

# Test HTTPS
curl -I https://averroes.cloud
curl -I https://archie.averroes.cloud
```

## Current Status

✅ Cloudflare Tunnel configured
✅ Routes set up (averroes.cloud → 3003, archie → 3002)
❌ DNS still pointing to Hostinger

Once DNS is updated, your sites will be live!
