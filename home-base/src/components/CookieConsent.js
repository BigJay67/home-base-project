import React, { useState } from 'react';
import { Coffee, X } from 'react-feather';

const CHOICE = 'homebase_cookie_notice';

export default function CookieConsent() {
  const [open, setOpen] = useState(() => !document.cookie.split('; ').some(part => part.startsWith(`${CHOICE}=`)));

  const acknowledge = () => {
    document.cookie = `${CHOICE}=seen; Max-Age=15552000; Path=/; SameSite=Lax`;
    setOpen(false);
  };

  return <>
    {open && <aside className="hb-cookie" aria-label="Cookie notice" role="dialog" aria-modal="false">
      <span className="hb-cookie-icon"><Coffee size={23} /></span>
      <div className="hb-cookie-copy"><strong>A little housekeeping.</strong><p>HomeBase uses essential browser storage for sign-in and saved stays. A cookie remembers that you saw this notice. We don't use advertising cookies.</p></div>
      <button className="hb-cookie-accept" onClick={acknowledge}>Got it</button>
      <button className="hb-cookie-close" onClick={acknowledge} aria-label="Close cookie notice"><X size={17} /></button>
    </aside>}
    <button className="hb-cookie-settings" onClick={() => setOpen(true)}>Cookie info</button>
  </>;
}
