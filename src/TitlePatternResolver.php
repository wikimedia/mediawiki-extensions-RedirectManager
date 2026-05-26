<?php

namespace MediaWiki\Extension\RedirectManager;

use MediaWiki\SiteStats\SiteStats;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class TitlePatternResolver {

	public function __construct( private readonly IConnectionProvider $connectionProvider ) {
	}

	public function resolve( string $titlePattern ): string {
		// The brace is okay here as it can never be used in a title.
		preg_match_all( '/\{([^}]+)}/', $titlePattern, $matches );
		$out = $titlePattern;
		foreach ( $matches[1] as $match ) {
			$matchParts = explode( ':', $match );
			$patternName = $matchParts[0];
			$patternParams = $matchParts[1] ?? null;
			$replacement = null;

			// Dates and times.
			if ( $patternName === 'date' || $patternName === 'datetime' ) {
				$replacement = date( $patternParams ?? 'Y-m-d', ConvertibleTimestamp::time() );
			}

			// Incrementing integers.
			if ( $patternName === 'number' ) {
				$low = 1;
				$high = max( SiteStats::pages(), 1 );
				$currentNumber = $low;
				while ( $low < $high ) {
					$titleStr = str_replace( '{' . $matchParts[0] . '}', (string)$currentNumber, $titlePattern );
					$possibleTitle = Title::newFromText( $titleStr );
					$possibleTitleExists = $this->connectionProvider
						->getReplicaDatabase()
						->newSelectQueryBuilder()
						->from( 'page' )
						->where( [
							'page_namespace' => $possibleTitle->getNamespace(),
							'page_title' => $possibleTitle->getDBkey(),
						] )
						->limit( 1 )
						->caller( __METHOD__ )
						->fetchRowCount();
					if ( $possibleTitleExists ) {
						$low = $currentNumber;
					} else {
						$high = $currentNumber;
					}
					$newCurrentNumber = intdiv( $low + $high, 2 );
					if ( $newCurrentNumber === $currentNumber ) {
						$currentNumber++;
						break;
					}
					$currentNumber = $newCurrentNumber;
				}
				$replacement = $currentNumber;
			}

			// Random strings.
			if ( $patternName === 'rand' || $patternName === 'random' ) {
				// @todo Make these configurable.
				$chars = str_split( 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' );
				$length = 3;
				$replacement = implode( '', array_rand( array_flip( $chars ), $length ) );
			}

			// If any replacements have been determined, update the output.
			if ( $replacement ) {
				$out = str_replace( '{' . $match . '}', $replacement, $out );
			}
		}
		return $out;
	}
}
