<?php
/**
 * Plugin Name:  CabinMind Vulnerability Scanner
 * Plugin URI:   https://wp.devcabin.tech/agents/vulnerability-scanner
 * Description:  Scan any WordPress URL for exposed plugins, known CVEs, missing security headers, and risk scores. Free tier included — no account required.
 * Version:      1.0.0
 * Author:       Dev Cabin Technologies
 * Author URI:   https://devcabin.tech
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Text Domain:  cabinmind-vuln-scanner
 * Domain Path:  /languages
 * License:      GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CM_VS_VERSION',     '1.0.0' );
define( 'CM_VS_API_URL',     'https://products.devcabin.tech/api/wp/vuln-scan' );
define( 'CM_VS_UPGRADE_URL', 'https://wp.devcabin.tech/agents/vulnerability-scanner' );

/**
 * Load plugin text domain for translations.
 */
function cm_vs_load_textdomain() {
	load_plugin_textdomain(
		'cabinmind-vuln-scanner',
		false,
		dirname( plugin_basename( __FILE__ ) ) . '/languages'
	);
}
add_action( 'plugins_loaded', 'cm_vs_load_textdomain' );

function cm_vs_register_assets() {
	wp_register_style(
		'cm-vuln-scanner',
		plugin_dir_url( __FILE__ ) . 'cabinmind-vuln-scanner.css',
		array(),
		CM_VS_VERSION
	);
	wp_register_script(
		'cm-vuln-scanner',
		plugin_dir_url( __FILE__ ) . 'cabinmind-vuln-scanner.js',
		array(),
		CM_VS_VERSION,
		true
	);
}
add_action( 'wp_enqueue_scripts', 'cm_vs_register_assets' );

/**
 * [cabinmind_vuln_scan] shortcode
 *
 * @param array $atts Shortcode attributes (none currently).
 * @return string HTML output.
 */
function cm_vs_shortcode( $atts ) {
	static $instance = 0;
	$instance++;

	shortcode_atts( array(), $atts, 'cabinmind_vuln_scan' );

	wp_enqueue_style( 'cm-vuln-scanner' );
	wp_enqueue_script( 'cm-vuln-scanner' );

	$container_id = 'cm-vs-' . $instance;

	$config = array(
		'id'         => $container_id,
		'apiUrl'     => CM_VS_API_URL,
		'upgradeUrl' => CM_VS_UPGRADE_URL,
	);

	$inline  = 'window.cmVsInstances = window.cmVsInstances || [];';
	$inline .= 'window.cmVsInstances.push(' . wp_json_encode( $config ) . ');';
	wp_add_inline_script( 'cm-vuln-scanner', $inline, 'before' );

	return '<div id="' . esc_attr( $container_id ) . '"></div>';
}
add_shortcode( 'cabinmind_vuln_scan', 'cm_vs_shortcode' );
