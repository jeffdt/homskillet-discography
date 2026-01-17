import { Link, useHistory } from 'react-router-dom';
import React, { memo } from 'react';

interface DirectoryLinkProps {
  to: string;
  dim?: boolean;
  search?: string;
  isBackLink?: boolean;
  children: React.ReactNode;
}

function getSearch(): string {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.delete('q');
  return urlParams.toString();
}

const DirectoryLink: React.FC<DirectoryLinkProps> = ({ to, dim, search, isBackLink, children }) => {
  const history = useHistory();
  const linkClassName = dim ? 'DirectoryLink-dim' : undefined;
  const folderClassName = dim ? 'inline-icon dim-icon icon-folder' : 'inline-icon icon-folder';

  // Double encode % because react-router will decode this into history.
  // See https://github.com/ReactTraining/history/issues/505
  // The fix https://github.com/ReactTraining/history/pull/656
  // ...is not released in react-router-dom 5.2.0 which uses history 4.10
  const encodedTo = to.replace('%25', '%2525');
  const finalSearch = search || getSearch();

  // For back links, strip the 'play' and 't' parameters to avoid re-processing
  const backLinkSearch = isBackLink
    ? (() => {
        const urlParams = new URLSearchParams(finalSearch);
        urlParams.delete('play');
        urlParams.delete('t');
        const cleanSearch = urlParams.toString();
        return cleanSearch ? `?${cleanSearch}` : '';
      })()
    : finalSearch;

  const toObj = {
    pathname: isBackLink ? '/' : encodedTo,
    search: isBackLink ? backLinkSearch : finalSearch,
    state: { prevPathname: window.location.pathname },
  };

  return (
    <Link to={toObj} className={linkClassName} tabIndex={-1}>
      <span className={folderClassName} />
      {children}
    </Link>
  );
};

export default memo(DirectoryLink);
