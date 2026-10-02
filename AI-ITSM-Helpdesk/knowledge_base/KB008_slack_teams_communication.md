# Enterprise Chat (Slack & Teams) Notification & Channel Guidelines
- **Article ID**: KB008
- **Category**: Email & Collaboration
- **Tags**: slack, teams, collaboration, notification, audio, screen share, huddle, channel
- **Created**: 2026-01-28
- **Updated**: 2026-03-01

## Troubleshooting Message Lag & Missing Notifications
1. **Clear Slack / Teams Local App Cache**:
   - Slack: Help -> Troubleshooting -> Clear Cache and Restart.
   - Microsoft Teams: Quit Teams. Open `%appdata%\Microsoft\Teams` and delete all files in the folder, then relaunch.
2. **Microphone / Screen Share Permissions on macOS / Windows**:
   - Windows 11: Settings -> Privacy & Security -> Microphone -> Allow desktop apps to access your microphone.
   - macOS: System Settings -> Privacy & Security -> Screen Recording -> Toggle Slack / Teams ON.
3. **Public vs Private Channel Provisioning**:
   - Internal project channels should follow naming standard: `#proj-<name>`, `#team-<name>`, or `#incident-<number>`.
   - Channels with over 50 members must disable `@channel` and `@here` mentions for standard members to avoid notification fatigue.
