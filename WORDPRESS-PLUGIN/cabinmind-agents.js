/* CabinMind AI Agents – bundled front-end script v1.4.0
 * Reads configuration injected by wp_add_inline_script (before).
 * window.cabinmindInstances is an array of { id, apiUrl, storeUrl } objects.
 */
/* global cabinmindInstances */
( function () {
	'use strict';

	var ICONS = {
		'receptionist':    '🤖',
		'website-audit':   '📈',
		'blog-writer':     '✍️',
		'sales-assistant': '💼',
		'lead-researcher': '🔎'
	};

	/**
	 * Escape a plain-text string so it is safe to inject as HTML text content.
	 *
	 * @param {*} str
	 * @return {string}
	 */
	function escHtml( str ) {
		var d = document.createElement( 'div' );
		d.appendChild( document.createTextNode( String( str ) ) );
		return d.innerHTML;
	}

	/**
	 * Build the price display HTML for one agent card.
	 * All user-supplied values are passed through escHtml().
	 *
	 * @param {Object} agent
	 * @return {string}
	 */
	function priceMarkup( agent ) {
		if ( agent && typeof agent.priceLabel === 'string' && agent.priceLabel.trim() !== '' ) {
			return escHtml( agent.priceLabel );
		}
		if ( agent && agent.price ) {
			var suffix = agent.priceSuffix || '/mo';
			return '$' + escHtml( agent.price ) + '<small>' + escHtml( suffix ) + '</small>';
		}
		return 'Contact for pricing';
	}

	/**
	 * Fetch and render one agent grid instance.
	 *
	 * @param {{ id: string, apiUrl: string, storeUrl: string }} config
	 */
	function renderGrid( config ) {
		var container = document.getElementById( config.id );
		if ( ! container ) {
			return;
		}

		var apiUrl   = config.apiUrl   || '';
		var storeUrl = config.storeUrl || '';

		fetch( apiUrl )
			.then( function ( res ) {
				if ( ! res.ok ) {
					throw new Error( 'HTTP ' + res.status );
				}
				return res.json();
			} )
			.then( function ( agents ) {
				if ( ! Array.isArray( agents ) || agents.length === 0 ) {
					container.innerHTML = '<p class="cabinmind-error">No agents found.</p>';
					return;
				}

				container.innerHTML = agents.map( function ( agent ) {
					var icon     = ICONS[ agent.id ] || '⚡';
					var agentUrl = escHtml( storeUrl + '/' + encodeURIComponent( String( agent.id || '' ) ) );

					var featuresHtml = '';
					if ( Array.isArray( agent.features ) ) {
						featuresHtml = '<ul class="cabinmind-features">' +
							agent.features.slice( 0, 4 ).map( function ( f ) {
								return '<li>&#10003; ' + escHtml( f ) + '</li>';
							} ).join( '' ) +
							'</ul>';
					}

					var freeBadge = agent.freemium
						? '<span class="cabinmind-free-badge">Free tier available</span>'
						: '';

					return [
						'<div class="cabinmind-card">',
							'<div class="cabinmind-card-header">',
								'<span class="cabinmind-icon">' + icon + '</span>',
								'<span class="cabinmind-badge">' + escHtml( agent.category || '' ) + '</span>',
							'</div>',
							'<h3 class="cabinmind-name">' + escHtml( agent.name || '' ) + '</h3>',
							'<p class="cabinmind-desc">' + escHtml( agent.description || '' ) + '</p>',
							featuresHtml,
							'<div class="cabinmind-footer">',
								'<div class="cabinmind-price-wrap">',
									freeBadge,
									'<span class="cabinmind-price">' + priceMarkup( agent ) + '</span>',
								'</div>',
								'<div class="cabinmind-actions">',
									'<a class="cabinmind-btn-secondary" href="' + agentUrl + '" target="_blank" rel="noopener noreferrer">Try Demo</a>',
									'<a class="cabinmind-btn-primary"   href="' + agentUrl + '" target="_blank" rel="noopener noreferrer">Subscribe &#8594;</a>',
								'</div>',
							'</div>',
						'</div>'
					].join( '' );
				} ).join( '' );
			} )
			.catch( function ( err ) {
				console.error( 'CabinMind Agents:', err );
				container.innerHTML =
					'<p class="cabinmind-error">Could not load agents. ' +
					'<a href="' + escHtml( storeUrl ) + '" target="_blank" rel="noopener noreferrer">View marketplace &#8594;</a>' +
					'</p>';
			} );
	}

	( window.cabinmindInstances || [] ).forEach( renderGrid );
}() );
