import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import { BrowserRouter as Router } from 'react-router-dom';
import { UserProvider } from './components/UserProvider';
import { ToastProvider } from './components/ToastProvider';

// Initialize Google Analytics
const GA_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
if (GA_ID && GA_ID !== 'UA-XXXXXXXXXX') {
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA_ID}');
  `;
  document.head.appendChild(script2);
}

ReactDOM.render((
  <Router basename="/">
    <ToastProvider>
      <UserProvider>
        <App/>
      </UserProvider>
    </ToastProvider>
  </Router>
), document.getElementById('root'));
