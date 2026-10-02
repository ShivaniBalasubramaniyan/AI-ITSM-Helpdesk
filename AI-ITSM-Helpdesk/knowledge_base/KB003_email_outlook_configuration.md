# Microsoft Outlook, Exchange Online & Email Synchronization Guide
- **Article ID**: KB003
- **Category**: Email & Collaboration
- **Tags**: email, outlook, exchange, 365, ost, synchronization, shared mailbox, inbox
- **Created**: 2026-01-15
- **Updated**: 2026-02-18

## Symptoms
- Outlook shows "Disconnected" or "Need Password" in the bottom status bar
- New emails appear on Outlook Web App (OWA) but do not sync to desktop client
- Search index returns incomplete or outdated email results
- Outlook crashes repeatedly when loading large offline data files (`.ost`)

## Resolution Steps
1. **Check Outlook Web Access (OWA)**:
   - Visit `https://outlook.office365.com` and log in.
   - If webmail works, the issue is strictly isolated to your local client profile or cache.
2. **Re-authenticate Modern Authentication**:
   - Close Outlook.
   - Open Windows **Settings** -> **Accounts** -> **Access work or school**.
   - Disconnect and reconnect your work account to refresh the Azure AD OAuth token.
3. **Rebuild Corrupted Offline Cache (.ost)**:
   - Exit Outlook completely.
   - Press `Win + R`, paste: `%localappdata%\Microsoft\Outlook` and press Enter.
   - Locate your account `.ost` file and rename it to `.ost.old`.
   - Re-open Outlook. Outlook will automatically create a fresh `.ost` file and download your mail server cache.
4. **Shared Mailbox Access**:
   - Shared mailboxes auto-map within 60 minutes after permission is granted in Microsoft 365 Admin Center.
   - To force manual mapping: File -> Account Settings -> Double click Account -> More Settings -> Advanced -> Add mailbox name.
