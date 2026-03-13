<?php
/**
 * Plugin Name:  CabinMind AI Agents
 * Plugin URI:   https://products.devcabin.tech
 * Description:  Embed the CabinMind AI Agent Marketplace on any page using the [cabinmind_agents] shortcode.
 * Version:      1.1.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
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
        '1.1.0'
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
                            '<span class="cabinmind-price">$' + escHtml(agent.price) + '<small>/mo</small></span>',
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
    <?php
    return ob_get_clean();
}
add_shortcode( 'cabinmind_agents', 'cabinmind_agents_shortcode' );
