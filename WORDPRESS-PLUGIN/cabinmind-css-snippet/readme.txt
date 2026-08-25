=== CabinMind CSS Snippet Generator ===
Contributors: devcabintech
Tags: css, child theme, wordpress customization, css snippets, divi elementor astra
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Describe a design change in plain English and get conflict-safe CSS for Divi, Elementor, Astra, and more. Free tier included.

== Description ==

**CabinMind CSS Snippet Generator** embeds an AI-powered CSS assistant on any page using one shortcode:

`[cabinmind_css_snippet]`

Select your theme or page builder, describe the design change you want, and receive:

* Ready-to-paste CSS with specificity tuned for your theme
* PHP snippets for functions.php when needed
* Potential conflict warnings specific to your theme
* Placement instructions (Customizer, child theme, etc.)
* Optional full child theme scaffold (style.css + functions.php)

Supports: **Divi, Elementor, Astra, GeneratePress, Kadence, Blocksy, Neve, Storefront, Twenty Twenty-Four**, and generic themes.

= Free Tier =
* 3 snippets per month, per visitor — no account required
* Full CSS and PHP output each time

= Upgrade =
Upgrade at [wp.devcabin.tech/agents/child-theme-builder](https://wp.devcabin.tech/agents/child-theme-builder) for:
* Unlimited snippets
* Block editor patterns
* Custom field CSS generation
* Full child theme packages

= Shortcode =
`[cabinmind_css_snippet]`

= External Services =
This plugin calls the CabinMind API to generate snippets. No executable code is downloaded. All generated CSS and PHP is displayed as plain text for you to review and copy manually.

Service endpoints:
* `https://products.devcabin.tech/api/wp/css-snippet`

What is sent: theme name and the design change description entered by the user.
What is received: JSON with CSS/PHP code snippets and conflict warnings.

Service terms: https://devcabin.tech/terms
Privacy policy: https://devcabin.tech/privacy

== Installation ==
1. Upload the `cabinmind-css-snippet` folder to `/wp-content/plugins/`.
2. Activate **CabinMind CSS Snippet Generator** from the Plugins screen.
3. Add `[cabinmind_css_snippet]` to any page or post.

== Frequently Asked Questions ==

= Does this plugin require an account? =
No. The free tier (3 snippets/month) works without any account or API key.

= Does the plugin execute the generated CSS automatically? =
No. All generated code is displayed as plain text inside a code block. You copy it and paste it yourself — the plugin never modifies your theme or site styles.

= Is the generated code safe? =
The API is instructed to generate only CSS and safe PHP (enqueue functions, add_action hooks). It will never generate eval(), shell_exec(), or external HTTP calls in the output. Always review code before adding it to your site.

= How does the free tier work? =
The free tier is enforced server-side by the CabinMind API. There are no artificial restrictions in the plugin code.

== Screenshots ==
1. CSS generator form on the front end
2. Generated CSS snippet with copy button
3. Child theme scaffold output

== Changelog ==
= 1.0.0 =
* Initial release.

== Upgrade Notice ==
= 1.0.0 =
Initial release.
