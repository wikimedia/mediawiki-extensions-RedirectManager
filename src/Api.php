<?php

namespace MediaWiki\Extension\RedirectManager;

use ApiBase;
use CommentStoreComment;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use Title;
use Wikimedia\ParamValidator\ParamValidator;

class Api extends ApiBase {

	/**
	 * @inheritDoc
	 */
	public function mustBePosted() {
		return true;
	}

	public function execute() {
		// Get and check the redirect/source page name and permission.
		$redirect = $this->getParameter( 'redirect' );
		$redirectTitle = Title::newFromText( $redirect );
		// Redirect is invalid.
		if ( $redirectTitle === null ) {
			$this->addError( 'redirectmanager-redirect-page-invalid' );
			return;
		}
		// Redirect already exists.
		if ( $redirectTitle->exists() ) {
			$this->addError( 'redirectmanager-redirect-page-exists' );
			return;
		}
		$this->checkTitleUserPermissions( $redirectTitle, 'edit' );

		// Get and check the target/destination page name.
		$target = $this->getParameter( 'target' );
		$targetTitle = Title::newFromText( $target );
		// Target is not valid.
		if ( $targetTitle === null ) {
			$this->addError( $this->msg( 'redirectmanager-invalid-target', $target ) );
			return;
		}
		// Target does not exist (not an error; just a warning).
		if ( !$targetTitle->exists() ) {
			$this->addWarning( $this->msg( 'redirectmanager-no-target', $targetTitle->getFullText() ) );
		}

		// Create the redirect.
		$services = MediaWikiServices::getInstance();
		$contentHandler = $services->getContentHandlerFactory()
			->getContentHandler( $redirectTitle->getContentModel() );
		$content = $contentHandler->makeRedirectContent( $targetTitle );
		$pageUpdater = $services->getWikiPageFactory()
			->newFromTitle( $redirectTitle )
			->newPageUpdater( $this->getUser() );
		$pageUpdater->setContent( SlotRecord::MAIN, $content );
		$pageUpdater->addTag( 'redirectmanager' );
		$comment = $this->msg( 'redirectmanager-edit-summary' )
			->inLanguage( $services->getContentLanguage() )
			->parse();
		$pageUpdater->saveRevision(
			CommentStoreComment::newUnsavedComment( $comment ),
			EDIT_INTERNAL | EDIT_AUTOSUMMARY
		);
		$this->addMessagesFromStatus( $pageUpdater->getStatus() );

		$this->getResult()->addValue( 'redirectmanager', 'status', 'ok' );
		$this->getResult()->addValue( 'redirectmanager', 'redirect', $redirectTitle->getFullText() );
		$this->getResult()->addValue( 'redirectmanager', 'target', $targetTitle->getFullText() );
	}

	/**
	 * @return mixed[][]
	 */
	public function getAllowedParams() {
		return [
			'redirect' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'target' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=redirectmanager&redirect=MOS:FOO&target=Project:Manual of Style, foobar'
				=> 'apihelp-redirectmanager-example-1',
		];
	}
}
