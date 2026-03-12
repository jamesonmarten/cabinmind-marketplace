<?php
/**
 * Plugin Name: CabinMind AI Agents
 * Plugin URI: https://devcabin.com
 * Description: Embed the CabinMind agent marketplace into your WordPress site. This plugin adds a shortcode that displays a list of available AI agents from your marketplace API.
 * Version: 1.0.0
 * Author: Dev Cabin Technologies
 * Author URI: https://devcabin.com
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly.
}

/**
 * Registers a [cabinmind_agents] shortcode.
 *
 * @param array $atts Shortcode attributes (optional).
 * @return string HTML content to display.
 */
function cabinmind_agents_shortcode( $atts = array() ) {
    $atts = shortcode_atts(
        array(
            'api_url' => 'https://example.com/api/agents', // replace with your actual API endpoint
        ),
        $atts,
        'cabinmind_agents'
    );

    // Enqueue a small script to fetch and render agents.
    ob_start();
    ?>
    <div id="cabinmind-agent-list">
        <p>Loading agents...</p>
    </div>
    <script>
    (function() {
        const container = document.getElementById('cabinmind-agent-list');
        fetch('<?php echo esc_url( $atts['api_url'] ); ?>')
            .then(res => res.json())
            .then(agents => {
                if (!Array.isArray(agents)) {
                    container.innerHTML = '<p>No agents found.</p>';
                    return;
                }
                const cards = agents.map(agent => {
                    return `
                        <div class="agent-card" style="border:1px solid #ddd;padding:16px;margin-bottom:16px;">
                            <h3 style="margin:0 0 8px;">${agent.name}</h3>
                            <p style="margin:0 0 8px;">${agent.description}</p>
                            <p style="font-weight:bold;margin:0 0 8px;">$${agent.price} / month</p>
                        </div>
                    `;
                });
                container.innerHTML = cards.join('');
            })
            .catch(err => {
                console.error('Error loading agents', err);
                container.innerHTML = '<p>Error loading agents.</p>';
            });
    })();
    </script>
    <?php
    return ob_get_clean();
}
add_shortcode( 'cabinmind_agents', 'cabinmind_agents_shortcode' );
