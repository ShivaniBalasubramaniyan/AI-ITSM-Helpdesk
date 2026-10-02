# Corporate Wi-Fi (Corp-Secure) & Office Network Connectivity
- **Article ID**: KB005
- **Category**: Network
- **Tags**: wifi, network, internet, corp-secure, wpa3, ethernet, ip conflict, office
- **Created**: 2026-01-20
- **Updated**: 2026-02-25

## Symptoms
- Device repeatedly prompts for Wi-Fi credentials when connecting to `Corp-Secure`
- Wi-Fi connected with "No Internet Access" exclamation mark
- Slow latency (>150ms) or dropped video calls while in office conference rooms

## Troubleshooting Steps
1. **Forget and Reconnect to SSID**:
   - Windows: Settings -> Network & internet -> Wi-Fi -> Manage known networks -> Select `Corp-Secure` -> Click **Forget**.
   - Re-select `Corp-Secure`. When prompted, choose **Connect using certificate** (or enter your corporate username and password).
2. **Verify 802.1x Machine Certificate**:
   - Open `certmgr.msc` and inspect **Personal** -> **Certificates**.
   - Check that the `Enterprise Root CA` certificate is valid and not expired. If expired, submit a ticket to Network Operations.
3. **Reset TCP/IP Stack**:
   - Open Command Prompt as Administrator and run:
     ```cmd
     netsh int ip reset
     netsh winsock reset
     ipconfig /release
     ipconfig /renew
     ```
   - Reboot laptop.
4. **Conference Room Wired Ethernet Ports**:
   - In conference rooms, plug directly into the green labeled RJ45 jacks for prioritized 1Gbps unthrottled streaming.
