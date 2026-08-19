<?php
/**
 * Plugin Name:  CabinMind AI Agents
 * Plugin URI:   https://products.devcabin.tech
 * Description:  Embed the CabinMind AI Agent Marketplace on any page using the [cabinmind_agents] shortcode.
 * Version:      1.4.0
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

define( 'CABINMIND_API_URL',   'https://products.devcabin.tech/api/agents' );
define( 'CABINMIND_STORE_URL', 'https://products.devcabin.tech/agents' );
define( 'CABINMIND_VERSION',   '1.4.0' );

/**
 * Register plugin CSS and JS (assets are only enqueued when the shortcode is used).
 */
function cabinmind_register_assets() {
	wp_register_style(
		'cabinmind-agents',
		plugin_dir_url( __FILE__ ) . 'cabinmind-agents.css',
		array(),
		CABINMIND_VERSION
	);
	wp_register_script(
		'cabinmind-agents',
		plugin_dir_url( __FILE__ ) . 'cabinmind-agents.js',
		array(),
		CABINMIND_VERSION,
		true // load in footer, after DOM is ready
	);
}
add_action( 'wp_enqueue_scripts', 'cabinmind_register_assets' );

/**
 * [cabinmind_agents] shortcode.
 *
 * Attributes:
 *   api_url   – override the API endpoint    (default: CABINMIND_API_URL)
 *   store_url – override the marketplace URL  (default: CABINMIND_STORE_URL)
 *   columns   – grid columns: 1 | 2 | 3      (default: 3)
 *
 * @param array $atts Shortcode attributes.
 * @return string      HTML output.
 */
function cabinmind_agents_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

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
	wp_enqueue_script( 'cabinmind-agents' );

	$api_url      = esc_url_raw( $atts['api_url'] );
	$store_url    = esc_url_raw( rtrim( $atts['store_url'], '/' ) );
	$columns      = in_array( $atts['columns'], array( '1', '2', '3' ), true ) ? $atts['columns'] : '3';
	$container_id = 'cabinmind-agent-list-' . $instance;

	/*
	 * Pass per-instance config to the bundled JS via an inline var pushed before
	 * cabinmind-agents.js runs.  wp_add_inline_script() is the WordPress-approved
	 * way to attach inline data to a registered/enqueued script handle.
	 */
	$config = array(
		'id'       => $container_id,
		'apiUrl'   => $api_url,
		'storeUrl' => $store_url,
	);
	$inline  = 'window.cabinmindInstances = window.cabinmindInstances || [];';
	$inline .= 'window.cabinmindInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cabinmind-agents', $inline, 'before' );

	ob_start();
	?>
	<div id="<?php echo esc_attr( $container_id ); ?>" class="cabinmind-grid cabinmind-cols-<?php echo esc_attr( $columns ); ?>">
		<p class="cabinmind-loading"><?php esc_html_e( 'Loading AI agents…', 'cabinmind-ai-agents' ); ?></p>
	</div>
	<?php
	return ob_get_clean();
}
add_shortcode( 'cabinmind_agents', 'cabinmind_agents_shortcode' );
