# Corporate Password Reset and Okta MFA De-synchronization
- **Article ID**: KB002
- **Category**: Access & Identity
- **Tags**: password, reset, mfa, okta, 2fa, authentication, locked account, active directory
- **Created**: 2026-01-12
- **Updated**: 2026-02-20

## Summary
Guidelines for self-service corporate domain password resets, recovering locked Active Directory accounts, and resolving MFA push notification issues.

## Self-Service Password Reset (SSPR)
1. Navigate to the self-service portal: `https://identity.corp.internal/sspr`.
2. Enter your corporate email username (e.g. `john.doe@company.com`).
3. Complete the secondary authentication challenge using SMS OTP or registered Authenticator App.
4. Set a new password meeting policy constraints:
   - Minimum 14 characters
   - At least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special symbol
   - Cannot match your previous 6 passwords
   - Password expires every 90 days

## Fixing Okta Verify / MFA Push Failures
If you are not receiving push notifications on your mobile device:
1. Ensure your mobile phone has a working cellular or Wi-Fi connection.
2. Open the **Okta Verify** app and swipe down to refresh pending prompts.
3. Check phone device clock: Go to phone Settings -> General -> Date & Time -> Ensure **Set Automatically** is turned ON. Clock drift greater than 60 seconds causes MFA verification rejections.
4. If you replaced your smartphone, use your temporary backup YubiKey or request a temporary 24-hour bypass code from IT Helpdesk.

## Account Lockout Policy
Accounts automatically lock after 5 consecutive incorrect password attempts.
- Lockout duration: 30 minutes self-unlock window.
- For immediate unlock before 30 minutes, submit an Access Request ticket with your Employee ID and Manager's email.
