# Release Guide for Obsidian Community Plugin

## Prerequisites

1. **GitHub Repository**: Create a public GitHub repository
2. **Author Information**: Update `manifest.json` with your author name
3. **GitHub Account**: You'll need a GitHub account to submit to Obsidian

## Step 1: Prepare the Repository

1. Initialize git (if not already):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create GitHub repository and push:
```bash
git remote add origin https://github.com/YOUR_USERNAME/obsidian-schedule.git
git branch -M main
git push -u origin main
```

## Step 2: Build Release Files

The plugin needs these files for distribution:
- `main.js` (built JavaScript)
- `manifest.json`
- `styles.css` (if exists)
- `calendar-bridge` (native binary - macOS only)

Build process:
```bash
# Build Swift binary
bun run build:swift

# Build plugin
bun run build
```

## Step 3: Create GitHub Release

### Option A: Automated (Recommended)

The GitHub Actions workflow will automatically build and create releases when you push a tag:

```bash
# Update version in manifest.json, package.json, and versions.json
# Then create and push a tag:
git tag v1.0.0
git push origin v1.0.0
```

The workflow will:
- Build the Swift binary
- Build the TypeScript plugin
- Create a zip file with all required files
- Create a GitHub release automatically

### Option B: Manual

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Tag version: `v1.0.0` (match manifest.json version)
4. Release title: `v1.0.0`
5. Upload these files as release assets:
   - `main.js`
   - `manifest.json`
   - `styles.css`
   - `calendar-bridge` (macOS binary)
6. Publish release

## Step 4: Submit to Obsidian Community Plugins

1. Go to https://github.com/obsidianmd/obsidian-releases
2. Fork the repository
3. Add your plugin to `community-plugins.json`:
```json
{
  "id": "obsidian-schedule",
  "name": "Schedule",
  "author": "YOUR_NAME",
  "version": "1.0.0",
  "minAppVersion": "1.0.0",
  "description": "A vertical, scrollable calendar view that syncs with local calendars",
  "repo": "YOUR_USERNAME/obsidian-schedule",
  "branch": "main"
}
```
4. Create a pull request

## Step 5: Version Management

Update versions in sync:
- `manifest.json` → `version`
- `package.json` → `version`
- `versions.json` → add new version entry
- Create git tag: `v1.0.0`

## Important Notes

- **Native Binary**: The `calendar-bridge` binary must be built for macOS and included in releases
- **Desktop Only**: Plugin is marked `isDesktopOnly: true` due to native component
- **Version Sync**: Always keep manifest.json, package.json, and versions.json in sync
- **Release Assets**: Users need all files (main.js, manifest.json, styles.css, calendar-bridge)

## Automated Release (Optional)

Consider setting up GitHub Actions to:
1. Build on tag push
2. Create release automatically
3. Upload assets

Example workflow would:
- Build Swift binary
- Build TypeScript
- Package files
- Create GitHub release
