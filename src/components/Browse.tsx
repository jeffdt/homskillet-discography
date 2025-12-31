import React, { Fragment } from 'react';
import autoBindReact from 'auto-bind/react';
import VirtualizedList from './VirtualizedList';
import DirectoryLink from './DirectoryLink';
import trimEnd from 'lodash/trimEnd';
import { BrowseProps } from '../types/app';
import { formatFileSize } from '../util';

interface BrowseState {
  shouldFlashTitle: boolean;
  shouldUnfoldList: boolean;
}

export default class Browse extends React.PureComponent<BrowseProps, BrowseState> {
  private titleFlashTimeout?: number;
  private unfoldTimeout?: number;

  constructor(props: BrowseProps) {
    super(props);
    autoBindReact(this);

    const shouldAnimate = (props.history.location.state as any)?.shouldAnimate || false;
    this.state = {
      shouldFlashTitle: shouldAnimate,
      shouldUnfoldList: shouldAnimate,
    };
  }

  componentDidMount() {
    this.navigate();

    console.log(
      'Browse mounted - shouldFlashTitle:',
      this.state.shouldFlashTitle,
      'shouldUnfoldList:',
      this.state.shouldUnfoldList
    );

    if (this.state.shouldFlashTitle) {
      this.titleFlashTimeout = window.setTimeout(() => {
        console.log('Browse - clearing flash title');
        this.setState({ shouldFlashTitle: false });
      }, 800);
    }

    if (this.state.shouldUnfoldList) {
      this.unfoldTimeout = window.setTimeout(() => {
        console.log('Browse - clearing unfold list');
        this.setState({ shouldUnfoldList: false });
      }, 600);
    }
  }

  componentDidUpdate(prevProps: BrowseProps, prevState: any) {
    this.navigate();

    if (prevProps.browsePath !== this.props.browsePath) {
      const shouldAnimate = (this.props.history.location.state as any)?.shouldAnimate || false;
      console.log(
        'Browse path changed - shouldAnimate:',
        shouldAnimate,
        'new path:',
        this.props.browsePath
      );

      if (shouldAnimate) {
        console.log('Browse - starting animations');
        this.setState({
          shouldFlashTitle: true,
          shouldUnfoldList: true,
        });

        this.titleFlashTimeout = window.setTimeout(() => {
          console.log('Browse - clearing flash title');
          this.setState({ shouldFlashTitle: false });
        }, 800);

        this.unfoldTimeout = window.setTimeout(() => {
          console.log('Browse - clearing unfold list');
          this.setState({ shouldUnfoldList: false });
        }, 600);
      }
    }
  }

  componentWillUnmount() {
    if (this.titleFlashTimeout) {
      clearTimeout(this.titleFlashTimeout);
    }
    if (this.unfoldTimeout) {
      clearTimeout(this.unfoldTimeout);
    }
  }

  handleShufflePlay() {
    this.props.handleShufflePlay(this.props.browsePath);
  }

  navigate() {
    const { browsePath, listing, fetchDirectory } = this.props;
    if (!listing) {
      fetchDirectory(browsePath);
    }
  }

  render() {
    const { listing, browsePath, playContext, history } = this.props;

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('q');
    const search = urlParams.toString();
    // Check if previous page url is the parent directory of current page url.
    const prevPath = trimEnd((history.location.state as any)?.prevPathname, '/');
    const currPath = trimEnd(window.location.pathname, '/');
    const prevPageIsParentDir = prevPath === currPath.slice(0, currPath.lastIndexOf('/'));

    const BrowseRow = (props: {
      item: any;
      onPlay: () => void;
      onCopyLink?: (href: string) => void;
      isPlaying?: boolean;
    }) => {
      const { item, onPlay, onCopyLink, isPlaying } = props;
      item.isBackLink = item.name === '..' && prevPageIsParentDir;

      if (item.type === 'directory') {
        return (
          <>
            <div className="BrowseList-colName">
              <DirectoryLink to={item.href} search={search} isBackLink={item.isBackLink}>
                {item.name}
              </DirectoryLink>
            </div>
            <div className="BrowseList-colDir">&lt;DIR&gt;</div>
            <div
              className="BrowseList-colCount"
              title={`Contains ${item.numChildren} direct child items`}
            >
              {item.numChildren}
            </div>
            <div className="BrowseList-colMtime">{item.mtime}</div>
            <div
              className="BrowseList-colSize"
              title={`Directory size is ${item.size} bytes (recursive)`}
            >
              {item.size != null && formatFileSize(item.size)}
            </div>
            <div className="BrowseList-colCopy"></div>
          </>
        );
      } else {
        return (
          <>
            <div className="BrowseList-colName">
              <a onClick={onPlay} href={item.href} tabIndex={-1}>
                {item.name}
              </a>
            </div>
            <div className="BrowseList-colMtime">{item.mtime}</div>
            <div className="BrowseList-colSize">{formatFileSize(item.size)}</div>
            <div className="BrowseList-colCopy">
              <span
                className={`inline-icon icon-copy BrowseList-copy-icon ${isPlaying ? 'is-playing' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onCopyLink) onCopyLink(item.href);
                }}
                title="Copy song link to clipboard"
              />
            </div>
          </>
        );
      }
    };

    const titleClassName = `Browse-topRow${this.state.shouldFlashTitle ? ' flash-title' : ''}`;
    const listClassName = `Browse-list-scroll${this.state.shouldUnfoldList ? ' unfold' : ''}`;

    return (
      <div className="Browse-container">
        <h3 className={titleClassName}>
          /{browsePath}{' '}
          <button
            className="box-button"
            title="Play a random song from this album"
            onClick={this.handleShufflePlay}
          >
            Randomize
          </button>
        </h3>
        <div className={listClassName}>
          <VirtualizedList
            scrollContainerRef={this.props.scrollContainerRef}
            currContext={this.props.currContext}
            currIdx={this.props.currIdx}
            onSongClick={this.props.onSongClick}
            onCopyLink={this.props.onCopyLink}
            isPlaying={(href) =>
              this.props.currContext !== null &&
              this.props.currContext !== undefined &&
              this.props.currIdx !== undefined &&
              this.props.currContext[this.props.currIdx] === href
            }
            itemList={listing || []}
            songContext={playContext}
            rowRenderer={BrowseRow}
            listRef={this.props.listRef}
            isSorted={true}
          />
        </div>
      </div>
    );
  }
}
