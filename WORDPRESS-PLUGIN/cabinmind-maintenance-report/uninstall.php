<?php
/**
 * Uninstall hook for CabinMind Maintenance Report.
 *
 * Called by WordPress when the plugin is deleted from the Plugins screen.
 * This plugin stores no WordPress options, database tables, or transients.
 * All AI processing is handled externally by the CabinMind API.
 *
 * @package cabinmind-maintenance-report
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit; // Prevent direct access.
}

// Nothing to clean up — this plugin creates no persistent WordPress data.
