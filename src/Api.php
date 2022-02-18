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
		// Get and check the target/destination page name.
		$target = $this->getParameter( 'target' );
		$targetTitle = Title::newFromText( $target );
		if ( !$targetTitle || !$targetTitle->exists() ) {
			$this->addError( $this->msg( 'redirectmanager-no-target', $targetTitle->getFullText() ) );
			return;
		}

		// Get and check the redirect/source page name.
		$redirect = $this->getParameter( 'redirect' );
		$redirectTitle = Title::newFromText( $redirect );
		if ( $redirectTitle->exists() ) {
			$this->addError( 'redirectmanager-redirect-page-exists' );
			return;
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
