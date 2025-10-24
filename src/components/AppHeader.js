import React from 'react';
import { Link } from 'react-router-dom';

const AppHeader = () => {
  return (
    <header className="AppHeader">
      <Link className="AppHeader-title" to={{ pathname: "/" }}>Homskillet Discography</Link>
    </header>
  );
}

export default AppHeader;
