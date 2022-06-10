( function () {
	var RedirectManager = require( './RedirectManager.js' );
	mw.hook( 'wikiEditor.toolbarReady' ).add( function ( $textarea ) {
		var dialog = new RedirectManager( $textarea );
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
						execute: function () {
							OO.ui.getWindowManager().openWindow( dialog );
						}
					}
				}
			}
		} );
		// Add a class to our new button, because WikiEditor doesn't have a better way.
		document.querySelector( '.tool[rel="redirectmanager"]' ).classList.add( 'ext-redirectmanager-image-toolbaricon' );
	} );
}() );
