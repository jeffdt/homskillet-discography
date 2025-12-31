import { Link, useHistory } from 'react-router-dom';
import React, { memo, useState, useRef, useEffect } from 'react';

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
  const [isFlashing, setIsFlashing] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const linkClassName = dim ? 'DirectoryLink-dim' : undefined;
  const folderClassName = dim ? 'inline-icon dim-icon icon-folder' : 'inline-icon icon-folder';

  // Double encode % because react-router will decode this into history.
  // See https://github.com/ReactTraining/history/issues/505
  // The fix https://github.com/ReactTraining/history/pull/656
  // ...is not released in react-router-dom 5.2.0 which uses history 4.10
  const encodedTo = to.replace('%25', '%2525');
  const finalSearch = search || getSearch();

  const toObj = {
    pathname: encodedTo,
    search: finalSearch,
    state: { prevPathname: window.location.pathname, shouldAnimate: true },
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isBackLink) {
      e.preventDefault();
      history.goBack();
      return;
    }

    console.log('DirectoryLink clicked - starting flash animation');
    setIsFlashing(true);

    e.preventDefault();

    setTimeout(() => {
      console.log('DirectoryLink - navigating with state:', toObj);
      history.push(toObj);
    }, 800);
  };

  useEffect(() => {
    if (isFlashing) {
      console.log('DirectoryLink - flash state set to true');
      const timer = setTimeout(() => {
        console.log('DirectoryLink - flash state cleared');
        setIsFlashing(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isFlashing]);

  const combinedClassName = [linkClassName, isFlashing ? 'directory-flash' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <Link
      ref={linkRef}
      to={toObj}
      className={combinedClassName}
      onClick={handleClick}
      tabIndex={-1}
    >
      <span className={folderClassName} />
      {children}
    </Link>
  );
};

export default memo(DirectoryLink);
