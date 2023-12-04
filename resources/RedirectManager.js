( function () {

	/**
	 * @param {jQuery} $textarea
	 */
	function RedirectManager( $textarea ) {
		RedirectManager.super.call( this, {} );
		this.$textarea = $textarea;
	}

	OO.inheritClass( RedirectManager, OO.ui.ProcessDialog );

	RedirectManager.static.name = 'extRedirectManager';

	RedirectManager.static.title = OO.ui.deferMsg( 'redirectmanager-title' );

	RedirectManager.static.actions = [
		{
			title: OO.ui.deferMsg( 'redirectmanager-close' ),
			flags: [ 'safe', 'close' ]
		},
		{
			action: 'help',
			label: OO.ui.deferMsg( 'redirectmanager-help' ),
			title: OO.ui.deferMsg( 'redirectmanager-help-title' ),
			href: 'https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Extension:RedirectManager'
		}
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
		const newRedirectButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'redirectmanager-newredirect-button' ),
			flags: [ 'progressive' ]
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

		const title = new mw.Title( mw.config.get( 'wgPageName' ) );
		const $strongTitle = $( '<strong>' ).text( title.getPrefixedText() );
		this.existingRedirectsField = new OO.ui.FieldLayout( new OO.ui.Widget(), {
			label: mw.message( 'redirectmanager-existing-redirects', [ $strongTitle ] ).parseDom(),
			align: 'top'
		} );

		this.content.$element.append(
			this.newRedirectField.$element,
			this.existingRedirectsField.$element
		);
		this.$body.append( this.content.$element );
	};

	RedirectManager.prototype.addRedirect = function () {
		const redirect = this.newRedirectInput.getValue();
		if ( redirect === '' ) {
			this.newRedirectInput.focus();
			return;
		}
		const redirectManager = this;
		( new mw.Api() ).post( {
			formatversion: 2,
			action: 'redirectmanager',
			target: mw.config.get( 'wgPageName' ),
			redirect: redirect,
			errorformat: 'html',
			uselang: mw.config.get( 'wgUserLanguage' )
		} ).done( function () {
			redirectManager.refreshList();
		} ).fail( function ( errorCode, result ) {
			result.errors.forEach( function ( error ) {
				redirectManager.newRedirectField.setErrors( [
					new OO.ui.HtmlSnippet( error.html )
				] );
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
		const redirectManager = this;
		const existingRedirectsField = this.existingRedirectsField;
		( new mw.Api() ).get( {
			formatversion: 2,
			action: 'query',
			prop: 'redirects',
			titles: mw.config.get( 'wgPageName' )
		} ).then( function ( result ) {
			let $out;
			const pageInfo = result.query.pages[ 0 ];
			if ( pageInfo.redirects === undefined ) {
				$out = $( '<p>' ).append(
					$( '<em>' ).text( mw.msg( 'redirectmanager-no-redirects-found' ) )
				);
			} else {
				$out = $( '<table>' ).addClass( 'ext-redirectmanager-table' );
				pageInfo.redirects
					.sort( function ( a, b ) {
						return a.title > b.title;
					} )
					.forEach( function ( redirect ) {
						const title = new mw.Title( redirect.title, redirect.ns );
						$out.append( redirectManager.getTableRow( title ) );
					} );
			}
			existingRedirectsField.getField().$element.empty().append( $out );
		} );
	};

	/**
	 * @private
	 * @param {mw.Title} title
	 * @return {jQuery}
	 */
	RedirectManager.prototype.getTableRow = function ( title ) {
		const redirectButton = new OO.ui.ButtonWidget( {
			href: title.getUrl( { redirect: 'no' } ),
			target: '_base',
			label: title.getPrefixedText(),
			framed: false
		} );

		const insertButton = new OO.ui.ButtonWidget( {
			label: mw.msg( 'redirectmanager-insert' ),
			flags: [ 'progressive' ],
			framed: false
		} );
		insertButton.connect( this, {
			click: function () {
				this.$textarea.textSelection( 'replaceSelection', title.getPrefixedText() );
				this.close();
			}
		} );

		let copyButton = false;
		if ( navigator && navigator.clipboard ) {
			copyButton = new OO.ui.ButtonWidget( {
				label: mw.msg( 'redirectmanager-copy-to-clipboard' ),
				flags: [ 'progressive' ],
				framed: false
			} );
			copyButton.connect( this, {
				click: function () {
					navigator.clipboard.writeText( title.getPrefixedText() ).then( function () {
						copyButton.setLabel( mw.msg( 'redirectmanager-copied-to-clipboard' ) );
						setTimeout( function () {
							copyButton.setLabel( mw.msg( 'redirectmanager-copy-to-clipboard' ) );
						}, 800 );
					} );
				}
			} );
		}

		const $row = $( '<tr>' ).append(
			$( '<td>' ).append( redirectButton.$element ),
			$( '<td>' ).append( insertButton.$element )
		);
		if ( copyButton ) {
			$row.append( $( '<td>' ).append( copyButton.$element ) );
		}
		return $row;
	};

	RedirectManager.prototype.getActionProcess = function ( action ) {
		const dialog = this;
		if ( action ) {
			return new OO.ui.Process( function () {
				if ( action === 'help' ) {
					window.open( dialog.actions.list[ 1 ].href );
				} else {
					dialog.close( { action: action } );
				}
			} );
		}
		return RedirectManager.super.prototype.getActionProcess.call( this, action );
	};

	module.exports = RedirectManager;

}() );
