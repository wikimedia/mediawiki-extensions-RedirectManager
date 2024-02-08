const RedirectManager = require( './RedirectManager.js' );
mw.hook( 'wikiEditor.toolbarReady' ).add( ( $textarea ) => {
	const dialog = new RedirectManager( $textarea );
	OO.ui.getWindowManager().addWindows( [ dialog ] );
	$textarea.wikiEditor( 'addToToolbar', {
		section: 'main',
		group: 'insert',
		tools: {
			redirectmanager: {
				type: 'button',
				label: mw.msg( 'redirectmanager-title' ),
				action: {
					type: 'callback',
					execute: () => {
						OO.ui.getWindowManager().openWindow( dialog );
					}
				}
			}
		}
	} );
} );
