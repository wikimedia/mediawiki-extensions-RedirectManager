<?php

namespace MediaWiki\Extension\RedirectManager;

use ApiBase;
use ApiMain;
use Language;
use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Content\IContentHandlerFactory;
use MediaWiki\Page\WikiPageFactory;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;

class Api extends ApiBase {
	/** @var IContentHandlerFactory */
	private $contentHandlerFactory;

	/** @var Language */
	private $contentLanguage;

	/** @var WikiPageFactory */
	private $wikiPageFactory;

	/**
	 * @param ApiMain $main
	 * @param string $action
	 * @param IContentHandlerFactory $contentHandlerFactory
	 * @param Language $contentLanguage
	 * @param WikiPageFactory $wikiPageFactory
	 */
	public function __construct(
		ApiMain $main,
		$action,
		IContentHandlerFactory $contentHandlerFactory,
		Language $contentLanguage,
		WikiPageFactory $wikiPageFactory
	) {
		parent::__construct( $main, $action );
		$this->contentHandlerFactory = $contentHandlerFactory;
		$this->contentLanguage = $contentLanguage;
		$this->wikiPageFactory = $wikiPageFactory;
	}

	/**
	 * @inheritDoc
	 */
	public function mustBePosted() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function isWriteMode() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
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
		$contentHandler = $this->contentHandlerFactory
			->getContentHandler( $redirectTitle->getContentModel() );
		$content = $contentHandler->makeRedirectContent( $targetTitle );
		$pageUpdater = $this->wikiPageFactory
			->newFromTitle( $redirectTitle )
			->newPageUpdater( $this->getUser() );
		$pageUpdater->setContent( SlotRecord::MAIN, $content );
		$pageUpdater->addTag( 'redirectmanager' );
		$comment = $this->msg( 'redirectmanager-edit-summary' )
			->inLanguage( $this->contentLanguage )
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
