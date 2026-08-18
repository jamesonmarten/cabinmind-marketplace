<?php
/**
 * Plugin Name:  CabinMind AI Agents
 * Plugin URI:   https://products.devcabin.tech
 * Description:  Embed the CabinMind AI Agent Marketplace on any page using the [cabinmind_agents] shortcode.
 * Version:      1.3.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain: cabinmind-ai-agents
 * Domain Path: /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ──────────────────────────────────────────────────────────────────────────────
// Defaults
// ──────────────────────────────────────────────────────────────────────────────
define( 'CABINMIND_API_URL',   'https://products.devcabin.tech/api/agents' );
define( 'CABINMIND_STORE_URL', 'https://products.devcabin.tech/agents' );

// ──────────────────────────────────────────────────────────────────────────────
// Register stylesheet (loaded only when shortcode is present)
// ──────────────────────────────────────────────────────────────────────────────
function cabinmind_enqueue_styles() {
    wp_register_style(
        'cabinmind-agents',
        plugin_dir_url( __FILE__ ) . 'cabinmind-agents.css',
        array(),
        '1.3.0'
    );
}
add_action( 'wp_enqueue_scripts', 'cabinmind_enqueue_styles' );

// ──────────────────────────────────────────────────────────────────────────────
// [cabinmind_agents] shortcode
//
// Attributes:
//   api_url   – override the API endpoint   (default: CABINMIND_API_URL)
//   store_url – override the marketplace URL (default: CABINMIND_STORE_URL)
//   columns   – grid columns: 1 | 2 | 3     (default: 3)
// ──────────────────────────────────────────────────────────────────────────────
function cabinmind_agents_shortcode( $atts ) {
    $atts = shortcode_atts(
        array(
            'api_url'   => CABINMIND_API_URL,
            'store_url' => CABINMIND_STORE_URL,
            'columns'   => '3',
        ),
        $atts,
        'cabinmind_agents'
    );

    wp_enqueue_style( 'cabinmind-agents' );

    $api_url   = esc_url( $atts['api_url'] );
    $store_url = esc_url( rtrim( $atts['store_url'], '/' ) );
    $columns   = in_array( $atts['columns'], array( '1', '2', '3' ), true ) ? $atts['columns'] : '3';

    ob_start();
    ?>
    <div id="cabinmind-agent-list" class="cabinmind-grid cabinmind-cols-<?php echo esc_attr( $columns ); ?>">
        <p class="cabinmind-loading">Loading AI agents…</p>
    </div>

    <script>
    (function () {
        'use strict';
        var container = document.getElementById('cabinmind-agent-list');
        var apiUrl    = <?php echo wp_json_encode( $api_url ); ?>;
        var storeUrl  = <?php echo wp_json_encode( $store_url ); ?>;

        var ICONS = {
            'receptionist':    '🤖',
            'website-audit':   '📈',
            'blog-writer':     '✍️',
            'sales-assistant': '💼',
            'lead-researcher': '🔎',
        };

        function escHtml( str ) {
            var d = document.createElement('div');
            d.appendChild( document.createTextNode( String(str) ) );
            return d.innerHTML;
        }

        function priceMarkup( agent ) {
            if ( agent && typeof agent.priceLabel === 'string' && agent.priceLabel.trim() !== '' ) {
                return escHtml(agent.priceLabel);
            }
            if ( agent && agent.price ) {
                var suffix = agent.priceSuffix || '/mo';
                return '$' + escHtml(agent.price) + '<small>' + escHtml(suffix) + '</small>';
            }
            return 'Contact for pricing';
        }

        fetch( apiUrl )
            .then( function(res) {
                if ( !res.ok ) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then( function(agents) {
                if ( !Array.isArray(agents) || agents.length === 0 ) {
                    container.innerHTML = '<p class="cabinmind-error">No agents found.</p>';
                    return;
                }
                container.innerHTML = agents.map( function(agent) {
                    var icon       = ICONS[agent.id] || '⚡';
                    var agentUrl   = storeUrl + '/' + encodeURIComponent(agent.id);
                    var featuresHtml = '';
                    if ( Array.isArray(agent.features) ) {
                        featuresHtml = '<ul class="cabinmind-features">' +
                            agent.features.slice(0, 4).map( function(f) {
                                return '<li>✓ ' + escHtml(f) + '</li>';
                            }).join('') + '</ul>';
                    }
                    return [
                        '<div class="cabinmind-card">',
                          '<div class="cabinmind-card-header">',
                            '<span class="cabinmind-icon">' + icon + '</span>',
                            '<span class="cabinmind-badge">' + escHtml(agent.category || '') + '</span>',
                          '</div>',
                          '<h3 class="cabinmind-name">' + escHtml(agent.name) + '</h3>',
                          '<p class="cabinmind-desc">' + escHtml(agent.description) + '</p>',
                          featuresHtml,
                          '<div class="cabinmind-footer">',
                                                        '<div class="cabinmind-price-wrap">',
                                                            (agent.freemium ? '<span class="cabinmind-free-badge">Free tier available</span>' : ''),
                                                            '<span class="cabinmind-price">' + priceMarkup(agent) + '</span>',
                                                        '</div>',
                            '<div class="cabinmind-actions">',
                              '<a class="cabinmind-btn-secondary" href="' + agentUrl + '" target="_blank" rel="noopener">Try Demo</a>',
                              '<a class="cabinmind-btn-primary"   href="' + agentUrl + '" target="_blank" rel="noopener">Subscribe →</a>',
                            '</div>',
                          '</div>',
                        '</div>',
                    ].join('');
                }).join('');
            })
            .catch( function(err) {
                console.error('CabinMind:', err);
                container.innerHTML = '<p class="cabinmind-error">Could not load agents. ' +
                    '<a href="' + storeUrl + '" target="_blank" rel="noopener">View marketplace →</a></p>';
            });
    })();
    </script>

    <script>
    (function () {
        'use strict';
        if (window.__cabinmindTeddyLoaded) return;
        window.__cabinmindTeddyLoaded = true;

        window.CabinMindConfig = Object.assign({}, window.CabinMindConfig || {}, {
            agentName: 'Teddy',
            businessName: 'CabinMind',
            businessContext: 'CabinMind is an AI agent marketplace built by Dev Cabin Technologies. It offers AI agents for lead generation, social media, sales, blog writing, audits, automation, and WordPress workflows. Visitors can try agents for free at /trial or /demo. Pricing includes freemium options for selected WordPress tools, paid plans from $19/mo on those tools, and marketplace subscriptions starting from $50/mo depending on product. Key pages: /agents (browse agents), /pricing, /demo, /agency.',
            salesMode: true,
            apiBase: 'https://products.devcabin.tech'
        });

        var s = document.createElement('script');
        s.src = 'https://products.devcabin.tech/widget.js';
        s.async = true;
        document.head.appendChild(s);
    })();
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode( 'cabinmind_agents', 'cabinmind_agents_shortcode' );
