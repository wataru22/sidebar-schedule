# Pre-Release Checklist

## Before First Release

- [ ] Update `manifest.json` with your author name
- [ ] Update `package.json` author field (optional)
- [ ] Review and update `README.md` with accurate information
- [ ] Test the plugin thoroughly
- [ ] Build and test locally: `bun run build:swift && bun run build`
- [ ] Verify all files are present: `main.js`, `manifest.json`, `styles.css`, `calendar-bridge`

## Repository Setup

- [ ] Create public GitHub repository
- [ ] Initialize git and push code
- [ ] Add repository URL to README.md
- [ ] Ensure `.gitignore` is correct (excludes build artifacts)

## Version Management

- [ ] Update version in `manifest.json`
- [ ] Update version in `package.json`
- [ ] Add version entry to `versions.json`
- [ ] Create git tag: `git tag v1.0.0`

## Release Process

- [ ] Push tag to trigger automated release: `git push origin v1.0.0`
- [ ] Verify GitHub release was created with all files
- [ ] Download and test the release zip file

## Community Plugin Submission

- [ ] Fork https://github.com/obsidianmd/obsidian-releases
- [ ] Add entry to `community-plugins.json`
- [ ] Create pull request
- [ ] Wait for approval and merge

## Post-Release

- [ ] Monitor for issues and feedback
- [ ] Update documentation as needed
- [ ] Plan next version features
