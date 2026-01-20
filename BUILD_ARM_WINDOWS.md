# ARM Windows Build Setup Guide for ha-weather-forecast-card

## System Info
- OS: Windows (ARM64)
- Node.js: v24.12.0
- npm: Latest
- pnpm: 10.28.1
- Project: ha-weather-forecast-card (TypeScript/Lit/Parcel)

## Issue: UNC Path Problems

ARM Windows can encounter permission issues with UNC paths (`\\psf\...`). The build system may fail with:
```
ERR_PNPM_NO_PKG_MANIFEST No package.json found in \\psf\Home\Documents\git
```

**Solution**: Use local drive paths and configure npm/pnpm store locally.

## Setup Instructions

### 1. Configure npm Store (One-time setup)

```powershell
# Set npm config to use local C: drive
npm config set store-dir "C:\pnpm-store"
npm config set cache "C:\npm-cache"
npm config set virtual-store-dir ".pnpm"

# Verify
npm config list
```

### 2. Navigate to Project Directory

Always navigate explicitly and verify your location:

```powershell
# Change to project directory
cd C:\Mac\Home\Documents\git\ha-weather-forecast-card

# Verify you're in the right place
pwd  # Should print: C:\Mac\Home\Documents\git\ha-weather-forecast-card
ls package.json  # Should show the file exists
```

### 3. Install Dependencies

```powershell
# First time: install all dependencies
npm install

# Or with pnpm (if you prefer):
pnpm install --frozen-lockfile
```

**Note**: Installation may take 2-5 minutes on ARM Windows. Be patient.

### 4. Verify Installation

```powershell
# Check that parcel was installed
npm list parcel

# Check all key dependencies
npm list @mdi/js lit parcel chart.js
```

## Build Commands

Once dependencies are installed, use these commands:

```powershell
# Production build (minified, optimized)
npm run build

# Debug build (source maps, unminified)
npm run build:debug

# Development server with live reload (open http://localhost:1234)
npm run dev

# Run linter
npm run lint

# Run tests
npm run test

# Watch tests
npm run test:watch

# Clean build artifacts
npm run clean
```

## Common Issues & Solutions

### Issue: "pnpm: No package.json found in \\psf\..."
**Cause**: pnpm is trying to use UNC paths.  
**Solution**:
```powershell
# Reconfigure store to local path
npm config set store-dir "C:\pnpm-store"

# Make sure you're in the right directory
cd C:\Mac\Home\Documents\git\ha-weather-forecast-card
pwd  # Verify path shows C:\ not \\psf\
```

### Issue: "EPERM: operation not permitted, rename..."
**Cause**: Permission issue in pnpm store.  
**Solution**:
```powershell
# Clean pnpm store
pnpm store prune

# Or reset and reinstall
npm config delete store-dir
npm install
```

### Issue: Build fails with "parcel: command not found"
**Cause**: Dependencies not installed or node_modules missing.  
**Solution**:
```powershell
# Reinstall dependencies
rm node_modules, pnpm-lock.yaml -Recurse -Force -ErrorAction SilentlyContinue
npm install
```

### Issue: Long build times on ARM
**Cause**: ARM processors may be slower; Parcel can be resource-intensive.  
**Solution**: Be patient (5-10 minutes is normal for first build). Subsequent builds with cache are faster.

## Project Structure

```
ha-weather-forecast-card/
├── src/
│   ├── helpers.ts              # Forecast grouping, day/night logic
│   ├── types.ts                # TypeScript types & interfaces
│   ├── index.ts                # Entry point
│   ├── weather-forecast-card.ts
│   ├── components/             # Lit web components
│   ├── editor/                 # Visual editor
│   ├── data/                   # Data processing
│   ├── hass/                   # Home Assistant integration
│   └── translations/           # i18n (en.json, de.json)
├── test/                       # Vitest test suite
├── dist/                       # Build output (weather-forecast-card.js)
├── package.json               # npm manifest
├── pnpm-lock.yaml             # Dependency lock file
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Test config
└── README.md                  # Documentation
```

## Build Output

After running `npm run build`, the compiled card is available at:
```
dist/weather-forecast-card.js
```

This is the production-ready bundle for deployment to Home Assistant.

## For Home Assistant Deployment

1. Build the card:
   ```powershell
   npm run build
   ```

2. Copy `dist/weather-forecast-card.js` to your Home Assistant config:
   ```
   config/www/weather-forecast-card.js
   ```

3. Add to your Lovelace configuration:
   ```yaml
   resources:
     - url: /local/weather-forecast-card.js
       type: module
   ```

## Troubleshooting: Full Reset

If you encounter persistent issues:

```powershell
cd C:\Mac\Home\Documents\git\ha-weather-forecast-card

# Remove all build artifacts and dependencies
npm run clean
rm node_modules -Recurse -Force -ErrorAction SilentlyContinue
rm pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
rm .parcel-cache -Recurse -Force -ErrorAction SilentlyContinue

# Restore lock file from git
git checkout pnpm-lock.yaml

# Clean npm cache
npm cache clean --force

# Reconfigure npm
npm config set store-dir "C:\pnpm-store"

# Fresh install
npm install

# Test build
npm run build
```

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [npm Documentation](https://docs.npmjs.com/)
- [Parcel Documentation](https://parceljs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Lit Documentation](https://lit.dev/)
- [Home Assistant Custom Cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card)
