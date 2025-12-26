import React, { Fragment } from 'react';
import autoBindReact from 'auto-bind/react';
import VirtualizedList from './VirtualizedList';
import DirectoryLink from './DirectoryLink';
import trimEnd from 'lodash/trimEnd';
import { BrowseProps } from '../types/app';
import { formatFileSize } from '../util';


export default class Browse extends React.PureComponent<BrowseProps> {
  constructor(props: BrowseProps) {
    super(props);
    autoBindReact(this);
  }

  componentDidMount() {
    this.navigate();
  }

  componentDidUpdate(prevProps: BrowseProps, prevState: any) {
    this.navigate();
  }

  handleShufflePlay() {
    this.props.handleShufflePlay(this.props.browsePath);
  }

  navigate() {
    const {
      browsePath,
      listing,
      fetchDirectory,
    } = this.props;
    if (!listing) {
      fetchDirectory(browsePath);
    }
  }

  render() {
    const {
      listing,
      browsePath,
      playContext,
      history,
    } = this.props;

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete('q');
    const search = urlParams.toString();
    // Check if previous page url is the parent directory of current page url.
    const prevPath = trimEnd((history.location.state as any)?.prevPathname, '/');
    const currPath = trimEnd(window.location.pathname, '/');
    const prevPageIsParentDir = prevPath === currPath.slice(0, currPath.lastIndexOf('/'));

    const BrowseRow = (props: { item: any; onPlay: () => void }) => {
      const { item, onPlay } = props;
      item.isBackLink = item.name === '..' && prevPageIsParentDir;

      if (item.type === 'directory') {
        return (
          <>
            <div className="BrowseList-colName">
              <DirectoryLink to={item.href} search={search}
                             isBackLink={item.isBackLink}>{item.name}</DirectoryLink>
            </div>
            <div className="BrowseList-colDir">
              &lt;DIR&gt;
            </div>
            <div className="BrowseList-colCount" title={`Contains ${item.numChildren} direct child items`}>
              {item.numChildren}
            </div>
            <div className="BrowseList-colMtime">
              {item.mtime}
            </div>
            <div className="BrowseList-colSize" title={`Directory size is ${item.size} bytes (recursive)`}>
              {item.size != null && formatFileSize(item.size)}
            </div>
          </>
        );
      } else {
        return (
          <>
            <div className="BrowseList-colName">
              <a onClick={onPlay}
                 href={item.href}
                 tabIndex={-1}>
                {item.name}
              </a>
            </div>
            <div className="BrowseList-colMtime">
              {item.mtime}
            </div>
            <div className="BrowseList-colSize">
              {formatFileSize(item.size)}
            </div>
          </>
        );
      }
    }

    return (
      <div className="Browse-container">
        <h3 className="Browse-topRow">
          /{browsePath}{' '}
          <button
            className="box-button"
            title="Play a random song from this album"
            onClick={this.handleShufflePlay}>
            Randomize
          </button>
        </h3>
        <div className="Browse-list-scroll">
          <VirtualizedList
            scrollContainerRef={this.props.scrollContainerRef}
            currContext={this.props.currContext}
            currIdx={this.props.currIdx}
            onSongClick={this.props.onSongClick}
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
