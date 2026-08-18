# WordPress.org Plugin Directory Submission Checklist

Use this checklist to publish CabinMind AI Agents to the official WordPress plugin directory.

## 1) Create/verify your WordPress.org account
- Create an account at https://login.wordpress.org/register
- Confirm email and complete profile

## 2) Prepare required plugin files
The submission zip should contain one root folder with at minimum:
- cabinmind-agent-plugin.php
- cabinmind-agents.css
- readme.txt
- optional assets folder for banners/icons (recommended)

## 3) Verify plugin metadata
In the main plugin file header, ensure these fields are present and accurate:
- Plugin Name
- Description
- Version
- Author
- License
- Requires at least (recommended)
- Requires PHP (recommended)
- Text Domain (recommended for i18n)

## 4) Validate WordPress readme
- Make sure readme.txt follows WordPress readme format
- "Stable tag" must match plugin version
- Keep tags relevant and non-spammy

## 5) Build plugin zip package
From inside WORDPRESS-PLUGIN:

zip -r cabinmind-ai-agents-1.2.0.zip . -x "*.DS_Store"

## 6) Submit the plugin
- Go to https://wordpress.org/plugins/developers/add/
- Upload the zip
- Fill plugin name, short description, and confirm guidelines

## 7) Respond to review team feedback
WordPress reviewers often request changes before approval.
Typical requests:
- sanitize/escape improvements
- nonce/capability checks (if admin forms/actions exist)
- clearer external service disclosure

## 8) After approval: push to SVN
WordPress.org hosts plugins via SVN.

Typical structure:
- trunk/
- tags/1.2.0/
- assets/

High-level flow:
1. Check out your assigned SVN repo URL
2. Copy plugin files into trunk/
3. Copy release snapshot to tags/1.2.0/
4. Add banner/icon images to assets/
5. svn add / svn commit

## 9) Recommended assets for better listing conversion
- Banner 1544x500 (banner-1544x500.png)
- Banner 772x250 (banner-772x250.png)
- Icon 256x256 (icon-256x256.png)
- Icon 128x128 (icon-128x128.png)

## 10) Compliance notes for this plugin
Because this plugin fetches remote data from CabinMind endpoints, include clear disclosure in readme and plugin description:
- what remote endpoint is called
- what data is sent
- when requests are made

Add a short privacy section in readme if requested by reviewer.
