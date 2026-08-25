/* CabinMind CSS Snippet Generator — bundled JS v1.0.0 */
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

	function codeBlock( code, id ) {
		return [
			'<div class="cm-code-wrap">',
				'<pre class="cm-code" id="' + escHtml( id ) + '">' + escHtml( code ) + '</pre>',
				'<button class="cm-copy-btn" data-target="' + escHtml( id ) + '">&#128203; Copy</button>',
			'</div>',
		].join( '' );
	}

	function init( config ) {
		var wrap = document.getElementById( config.id );
		if ( ! wrap ) return;

		wrap.innerHTML = [
			'<div class="cm-wrap">',
				'<div class="cm-header">',
					'<span class="cm-icon">&#127912;</span>',
					'<div><h2 class="cm-title">CSS Snippet Generator</h2>',
					'<p class="cm-subtitle">Describe a design change &mdash; get conflict-safe CSS for Divi, Elementor, Astra &amp; more.</p></div>',
				'</div>',
				'<span class="cm-free-badge">&#10003; Free &mdash; 3 snippets per month, no account needed</span>',
				'<hr class="cm-divider">',
				'<form class="cm-form" id="' + escHtml( config.id ) + '-form" novalidate>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-theme">Theme / Page Builder</label>',
						'<select class="cm-select" id="' + escHtml( config.id ) + '-theme">',
							'<option value="astra" selected>Astra</option>',
							'<option value="divi">Divi</option>',
							'<option value="elementor">Elementor (Hello / any theme)</option>',
							'<option value="generatepress">GeneratePress</option>',
							'<option value="kadence">Kadence</option>',
							'<option value="blocksy">Blocksy</option>',
							'<option value="neve">Neve</option>',
							'<option value="storefront">Storefront (WooCommerce)</option>',
							'<option value="twentytwentyfour">Twenty Twenty-Four</option>',
							'<option value="other">Other</option>',
						'</select>',
					'</div>',
					'<div class="cm-field">',
						'<label class="cm-label" for="' + escHtml( config.id ) + '-desc">What do you want to change? <span style="font-weight:400;color:#9ca3af">(min 10 chars)</span></label>',
						'<textarea class="cm-textarea" id="' + escHtml( config.id ) + '-desc" placeholder="e.g. Make the header sticky, change the primary button colour to #e63946, and add a 2px purple border to all card sections." required></textarea>',
					'</div>',
					'<label class="cm-checkbox-row">',
						'<input type="checkbox" id="' + escHtml( config.id ) + '-child">',
						'Also generate a child theme scaffold',
					'</label>',
					'<button class="cm-btn" type="submit">',
						'<span class="cm-btn-spinner"></span>',
						'<span class="cm-btn-label">Generate Snippet</span>',
					'</button>',
				'</form>',
				'<div class="cm-results" id="' + escHtml( config.id ) + '-results"></div>',
			'</div>',
		].join( '' );

		var form    = document.getElementById( config.id + '-form' );
		var results = document.getElementById( config.id + '-results' );
		var btn     = form.querySelector( '.cm-btn' );
		var label   = form.querySelector( '.cm-btn-label' );

		// Copy buttons (delegated)
		wrap.addEventListener( 'click', function ( e ) {
			var copyBtn = e.target.closest( '.cm-copy-btn' );
			if ( ! copyBtn ) return;
			var targetId = copyBtn.getAttribute( 'data-target' );
			var pre = document.getElementById( targetId );
			if ( ! pre ) return;
			if ( navigator.clipboard ) {
				navigator.clipboard.writeText( pre.textContent ).then( function () {
					copyBtn.textContent = '&#10003; Copied!';
					setTimeout( function () { copyBtn.innerHTML = '&#128203; Copy'; }, 2000 );
				} );
			}
		} );

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var themeVal = document.getElementById( config.id + '-theme' ).value;
			var descVal  = document.getElementById( config.id + '-desc' ).value.trim();
			var childVal = document.getElementById( config.id + '-child' ).checked;
			if ( descVal.length < 10 ) { document.getElementById( config.id + '-desc' ).focus(); return; }

			btn.disabled = true;
			btn.classList.add( 'loading' );
			label.textContent = 'Generating\u2026';
			results.innerHTML = '<p class="cm-loading-msg">Writing your CSS snippet\u2026 usually 5\u201310 seconds.</p>';

			fetch( config.apiUrl, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify( { description: descVal, theme: themeVal, includeChildTheme: childVal } ),
			} )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, status: r.status, d: d }; } ); } )
				.then( function ( res ) {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Generate Snippet';

					if ( res.status === 429 ) {
						results.innerHTML = upgradeBox( 'You have used your 3 free snippets this month. Upgrade for unlimited snippets.', config.upgradeUrl );
						return;
					}
					if ( ! res.ok ) {
						results.innerHTML = '<div class="cm-error-box">' + escHtml( res.d.error || 'Generation failed.' ) + '</div>';
						return;
					}
					renderResults( results, res.d, config.upgradeUrl );
				} )
				.catch( function () {
					btn.disabled = false;
					btn.classList.remove( 'loading' );
					label.textContent = 'Generate Snippet';
					results.innerHTML = '<div class="cm-error-box">Network error. Please try again.</div>';
				} );
		} );
	}

	function renderResults( container, resp, upgradeUrl ) {
		var d   = resp.data || {};
		var out = [];
		var uid = 'cm-cs-code-' + Date.now();

		if ( d.preview ) {
			out.push( '<div class="cm-summary-box">' + escHtml( d.preview ) + '</div>' );
		}

		// CSS
		if ( d.css ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">CSS Snippet</div>' );
			out.push( codeBlock( d.css, uid + '-css' ) );
			if ( d.placement ) {
				out.push( '<div style="margin-top:8px;font-size:12px;color:#6b7280">&#128204; Paste in: <strong>' + escHtml( d.placement ) + '</strong></div>' );
			}
			out.push( '</div>' );
		}

		// PHP
		if ( d.php ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">PHP (functions.php)</div>' );
			out.push( codeBlock( d.php, uid + '-php' ) );
			out.push( '</div>' );
		}

		// Child theme scaffold
		if ( d.childTheme ) {
			var ct = d.childTheme;
			out.push( '<div class="cm-section"><div class="cm-section-title">Child Theme Scaffold</div>' );
			if ( ct.styleHeader ) {
				out.push( '<div class="cm-item-title" style="font-size:13px;margin-bottom:6px">style.css</div>' );
				out.push( codeBlock( ct.styleHeader, uid + '-ct-style' ) );
			}
			if ( ct.functions ) {
				out.push( '<div class="cm-item-title" style="font-size:13px;margin:12px 0 6px">functions.php</div>' );
				out.push( codeBlock( ct.functions, uid + '-ct-fn' ) );
			}
			if ( ct.instructions ) {
				out.push( '<div style="margin-top:10px;padding:12px 14px;background:#f0fdf4;border-radius:8px;font-size:12px;color:#14532d;line-height:1.6">' + escHtml( ct.instructions ) + '</div>' );
			}
			out.push( '</div>' );
		}

		// Conflicts
		if ( d.conflicts && d.conflicts.length ) {
			out.push( '<div class="cm-section"><div class="cm-section-title">Potential Conflicts</div><ul class="cm-item-list">' );
			d.conflicts.forEach( function ( c ) {
				out.push( '<li class="cm-item"><span class="cm-item-icon">&#9888;&#65039;</span><div>' + escHtml( c ) + '</div></li>' );
			} );
			out.push( '</ul></div>' );
		}

		// Notes
		if ( d.notes ) {
			out.push( '<div style="font-size:12px;color:#6b7280;margin-bottom:16px">&#128221; ' + escHtml( d.notes ) + '</div>' );
		}

		out.push( upgradeBox( 'Upgrade for unlimited snippets, child theme generation, and block editor patterns.', upgradeUrl ) );
		container.innerHTML = out.join( '' );
	}

	( window.cmCsInstances || [] ).forEach( init );
}() );
