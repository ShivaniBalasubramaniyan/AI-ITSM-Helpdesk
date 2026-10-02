# VPN Connection & Gateway Troubleshooting Guide
- **Article ID**: KB001
- **Category**: Network
- **Tags**: vpn, anyconnect, globalprotect, network, connection, remote work, gateway timeout
- **Created**: 2026-01-10
- **Updated**: 2026-02-15

## Symptoms
- AnyConnect or GlobalProtect VPN client hangs on "Connecting to gateway..."
- Error message: "VPN connection failed due to unsuccessful certificate validation or gateway timeout"
- Internet connection works, but internal enterprise applications (Jira, GitLab, Intranet) are unreachable

## Immediate Self-Service Steps
1. **Verify Local Internet**: Ensure your primary Wi-Fi or Ethernet connection is active and you can open external sites like `google.com`.
2. **Restart VPN Agent Service**: Press `Win + R`, type `services.msc`, locate `Cisco AnyConnect Secure Mobility Agent`, right-click and select **Restart** (macOS: `sudo launchctl kickstart -k system/com.cisco.anyconnect.vpnagentd`).
3. **Flush Local DNS Cache**: Open Command Prompt as Administrator and execute `ipconfig /flushdns` (followed by `ipconfig /registerdns`). On macOS, run `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`.
4. **Switch VPN Gateways**: If `vpn-primary.corp.internal` fails, select the secondary backup gateway from the dropdown (`vpn-us-backup.corp.internal` or `vpn-eu-backup.corp.internal`).
5. **MFA Token Refresh**: If prompted for multi-factor authentication, ensure you approve the Okta Verify push within 30 seconds.

## When to Escalate to IT Service Desk
If you encounter "Certificate Revoked" or your corporate laptop profile has expired credentials, submit a Critical/High priority ticket to the **Network Operations Team**.
