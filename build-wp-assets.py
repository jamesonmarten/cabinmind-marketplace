#!/usr/bin/env python3
"""
build-wp-assets.py
Generates all WordPress.org plugin directory assets from source images.

Usage:
  python3 build-wp-assets.py --banner ~/Downloads/devcabin-banner-source.png

The script expects the campfire icon to already exist at
  public/dev-cabin-logo-transparent.png  (already in the repo)

Outputs to WORDPRESS-PLUGIN/wp-org-assets/:
  icon-256x256.png        — plugin icon (retina)
  icon-128x128.png        — plugin icon (standard)
  banner-1544x500.png     — plugin banner (retina)
  banner-772x250.png      — plugin banner (standard)
  screenshot-1.png        — placeholder screenshot

Then copies every file into each plugin's assets/ folder.
"""

import sys
import os
import shutil
import argparse
from PIL import Image

REPO  = os.path.dirname(os.path.abspath(__file__))
DEST  = os.path.join(REPO, 'WORDPRESS-PLUGIN', 'wp-org-assets')
ICON_SRC = os.path.join(REPO, 'public', 'dev-cabin-logo-transparent.png')

PLUGINS = [
    'cabinmind-vuln-scanner',
    'cabinmind-plugin-recommender',
    'cabinmind-speed-optimizer',
    'cabinmind-maintenance-report',
    'cabinmind-css-snippet',
    'cabinmind-link-checker',
]

def make_icon(src_path: str, dest_dir: str):
    img = Image.open(src_path).convert('RGBA')
    for size in [(256, 256), (128, 128)]:
        out = os.path.join(dest_dir, f'icon-{size[0]}x{size[1]}.png')
        img.resize(size, Image.LANCZOS).save(out, 'PNG', optimize=True)
        print(f'  icon-{size[0]}x{size[1]}.png')

def make_banner(src_path: str, dest_dir: str):
    img = Image.open(src_path).convert('RGB')
    w, h = img.size

    for (tw, th) in [(1544, 500), (772, 250)]:
        # Scale so the image fills the target width, then centre-crop height.
        scale = tw / w
        scaled_h = int(h * scale)
        resized = img.resize((tw, scaled_h), Image.LANCZOS)

        if scaled_h >= th:
            # Crop vertically from centre
            top = (scaled_h - th) // 2
            banner = resized.crop((0, top, tw, top + th))
        else:
            # Pad with near-black background to reach target height
            banner = Image.new('RGB', (tw, th), (18, 18, 18))
            y_offset = (th - scaled_h) // 2
            banner.paste(resized, (0, y_offset))

        out = os.path.join(dest_dir, f'banner-{tw}x{th}.png')
        banner.save(out, 'PNG', optimize=True)
        print(f'  banner-{tw}x{th}.png')

def main():
    parser = argparse.ArgumentParser(description='Build WP.org plugin assets.')
    parser.add_argument('--banner', required=True, help='Path to the banner source image.')
    parser.add_argument('--icon',   default=ICON_SRC, help='Path to the icon source image.')
    args = parser.parse_args()

    if not os.path.exists(args.banner):
        print(f'ERROR: Banner source not found at {args.banner}')
        sys.exit(1)

    if not os.path.exists(args.icon):
        print(f'ERROR: Icon source not found at {args.icon}')
        sys.exit(1)

    os.makedirs(DEST, exist_ok=True)
    print(f'\nGenerating assets → {DEST}\n')

    print('Icons:')
    make_icon(args.icon, DEST)

    print('Banners:')
    make_banner(args.banner, DEST)

    # Copy assets into each plugin directory
    print('\nCopying to plugin assets/ directories:')
    for slug in PLUGINS:
        plugin_assets = os.path.join(REPO, 'WORDPRESS-PLUGIN', slug, 'assets')
        os.makedirs(plugin_assets, exist_ok=True)
        for fname in os.listdir(DEST):
            if fname.endswith('.png') or fname.endswith('.jpg'):
                shutil.copy2(os.path.join(DEST, fname), os.path.join(plugin_assets, fname))
        print(f'  {slug}/assets/')

    print('\nAll done. Assets are ready for WordPress.org SVN upload.')
    print('Upload instructions:')
    print('  1. Check out your plugin SVN:  svn co https://plugins.svn.wordpress.org/YOUR-SLUG/assets assets-folder')
    print('  2. Copy the files from wp-org-assets/ into the checked-out assets-folder/')
    print('  3. svn add *  &&  svn ci -m "Add plugin assets"')

if __name__ == '__main__':
    main()
