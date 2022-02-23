( function () {

	function RedirectManager( config ) {
		RedirectManager.super.call( this, config );
	}

	OO.inheritClass( RedirectManager, OO.ui.ProcessDialog );

	RedirectManager.static.name = 'extRedirectManager';

	RedirectManager.static.title = mw.msg( 'redirectmanager-title' );

	RedirectManager.static.actions = [
		{ label: mw.msg( 'redirectmanager-close' ), flags: 'progressive' }
	];

	/**
	 * Set the height to a reasonable maximum.
	 *
	 * @return {number} Body height
	 */
	RedirectManager.prototype.getBodyHeight = function () {
		return 400;
	};

	RedirectManager.prototype.initialize = function () {
		RedirectManager.super.prototype.initialize.apply( this, arguments );
		this.content = new OO.ui.PanelLayout( { padded: true, expanded: false } );

		this.newRedirectInput = new mw.widgets.TitleInputWidget();
		var newRedirectButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'redirectmanager-newredirect-button' )
		} );
		newRedirectButton.connect( this, { click: this.addRedirect } );
		this.newRedirectField = new OO.ui.ActionFieldLayout(
			this.newRedirectInput,
			newRedirectButton,
			{
				align: 'top',
				label: mw.msg( 'redirectmanager-newredirect-field' )
			}
		);
		this.newRedirectInput.connect( this, { change: function () {
			this.newRedirectField.setErrors( [] );
		} } );

		var title = new mw.Title( mw.config.get( 'wgPageName' ) );
		var strongTitle = '<strong>' + title.getPrefixedText() + '</strong>';
		this.existingRedirectsField = new OO.ui.FieldLayout( new OO.ui.Widget(), {
			label: new OO.ui.HtmlSnippet( mw.message( 'redirectmanager-existing-redirects', [ strongTitle ] ).text() ),
			align: 'top'
		} );

		this.content.$element.append(
			this.newRedirectField.$element,
			this.existingRedirectsField.$element
		);
		this.$body.append( this.content.$element );
	};

	RedirectManager.prototype.addRedirect = function () {
		var redirect = this.newRedirectInput.getValue();
		if ( redirect === '' ) {
			this.newRedirectInput.focus();
			return;
		}
		var redirectManager = this;
		( new mw.Api() ).post( {
			action: 'redirectmanager',
			target: mw.config.get( 'wgPageName' ),
			redirect: redirect,
			errorformat: 'html'
		} ).done( function () {
			redirectManager.refreshList();
		} ).fail( function ( errorCode, result ) {
			result.errors.forEach( function ( error ) {
				redirectManager.newRedirectField.setErrors( [ new OO.ui.HtmlSnippet( error[ '*' ] ) ] );
			} );
		} );
	};

	RedirectManager.prototype.getSetupProcess = function ( data ) {
		data = data || {};
		return RedirectManager.super.prototype.getSetupProcess.call( this, data )
			.next( function () {
				this.newRedirectField.setErrors( [] );
				this.refreshList();
			}, this );
	};

	RedirectManager.prototype.refreshList = function () {
		var existingRedirectsField = this.existingRedirectsField;
		( new mw.Api() ).get( {
			action: 'query',
			prop: 'redirects',
			titles: mw.config.get( 'wgPageName' )
		} ).then( function ( result ) {
			var out;
			if ( result.query.pages[ mw.config.get( 'wgArticleId' ) ].redirects === undefined ) {
				var msg = document.createElement( 'em' );
				msg.textContent = mw.msg( 'redirectmanager-no-redirects-found' );
				out = document.createElement( 'p' );
				out.appendChild( msg );
			} else {
				var redirects = result.query.pages[ mw.config.get( 'wgArticleId' ) ].redirects;
				redirects.sort( function ( a, b ) {
					return a.title > b.title;
				} );
				out = document.createElement( 'ul' );
				Object.keys( redirects ).forEach( function ( key ) {
					var title = new mw.Title( redirects[ key ].title, redirects[ key ].ns );
					var a = document.createElement( 'a' );
					a.setAttribute( 'href', title.getUrl( { redirect: 'no' } ) );
					a.setAttribute( 'target', '_base' );
					a.textContent = title.getPrefixedText();
					var copy = document.createElement( 'a' );
					copy.setAttribute( 'role', 'button' );
					copy.setAttribute( 'class', 'ext-redirectmanager-copy-to-clipboard' );
					copy.textContent = mw.msg( 'redirectmanager-copy-to-clipboard' );
					copy.addEventListener( 'click', function () {
						navigator.clipboard.writeText( title.getPrefixedText() ).then( function () {
							copy.textContent = mw.msg( 'redirectmanager-copied-to-clipboard' );
						} );
					} );
					var li = document.createElement( 'li' );
					li.appendChild( a );
					li.appendChild( new Text( ' ' ) );
					li.appendChild( copy );
					out.appendChild( li );
				} );
			}
			existingRedirectsField.getField().$element.empty();
			existingRedirectsField.getField().$element.append( out );
		} );
	};

	RedirectManager.prototype.getActionProcess = function ( action ) {
		var dialog = this;
		if ( action ) {
			return new OO.ui.Process( function () {
				dialog.close( { action: action } );
			} );
		}
		return RedirectManager.super.prototype.getActionProcess.call( this, action );
	};

	module.exports = RedirectManager;

}() );
