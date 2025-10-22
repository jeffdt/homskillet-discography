import React from 'react';
import { Link } from 'react-router-dom';

const AppHeader = () => {
  return (
    <header className="AppHeader">
      <Link className="AppHeader-title" to={{ pathname: "/" }}>Chip Player JS</Link>
      {' • '}
      <a href="https://twitter.com/messages/compose?recipient_id=587634572" target="_blank" rel="noopener noreferrer">
        Feedback
      </a>
    </header>
  );
}

export default AppHeader;
