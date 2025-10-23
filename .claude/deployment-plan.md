# Deployment Plan

## Overview

Deploy the Homskillet Discography site to GitHub Pages as a fully static site with all assets (app + NSF files) hosted together.

## Why GitHub Pages?

- **Perfect fit for our use case:** Static React SPA + 2.1 MB of NSF files (125 files)
- **Free hosting:** No cost for public repos
- **Simple deployment:** Already configured with `npm run deploy`
- **CDN included:** GitHub Pages uses Fastly CDN for global delivery
- **No over-engineering:** AWS/S3 would be overkill for a 2.1 MB music collection

## Current Architecture (Development)

Three servers running locally:
- **Port 3000** - Webpack dev server (React app)
- **Port 8080** - Node.js API server (`/browse`, `/search`, `/total` endpoints)
- **Port 8000** - Python file server (serves NSF files from `./catalog` symlink)

## Target Architecture (Production)

Single static site on GitHub Pages:
- **React app** - Pre-built static bundle (HTML/JS/CSS/WASM)
- **NSF files** - Committed to repo in `music/` folder
- **Catalog data** - Pre-generated JSON files included in build
- **No backend servers** - All browse/search data baked into static files at build time

## Implementation Steps

### 1. Update Git Tracking
- [ ] Remove `music/` from `.gitignore` (currently untracked)
- [ ] Commit the `music/` folder to the repo
- [ ] Verify all NSF files are tracked

### 2. Update Catalog Build Process
- [ ] Change catalog build script to use `music/` instead of `./catalog` symlink
- [ ] Ensure `scripts/build-catalog.js` outputs to correct location
- [ ] Test that catalog builds correctly with `npm run build-catalog`

### 3. Eliminate API Server Dependencies
- [ ] Pre-generate all `/browse` responses into static JSON files
- [ ] Pre-generate `/search` index into static JSON
- [ ] Pre-generate `/total` count into static JSON
- [ ] Update frontend to load from static JSON instead of API calls
- [ ] Remove dependency on Node.js API server for production builds

### 4. Update Deployment Configuration
- [ ] Verify `homepage` in `package.json` points to correct GitHub Pages URL
- [ ] Ensure `CATALOG_PREFIX` in `src/config/index.js` points to correct path in production
- [ ] Test production build locally: `npm run build`
- [ ] Verify all paths resolve correctly in production build

### 5. Deploy to GitHub Pages
- [ ] Run `npm run deploy`
- [ ] Test deployed site thoroughly
- [ ] Verify all NSF files load and play correctly
- [ ] Check that browse/search functionality works

### 6. Documentation Updates
- [ ] Update README with deployment instructions
- [ ] Remove references to AWS deployment from CLAUDE.md
- [ ] Document the simplified static deployment approach

## Folder Structure (Production)

```
homskillet-discography/
├── build/                    # Production build output
│   ├── index.html
│   ├── static/              # JS/CSS bundles
│   ├── chip-core.wasm       # Audio engine
│   ├── music/               # NSF files (copied from src)
│   └── catalog/             # Pre-generated catalog JSON
├── music/                    # Source NSF files (committed to repo)
│   ├── Bazaar/
│   ├── Covers/
│   ├── LilLoops/
│   ├── MetallicWing/
│   ├── RandomJams/
│   ├── SuperFORE!/
│   └── UnfinishedBusiness/
└── ...
```

## Configuration Requirements

### Environment-Specific Settings

**Development:**
- API server on localhost:8080
- File server on localhost:8000
- Webpack dev server on localhost:3000

**Production (GitHub Pages):**
- No backend servers
- All data served as static files from GitHub Pages CDN
- Catalog JSON files pre-generated at build time

## Future Considerations

### When to Consider Moving to AWS

Only if you need:
- **User accounts/database** - Comments, favorites, play tracking
- **Analytics beyond client-side** - Server-side logging
- **High traffic** - GitHub Pages bandwidth limits become an issue
- **Dynamic content** - Content that updates without rebuilds
- **Custom API** - Server-side processing requirements

### Migration Path if Needed

If the site grows beyond GitHub Pages capabilities:
1. Move NSF files to S3 bucket with CloudFront CDN
2. Deploy app to Netlify/Vercel/AWS Amplify
3. Update `CATALOG_PREFIX` to point to S3/CloudFront URL
4. Cost would still be minimal (~$1-5/month)

## Success Criteria

- ✅ Site loads from GitHub Pages URL
- ✅ All NSF files play correctly
- ✅ Browse functionality works (no API server needed)
- ✅ Search functionality works (if implemented)
- ✅ No console errors
- ✅ Fast load times (under 3 seconds for initial load)
- ✅ Mobile-friendly playback

## Notes

- **Repository size:** Currently 2.1 MB for music, well under GitHub's 1GB soft limit
- **Scalability:** Even if discography grows 10x (21 MB), still well within limits
- **Simplicity:** No infrastructure management, just `git push` to deploy
- **Cost:** $0
