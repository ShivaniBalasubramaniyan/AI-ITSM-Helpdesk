# Laptop Hardware, Docking Stations & External Monitor Issues
- **Article ID**: KB006
- **Category**: Hardware
- **Tags**: hardware, laptop, monitor, docking station, displaylink, battery, keyboard, screen
- **Created**: 2026-01-22
- **Updated**: 2026-02-24

## Common Issues
- External monitor remains black or says "No Signal" through Thunderbolt 4 / USB-C Dock
- Laptop battery drain or thermal throttling with excessive fan noise
- Peripheral devices (webcam, headset, mechanical keyboard) disconnect randomly

## Resolution Procedures
1. **Docking Station Power Cycle**:
   - Unplug the Thunderbolt/USB-C host cable from your laptop.
   - Disconnect the AC power brick from the dock for 30 seconds to drain residual capacitor charge.
   - Plug power brick back into the dock first, wait for the dock LED to illuminate, then reconnect laptop.
2. **Display Detection Shortcut**:
   - Windows: Press `Win + Ctrl + Shift + B` to force restart the Windows graphics driver stack. The screen will flicker and beep once.
   - Go to Display Settings -> Detect Displays.
3. **DisplayLink Driver Update**:
   - If utilizing universal USB 3.0 docks, ensure DisplayLink Manager is running in your system tray.
4. **Laptop Battery Health Check**:
   - Run in PowerShell: `powercfg /batteryreport /output "$env:USERPROFILE\battery_report.html"`.
   - If full charge capacity is under 60% of design capacity, IT will issue a replacement battery or loaner laptop.
