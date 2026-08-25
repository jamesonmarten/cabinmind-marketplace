/* CabinMind Plugin Recommender — bundled JS v1.0.0 */
( function () {
	'use strict';

	function escHtml( s ) {
		var d = document.createElement( 'div' );
		d.appendChild( document.createTextNode( String( s || '' ) ) );
		return d.innerHTML;
	}

	function upgradeBox( msg, url ) {
		return '<div class="cm-upgrade-box"><p>' + escHtml( msg ) + '</p>' +
			'<a class="cm-upgrade-link" href="' + escHtml( url ) + '" target="_blank" rel="noopener noreferrer">Upgrade &rarr;</a></div>';
	}

	var CATEGORY_ICONS = {
		'SEO': '&#128269;', 'Security': '&#128274;', 'Performance': '&#9889;',
		'Backup': '&#128190;', 'E-commerce': '&#128722;', 'Forms': '&#128203;',
		'Analytics': '&#128202;', 'Other': '&#129695;',
	};

	function init( config ) {
		var wrap = document.getElementById( config.id );
		if ( ! wrap ) return;

		wrap.innerHTML = [
			'<div class="cm-wrap">',
				'<div class="cm-header">',
					'<span class="cm-icon">&#129513;</span>',
					'<div><h2 class="cm-title">WordPress Plugin Recommender</h2>',
					'<p class="cm-subtitle">Describe your business and get a hand-picked, conflict-free plugin stack.</p></div>',
				'</div>',
				'<span class="cm-free-badge">&#10003; Free &mdash; 2 recommendations per month, no account needed</span>',
				'<hr class="cm-divider">',
				'<form class="cm-form" id="' + escHtml( config.id ) + '-form" novalidate>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-type">Business Type</label>',
						'<select class="cm-select" id="' + escHtml( config.id ) + '-type">',
							'<option value="e-commerce">E-commerce / Online Store</option>',
							'<option value="blog">Blog / News</option>',
							'<option value="portfolio">Portfolio / Freelancer</option>',
							'<option value="restaurant">Restaurant / Food & Drink</option>',
							'<option value="service-business" selected>Service Business</option>',
							'<option value="nonprofit">Nonprofit / Charity</option>',
							'<option value="real-estate">Real Estate</option>',
							'<option value="membership">Membership / Community</option>',
							'<option value="directory">Directory / Listings</option>',
							'<option value="other">Other</option>',
						'</select>',
					'</div>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-desc">Describe your business <span style="font-weight:400;color:#9ca3af">(min 10 chars)</span></label>',
						'<textarea class="cm-textarea" id="' + escHtml( config.id ) + '-desc" placeholder="e.g. Local plumbing company that books jobs online and sends email follow-ups to customers." required></textarea>',
					'</div>',
					'<button class="cm-btn" type="submit">',
						'<span class="cm-btn-spinner"></span>',
						'<span class="cm-btn-label">Get My Plugin Stack</span>',
					'</button>',
				'</form>',
				'<div class="cm-results" id="' + escHtml( config.id ) + '-results"></div>',
			'</div>',
		].join( '' );

		var form    = document.getElementById( config.id + '-form' );
		var results = document.getElementById( config.id + '-results' );
		var btn     = form.querySelector( '.cm-btn' );
		var label   = form.querySelector( '.cm-btn-label' );

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var typeVal = document.getElementById( config.id + '-type' ).value;
			var descVal = document.getElementById( config.id + '-desc' ).value.trim();
			if ( descVal.length < 10 ) {
				document.getElementById( config.id + '-desc' ).focus();
				return;
			}

			btn.disabled = true;
			btn.classList.add( 'loading' );
			label.textContent = 'Building your stack\u2026';
			results.innerHTML = '<p class="cm-loading-msg">Analysing your business and selecting the best plugins\u2026 usually 5\u201310 seconds.</p>';

			fetch( config.apiUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify( { businessType: typeVal, description: descVal } ),
			} )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, status: r.status, d: d }; } ); } )
				.then( function ( res ) {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Get My Plugin Stack';

					if ( res.status === 429 ) {
						results.innerHTML = upgradeBox(
							'You have used your 2 free recommendations this month. Upgrade for unlimited plugin stacks.',
							config.upgradeUrl
						);
						return;
					}
					if ( ! res.ok ) {
						results.innerHTML = '<div class="cm-error-box">' + escHtml( res.d.error || 'Request failed. Please try again.' ) + '</div>';
						return;
					}

					renderResults( results, res.d, config.upgradeUrl );
				} )
				.catch( function () {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Get My Plugin Stack';
					results.innerHTML = '<div class="cm-error-box">Network error. Please check your connection and try again.</div>';
				} );
		} );
	}

	function renderResults( container, resp, upgradeUrl ) {
		var d     = resp.data || {};
		var stack = Array.isArray( d.stack ) ? d.stack : [];
		var out   = [];

		if ( d.summary ) {
			out.push( '<div class="cm-summary-box">' + escHtml( d.summary ) + '</div>' );
		}

		// Stats
		out.push( '<div class="cm-metrics">' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( stack.length ) + '</div><div class="cm-metric-label">Plugins</div></div>' );
		out.push( '<div class="cm-metric"><div class="cm-metric-val">' + escHtml( d.estimatedSetupTime || '2-3 hrs' ) + '</div><div class="cm-metric-label">Setup Time</div></div>' );
		out.push( '</div>' );

		// Plugin cards
		if ( stack.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Your Plugin Stack</div><ul class="cm-item-list">' );
			stack.forEach( function ( p ) {
				var icon = CATEGORY_ICONS[ p.category ] || CATEGORY_ICONS['Other'];
				out.push( '<li class="cm-item">' );
				out.push( '<span class="cm-item-icon">' + icon + '</span>' );
				out.push( '<div style="flex:1">' );
				out.push( '<div class="cm-item-title" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' );
				out.push( '<span style="font-size:14px">#' + escHtml( p.installOrder || '' ) + ' ' + escHtml( p.name ) + '</span>' );
				out.push( '<span class="cm-badge cm-badge-info" style="font-size:10px">' + escHtml( p.category || 'Other' ) + '</span>' );
				out.push( '</div>' );
				out.push( '<div class="cm-item-desc" style="margin-top:4px">' + escHtml( p.purpose ) + '</div>' );
				out.push( '<div style="margin-top:6px;display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:#6b7280">' );
				out.push( '<span>&#128176; ' + escHtml( p.pricing || '' ) + '</span>' );
				if ( p.wpOrgUrl ) {
					out.push( '<a href="' + escHtml( p.wpOrgUrl ) + '" target="_blank" rel="noopener noreferrer" style="color:#7c3aed">WP.org &rarr;</a>' );
				}
				out.push( '</div></div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		// Warnings
		if ( d.warnings && d.warnings.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Things to Watch</div><ul class="cm-item-list">' );
			d.warnings.forEach( function ( w ) {
				out.push( '<li class="cm-item"><span class="cm-item-icon">&#9888;&#65039;</span><div>' + escHtml( w ) + '</div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		out.push( upgradeBox( 'Upgrade for unlimited stacks, compatibility reports, and proposal exports.', upgradeUrl ) );
		container.innerHTML = out.join( '' );
	}

	( window.cmPrInstances || [] ).forEach( init );
}() );
